import { analysisInputSchema, type AnalysisInput } from "../../lib/analysis-schema";

type AnalysisPayload = AnalysisInput;

type CsvRecord = Record<string, string>;

type ImportPreview = {
  rowNumber: number;
  sourceName: string;
  spend: number;
  roas: number;
  payload: AnalysisPayload;
};

const HEADER_ALIASES: Record<string, string[]> = {
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

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[$€£₽]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: string | undefined) {
  if (!value) return 0;
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/[%$€£₽]/g, "")
    .replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function pick(record: CsvRecord, normalizedHeaders: Map<string, string>, field: keyof typeof HEADER_ALIASES) {
  for (const alias of HEADER_ALIASES[field]) {
    const exact = normalizedHeaders.get(normalizeHeader(alias));
    if (exact && record[exact] !== undefined) return record[exact];
  }

  for (const [normalized, original] of normalizedHeaders.entries()) {
    if (HEADER_ALIASES[field].some((alias) => normalized.includes(normalizeHeader(alias)))) {
      return record[original];
    }
  }

  return undefined;
}

function detectDelimiter(line: string) {
  const options = [",", "\t", ";"];
  return options
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    const record: CsvRecord = {};
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex] ?? "";
    });
    return { record, rowNumber: index + 2, headers };
  });
}

function recordToPayload(record: CsvRecord, headers: string[]): ImportPreview | null {
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

  if (impressions <= 0 && clicks <= 0 && spend <= 0) return null;

  const payload = analysisInputSchema.parse({
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

export function parseMetaAdsCsv(csv: string, limit = 5) {
  return parseCsv(csv)
    .map(({ record, rowNumber, headers }) => {
      const preview = recordToPayload(record, headers);
      return preview ? { ...preview, rowNumber } : null;
    })
    .filter((item): item is ImportPreview => Boolean(item))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);
}
