// Content script for Meta Ads Manager
// Scrapes campaign metrics from the Ads Manager table UI

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

  // Get column positions from table headers
  const headerEls = Array.from(
    document.querySelectorAll("thead th, [role='columnheader']")
  );
  const headers = headerEls.map((th) => th.textContent.trim().toLowerCase());

  // All data rows (tbody or aria rows)
  const rows = document.querySelectorAll(
    "tbody tr, [role='row']:not([role='columnheader'])"
  );

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td, [role='cell']"));
    if (cells.length < 2) return;

    const campaign = {};

    // Campaign name — first cell, prefer anchor or named element
    const firstCell = cells[0];
    const nameEl =
      firstCell.querySelector("a") ??
      firstCell.querySelector("[data-testid*='name']") ??
      firstCell;
    campaign.name = (nameEl.textContent ?? "").trim().replace(/\s+/g, " ");
    if (!campaign.name) return;

    // Header-based column extraction
    if (headers.length > 0) {
      headers.forEach((header, i) => {
        if (i >= cells.length) return;
        const val = parseNumber(cells[i]?.textContent ?? "");
        if (val === null) return;

        if (header.includes("impression")) campaign.impressions = val;
        if (
          (header.includes("link click") ||
            header === "clicks (all)" ||
            header === "clicks") &&
          !header.includes("ctr")
        )
          campaign.clicks = val;
        if (
          header === "cpc (all)" ||
          header === "cpc" ||
          header.includes("cost per click")
        )
          campaign.cpc = val;
        if (header === "ctr (all)" || header === "ctr") campaign.ctr = val;
        if (
          (header.includes("purchase") || header.includes("result")) &&
          !header.includes("cost") &&
          !header.includes("roas") &&
          !header.includes("value") &&
          !campaign.purchases
        )
          campaign.purchases = val;
        if (
          header.includes("purchase roas") ||
          header.includes("return on ad spend") ||
          header === "roas"
        )
          campaign.roas = val;
        if (header.includes("amount spent") || header === "spend")
          campaign.spend = val;
        if (
          (header.includes("purchase") && header.includes("value")) ||
          header.includes("conversion value") ||
          header.includes("purchase conversion value")
        )
          campaign.revenue = val;
      });
    }

    // Fallback: data-testid attributes on individual cells
    cells.forEach((cell) => {
      const key = (cell.getAttribute("data-testid") ?? "").toLowerCase();
      const val = parseNumber(cell.textContent);
      if (val === null) return;

      if (key.includes("impressions") && !campaign.impressions)
        campaign.impressions = val;
      if (
        key.includes("clicks") &&
        !key.includes("ctr") &&
        !campaign.clicks
      )
        campaign.clicks = val;
      if (key.includes("cpc") && !campaign.cpc) campaign.cpc = val;
      if (key.includes("ctr") && !campaign.ctr) campaign.ctr = val;
      if (
        key.includes("purchase") &&
        !key.includes("roas") &&
        !key.includes("value") &&
        !campaign.purchases
      )
        campaign.purchases = val;
      if (
        (key.includes("revenue") ||
          key.includes("purchase_roas") ||
          key.includes("roas")) &&
        !campaign.roas
      )
        campaign.roas = val;
    });

    // Include only rows with at least some real ad data
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
