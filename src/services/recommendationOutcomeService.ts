import { randomUUID } from "node:crypto";
import { IntegrationProvider, type Prisma } from "@prisma/client";
import { analysisInputSchema } from "../../lib/analysis-schema";
import { prisma } from "../models/prisma";
import type { AnalysisPayload } from "./analysisService";
import type { AiAnalysisResult } from "./aiService";

type AnalysisResult = Omit<AiAnalysisResult, "provider"> & {
  provider: "gigachat" | "rules";
  saved: boolean;
  savedId?: string;
};

type OutcomeRow = {
  id: string;
  userId: string;
  analysisId: string;
  connectionId: string | null;
  provider: IntegrationProvider | null;
  externalAccountId: string | null;
  externalEntityId: string | null;
  entityName: string | null;
  inputSnapshot: Prisma.JsonValue;
  verdict: string;
  confidence: number | null;
  breakEvenRoas: number;
  breakEvenCpa: number | null;
  evaluationHorizonDays: number;
  scheduledFor: Date;
  issuedAt: Date;
};

type TrackRecordSummary = {
  accuracyPct: number | null;
  evaluatedCount: number;
  pendingCount: number;
  moneySaved: number;
  moneyEarned: number;
  calibrationAdjustment: number;
  recent: Array<{
    id: string;
    verdict: string;
    confidence: number | null;
    horizonDays: number;
    wasRight: boolean | null;
    status: string;
    moneySaved: number;
    moneyEarned: number;
    issuedAt: string;
    evaluatedAt: string | null;
    entityName: string | null;
  }>;
};

type RecentOutcomeRow = {
  id: string;
  verdict: string;
  confidence: number | null;
  horizonDays: number;
  wasRight: boolean | null;
  status: string;
  moneySaved: number;
  moneyEarned: number;
  issuedAt: Date;
  evaluatedAt: Date | null;
  entityName: string | null;
};

const HORIZONS = [7, 14, 30] as const;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

async function findMatchingSnapshot(userId: string, payload: AnalysisPayload) {
  const snapshots = await prisma.integrationMetricSnapshot.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: 75,
    select: {
      connectionId: true,
      provider: true,
      externalAccountId: true,
      externalEntityId: true,
      entityName: true,
      analysisInput: true,
      date: true,
    },
  });

  const productName = normalize(payload.product_name);
  return snapshots.find((snapshot) => {
    const entityName = normalize(snapshot.entityName);
    const externalEntityId = normalize(snapshot.externalEntityId);
    const parsed = analysisInputSchema.safeParse(snapshot.analysisInput);
    const snapshotProductName = parsed.success ? normalize(parsed.data.product_name) : "";
    return Boolean(productName) && (
      entityName === productName ||
      externalEntityId === productName ||
      snapshotProductName === productName
    );
  }) ?? snapshots[0] ?? null;
}

export async function recordRecommendationOutcomes(
  userId: string,
  analysisId: string,
  payload: AnalysisPayload,
  result: AnalysisResult,
  issuedAt = new Date(),
) {
  const snapshot = await findMatchingSnapshot(userId, payload);
  const confidence =
    typeof result.decision.confidenceScore === "number"
      ? result.decision.confidenceScore
      : result.decision.confidence === "high"
        ? 85
        : result.decision.confidence === "medium"
          ? 65
          : 35;
  const inputJson = JSON.stringify(payload);

  for (const horizon of HORIZONS) {
    await prisma.$executeRaw`
      INSERT INTO "RecommendationOutcome" (
        "id",
        "userId",
        "analysisId",
        "connectionId",
        "provider",
        "externalAccountId",
        "externalEntityId",
        "entityName",
        "inputSnapshot",
        "verdict",
        "confidence",
        "breakEvenRoas",
        "breakEvenCpa",
        "evaluationHorizonDays",
        "scheduledFor",
        "issuedAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${analysisId},
        ${snapshot?.connectionId ?? null},
        ${snapshot?.provider ?? null}::"IntegrationProvider",
        ${snapshot?.externalAccountId ?? null},
        ${snapshot?.externalEntityId ?? null},
        ${snapshot?.entityName ?? payload.product_name ?? null},
        ${inputJson}::jsonb,
        ${result.decision.finalDecision},
        ${confidence},
        ${result.derived.breakEvenRoas},
        ${result.derived.breakEvenCpa},
        ${horizon},
        ${addDays(issuedAt, horizon)},
        ${issuedAt},
        ${new Date()}
      )
      ON CONFLICT ("analysisId", "evaluationHorizonDays") DO NOTHING
    `;
  }
}

