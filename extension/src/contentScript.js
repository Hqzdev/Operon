function detectPageKind(hostname) {
  if (hostname.includes("facebook.com")) return "meta";
  if (hostname.includes("tiktok.com")) return "tiktok";
  if (hostname.includes("shopify.com") || hostname.includes("myshopify.com")) {
    return "shopify";
  }
  return "unknown";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPERON_SCAN_PAGE") return false;

  const page = {
    kind: detectPageKind(window.location.hostname),
    title: document.title,
    url: window.location.href,
    hostname: window.location.hostname,
  };

  sendResponse({ ok: true, page });
  return true;
});
