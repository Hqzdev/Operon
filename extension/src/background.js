const OPERON_DASHBOARD_URL = "http://localhost:3000/dashboard";
const DEFAULT_API_BASE = "https://operons.vercel.app/api";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    operonExtensionVersion: chrome.runtime.getManifest().version,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPERON_OPEN_DASHBOARD") {
    chrome.tabs.create({ url: OPERON_DASHBOARD_URL });
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "OPERON_SYNC_ACTIVE_PAGE") {
    syncActivePage()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }

  return false;
});

async function syncActivePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("Open Meta, TikTok, or Shopify first.");

  const settings = await chrome.storage.local.get([
    "operon_extension_key",
    "operon_api_base",
    "operon_account_name",
  ]);
  if (!settings.operon_extension_key) throw new Error("Paste your extension key first.");

  const response = await chrome.tabs.sendMessage(tab.id, { type: "OPERON_SCRAPE_METRICS" });
  const metrics = response?.metrics ?? [];
  if (!response?.ok || metrics.length === 0) throw new Error("No metrics found on this page.");

  const apiBase = settings.operon_api_base || DEFAULT_API_BASE;
  const res = await fetch(`${apiBase}/integrations/extension/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: response.provider,
      extensionKey: settings.operon_extension_key,
      accountName: settings.operon_account_name || response.accountName || new URL(tab.url).hostname,
      externalAccountId: settings.operon_account_name || response.accountName || response.provider.toLowerCase(),
      metrics,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Operon sync failed.");

  const lastSync = new Date().toISOString();
  await chrome.storage.local.set({ operon_last_sync: lastSync, operon_last_sync_result: data });
  return { ...data, lastSync };
}
