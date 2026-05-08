// Content script for TikTok Ads Manager

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SCRAPE_METRICS") {
    try {
      const campaigns = scrapeAllCampaigns();
      sendResponse({ metrics: campaigns[0] ?? null });
    } catch {
      sendResponse({ metrics: null });
    }
    return true;
  }

  if (msg.type === "SCRAPE_ALL") {
    try {
      const campaigns = scrapeAllCampaigns();
      sendResponse({ campaigns });
    } catch {
      sendResponse({ campaigns: [] });
    }
    return true;
  }
});

function scrapeAllCampaigns() {
  const campaigns = [];

  // TikTok uses a virtual table — try multiple row selectors
  const rows = document.querySelectorAll(
    "[class*='table-row']:not([class*='header']), tbody tr"
  );

  // Header detection
  const headerEls = Array.from(
    document.querySelectorAll(
      "[class*='table-header'] [class*='cell'], thead th"
    )
  );
  const headers = headerEls.map((el) => el.textContent.trim().toLowerCase());

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("[class*='cell'], td"));
    if (cells.length < 2) return;

    const campaign = {};

    // Name — first cell, prefer anchor or named element
    const nameEl =
      cells[0].querySelector("a, [class*='name'], span") ?? cells[0];
    campaign.name = (nameEl.textContent ?? "").trim().replace(/\s+/g, " ");
    if (!campaign.name) return;

    // Header-based extraction
    if (headers.length > 0) {
      headers.forEach((header, i) => {
        if (i >= cells.length) return;
        const val = parseNumber(cells[i]?.textContent ?? "");
        if (val === null) return;

        if (header.includes("impression")) campaign.impressions = val;
        if (
          (header.includes("click") || header === "clicks") &&
          !header.includes("ctr") &&
          !header.includes("cost")
        )
          campaign.clicks = val;
        if (
          header === "cpc" ||
          header.includes("cost per click") ||
          header.includes("cost_per_click")
        )
          campaign.cpc = val;
        if (header === "ctr" || header.includes("click-through rate"))
          campaign.ctr = val;
        if (
          (header.includes("conversion") ||
            header.includes("purchase") ||
            header === "results") &&
          !header.includes("cost") &&
          !header.includes("value") &&
          !campaign.purchases
        )
          campaign.purchases = val;
        if (
          header.includes("cost_per_result") ||
          header.includes("cost per result")
        )
          campaign.cpr = val;
        if (
          header.includes("spend") ||
          header.includes("total cost") ||
          header.includes("amount spent")
        )
          campaign.spend = val;
        if (
          header.includes("revenue") ||
          header.includes("conversion value") ||
          (header.includes("value") && !header.includes("lifetime"))
        )
          campaign.revenue = val;
      });
    }

    // Fallback: data-key / aria-label on cells
    cells.forEach((cell) => {
      const label = (
        cell.getAttribute("data-key") ??
        cell.getAttribute("aria-label") ??
        ""
      ).toLowerCase();
      const val = parseNumber(cell.textContent);
      if (val === null) return;

      if (label.includes("impression") && !campaign.impressions)
        campaign.impressions = val;
      if (
        (label.includes("click") || label === "clicks") &&
        !label.includes("ctr") &&
        !label.includes("cost") &&
        !campaign.clicks
      )
        campaign.clicks = val;
      if (
        (label === "cpc" || label.includes("cost_per_click")) &&
        !campaign.cpc
      )
        campaign.cpc = val;
      if (label === "ctr" && !campaign.ctr) campaign.ctr = val;
      if (
        (label.includes("conversion") || label.includes("purchase")) &&
        !label.includes("cost") &&
        !campaign.purchases
      )
        campaign.purchases = val;
      if (
        (label.includes("revenue") || label.includes("value")) &&
        !campaign.revenue
      )
        campaign.revenue = val;
    });

    if (
      campaign.impressions ||
      campaign.clicks ||
      campaign.spend ||
      campaign.purchases
    ) {
      campaigns.push(campaign);
    }
  });

  return campaigns;
}

function parseNumber(str) {
  const cleaned = (str ?? "").replace(/[$,%\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isFinite(num) && num >= 0 ? num : null;
}
