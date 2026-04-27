import { z } from "zod";

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

export type BudgetInput = z.infer<typeof budgetInputSchema>;
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
