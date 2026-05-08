import { IntegrationProvider, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

export const campaignSimulationInputSchema = z.object({
  externalEntityId: z.string().min(1),
  externalAccountId: z.string().min(1).optional(),
  provider: z.enum(["META", "TIKTOK"]).optional(),
});

export type CampaignSimulationInput = z.infer<typeof campaignSimulationInputSchema>;

type Point = {
  date: Date;
  spend: number;
  revenue: number;
  purchases: number;
  cpa: number | null;
  roas: number;
};

type Signal = {
  label: string;
  detail: string;
  score: number;
};

type ScenarioKind =
  | "budget_up_10"
  | "budget_up_20"
  | "budget_up_50"
  | "budget_down_20"
  | "budget_down_50"
  | "pause"
  | "duplicate_scale";

type ScenarioDefinition = {
  kind: ScenarioKind;
  label: string;
  budgetFactor: number;
  cpaPenaltyPct: number;
};

const SCENARIOS: ScenarioDefinition[] = [
  { kind: "budget_up_10", label: "Budget increase +10%", budgetFactor: 1.1, cpaPenaltyPct: 2 },
  { kind: "budget_up_20", label: "Budget increase +20%", budgetFactor: 1.2, cpaPenaltyPct: 5 },
  { kind: "budget_up_50", label: "Budget increase +50%", budgetFactor: 1.5, cpaPenaltyPct: 14 },
  { kind: "budget_down_20", label: "Budget decrease -20%", budgetFactor: 0.8, cpaPenaltyPct: -3 },
  { kind: "budget_down_50", label: "Budget decrease -50%", budgetFactor: 0.5, cpaPenaltyPct: -8 },
  { kind: "pause", label: "Pause campaign", budgetFactor: 0, cpaPenaltyPct: 0 },
  { kind: "duplicate_scale", label: "Duplicate + scale (split budget)", budgetFactor: 1.2, cpaPenaltyPct: 8 },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function pctChange(base: number | null, projected: number | null) {
  if (base === null || projected === null || base === 0) return null;
  return round(((projected - base) / Math.abs(base)) * 100, 1);
}

function sum(points: Point[], key: "spend" | "revenue" | "purchases") {
  return points.reduce((total, point) => total + point[key], 0);
}

function toPoint(snapshot: {
  date: Date;
  metrics: Prisma.JsonValue;
  analysisInput: Prisma.JsonValue;
}): Point {
  const metrics = asRecord(snapshot.metrics);
  const input = asRecord(snapshot.analysisInput);
  const spend = asNumber(metrics.spend) || asNumber(input.cpc) * asNumber(input.clicks);
  const revenue = asNumber(input.revenue);
  const purchases = asNumber(input.purchases);
  const cpa = purchases > 0 ? spend / purchases : null;
  const roas = spend > 0 ? revenue / spend : 0;

  return {
    date: snapshot.date,
    spend,
    revenue,
    purchases,
    cpa,
    roas,
  };
}

function linearRegression(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return { slope: 0.85, r2: 0, enoughData: false };
  const meanX = points.reduce((sumValue, point) => sumValue + point.x, 0) / points.length;
  const meanY = points.reduce((sumValue, point) => sumValue + point.y, 0) / points.length;
  const numerator = points.reduce((sumValue, point) => sumValue + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = points.reduce((sumValue, point) => sumValue + (point.x - meanX) ** 2, 0);
  if (denominator === 0) return { slope: 0.85, r2: 0, enoughData: false };
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const ssTot = points.reduce((sumValue, point) => sumValue + (point.y - meanY) ** 2, 0);
  const ssRes = points.reduce((sumValue, point) => sumValue + (point.y - (intercept + slope * point.x)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return {
    slope: Math.max(0.2, Math.min(1.4, slope)),
    r2,
    enoughData: true,
  };
}

function riskLevel(kind: ScenarioKind, roasDeltaPct: number | null, cpaDeltaPct: number | null) {
  if (kind === "pause") return "Low";
  if (kind === "budget_up_50" || kind === "duplicate_scale") return "High";
  if ((roasDeltaPct ?? 0) < -8 || (cpaDeltaPct ?? 0) > 12) return "High";
  if ((roasDeltaPct ?? 0) < -3 || (cpaDeltaPct ?? 0) > 6) return "Medium";
  return "Low";
}

function confidenceFromSignals(points: Point[], regression: ReturnType<typeof linearRegression>) {
  const purchaseDays = points.filter((point) => point.purchases > 0).length;
  const spendValues = points.map((point) => point.spend).filter((value) => value > 0);
  const avgSpend = spendValues.length ? spendValues.reduce((sumValue, value) => sumValue + value, 0) / spendValues.length : 0;
  const spendVolatility = avgSpend > 0
    ? spendValues.reduce((sumValue, value) => sumValue + Math.abs(value - avgSpend), 0) / spendValues.length / avgSpend
    : 1;

  const signals: Signal[] = [
    {
      label: "Last 14-30 days performance",
      detail: `${points.length} daily snapshots available`,
      score: points.length >= 14 ? 90 : points.length >= 7 ? 72 : points.length >= 3 ? 48 : 25,
    },
    {
      label: "Spend elasticity",
      detail: regression.enoughData
        ? `Revenue elasticity ${round(regression.slope, 2)} with R2 ${round(regression.r2, 2)}`
        : "Using conservative default elasticity until more history is available",
      score: regression.enoughData ? Math.round(45 + regression.r2 * 45) : 35,
    },
    {
      label: "Purchase signal depth",
      detail: `${purchaseDays} days had purchases`,
      score: purchaseDays >= 10 ? 88 : purchaseDays >= 5 ? 68 : purchaseDays >= 2 ? 45 : 25,
    },
    {
      label: "Spend stability",
      detail: `${round(spendVolatility * 100, 0)}% average daily spend variation`,
      score: spendVolatility <= 0.25 ? 85 : spendVolatility <= 0.5 ? 65 : spendVolatility <= 0.9 ? 45 : 25,
    },
  ];
  const confidence = Math.max(0, Math.min(100, Math.round(signals.reduce((sumValue, signal) => sumValue + signal.score, 0) / signals.length)));
  return { confidence, signals };
}

function buildScenario(definition: ScenarioDefinition, baseline: {
  spend: number;
  revenue: number;
  purchases: number;
  cpa: number | null;
  roas: number;
}, elasticity: number) {
  if (definition.kind === "pause") {
    return {
      kind: definition.kind,
      label: definition.label,
      expected: { cpa: null, revenue: 0, roas: 0, spend: 0 },
      delta: {
        cpaPct: null,
        revenuePct: pctChange(baseline.revenue, 0),
        roasPct: pctChange(baseline.roas, 0),
      },
      riskLevel: "Low",
    };
  }

  const spend = baseline.spend * definition.budgetFactor;
  const revenueMultiplier = definition.kind === "duplicate_scale"
    ? definition.budgetFactor ** (elasticity * 0.9)
    : definition.budgetFactor ** elasticity;
  const revenue = baseline.revenue * revenueMultiplier;
  const purchaseMultiplier = definition.budgetFactor ** Math.max(0.2, elasticity * 0.95);
  const purchases = baseline.purchases * purchaseMultiplier;
  const rawCpa = purchases > 0 ? spend / purchases : null;
  const cpa = rawCpa === null ? null : rawCpa * (1 + definition.cpaPenaltyPct / 100);
  const roas = spend > 0 ? revenue / spend : 0;
  const cpaPct = pctChange(baseline.cpa, cpa);
  const revenuePct = pctChange(baseline.revenue, revenue);
  const roasPct = pctChange(baseline.roas, roas);

  return {
    kind: definition.kind,
    label: definition.label,
    expected: {
      cpa: cpa === null ? null : round(cpa),
      revenue: round(revenue),
      roas: round(roas),
      spend: round(spend),
    },
    delta: {
      cpaPct,
      revenuePct,
      roasPct,
    },
    riskLevel: riskLevel(definition.kind, roasPct, cpaPct),
  };
}

export async function simulateCampaignBudget(userId: string, input: CampaignSimulationInput) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const snapshots = await prisma.integrationMetricSnapshot.findMany({
    where: {
      userId,
      externalEntityId: input.externalEntityId,
      ...(input.externalAccountId ? { externalAccountId: input.externalAccountId } : {}),
      provider: input.provider
        ? input.provider as IntegrationProvider
        : { in: [IntegrationProvider.META, IntegrationProvider.TIKTOK] },
      date: { gte: since },
    },
    orderBy: { date: "asc" },
  });

  if (!snapshots.length) {
    throw new AppError("No campaign history found for simulation", 404);
  }

  const points = snapshots.map(toPoint).filter((point) => point.spend > 0 || point.revenue > 0);
  const recent = points.slice(-14);
  const baselineWindow = recent.length >= 3 ? recent.slice(-7) : points.slice(-7);
  const baselineSpend = sum(baselineWindow, "spend");
  const baselineRevenue = sum(baselineWindow, "revenue");
  const baselinePurchases = sum(baselineWindow, "purchases");
  const baseline = {
    days: baselineWindow.length,
    spend: round(baselineSpend),
    revenue: round(baselineRevenue),
    purchases: round(baselinePurchases, 0),
    cpa: baselinePurchases > 0 ? round(baselineSpend / baselinePurchases) : null,
    roas: baselineSpend > 0 ? round(baselineRevenue / baselineSpend) : 0,
  };

  const regression = linearRegression(points
    .filter((point) => point.spend > 0 && point.revenue > 0)
    .map((point) => ({ x: Math.log(point.spend + 1), y: Math.log(point.revenue + 1) })));
  const { confidence, signals } = confidenceFromSignals(points, regression);
  const scenarios = SCENARIOS.map((scenario) => buildScenario(scenario, baseline, regression.slope));
  const latest = snapshots[snapshots.length - 1];

  await prisma.simulationLog.create({
    data: {
      userId,
      provider: latest.provider,
      externalAccountId: latest.externalAccountId,
      externalEntityId: latest.externalEntityId,
      entityName: latest.entityName,
      scenarios: scenarios as unknown as Prisma.InputJsonValue,
      baseline: baseline as unknown as Prisma.InputJsonValue,
      confidence,
      signalBreakdown: signals as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    campaign: {
      provider: latest.provider,
      externalAccountId: latest.externalAccountId,
      externalEntityId: latest.externalEntityId,
      entityName: latest.entityName ?? latest.externalEntityId,
    },
    period: {
      historyDays: points.length,
      baselineDays: baseline.days,
      horizonDays: 7,
    },
    baseline,
    scenarios,
    confidence,
    signalBreakdown: signals,
    basedOn: [
      `last ${Math.min(30, points.length)} days performance`,
      "spend elasticity",
      "niche avg scaling behavior",
    ],
  };
}