function summarizeActuals(inputs: AnalysisPayload[], breakEvenRoas: number) {
  const spend = inputs.reduce((sum, input) => sum + input.cpc * input.clicks, 0);
  const revenue = inputs.reduce((sum, input) => sum + input.revenue, 0);
  const purchases = inputs.reduce((sum, input) => sum + input.purchases, 0);
  const clicks = inputs.reduce((sum, input) => sum + input.clicks, 0);
  const impressions = inputs.reduce((sum, input) => sum + input.impressions, 0);
  const cost = inputs.reduce((sum, input) => sum + input.cost * input.purchases, 0);
  const profit = revenue - spend - cost;
  const roas = spend > 0 ? revenue / spend : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;
  const wastedSpend = Math.max(0, spend - (breakEvenRoas > 0 ? revenue / breakEvenRoas : revenue));

  return {
    spend: round(spend),
    revenue: round(revenue),
    purchases,
    clicks,
    impressions,
    profit: round(profit),
    roas: round(roas),
    ctr: round(ctr),
    conversionRate: round(conversionRate),
    wastedSpend: round(wastedSpend),
  };
}

function judgeOutcome(verdict: string, actual: ReturnType<typeof summarizeActuals>, breakEvenRoas: number) {
  if (verdict === "KILL") {
    return {
      wasRight: actual.roas < breakEvenRoas || actual.profit < 0,
      moneySaved: actual.roas < breakEvenRoas ? actual.wastedSpend : 0,
      moneyEarned: 0,
    };
  }

  if (verdict === "SCALE") {
    return {
      wasRight: actual.roas >= breakEvenRoas && actual.profit > 0,
      moneySaved: 0,
      moneyEarned: actual.roas >= breakEvenRoas ? Math.max(0, actual.profit) : 0,
    };
  }

  if (verdict === "FIX") {
    const stillWeak = actual.roas < breakEvenRoas || actual.ctr < 1;
    return {
      wasRight: stillWeak,
      moneySaved: stillWeak ? Math.max(0, actual.wastedSpend) : 0,
      moneyEarned: 0,
    };
  }

  const clearlyBad = actual.roas < breakEvenRoas * 0.6 && actual.spend > 0;
  const clearlyGood = actual.roas >= breakEvenRoas * 1.25 && actual.profit > 0;
  return {
    wasRight: !clearlyBad && !clearlyGood,
    moneySaved: 0,
    moneyEarned: 0,
  };
}

export async function recomputeDueRecommendationOutcomes(limit = 100) {
  const due = await prisma.$queryRaw<OutcomeRow[]>`
    SELECT *
    FROM "RecommendationOutcome"
    WHERE "status" = 'pending'::"RecommendationOutcomeStatus"
      AND "scheduledFor" <= ${new Date()}
    ORDER BY "scheduledFor" ASC
    LIMIT ${limit}
  `;

  let evaluated = 0;
  let unavailable = 0;

  for (const outcome of due) {
    if (!outcome.connectionId || !outcome.externalEntityId) {
      await markUnavailable(outcome.id);
      unavailable += 1;
      continue;
    }

    const end = addDays(outcome.issuedAt, outcome.evaluationHorizonDays);
    const snapshots = await prisma.integrationMetricSnapshot.findMany({
      where: {
        connectionId: outcome.connectionId,
        externalEntityId: outcome.externalEntityId,
        date: { gte: outcome.issuedAt, lte: end },
      },
      select: { analysisInput: true },
      orderBy: { date: "asc" },
    });

    const inputs: AnalysisPayload[] = [];
    for (const snapshot of snapshots) {
      const parsed = analysisInputSchema.safeParse(snapshot.analysisInput);
      if (parsed.success) inputs.push(parsed.data);
    }

    if (!inputs.length) {
      if (Date.now() > outcome.scheduledFor.getTime() + 3 * 24 * 60 * 60 * 1000) {
        await markUnavailable(outcome.id);
        unavailable += 1;
      }
      continue;
    }

    const actual = summarizeActuals(inputs, outcome.breakEvenRoas);
    const judgment = judgeOutcome(outcome.verdict, actual, outcome.breakEvenRoas);
    await prisma.$executeRaw`
      UPDATE "RecommendationOutcome"
      SET
        "status" = 'evaluated'::"RecommendationOutcomeStatus",
        "actualMetrics" = ${JSON.stringify(actual)}::jsonb,
        "wasRight" = ${judgment.wasRight},
        "moneySaved" = ${round(judgment.moneySaved)},
        "moneyEarned" = ${round(judgment.moneyEarned)},
        "evaluatedAt" = ${new Date()},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${outcome.id}
    `;
    evaluated += 1;
  }

  return { evaluated, unavailable, checked: due.length };
}

