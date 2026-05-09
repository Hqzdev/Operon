const DEFAULT_API_BASE = "https://operons.vercel.app/api";
const ALARM_NAME = "operon-autopilot-sync";
const SYNC_INTERVAL_MINUTES = 60 * 24; // every 24h

const ADS_MANAGER_PATTERNS = [
  { provider: "META", url: "https://www.facebook.com/adsmanager/*" },
  { provider: "META", url: "https://adsmanager.facebook.com/*" },
  { provider: "META", url: "https://business.facebook.com/*" },
  { provider: "META", url: "https://ads.facebook.com/*" },
  { provider: "TIKTOK", url: "https://ads.tiktok.com/*" },
  { provider: "TIKTOK", url: "https://business.tiktok.com/*" },
  { provider: "SHOPIFY", url: "https://admin.shopify.com/*" },
  { provider: "SHOPIFY", url: "https://*.myshopify.com/*" },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

async function apiFetch(path, options = {}) {
  const { operon_token: token } = await getStorage("operon_token");
  if (!token) return null;
  const { operon_api_base: apiBase = DEFAULT_API_BASE } = await getStorage("operon_api_base");
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

async function getExtensionSettings() {
  const settings = await getStorage([
    "operon_api_base",
    "operon_extension_key",
    "operon_account_name",
  ]);

  return {
    apiBase: settings.operon_api_base || DEFAULT_API_BASE,
    extensionKey: settings.operon_extension_key || "",
    accountName: settings.operon_account_name || "",
  };
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function slug(value, fallback = "creative") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || fallback;
}

function normalizeMetric(provider, row, index) {
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  const purchases = Number(row.purchases || row.orders || 0);
  const revenue = Number(row.revenue || row.sales || 0);
  const spend = Number(row.spend || 0);
  const name = row.name || row.entityName || row.title || `${provider} row ${index + 1}`;

  return {
    externalEntityId: row.externalEntityId || row.id || `${provider.toLowerCase()}-${slug(name)}-${index}`,
    entityName: name,
    date: row.date || todayIsoDate(),
    spend,
    total_spend: Number(row.total_spend || row.totalSpend || spend),
    days_active: Number(row.days_active || row.daysActive || 1),
    impressions,
    clicks,
    add_to_cart: Number(row.add_to_cart || row.addToCart || 0),
    purchases,
    revenue,
    return_rate: Number(row.return_rate || row.returnRate || 0),
    net_revenue: Number(row.net_revenue || row.netRevenue || 0) || undefined,
    frequency: Number(row.frequency || 0),
    product_price: Number(row.product_price || row.productPrice || (purchases > 0 ? revenue / purchases : 0)),
    cost: Number(row.cost || 0),
    source: {
      ...row,
      provider,
      capturedBy: "operon-chrome-extension",
      capturedAt: new Date().toISOString(),
    },
  };
}

async function sendExtensionMetrics(provider, rows, accountName = "") {
  const { apiBase, extensionKey, accountName: storedAccountName } = await getExtensionSettings();
  if (!extensionKey) throw new Error("Extension key is missing");

  const metrics = rows.map((row, index) => normalizeMetric(provider, row, index));
  if (metrics.length === 0) return { ok: true, count: 0 };

  const res = await fetch(`${apiBase}/integrations/extension/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      extensionKey,
      accountName: accountName || storedAccountName || `${provider} browser sync`,
      externalAccountId: accountName || storedAccountName || provider.toLowerCase(),
      metrics,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Operon sync failed");
  return data;
}

async function updateRemoteAutopilot(enabled) {
  const { apiBase, extensionKey } = await getExtensionSettings();
  if (!extensionKey) throw new Error("Extension key is missing");

  const res = await fetch(`${apiBase}/integrations/extension/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extensionKey, autopilotEnabled: enabled }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Autopilot sync failed");
  chrome.storage.local.set({ operon_connection_status: data });
  return data;
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
    updateRemoteAutopilot(Boolean(msg.enabled))
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }

  if (msg.type === "MANUAL_SYNC") {
    runAutopilotSync()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true; // async
  }

  if (msg.type === "SYNC_ACTIVE_PAGE") {
    syncActivePage()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true; // async
  }
});

// ── scrape from an open Ads Manager tab ───────────────────────────────────────
async function scrapeFromOpenTab() {
  for (const pattern of ADS_MANAGER_PATTERNS) {
    let tabs;
    try {
      tabs = await chrome.tabs.query({ url: pattern.url });
    } catch {
      continue;
    }
    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_ALL" });
        const rows = response?.campaigns ?? response?.metrics ?? [];
        if (rows?.length > 0) {
          return {
            provider: response.provider || pattern.provider,
            accountName: response.accountName || new URL(tab.url).hostname,
            rows,
          };
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function syncActivePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("Open Meta, TikTok, or Shopify first");

  const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_ALL" });
  const rows = response?.campaigns ?? response?.metrics ?? [];
  if (!rows.length) throw new Error("No metrics found on this page");

  const provider = response.provider || detectProviderFromUrl(tab.url);
  if (!provider) throw new Error("Unsupported page");

  const result = await sendExtensionMetrics(provider, rows, response.accountName || new URL(tab.url).hostname);
  const lastSync = new Date().toISOString();
  chrome.storage.local.set({ last_sync: lastSync, last_sync_result: result });
  notify("Operon synced", `${rows.length} row${rows.length === 1 ? "" : "s"} sent to dashboard`);
  return { ...result, lastSync };
}

function detectProviderFromUrl(url) {
  const hostname = new URL(url).hostname;
  if (hostname.includes("facebook.com")) return "META";
  if (hostname.includes("tiktok.com")) return "TIKTOK";
  if (hostname.includes("shopify.com") || hostname.includes("myshopify.com")) return "SHOPIFY";
  return null;
}

// ── core sync logic ───────────────────────────────────────────────────────────
async function runAutopilotSync() {
  try {
    const scraped = await scrapeFromOpenTab();

    if (scraped?.rows?.length > 0) {
      const result = await sendExtensionMetrics(scraped.provider, scraped.rows, scraped.accountName);
      const lastSync = new Date().toISOString();
      chrome.storage.local.set({ last_sync: lastSync, last_sync_result: result });
      notify("Operon synced", `${scraped.rows.length} ${scraped.provider} row${scraped.rows.length === 1 ? "" : "s"} captured`);
      return { ...result, lastSync };
    }

    // Fallback for old token-based installs.
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

    return { count: history?.length ?? 0 };
  } catch (err) {
    console.error("[Operon Autopilot] sync error:", err);
    throw err;
  }
}
