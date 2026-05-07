// Content script for Meta Ads Manager
// Scrapes campaign metrics from the Ads Manager table UI

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "SCRAPE_METRICS") return;

  try {
    const metrics = scrapeMeta();
    sendResponse({ metrics });
  } catch {
    sendResponse({ metrics: null });
  }

  return true;
});

function scrapeMeta() {
  const metrics = {};

  // Campaign/adset name — first selected row or page title
  const nameEl =
    document.querySelector("[data-testid='campaign-name']") ??
    document.querySelector(".x1n2onr6 .x193iq5w") ??
    document.querySelector("h1");
  if (nameEl) metrics.name = nameEl.textContent.trim();

  // Try to read table cells — Meta Ads Manager uses data-testid attributes
  const cells = document.querySelectorAll("[data-testid]");
  cells.forEach((cell) => {
    const key = cell.getAttribute("data-testid") ?? "";
    const val = parseNumber(cell.textContent);

    if (key.includes("impressions") && val) metrics.impressions = val;
    if (key.includes("clicks") && val)      metrics.clicks = val;
    if (key.includes("cpc") && val)         metrics.cpc = val;
    if (key.includes("ctr") && val)         metrics.ctr = val;
    if (key.includes("purchase") && val)    metrics.purchases = val;
    if (key.includes("revenue") || key.includes("purchase_roas")) {
      if (val) metrics.revenue = val;
    }
  });

  // Fallback: scan table rows for column-header aligned values
  if (!metrics.impressions) {
    scrapeTableByHeaders(metrics);
  }

  return Object.keys(metrics).length > 1 ? metrics : null;
}

function scrapeTableByHeaders() {
  const headers = Array.from(document.querySelectorAll("th")).map((th) =>
    th.textContent.trim().toLowerCase()
  );

  const rows = document.querySelectorAll("tr");
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td")).map((td) =>
      td.textContent.trim()
    );
    if (cells.length === 0) return;

    headers.forEach((header, i) => {
      const val = parseNumber(cells[i] ?? "");
      if (!val) return;

      if (header.includes("impression")) window._operonMetrics = { ...window._operonMetrics, impressions: val };
      if (header.includes("click") && !header.includes("ctr")) window._operonMetrics = { ...window._operonMetrics, clicks: val };
      if (header === "cpc") window._operonMetrics = { ...window._operonMetrics, cpc: val };
      if (header === "ctr") window._operonMetrics = { ...window._operonMetrics, ctr: val };
    });
  });

  return window._operonMetrics ?? {};
}

function parseNumber(str) {
  const cleaned = str.replace(/[$,%\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isFinite(num) && num >= 0 ? num : null;
}