async function markUnavailable(id: string) {
  await prisma.$executeRaw`
    UPDATE "RecommendationOutcome"
    SET
      "status" = 'unavailable'::"RecommendationOutcomeStatus",
      "evaluatedAt" = ${new Date()},
      "updatedAt" = ${new Date()}
    WHERE "id" = ${id}
  `;
}

export async function getRecommendationTrackRecord(userId: string): Promise<TrackRecordSummary> {
  const since = addDays(new Date(), -60);
  const aggregate = await prisma.$queryRaw<Array<{
    evaluated_count: bigint;
    correct_count: bigint;
    pending_count: bigint;
    money_saved: number | null;
    money_earned: number | null;
  }>>`
    SELECT
      COUNT(*) FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus") AS evaluated_count,
      COUNT(*) FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus" AND "wasRight" = true) AS correct_count,
      COUNT(*) FILTER (WHERE "status" = 'pending'::"RecommendationOutcomeStatus") AS pending_count,
      COALESCE(SUM("moneySaved") FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus"), 0) AS money_saved,
      COALESCE(SUM("moneyEarned") FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus"), 0) AS money_earned
    FROM "RecommendationOutcome"
    WHERE "userId" = ${userId}
      AND "issuedAt" >= ${since}
  `;
  const row = aggregate[0];
  const evaluatedCount = Number(row?.evaluated_count ?? 0);
  const correctCount = Number(row?.correct_count ?? 0);
  const accuracyPct = evaluatedCount > 0 ? Math.round((correctCount / evaluatedCount) * 100) : null;

  const recent = await prisma.$queryRaw<RecentOutcomeRow[]>`
    SELECT
      "id",
      "verdict",
      "confidence",
      "evaluationHorizonDays" AS "horizonDays",
      "wasRight",
      "status",
      "moneySaved",
      "moneyEarned",
      "issuedAt",
      "evaluatedAt",
      "entityName"
    FROM "RecommendationOutcome"
    WHERE "userId" = ${userId}
    ORDER BY "issuedAt" DESC, "evaluationHorizonDays" ASC
    LIMIT 8
  `;

  return {
    accuracyPct,
    evaluatedCount,
    pendingCount: Number(row?.pending_count ?? 0),
    moneySaved: round(asNumber(row?.money_saved)),
    moneyEarned: round(asNumber(row?.money_earned)),
    calibrationAdjustment: confidenceAdjustmentFromAccuracy(accuracyPct, evaluatedCount),
    recent: recent.map((item) => ({
      ...item,
      issuedAt: new Date(item.issuedAt).toISOString(),
      evaluatedAt: item.evaluatedAt ? new Date(item.evaluatedAt).toISOString() : null,
    })),
  };
}

export function confidenceAdjustmentFromAccuracy(accuracyPct: number | null, evaluatedCount: number) {
  if (accuracyPct === null || evaluatedCount < 5) return 0;
  if (accuracyPct >= 80) return 8;
  if (accuracyPct >= 70) return 5;
  if (accuracyPct >= 60) return 2;
  if (accuracyPct < 45) return -10;
  if (accuracyPct < 55) return -5;
  return 0;
}

export async function getUserConfidenceCalibration(userId: string) {
  const summary = await getRecommendationTrackRecord(userId);
  return {
    accuracyPct: summary.accuracyPct,
    evaluatedCount: summary.evaluatedCount,
    adjustment: summary.calibrationAdjustment,
  };
}
