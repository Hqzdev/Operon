import benchmarkData from "./benchmarks.json";

export type BenchmarkNiche = "beauty" | "fashion" | "electronics" | "fitness" | "home_goods";
export type BenchmarkPlatform = "META" | "TIKTOK" | "SHOPIFY" | "UNKNOWN";
export type BenchmarkMetric = "ctr" | "cpc" | "cpm" | "cpa" | "roas";
export type BenchmarkTone = "green" | "yellow" | "red";

type Range = {
  low: number;
  avg: number;
  high: number;
  label: "estimated" | "community avg";
};

type BenchmarkResult = {
  metric: BenchmarkMetric;
  value: number;
  benchmark: number;
  deltaPct: number;
  tone: BenchmarkTone;
  copy: string;
  label: Range["label"];
};

const NICHE_LABELS: Record<BenchmarkNiche, string> = {
  beauty: "beauty",
  fashion: "fashion",
  electronics: "electronics",
  fitness: "fitness",
  home_goods: "home goods",
};

const CTR = benchmarkData.ctr as unknown as Record<BenchmarkNiche, Range>;
const CPC = benchmarkData.cpc as unknown as Record<BenchmarkNiche, Partial<Record<BenchmarkPlatform, Range>>>;
const CPM = benchmarkData.cpm as unknown as Partial<Record<BenchmarkPlatform, Range>>;
const CPA = benchmarkData.cpa as unknown as Record<BenchmarkNiche, Range>;
const ROAS = benchmarkData.roas as unknown as Record<BenchmarkNiche, Range>;

export const BENCHMARK_NICHES = Object.keys(NICHE_LABELS) as BenchmarkNiche[];

export function nicheLabel(niche: BenchmarkNiche) {
  return NICHE_LABELS[niche];
}

export function normalizeNiche(value?: string | null): BenchmarkNiche {
  const normalized = (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (normalized.includes("beauty") || normalized.includes("cosmetic") || normalized.includes("skin")) return "beauty";
  if (normalized.includes("fashion") || normalized.includes("apparel") || normalized.includes("clothing")) return "fashion";
  if (normalized.includes("electronic") || normalized.includes("gadget") || normalized.includes("tech")) return "electronics";
  if (normalized.includes("fitness") || normalized.includes("sport") || normalized.includes("wellness")) return "fitness";
  if (normalized.includes("home") || normalized.includes("furniture") || normalized.includes("decor")) return "home_goods";
  return BENCHMARK_NICHES.includes(normalized as BenchmarkNiche) ? normalized as BenchmarkNiche : "fashion";
}

function compareHigherIsBetter(value: number, range: Range): BenchmarkTone {
  const delta = ((value - range.avg) / range.avg) * 100;
  if (delta >= -10) return delta >= 10 ? "green" : "yellow";
  return "red";
}

function compareLowerIsBetter(value: number, range: Range): BenchmarkTone {
  const delta = ((value - range.avg) / range.avg) * 100;
  if (delta <= 10) return delta <= -10 ? "green" : "yellow";
  return "red";
}

function result(metric: BenchmarkMetric, value: number, range: Range, tone: BenchmarkTone, copy: string): BenchmarkResult {
  return {
    metric,
    value,
    benchmark: range.avg,
    deltaPct: Number((((value - range.avg) / range.avg) * 100).toFixed(0)),
    tone,
    copy,
    label: range.label,
  };
}

export function getBenchmarks(input: {
  niche?: string | null;
  platform?: string | null;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpa?: number;
  roas?: number;
}): BenchmarkResult[] {
  const niche = normalizeNiche(input.niche);
  const platform = ((input.platform ?? "META").toUpperCase() as BenchmarkPlatform) || "META";
  const rows: BenchmarkResult[] = [];

  if (typeof input.ctr === "number") {
    const range = CTR[niche];
    rows.push(result("ctr", input.ctr, range, compareHigherIsBetter(input.ctr, range), `CTR ${input.ctr.toFixed(1)}% vs ${NICHE_LABELS[niche]} avg ${range.avg}%`));
  }
  if (typeof input.cpc === "number") {
    const range = CPC[niche][platform] ?? CPC[niche].META!;
    rows.push(result("cpc", input.cpc, range, compareLowerIsBetter(input.cpc, range), `CPC is ${Math.abs((((input.cpc - range.avg) / range.avg) * 100)).toFixed(0)}% ${input.cpc > range.avg ? "above" : "below"} similar stores`));
  }
  if (typeof input.cpm === "number") {
    const range = CPM[platform] ?? CPM.META!;
    rows.push(result("cpm", input.cpm, range, compareLowerIsBetter(input.cpm, range), `CPM is compared with ${platform} community avg $${range.avg}`));
  }
  if (typeof input.cpa === "number") {
    const range = CPA[niche];
    rows.push(result("cpa", input.cpa, range, compareLowerIsBetter(input.cpa, range), `CPA vs ${NICHE_LABELS[niche]} avg $${range.avg}`));
  }
  if (typeof input.roas === "number") {
    const range = ROAS[niche];
    rows.push(result("roas", input.roas, range, compareHigherIsBetter(input.roas, range), `ROAS vs ${NICHE_LABELS[niche]} avg ${range.avg}x`));
  }

  return rows;
}
