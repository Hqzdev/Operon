"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioInputSchema = void 0;
exports.runScenario = runScenario;
const zod_1 = require("zod");
exports.scenarioInputSchema = zod_1.z.object({
    base: zod_1.z.object({
        product_price: zod_1.z.number().positive(),
        cost: zod_1.z.number().min(0),
        impressions: zod_1.z.number().int().min(0),
        clicks: zod_1.z.number().int().min(0),
        add_to_cart: zod_1.z.number().int().min(0),
        purchases: zod_1.z.number().int().min(0),
        revenue: zod_1.z.number().min(0),
        ctr: zod_1.z.number().min(0),
        cpc: zod_1.z.number().min(0),
        cpm: zod_1.z.number().min(0),
    }),
    changes: zod_1.z.object({
        ctr_delta_pct: zod_1.z.number().optional(),
        conversion_delta_pct: zod_1.z.number().optional(),
        cpc_delta_pct: zod_1.z.number().optional(),
        aov_delta_pct: zod_1.z.number().optional(),
        new_budget: zod_1.z.number().positive().optional(),
    }),
});
function computeMetrics(impressions, ctr, conversionRate, aov, cpc, cost) {
    const clicks = Math.round(impressions * (ctr / 100));
    const purchases = Math.round(clicks * conversionRate);
    const revenue = Math.round(purchases * aov * 100) / 100;
    const spend = Math.round(clicks * cpc * 100) / 100;
    const margin = aov - cost;
    const profit = Math.round((purchases * margin - spend) * 100) / 100;
    const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
    const cpa = purchases > 0 ? Math.round((spend / purchases) * 100) / 100 : null;
    return { impressions, clicks, purchases, revenue, spend, roas, profit, cpa, conversionRate };
}
function deltaPct(base, projected) {
    if (base === 0)
        return 0;
    return Math.round(((projected - base) / Math.abs(base)) * 1000) / 10;
}
function runScenario(input) {
    const { base, changes } = input;
    const baseConversionRate = base.clicks > 0 ? base.purchases / base.clicks : 0;
    const baseAov = base.purchases > 0 ? base.revenue / base.purchases : base.product_price;
    const baseCtr = base.ctr;
    const baseCpc = base.cpc;
    const baseImpressions = base.impressions;
    const baseMetrics = computeMetrics(baseImpressions, baseCtr, baseConversionRate, baseAov, baseCpc, base.cost);
    const newCtr = baseCtr * (1 + (changes.ctr_delta_pct ?? 0) / 100);
    const newConversion = baseConversionRate * (1 + (changes.conversion_delta_pct ?? 0) / 100);
    const newCpc = baseCpc * (1 + (changes.cpc_delta_pct ?? 0) / 100);
    const newAov = baseAov * (1 + (changes.aov_delta_pct ?? 0) / 100);
    let projectedImpressions = baseImpressions;
    if (changes.new_budget !== undefined && newCpc > 0) {
        const projectedClicks = Math.round(changes.new_budget / newCpc);
        projectedImpressions = newCtr > 0 ? Math.round((projectedClicks / newCtr) * 100) : baseImpressions;
    }
    const projected = computeMetrics(projectedImpressions, newCtr, newConversion, newAov, newCpc, base.cost);
    const revenuePct = deltaPct(baseMetrics.revenue, projected.revenue);
    const profitPct = baseMetrics.profit !== 0 ? deltaPct(baseMetrics.profit, projected.profit) : null;
    const roapPct = deltaPct(baseMetrics.roas, projected.roas);
    const purchasesPct = deltaPct(baseMetrics.purchases, projected.purchases);
    const insights = [];
    if (Math.abs(revenuePct) > 10) {
        insights.push(`Revenue ${revenuePct > 0 ? "+" : ""}${revenuePct}% vs baseline.`);
    }
    if (projected.profit > 0 && baseMetrics.profit <= 0) {
        insights.push("Setup turns profitable in this scenario.");
    }
    else if (projected.profit < 0) {
        insights.push("Setup remains unprofitable in this scenario.");
    }
    if (projected.roas > baseMetrics.roas * 1.2) {
        insights.push(`ROAS improves significantly to ${projected.roas}x.`);
    }
    if (insights.length === 0) {
        insights.push("Changes produce marginal impact. Consider more aggressive levers.");
    }
    return {
        baseline: baseMetrics,
        projected,
        delta: {
            revenue_pct: revenuePct,
            profit_pct: profitPct,
            roas_pct: roapPct,
            purchases_pct: purchasesPct,
        },
        insight: insights.join(" "),
    };
}
