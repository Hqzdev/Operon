const OPERON_DASHBOARD_URL = "http://localhost:3000/dashboard";

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

  return false;
});
