const API = "https://operons.vercel.app/api";
const ALARM_NAME = "operon-autopilot-sync";
const SYNC_INTERVAL_MINUTES = 60 * 24; // every 24h

// ── helpers ───────────────────────────────────────────────────────────────────
function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

async function apiFetch(path, options = {}) {
  const { operon_token: token } = await getStorage("operon_token");
  if (!token) return null;
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title,
    message,
    priority: 1,
  });
}

// ── alarm setup ───────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
    }
  });
});

// ── alarm fire ────────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const { autopilot_enabled } = await getStorage("autopilot_enabled");
  if (!autopilot_enabled) return;

  await runAutopilotSync();
});

// ── messages from popup ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "AUTOPILOT_TOGGLE") {
    if (msg.enabled) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
    } else {
      chrome.alarms.clear(ALARM_NAME);
    }
    sendResponse({ ok: true });
  }

  if (msg.type === "MANUAL_SYNC") {
    runAutopilotSync().then(() => sendResponse({ ok: true }));
    return true; // async
  }
});

// ── core sync logic ───────────────────────────────────────────────────────────
async function runAutopilotSync() {
  try {
    // 1. Trigger metrics sync from integrations
    const syncRes = await apiFetch("/integrations", { method: "PATCH" });
    if (!syncRes || !syncRes.ok) return;

    // 2. Fetch latest analysis history to check for decision changes
    const histRes = await apiFetch("/analysis");
    if (!histRes || !histRes.ok) return;

    const history = await histRes.json();
    const { last_decisions: prevDecisions = {} } = await getStorage("last_decisions");

    const changes = [];

    for (const item of (history ?? []).slice(0, 10)) {
      const name = item.inputData?.product_name ?? "Product";
      const decision = item.result?.decision?.finalDecision;
      const prev = prevDecisions[name];

      if (prev && prev !== decision) {
        changes.push({ name, from: prev, to: decision });
      }

      if (decision) prevDecisions[name] = decision;

      // ROAS drop alert
      const derived = item.result?.derived;
      if (derived && derived.roas < derived.breakEvenRoas && derived.roas > 0) {
        notify(
          `⚠️ ROAS ниже точки безубыточности`,
          `${name}: ROAS ${derived.roas}x < BE ${derived.breakEvenRoas}x`
        );
      }
    }

    // Notify about decision changes
    if (changes.length > 0) {
      const summary = changes.map((c) => `${c.name}: ${c.from} → ${c.to}`).join("\n");
      notify("Решения изменились", summary);
    }

    // Save state
    chrome.storage.local.set({
      last_decisions: prevDecisions,
      last_sync: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Operon Autopilot] sync error:", err);
  }
}
