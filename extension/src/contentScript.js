function detectPageKind(hostname) {
  if (hostname.includes("facebook.com")) return "meta";
  if (hostname.includes("tiktok.com")) return "tiktok";
  if (hostname.includes("shopify.com") || hostname.includes("myshopify.com")) {
    return "shopify";
  }
  return "unknown";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPERON_SCAN_PAGE") {
    const page = getPageInfo();

    sendResponse({ ok: true, page });
    return true;
  }

  if (message?.type === "OPERON_SCRAPE_METRICS") {
    const page = getPageInfo();
    const provider = providerFromKind(page.kind);
    if (!provider) {
      sendResponse({ ok: false, provider: null, metrics: [], page });
      return true;
    }

    const rows = scrapeVisibleRows(page.kind);

    sendResponse({
      ok: true,
      provider,
      accountName: document.title || window.location.hostname,
      metrics: rows.map((row, index) => normalizeMetric(provider, row, index)),
      page,
    });
    return true;
  }

  return false;
});

function getPageInfo() {
  return {
    kind: detectPageKind(window.location.hostname),
    title: document.title,
    url: window.location.href,
    hostname: window.location.hostname,
  };
}

function providerFromKind(kind) {
  if (kind === "meta") return "META";
  if (kind === "tiktok") return "TIKTOK";
  if (kind === "shopify") return "SHOPIFY";
  return null;
}

function scrapeVisibleRows(kind) {
  if (kind === "shopify") return scrapeShopify();
  return scrapeAdTable(kind);
}

function scrapeAdTable(kind) {
  const rows = Array.from(document.querySelectorAll("tbody tr, [role='row']:not([role='columnheader'])"));
  const headers = Array.from(document.querySelectorAll("thead th, [role='columnheader'], [class*='table-header'] [class*='cell']"))
    .map((node) => (node.textContent || "").trim().toLowerCase());

  return rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("td, [role='cell'], [class*='cell']"));
    if (cells.length < 2) return null;

    const metric = {
      name: (cells[0].textContent || `${kind} creative`).trim().replace(/\s+/g, " "),
    };

    headers.forEach((header, index) => {
      const value = parseNumber(cells[index]?.textContent || "");
      if (value === null) return;
      if (header.includes("impression")) metric.impressions = value;
      if ((header.includes("click") || header === "clicks") && !header.includes("ctr") && !header.includes("cost")) metric.clicks = value;
      if (header === "ctr" || header.includes("click-through")) metric.ctr = value;
      if (header === "cpc" || header.includes("cost per click")) metric.cpc = value;
      if (header.includes("spend") || header.includes("amount spent") || header.includes("total cost")) metric.spend = value;
      if ((header.includes("purchase") || header.includes("conversion") || header === "results") && !header.includes("cost")) metric.purchases = value;
      if (header.includes("revenue") || header.includes("value")) metric.revenue = value;
      if (header.includes("frequency")) metric.frequency = value;
    });

    if (!metric.impressions && !metric.clicks && !metric.spend && !metric.purchases) return null;
    return metric;
  }).filter(Boolean).slice(0, 50);
}

function scrapeShopify() {
  const text = document.body?.innerText || "";
  const rows = Array.from(document.querySelectorAll("tbody tr, [role='row']"));
  let purchases = 0;
  let revenue = 0;

  rows.forEach((row) => {
    const rowText = (row.textContent || "").replace(/\s+/g, " ").trim();
    if (!/order|paid|fulfilled|заказ|оплачен/i.test(rowText)) return;
    const values = extractMoneyValues(rowText);
    if (values.length === 0) return;
    purchases += 1;
    revenue += Math.max(...values);
  });

  if (!purchases && !revenue) {
    revenue = extractMoneyValues(text).slice(0, 6).reduce((sum, value) => sum + value, 0);
  }

  return [{
    name: document.title || window.location.hostname,
    externalEntityId: `shopify-${window.location.hostname}`,
    purchases,
    revenue: Math.round(revenue * 100) / 100,
  }].filter((row) => row.purchases || row.revenue);
}

function normalizeMetric(provider, row, index) {
  const purchases = Number(row.purchases || 0);
  const revenue = Number(row.revenue || 0);
  const name = row.name || `${provider} creative ${index + 1}`;

  return {
    externalEntityId: row.externalEntityId || `${provider.toLowerCase()}-${slug(name)}-${index}`,
    entityName: name,
    date: new Date().toISOString().slice(0, 10),
    spend: Number(row.spend || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    add_to_cart: Number(row.add_to_cart || 0),
    purchases,
    revenue,
    frequency: Number(row.frequency || 0),
    product_price: purchases ? revenue / purchases : 0,
    cost: Number(row.cost || 0),
    source: { ...row, provider, capturedBy: "operon-lens", capturedAt: new Date().toISOString() },
  };
}

function parseNumber(value) {
  const cleaned = String(value || "")
    .replace(/[^\d,.\-]/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const number = Number.parseFloat(cleaned);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function extractMoneyValues(text) {
  return (text.match(/(?:[$€£₽]\s?[\d\s,.]+|[\d\s,.]+\s?(?:USD|EUR|GBP|RUB|₽))/gi) || [])
    .map((value) => Number.parseFloat(value.replace(/[^\d,.\s]/g, "").replace(/\s+/g, "").replace(/,(\d{2})$/, ".$1").replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function slug(value) {
  return String(value || "creative")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "creative";
}
