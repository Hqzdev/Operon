const pageKind = document.querySelector("#page-kind");
const currentHost = document.querySelector("#current-host");
const scriptStatus = document.querySelector("#script-status");
const statusMessage = document.querySelector("#status-message");
const scanButton = document.querySelector("#scan-button");
const openDashboardButton = document.querySelector("#open-dashboard-button");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(text) {
  statusMessage.textContent = text;
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
    setStatus(`Detected ${response.page.kind} page. Metric parsing comes next.`);
  });
}

scanButton.addEventListener("click", scanPage);
openDashboardButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPERON_OPEN_DASHBOARD" });
});

scanPage().catch(() => {
  scriptStatus.textContent = "Unavailable";
  setStatus("Unable to inspect this tab.");
});
