"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMetaAdsCsv = parseMetaAdsCsv;
const analysis_schema_1 = require("../../lib/analysis-schema");
const HEADER_ALIASES = {
    name: ["ad name", "ad set name", "adset name", "campaign name", "campaign"],
    spend: ["amount spent", "amount spent usd", "spend", "cost"],
    impressions: ["impressions"],
    clicks: ["link clicks", "clicks", "outbound clicks", "inline link clicks"],
    ctr: ["ctr", "link ctr", "ctr link click through rate", "click through rate"],
    cpc: ["cpc", "cost per click", "cost per link click", "cpc cost per link click"],
    cpm: ["cpm", "cost per 1 000 impressions", "cost per 1000 impressions"],
    add_to_cart: ["adds to cart", "add to cart", "website adds to cart", "omni add to cart"],
    purchases: ["purchases", "website purchases", "omni purchases", "purchase"],
    revenue: ["purchase conversion value", "website purchase conversion value", "conversion value", "revenue"],
};
function normalizeHeader(value) {
    return value
        .toLowerCase()
        .replace(/[$€£₽]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function parseNumber(value) {
    if (!value)
        return 0;
    const cleaned = value
        .replace(/\s/g, "")
        .replace(/[%$€£₽]/g, "")
        .replace(/,/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}
function round(value, precision = 2) {
    return Number(value.toFixed(precision));
}
function pick(record, normalizedHeaders, field) {
    for (const alias of HEADER_ALIASES[field]) {
        const exact = normalizedHeaders.get(normalizeHeader(alias));
        if (exact && record[exact] !== undefined)
            return record[exact];
    }
    for (const [normalized, original] of normalizedHeaders.entries()) {
        if (HEADER_ALIASES[field].some((alias) => normalized.includes(normalizeHeader(alias)))) {
            return record[original];
        }
    }
    return undefined;
}
function detectDelimiter(line) {
    const options = [",", "\t", ";"];
    return options
        .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
        .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}
function parseCsvLine(line, delimiter) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];
        if (char === '"' && quoted && next === '"') {
            current += '"';
            index += 1;
        }
        else if (char === '"') {
            quoted = !quoted;
        }
        else if (char === delimiter && !quoted) {
            cells.push(current.trim());
            current = "";
        }
        else {
            current += char;
        }
    }
    cells.push(current.trim());
    return cells;
}
function parseCsv(csv) {
    const lines = csv
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length < 2)
        return [];
    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCsvLine(lines[0], delimiter).map((header) => header.replace(/^"|"$/g, "").trim());
    return lines.slice(1).map((line, index) => {
        const cells = parseCsvLine(line, delimiter);
        const record = {};
        headers.forEach((header, cellIndex) => {
            record[header] = cells[cellIndex] ?? "";
        });
        return { record, rowNumber: index + 2, headers };
    });
}
function recordToPayload(record, headers) {
    const normalizedHeaders = new Map(headers.map((header) => [normalizeHeader(header), header]));
    const sourceName = pick(record, normalizedHeaders, "name")?.trim() || "Meta Ads import";
    const spend = parseNumber(pick(record, normalizedHeaders, "spend"));
    const impressions = Math.round(parseNumber(pick(record, normalizedHeaders, "impressions")));
    const clicks = Math.round(parseNumber(pick(record, normalizedHeaders, "clicks")));
    const purchases = Math.round(parseNumber(pick(record, normalizedHeaders, "purchases")));
    const revenue = parseNumber(pick(record, normalizedHeaders, "revenue"));
    const addToCart = Math.round(parseNumber(pick(record, normalizedHeaders, "add_to_cart")));
    const ctr = parseNumber(pick(record, normalizedHeaders, "ctr")) || (impressions > 0 ? (clicks / impressions) * 100 : 0);
    const cpc = parseNumber(pick(record, normalizedHeaders, "cpc")) || (clicks > 0 ? spend / clicks : 0);
    const cpm = parseNumber(pick(record, normalizedHeaders, "cpm")) || (impressions > 0 ? (spend / impressions) * 1000 : 0);
    const productPrice = purchases > 0 && revenue > 0 ? revenue / purchases : Math.max(revenue, 1);
    if (impressions <= 0 && clicks <= 0 && spend <= 0)
        return null;
    const payload = analysis_schema_1.analysisInputSchema.parse({
        product_name: sourceName.slice(0, 120),
        product_description: `Imported from Meta Ads CSV row for ${sourceName}.`,
        product_price: round(productPrice || 1),
        cost: 0,
        ctr: round(ctr),
        cpc: round(cpc),
        cpm: round(cpm),
        impressions,
        clicks,
        add_to_cart: addToCart,
        purchases,
        revenue: round(revenue),
        return_rate: 0,
        total_spend: round(spend || cpc * clicks),
        days_active: 1,
        stage: "testing",
    });
    return {
        rowNumber: 0,
        sourceName,
        spend: round(spend || payload.cpc * payload.clicks),
        roas: spend > 0 ? round(revenue / spend) : 0,
        payload,
    };
}
function parseMetaAdsCsv(csv, limit = 5) {
    return parseCsv(csv)
        .map(({ record, rowNumber, headers }) => {
        const preview = recordToPayload(record, headers);
        return preview ? { ...preview, rowNumber } : null;
    })
        .filter((item) => Boolean(item))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, limit);
}
