import { prisma } from "../models/prisma";
import type { AnalysisPayload } from "./analysisService";

export const MIN_BENCHMARK_BUCKET_SIZE = 50;

export type CommunityBenchmark = {
  niche: string;
  country: string;
  sampleSize: number;
  medianCtr: number;
  medianCpc: number;
  medianCpm: number;
  medianAddToCartRate: number;
  medianPurchaseRate: number;
};

type BenchmarkRow = {
  niche: string;
  country: string;
  analysisCount: number;
  medianCtr: number;
  medianCpc: number;
  medianCpm: number;
  medianAddToCartRate: number;
  medianPurchaseRate: number;
};

function normalizeNiche(value?: string | null) {
  return (value ?? "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

function normalizeCountry(value?: string | null) {
  const normalized = (value ?? "GLOBAL").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || "GLOBAL";
}

export function normalizeBenchmarkBucket(input: { niche?: string | null; country?: string | null }) {
  return {
    niche: normalizeNiche(input.niche),
    country: normalizeCountry(input.country),
  };
}

function mapRow(row: BenchmarkRow): CommunityBenchmark {
  return {
    niche: row.niche,
    country: row.country,
    sampleSize: Number(row.analysisCount),
    medianCtr: Number(row.medianCtr),
    medianCpc: Number(row.medianCpc),
    medianCpm: Number(row.medianCpm),
    medianAddToCartRate: Number(row.medianAddToCartRate),
    medianPurchaseRate: Number(row.medianPurchaseRate),
  };
}

export async function getCommunityBenchmarkForInput(input: AnalysisPayload): Promise<CommunityBenchmark | null> {
  const bucket = normalizeBenchmarkBucket(input);
  const rows = await prisma.$queryRaw<BenchmarkRow[]>`
    SELECT
      "niche",
      "country",
      "analysisCount",
      "medianCtr",
      "medianCpc",
      "medianCpm",
      "medianAddToCartRate",
      "medianPurchaseRate"
    FROM "community_benchmarks"
    WHERE "niche" = ${bucket.niche}
      AND "country" = ${bucket.country}
      AND "analysisCount" >= ${MIN_BENCHMARK_BUCKET_SIZE}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export function benchmarkDelta(value: number, median: number) {
  if (median <= 0) return 0;
  return Math.round(((value - median) / median) * 100);
}

export function buildBenchmarkComparison(input: AnalysisPayload, benchmark: CommunityBenchmark | null) {
  if (!benchmark) return undefined;
  const addToCartRate = input.clicks > 0 ? (input.add_to_cart / input.clicks) * 100 : 0;
  const purchaseRate = input.clicks > 0 ? (input.purchases / input.clicks) * 100 : 0;

  return {
    niche: benchmark.niche,
    country: benchmark.country,
    sampleSize: benchmark.sampleSize,
    source: "community" as const,
    metrics: {
      ctr: { value: input.ctr, median: benchmark.medianCtr, deltaPct: benchmarkDelta(input.ctr, benchmark.medianCtr), unit: "%" as const },
      cpc: { value: input.cpc, median: benchmark.medianCpc, deltaPct: benchmarkDelta(input.cpc, benchmark.medianCpc), unit: "currency" as const },
      cpm: { value: input.cpm, median: benchmark.medianCpm, deltaPct: benchmarkDelta(input.cpm, benchmark.medianCpm), unit: "currency" as const },
      addToCartRate: {
        value: Number(addToCartRate.toFixed(2)),
        median: benchmark.medianAddToCartRate,
        deltaPct: benchmarkDelta(addToCartRate, benchmark.medianAddToCartRate),
        unit: "%" as const,
      },
      purchaseRate: {
        value: Number(purchaseRate.toFixed(2)),
        median: benchmark.medianPurchaseRate,
        deltaPct: benchmarkDelta(purchaseRate, benchmark.medianPurchaseRate),
        unit: "%" as const,
      },
    },
  };
}

export async function recomputeCommunityBenchmarks() {
  await prisma.$executeRaw`
    INSERT INTO "community_benchmarks" (
      "id", "niche", "country", "analysisCount", "medianCtr", "medianCpc", "medianCpm",
      "medianAddToCartRate", "medianPurchaseRate", "computedAt", "updatedAt"
    )
    SELECT
      'bench_' || md5(bucket."niche" || ':' || bucket."country"),
      bucket."niche",
      bucket."country",
      COUNT(*)::int AS "analysisCount",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY bucket."ctr") AS "medianCtr",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY bucket."cpc") AS "medianCpc",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY bucket."cpm") AS "medianCpm",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY bucket."addToCartRate") AS "medianAddToCartRate",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY bucket."purchaseRate") AS "medianPurchaseRate",
      ${new Date()},
      ${new Date()}
    FROM (
      SELECT
        COALESCE(NULLIF(regexp_replace(lower(("inputData"->>'niche')), '[^a-z0-9]+', '_', 'g'), ''), 'general') AS "niche",
        COALESCE(NULLIF(regexp_replace(upper(("inputData"->>'country')), '[^A-Z0-9]+', '', 'g'), ''), 'GLOBAL') AS "country",
        ("inputData"->>'ctr')::double precision AS "ctr",
        ("inputData"->>'cpc')::double precision AS "cpc",
        ("inputData"->>'cpm')::double precision AS "cpm",
        CASE
          WHEN ("inputData"->>'clicks')::double precision > 0
            THEN (("inputData"->>'add_to_cart')::double precision / ("inputData"->>'clicks')::double precision) * 100
          ELSE 0
        END AS "addToCartRate",
        CASE
          WHEN ("inputData"->>'clicks')::double precision > 0
            THEN (("inputData"->>'purchases')::double precision / ("inputData"->>'clicks')::double precision) * 100
          ELSE 0
        END AS "purchaseRate"
      FROM "Analysis"
      WHERE "inputData" ? 'ctr'
        AND "inputData" ? 'cpc'
        AND "inputData" ? 'cpm'
        AND "inputData" ? 'clicks'
        AND "inputData" ? 'add_to_cart'
        AND "inputData" ? 'purchases'
    ) bucket
    GROUP BY bucket."niche", bucket."country"
    HAVING COUNT(*) >= ${MIN_BENCHMARK_BUCKET_SIZE}
    ON CONFLICT ("niche", "country") DO UPDATE SET
      "analysisCount" = EXCLUDED."analysisCount",
      "medianCtr" = EXCLUDED."medianCtr",
      "medianCpc" = EXCLUDED."medianCpc",
      "medianCpm" = EXCLUDED."medianCpm",
      "medianAddToCartRate" = EXCLUDED."medianAddToCartRate",
      "medianPurchaseRate" = EXCLUDED."medianPurchaseRate",
      "computedAt" = EXCLUDED."computedAt",
      "updatedAt" = EXCLUDED."updatedAt"
  `;

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "community_benchmarks"
  `;
  return { buckets: Number(rows[0]?.count ?? 0), minimumBucketSize: MIN_BENCHMARK_BUCKET_SIZE };
}
