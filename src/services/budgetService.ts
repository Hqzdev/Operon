import { z } from "zod";
import { getSeasonContext } from "../lib/seasonality";

export const adSetSchema = z.object({
  name: z.string().min(1).max(120),
  spend: z.number().min(0),
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  add_to_cart: z.number().int().min(0),
  purchases: z.number().int().min(0),
  revenue: z.number().min(0),
  product_price: z.number().positive(),
  cost: z.number().min(0),
});

export const budgetInputSchema = z.object({
  totalBudget: z.number().positive(),
  adSets: z.array(adSetSchema).min(2).max(10),
});

export const weeklyBudgetPlanInputSchema = z.object({
  weeklyBudget: z.number().positive(),
  targetSales: z.number().int().positive(),
  startDate: z.string().optional(),
  historical: z.object({
    spend: z.number().min(0),
    clicks: z.number().int().min(0),
    purchases: z.number().int().min(0),
  }).optional(),
});

export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type WeeklyBudgetPlanInput = z.infer<typeof weeklyBudgetPlanInputSchema>;
export type AdSet = z.infer<typeof adSetSchema>;

type AdSetResult = {
  name: string;
  spend: number;
  roas: number;
  cpa: number | null;
  breakEvenRoas: number;
  conversionRate: number;
  efficiencyScore: number;
  recommendation: "SCALE" | "HOLD" | "CUT";
  recommendedBudget: number;
  allocatedPct: number;
};

type BudgetAllocationResult = {
  totalBudget: number;
  adSets: AdSetResult[];
  summary: string;
};

type DailyBudgetPlan = {
  date: string;
  day: string;
  recommendedBudget: number;
  allocatedPct: number;
  expectedSales: number;
  confidenceLow: number;
  confidenceHigh: number;
  trafficMultiplier: number;
  cpcMultiplier: number;
  seasonalityMultiplier: number;
  seasonLabel: string;
};

type WeeklyBudgetPlanResult = {
  weeklyBudget: number;
  targetSales: number;
  expectedSales: number;
  confidenceLow: number;
  confidenceHigh: number;
  expectedCpa: number;
  requiredCpa: number;
  dailyPlan: DailyBudgetPlan[];
  assumptions: {
    averageCpc: number;
    conversionRate: number;
    historicalDataUsed: boolean;
    confidenceRangePct: number;
  };
  summary: string;
};

