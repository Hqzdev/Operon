// Content script for Shopify Admin.
// Captures a lightweight store/day revenue snapshot from visible order tables.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SCRAPE_METRICS") {
    try {
      const metrics = scrapeShopifyMetrics();
      sendResponse({ provider: "SHOPIFY", accountName: getAccountName(), metrics: metrics[0] ?? null });
    } catch {
      sendResponse({ provider: "SHOPIFY", metrics: null });
    }
    return true;
  }

  if (msg.type === "SCRAPE_ALL") {
    try {
      sendResponse({
        provider: "SHOPIFY",
        accountName: getAccountName(),
        campaigns: scrapeShopifyMetrics(),
      });
    } catch {
      sendResponse({ provider: "SHOPIFY", campaigns: [] });
    }
    return true;
  }
});

function scrapeShopifyMetrics() {
  const rows = Array.from(document.querySelectorAll("tbody tr, [role='row']"));
  let purchases = 0;
  let revenue = 0;

  rows.forEach((row) => {
    const text = (row.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || !hasOrderSignal(text)) return;

    const moneyValues = extractMoneyValues(text);
    if (moneyValues.length === 0) return;

    purchases += 1;
    revenue += Math.max(...moneyValues);
  });

  if (purchases === 0 || revenue === 0) {
    const pageText = document.body?.innerText || "";
    purchases = parseLabeledNumber(pageText, /(orders?|заказ[а-я]*)/i) || 0;
    revenue = extractMoneyValues(pageText).slice(0, 6).reduce((sum, value) => sum + value, 0);
  }

  return [
    {
      externalEntityId: `shopify-${window.location.hostname}`,
      name: getAccountName(),
      purchases,
      revenue: roundMoney(revenue),
      sourcePage: window.location.href,
    },
  ].filter((metric) => metric.purchases || metric.revenue);
}

function getAccountName() {
  const host = window.location.hostname;
  const title = (document.title || "").replace(/\s+-\s+Shopify.*/i, "").trim();
  return title || host;
}

function hasOrderSignal(text) {
  return /paid|fulfilled|unfulfilled|order|заказ|оплачен/i.test(text);
}

function extractMoneyValues(text) {
  const matches = text.match(/(?:[$€£₽]\s?[\d\s,.]+|[\d\s,.]+\s?(?:USD|EUR|GBP|RUB|₽))/gi) || [];
  return matches
    .map((value) => parseMoney(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function parseMoney(value) {
  const cleaned = String(value)
    .replace(/[^\d,.\s]/g, "")
    .replace(/\s+/g, "")
    .replace(/,(\d{2})$/, ".$1")
    .replace(/,/g, "");
  return Number.parseFloat(cleaned);
}

function parseLabeledNumber(text, labelPattern) {
  const match = text.match(new RegExp(`([\\d\\s,.]+)\\s*${labelPattern.source}`, "i"));
  if (!match) return null;
  return Number.parseInt(match[1].replace(/[^\d]/g, ""), 10);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
