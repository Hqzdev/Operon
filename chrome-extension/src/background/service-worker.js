const API = "https://operons.vercel.app/api";
const ALARM_NAME = "operon-autopilot-sync";
const SYNC_INTERVAL_MINUTES = 60 * 24; // every 24h

const ADS_MANAGER_PATTERNS = [
  "https://www.facebook.com/adsmanager/*",
  "https://business.facebook.com/*",
  "https://ads.tiktok.com/*",
];

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

// ── scrape from an open Ads Manager tab ───────────────────────────────────────
async function scrapeFromOpenTab() {
  for (const pattern of ADS_MANAGER_PATTERNS) {
    let tabs;
    try {
      tabs = await chrome.tabs.query({ url: pattern });
    } catch {
      continue;
    }
    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_ALL" });
        if (response?.campaigns?.length > 0) return response.campaigns;
      } catch {
        continue;
      }
    }
  }
  return [];
}

// ── analyze scraped campaigns and fire notifications ──────────────────────────
async function analyzeScrapedCampaigns(campaigns) {
  const { last_decisions: prevDecisions = {} } = await getStorage("last_decisions");
  const changes = [];

  for (const campaign of campaigns.slice(0, 10)) {
    const name = campaign.name || "Campaign";
    const form = {
      product_name:        name,
      product_price:       0,
      cost:                0,
      impressions:         campaign.impressions || 0,
      clicks:              campaign.clicks || 0,
      cpc:                 campaign.cpc || 0,
      ctr:                 campaign.ctr || 0,
      purchases:           campaign.purchases || 0,
      revenue:             campaign.revenue || 0,
      add_to_cart:         0,
      cpm:                 0,
      stage:               "testing",
      product_description: "",
    };

    try {
      const res = await apiFetch("/analysis", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res?.ok) continue;

      const data   = await res.json();
      const result = data.result ?? data;
      const decision = result.decision?.finalDecision;
      const prev     = prevDecisions[name];

      if (prev && prev !== decision) {
        changes.push({ name, from: prev, to: decision });
      }
      if (decision) prevDecisions[name] = decision;

      // ROAS drop alert
      const derived = result.derived;
      if (derived?.roas > 0 && derived.roas < derived.breakEvenRoas) {
        notify(
          "ROAS below break-even",
          `${name}: ROAS ${derived.roas}x < BE ${derived.breakEvenRoas}x`
        );
      }
    } catch {
      continue;
    }
  }

  if (changes.length > 0) {
    const summary = changes.map((c) => `${c.name}: ${c.from} → ${c.to}`).join("\n");
    notify("Decision changed", summary);
  }

  chrome.storage.local.set({
    last_decisions: prevDecisions,
    last_sync: new Date().toISOString(),
  });
}

// ── core sync logic ───────────────────────────────────────────────────────────
async function runAutopilotSync() {
  try {
    // Try scraping from an open Ads Manager tab (no API key needed)
    const campaigns = await scrapeFromOpenTab();

    if (campaigns.length > 0) {
      await analyzeScrapedCampaigns(campaigns);
      return;
    }

    // Fallback: server-side integration sync (requires connected accounts)
    const syncRes = await apiFetch("/integrations", { method: "PATCH" });
    if (!syncRes?.ok) return;

    const histRes = await apiFetch("/analysis");
    if (!histRes?.ok) return;

    const history = await histRes.json();
    const { last_decisions: prevDecisions = {} } = await getStorage("last_decisions");
    const changes = [];

    for (const item of (history ?? []).slice(0, 10)) {
      const name     = item.inputData?.product_name ?? "Product";
      const decision = item.result?.decision?.finalDecision;
      const prev     = prevDecisions[name];

      if (prev && prev !== decision) changes.push({ name, from: prev, to: decision });
      if (decision) prevDecisions[name] = decision;

      const derived = item.result?.derived;
      if (derived?.roas > 0 && derived.roas < derived.breakEvenRoas) {
        notify(
          "ROAS below break-even",
          `${name}: ROAS ${derived.roas}x < BE ${derived.breakEvenRoas}x`
        );
      }
    }

    if (changes.length > 0) {
      const summary = changes.map((c) => `${c.name}: ${c.from} → ${c.to}`).join("\n");
      notify("Decision changed", summary);
    }

    chrome.storage.local.set({
      last_decisions: prevDecisions,
      last_sync: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Operon Autopilot] sync error:", err);
  }
}