const DAY_VARIANCE: Record<number, { traffic: number; cpc: number }> = {
  0: { traffic: 0.9, cpc: 1.08 },
  1: { traffic: 1.04, cpc: 0.92 },
  2: { traffic: 1.08, cpc: 0.9 },
  3: { traffic: 1.07, cpc: 0.91 },
  4: { traffic: 1.03, cpc: 0.95 },
  5: { traffic: 0.98, cpc: 1.02 },
  6: { traffic: 0.92, cpc: 1.1 },
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function scoreAdSet(set: AdSet): number {
  if (set.spend === 0) return 0;
  const roas = set.revenue / set.spend;
  const breakEvenRoas = set.cost > 0 ? set.product_price / (set.product_price - set.cost) : 1;
  const roasRatio = roas / Math.max(breakEvenRoas, 0.1);
  const ctr = set.impressions > 0 ? set.clicks / set.impressions : 0;
  const conversionRate = set.clicks > 0 ? set.purchases / set.clicks : 0;
  return roasRatio * 0.5 + (ctr / 0.02) * 0.2 + (conversionRate / 0.03) * 0.3;
}

export function allocateBudget(input: BudgetInput): BudgetAllocationResult {
  const scored = input.adSets.map((set) => {
    const spend = set.spend;
    const roas = spend > 0 ? set.revenue / spend : 0;
    const breakEvenRoas =
      set.cost > 0 ? set.product_price / (set.product_price - set.cost) : 1;
    const cpa = set.purchases > 0 ? spend / set.purchases : null;
    const conversionRate = set.clicks > 0 ? set.purchases / set.clicks : 0;
    const efficiencyScore = scoreAdSet(set);

    let recommendation: "SCALE" | "HOLD" | "CUT";
    if (roas >= breakEvenRoas * 1.2 && set.purchases >= 2) {
      recommendation = "SCALE";
    } else if (roas < breakEvenRoas * 0.5 && spend > 50) {
      recommendation = "CUT";
    } else {
      recommendation = "HOLD";
    }

    return { set, spend, roas, breakEvenRoas, cpa, conversionRate, efficiencyScore, recommendation };
  });

  const totalScore = scored.reduce((sum, s) => sum + Math.max(s.efficiencyScore, 0.01), 0);

  const results: AdSetResult[] = scored.map((s) => {
    const weight = Math.max(s.efficiencyScore, 0.01) / totalScore;
    let allocatedPct = weight;

    if (s.recommendation === "CUT") allocatedPct = Math.min(weight, 0.05);
    if (s.recommendation === "SCALE") allocatedPct = Math.min(weight * 1.3, 0.6);

    return {
      name: s.set.name,
      spend: s.spend,
      roas: Math.round(s.roas * 100) / 100,
      cpa: s.cpa !== null ? Math.round(s.cpa * 100) / 100 : null,
      breakEvenRoas: Math.round(s.breakEvenRoas * 100) / 100,
      conversionRate: Math.round(s.conversionRate * 10000) / 100,
      efficiencyScore: Math.round(s.efficiencyScore * 100) / 100,
      recommendation: s.recommendation,
      recommendedBudget: 0,
      allocatedPct,
    };
  });

  // Normalize allocations to sum to 1
  const totalWeight = results.reduce((sum, r) => sum + r.allocatedPct, 0);
  results.forEach((r) => {
    r.allocatedPct = Math.round((r.allocatedPct / totalWeight) * 1000) / 10;
    r.recommendedBudget = Math.round((r.allocatedPct / 100) * input.totalBudget * 100) / 100;
  });

  const bestSet = results.reduce((best, r) => (r.roas > best.roas ? r : best), results[0]);
  const cutSets = results.filter((r) => r.recommendation === "CUT").map((r) => r.name);
  const summary =
    `Best performer: ${bestSet.name} (ROAS ${bestSet.roas}x). ` +
    (cutSets.length
      ? `Consider cutting budget from: ${cutSets.join(", ")}. `
      : "All ad sets show viable signals. ") +
    `Total budget $${input.totalBudget} distributed across ${results.length} ad sets.`;

  return { totalBudget: input.totalBudget, adSets: results, summary };
}

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function nextMonday(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysUntilMonday = (8 - utc.getUTCDay()) % 7 || 7;
  return addDays(utc, daysUntilMonday);
}

function parsePlanStartDate(value?: string) {
  if (!value) return nextMonday();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? nextMonday() : parsed;
}

function deriveHistoricalAssumptions(input: WeeklyBudgetPlanInput) {
  const historical = input.historical;
  if (historical && historical.spend > 0 && historical.clicks > 0 && historical.purchases > 0) {
    return {
      averageCpc: historical.spend / historical.clicks,
      conversionRate: historical.purchases / historical.clicks,
      historicalDataUsed: true,
    };
  }

  const requiredCpa = input.weeklyBudget / input.targetSales;
  const conversionRate = 0.02;
  return {
    averageCpc: Math.max(0.01, requiredCpa * conversionRate),
    conversionRate,
    historicalDataUsed: false,
  };
}

export function planWeeklyBudget(input: WeeklyBudgetPlanInput): WeeklyBudgetPlanResult {
  const start = parsePlanStartDate(input.startDate);
  const assumptions = deriveHistoricalAssumptions(input);
  const requiredCpa = input.weeklyBudget / input.targetSales;

  const dayModels = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const variance = DAY_VARIANCE[date.getUTCDay()];
    const season = getSeasonContext(date);
    const seasonalityMultiplier = Math.max(0.2, season.convMultiplier / Math.max(season.cpmMultiplier, 0.2));
    const conversionPerDollar =
      (variance.traffic * assumptions.conversionRate * seasonalityMultiplier) /
      Math.max(assumptions.averageCpc * variance.cpc, 0.01);
    return { date, variance, season, seasonalityMultiplier, conversionPerDollar };
  });

  const totalEfficiency = dayModels.reduce((sum, day) => sum + day.conversionPerDollar, 0);
  const dailyPlan = dayModels.map((day) => {
    const allocatedPct = totalEfficiency > 0 ? day.conversionPerDollar / totalEfficiency : 1 / 7;
    const recommendedBudget = input.weeklyBudget * allocatedPct;
    const expectedSales = recommendedBudget * day.conversionPerDollar;
    return {
      date: day.date.toISOString().slice(0, 10),
      day: DAY_NAMES[day.date.getUTCDay()],
      recommendedBudget: round(recommendedBudget),
      allocatedPct: round(allocatedPct * 100, 1),
      expectedSales: round(expectedSales, 1),
      confidenceLow: round(expectedSales * 0.9, 1),
      confidenceHigh: round(expectedSales * 1.1, 1),
      trafficMultiplier: day.variance.traffic,
      cpcMultiplier: day.variance.cpc,
      seasonalityMultiplier: round(day.seasonalityMultiplier, 2),
      seasonLabel: day.season.label,
    };
  });

  const expectedSales = dailyPlan.reduce((sum, day) => sum + day.expectedSales, 0);
  const expectedCpa = expectedSales > 0 ? input.weeklyBudget / expectedSales : input.weeklyBudget;
  const gap = expectedSales - input.targetSales;
  const summary = assumptions.historicalDataUsed
    ? `Plan expects ${round(expectedSales, 1)} sales against a ${input.targetSales}-sale goal, using historical CPC and conversion rate.`
    : `Plan distributes budget for a ${input.targetSales}-sale goal using target CPA because historical conversion data was not available.`;

  return {
    weeklyBudget: input.weeklyBudget,
    targetSales: input.targetSales,
    expectedSales: round(expectedSales, 1),
    confidenceLow: round(expectedSales * 0.9, 1),
    confidenceHigh: round(expectedSales * 1.1, 1),
    expectedCpa: round(expectedCpa),
    requiredCpa: round(requiredCpa),
    dailyPlan,
    assumptions: {
      averageCpc: round(assumptions.averageCpc),
      conversionRate: round(assumptions.conversionRate * 100, 2),
      historicalDataUsed: assumptions.historicalDataUsed,
      confidenceRangePct: 10,
    },
    summary: `${summary} ${gap >= 0 ? "The plan is above target." : "The plan is below target; improve conversion rate, CPC, or budget to close the gap."}`,
  };
}
