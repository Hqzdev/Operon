// Content script for TikTok Ads Manager

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "SCRAPE_METRICS") return;

  try {
    const metrics = scrapeTikTok();
    sendResponse({ metrics });
  } catch {
    sendResponse({ metrics: null });
  }

  return true;
});

function scrapeTikTok() {
  const metrics = {};

  // Campaign name
  const nameEl =
    document.querySelector(".campaign-name") ??
    document.querySelector("[class*='campaign'] [class*='name']") ??
    document.querySelector("h1");
  if (nameEl) metrics.name = nameEl.textContent.trim();

  // TikTok Ads Manager renders a virtual table — try reading visible cells
  const rows = document.querySelectorAll("[class*='table-row'], tr");

  rows.forEach((row) => {
    const cols = Array.from(row.querySelectorAll("[class*='cell'], td"));
    cols.forEach((col) => {
      const label = (col.getAttribute("data-key") ?? col.getAttribute("aria-label") ?? "").toLowerCase();
      const val = parseNumber(col.textContent);
      if (!val) return;

      if (label.includes("impression")) metrics.impressions = val;
      if (label.includes("click") && !label.includes("ctr")) metrics.clicks = val;
      if (label === "cpc" || label.includes("cost_per_click")) metrics.cpc = val;
      if (label === "ctr") metrics.ctr = val;
      if (label.includes("conversion") || label.includes("purchase")) metrics.purchases = val;
      if (label.includes("revenue") || label.includes("value")) metrics.revenue = val;
    });
  });

  return Object.keys(metrics).length > 1 ? metrics : null;
}

function parseNumber(str) {
  const cleaned = str.replace(/[$,%\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isFinite(num) && num >= 0 ? num : null;
}
