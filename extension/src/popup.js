const pageKind = document.querySelector("#page-kind");
const currentHost = document.querySelector("#current-host");
const scriptStatus = document.querySelector("#script-status");
const statusMessage = document.querySelector("#status-message");
const scanButton = document.querySelector("#scan-button");
const syncButton = document.querySelector("#sync-button");
const openDashboardButton = document.querySelector("#open-dashboard-button");
const extensionKeyInput = document.querySelector("#extension-key-input");
const accountNameInput = document.querySelector("#account-name-input");
const apiBaseInput = document.querySelector("#api-base-input");

const DEFAULT_API_BASE = "https://operons.vercel.app/api";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(text) {
  statusMessage.textContent = text;
}

async function loadSettings() {
  const settings = await chrome.storage.local.get([
    "operon_extension_key",
    "operon_api_base",
    "operon_account_name",
    "operon_last_sync",
  ]);
  extensionKeyInput.value = settings.operon_extension_key || "";
  accountNameInput.value = settings.operon_account_name || "";
  apiBaseInput.value = settings.operon_api_base || DEFAULT_API_BASE;
  if (settings.operon_last_sync) {
    setStatus(`Last sync: ${new Date(settings.operon_last_sync).toLocaleString()}`);
  }
}

async function saveSettings() {
  await chrome.storage.local.set({
    operon_extension_key: extensionKeyInput.value.trim(),
    operon_account_name: accountNameInput.value.trim(),
    operon_api_base: apiBaseInput.value.trim() || DEFAULT_API_BASE,
  });
}

async function scanPage() {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) {
    setStatus("No active tab found.");
    return;
  }

  currentHost.textContent = new URL(tab.url).hostname;

  chrome.tabs.sendMessage(tab.id, { type: "OPERON_SCAN_PAGE" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      scriptStatus.textContent = "Unavailable";
      pageKind.textContent = "Unsupported";
      setStatus("Open Meta Ads, TikTok Ads, or Shopify, then scan again.");
      return;
    }

    scriptStatus.textContent = "Ready";
    pageKind.textContent = response.page.kind;
    setStatus(`Detected ${response.page.kind} page. Ready to sync visible metrics.`);
  });
}

async function syncPage() {
  await saveSettings();
  syncButton.disabled = true;
  syncButton.textContent = "Syncing...";

  chrome.runtime.sendMessage({ type: "OPERON_SYNC_ACTIVE_PAGE" }, (response) => {
    syncButton.disabled = false;
    syncButton.textContent = "Sync data";

    if (chrome.runtime.lastError || !response?.ok) {
      setStatus(response?.message || "Unable to sync this page.");
      return;
    }

    const count = response.result?.count ?? 0;
    setStatus(`Synced ${count} metric snapshot${count === 1 ? "" : "s"} to Operon.`);
  });
}

scanButton.addEventListener("click", scanPage);
syncButton.addEventListener("click", syncPage);
openDashboardButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPERON_OPEN_DASHBOARD" });
});

loadSettings().then(scanPage).catch(() => {
  scriptStatus.textContent = "Unavailable";
  setStatus("Unable to inspect this tab.");
});
