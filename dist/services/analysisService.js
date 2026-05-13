"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisInputSchema = void 0;
exports.createAnalysis = createAnalysis;
exports.listAnalyses = listAnalyses;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const aiService_1 = require("./aiService");
const seasonality_1 = require("../lib/seasonality");
const analysisRepository_1 = require("../repositories/analysisRepository");
const integrationRepository_1 = require("../repositories/integrationRepository");
const integrationService_1 = require("./integrationService");
const shopifyLtvService_1 = require("./shopifyLtvService");
const recommendationOutcomeService_1 = require("./recommendationOutcomeService");
const communityBenchmarkService_1 = require("./communityBenchmarkService");
const userRepository_1 = require("../repositories/userRepository");
exports.analysisInputSchema = zod_1.z.object({
    account_type: zod_1.z.enum(["dropship", "dtc", "subscription", "leadgen", "b2b"]).default("dropship"),
    product_name: zod_1.z.string().min(2).max(120).optional(),
    product_description: zod_1.z.string().min(10).max(4000).optional(),
    product_price: zod_1.z.number().positive(),
    cost: zod_1.z.number().min(0),
    ctr: zod_1.z.number().min(0),
    cpc: zod_1.z.number().min(0),
    cpm: zod_1.z.number().min(0),
    impressions: zod_1.z.number().int().min(0),
    clicks: zod_1.z.number().int().min(0),
    add_to_cart: zod_1.z.number().int().min(0),
    purchases: zod_1.z.number().int().min(0),
    revenue: zod_1.z.number().min(0),
    return_rate: zod_1.z.number().min(0).max(100).default(0),
    net_revenue: zod_1.z.number().min(0).optional(),
    total_spend: zod_1.z.number().min(0).optional(),
    days_active: zod_1.z.number().int().min(0).optional(),
    platform_breakdown: zod_1.z.object({
        ios: zod_1.z.number().min(0).optional(),
        android: zod_1.z.number().min(0).optional(),
        desktop: zod_1.z.number().min(0).optional(),
        unknown: zod_1.z.number().min(0).optional(),
    }).optional(),
    ios_audience_pct: zod_1.z.number().min(0).max(100).optional(),
    ios_under_attribution_multiplier: zod_1.z.number().min(0).max(10).optional(),
    pixel_purchases: zod_1.z.number().min(0).optional(),
    shopify_purchases: zod_1.z.number().min(0).optional(),
    niche: zod_1.z.string().min(2).max(80).optional(),
    country: zod_1.z.string().min(2).max(80).optional(),
    mrr: zod_1.z.number().min(0).optional(),
    monthly_churn_rate: zod_1.z.number().min(0).max(100).optional(),
    subscription_starts: zod_1.z.number().int().min(0).optional(),
    qualified_leads: zod_1.z.number().int().min(0).optional(),
    form_starts: zod_1.z.number().int().min(0).optional(),
    lead_value: zod_1.z.number().min(0).optional(),
    stage: zod_1.z.enum(["testing", "scaling", "retesting"]).default("testing"),
}).superRefine((value, ctx) => {
    if (value.account_type === "subscription") {
        if (!value.mrr || value.mrr <= 0) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ["mrr"], message: "MRR is required for subscription analyses" });
        }
        if (!value.monthly_churn_rate || value.monthly_churn_rate <= 0) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ["monthly_churn_rate"], message: "Monthly churn rate is required for subscription analyses" });
        }
    }
    if ((value.account_type === "leadgen" || value.account_type === "b2b") && value.qualified_leads === undefined) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ["qualified_leads"], message: "Qualified leads are required for lead-gen/B2B analyses" });
    }
});
const ACCOUNT_THRESHOLDS = {
    dropship: { minClicks: 80, minImpressions: 5000, weakIntentCeiling: 1, weakConversionClicks: 60, intentFixFloor: 3, scaleConversions: 2, ctrFloor: 1.5, expensiveCpm: 60 },
    dtc: { minClicks: 80, minImpressions: 5000, weakIntentCeiling: 1, weakConversionClicks: 60, intentFixFloor: 3, scaleConversions: 2, ctrFloor: 1.4, expensiveCpm: 70 },
    subscription: { minClicks: 100, minImpressions: 6000, weakIntentCeiling: 1, weakConversionClicks: 80, intentFixFloor: 4, scaleConversions: 2, ctrFloor: 1.2, expensiveCpm: 80 },
    leadgen: { minClicks: 80, minImpressions: 4000, weakIntentCeiling: 1, weakConversionClicks: 50, intentFixFloor: 5, scaleConversions: 3, ctrFloor: 1.0, expensiveCpm: 90 },
    b2b: { minClicks: 60, minImpressions: 3000, weakIntentCeiling: 0, weakConversionClicks: 40, intentFixFloor: 3, scaleConversions: 2, ctrFloor: 0.8, expensiveCpm: 120 },
};
function confidenceLevel(score) {
    if (score >= 75)
        return "high";
    if (score >= 50)
        return "medium";
    return "low";
}
function round(value, precision = 0) {
    return Number(value.toFixed(precision));
}
function spendTarget(breakEvenCpa, breakEvenRoas) {
    return Math.max(150, breakEvenCpa * 3, breakEvenRoas * 50);
}
function evidenceMaturity(input, derived) {
    const spend = input.total_spend && input.total_spend > 0 ? input.total_spend : derived.spend;
    const target = spendTarget(derived.breakEvenCpa, derived.breakEvenRoas);
    const days = input.days_active ?? 0;
    const lowSpend = spend < Math.min(100, target * 0.35);
    const enoughSpend = spend >= target;
    const enoughTime = days === 0 || days >= 3;
    return {
        spend,
        target,
        days,
        lowSpend,
        enoughSpend,
        enoughTime,
        enoughEvidence: enoughSpend && enoughTime,
        needsSpend: Math.max(0, Math.ceil(target - spend)),
        needsDays: Math.max(0, 3 - days),
    };
}
function toConfidencePoint(input) {
    const derived = (0, aiService_1.deriveMetrics)(input);
    return {
        spend: derived.spend,
        cpa: derived.currentCpa,
        ctr: input.ctr,
        cpm: input.cpm,
        roas: derived.roas,
        breakEvenCpa: derived.breakEvenCpa,
        breakEvenRoas: derived.breakEvenRoas,
    };
}
function attributionAdjustedPayload(input, derived) {
    const adjustment = derived.attributionAdjustment;
    if (!adjustment)
        return input;
    return {
        ...input,
        purchases: adjustment.adjustedPurchases,
        qualified_leads: input.account_type === "leadgen" || input.account_type === "b2b" ? adjustment.adjustedPurchases : input.qualified_leads,
        subscription_starts: input.account_type === "subscription" ? adjustment.adjustedPurchases : input.subscription_starts,
        revenue: derived.grossRevenue ?? input.revenue,
    };
}
function sumSnapshotPurchases(snapshots) {
    return snapshots.reduce((sum, snapshot) => {
        const parsed = exports.analysisInputSchema.safeParse(snapshot.analysisInput);
        return sum + (parsed.success ? parsed.data.purchases : 0);
    }, 0);
}
async function enrichAttributionFromShopify(userId, payload) {
    if (payload.shopify_purchases || payload.purchases <= 0)
        return payload;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snapshots = await integrationRepository_1.IntegrationRepository.findRecentSnapshotsByProvider(userId, "SHOPIFY", since);
    const shopifyPurchases = sumSnapshotPurchases(snapshots);
    if (shopifyPurchases <= payload.purchases)
        return payload;
    return {
        ...payload,
        pixel_purchases: payload.pixel_purchases ?? payload.purchases,
        shopify_purchases: shopifyPurchases,
    };
}
async function enrichBenchmarkBucket(userId, payload) {
    if (payload.niche && payload.country && payload.account_type)
        return payload;
    const user = await userRepository_1.UserRepository.findById(userId).catch(() => null);
    const userAccountType = user?.accountType;
    return {
        ...payload,
        niche: payload.niche ?? user?.niche ?? undefined,
        country: payload.country ?? "GLOBAL",
        account_type: payload.account_type ?? userAccountType ?? "dropship",
    };
}
function scoreDirection(current, previous, higherIsBetter) {
    if (current <= 0)
        return { score: 20, deltaPct: -100 };
    if (previous <= 0)
        return { score: 45, deltaPct: 0 };
    const deltaPct = ((current - previous) / previous) * 100;
    const favorable = higherIsBetter ? deltaPct : -deltaPct;
    const score = favorable >= 15 ? 95 :
        favorable >= 5 ? 80 :
            favorable >= -10 ? 60 :
                favorable >= -25 ? 40 :
                    20;
    return { score, deltaPct };
}
function computeRecommendationConfidence(input, historyInputs) {
    const points = [...historyInputs, input].slice(-4).map(toConfidencePoint);
    const current = points[points.length - 1];
    const maturity = evidenceMaturity(input, current);
    const previous = points.slice(0, -1);
    const previousAvg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const signals = [];
    const cpaValues = points.map((point) => point.cpa).filter((value) => value !== null && value > 0);
    if (cpaValues.length >= 3) {
        const changes = cpaValues.slice(1).map((value, index) => Math.abs((value - cpaValues[index]) / cpaValues[index]) * 100);
        const avgChange = previousAvg(changes);
        const score = avgChange <= 10 ? 95 :
            avgChange <= 20 ? 78 :
                avgChange <= 35 ? 55 :
                    25;
        signals.push({
            label: avgChange <= 20 ? "CPA stable" : "CPA unstable",
            detail: `CPA changed ${round(avgChange)}% on average across recent checks`,
            score,
            weight: 30,
        });
    }
    else {
        signals.push({
            label: "CPA stability has limited data",
            detail: "Need at least 3 purchase-bearing checks for a stronger CPA stability signal",
            score: current.cpa && current.cpa > 0 ? 45 : 25,
            weight: 30,
        });
    }
    const previousCtr = previousAvg(previous.map((point) => point.ctr).filter((value) => value > 0));
    if (previousCtr > 0) {
        const { score, deltaPct } = scoreDirection(current.ctr, previousCtr, true);
        signals.push({
            label: deltaPct >= 0 ? "CTR trending up" : "CTR trending down",
            detail: `CTR is ${round(Math.abs(deltaPct))}% ${deltaPct >= 0 ? "above" : "below"} recent average`,
            score,
            weight: 25,
        });
    }
    else {
        const score = current.ctr >= 2 ? 80 : current.ctr >= 1.2 ? 60 : current.ctr > 0 ? 35 : 20;
        signals.push({
            label: current.ctr >= 1.2 ? "CTR has initial signal" : "CTR signal is weak",
            detail: `Current CTR is ${current.ctr}%`,
            score,
            weight: 25,
        });
    }
    const previousCpm = previousAvg(previous.map((point) => point.cpm).filter((value) => value > 0));
    if (current.cpm <= 0) {
        signals.push({
            label: "CPM direction unavailable",
            detail: "No CPM value yet",
            score: 25,
            weight: 20,
        });
    }
    else if (previousCpm > 0) {
        const { score, deltaPct } = scoreDirection(current.cpm, previousCpm, false);
        signals.push({
            label: deltaPct <= 0 ? "CPM decreasing" : "CPM increasing",
            detail: `CPM is ${round(Math.abs(deltaPct))}% ${deltaPct <= 0 ? "below" : "above"} recent average`,
            score,
            weight: 20,
        });
    }
    else {
        signals.push({
            label: "CPM direction unavailable",
            detail: `Current CPM is ${current.cpm}`,
            score: 50,
            weight: 20,
        });
    }
    const previousSpend = previousAvg(previous.map((point) => point.spend).filter((value) => value > 0));
    if (previousSpend > 0) {
        const velocity = ((current.spend - previousSpend) / previousSpend) * 100;
        const profitable = current.roas >= current.breakEvenRoas;
        const score = Math.abs(velocity) <= 30 && profitable ? 90 :
            Math.abs(velocity) <= 30 ? 68 :
                velocity > 30 && profitable ? 58 :
                    velocity > 30 ? 30 :
                        50;
        signals.push({
            label: Math.abs(velocity) <= 30 ? "Spend scaling safely" : "Spend velocity needs caution",
            detail: `Spend changed ${round(Math.abs(velocity))}% vs recent average`,
            score,
            weight: 25,
        });
    }
    else {
        const enoughSpend = maturity.enoughEvidence;
        signals.push({
            label: enoughSpend ? "Spend and time sample are mature" : "Spend or time sample is thin",
            detail: `Current spend is ${round(maturity.spend, 2)} over ${maturity.days || "unknown"} days; ` +
                `target is about ${round(maturity.target, 2)} and 3 active days`,
            score: enoughSpend ? 75 : maturity.lowSpend ? 20 : 40,
            weight: 25,
        });
    }
    let score = Math.max(0, Math.min(100, Math.round(signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / 100)));
    if (maturity.lowSpend || !maturity.enoughTime) {
        score = Math.min(score, 45);
    }
    else if (maturity.enoughEvidence && input.clicks >= 80) {
        score = Math.min(100, score + 8);
    }
    return {
        score,
        level: confidenceLevel(score),
        signals: signals.sort((a, b) => (b.score * b.weight) - (a.score * a.weight)).slice(0, 4),
    };
}
async function getRecentComparableInputs(userId, payload) {
    const recent = await analysisRepository_1.AnalysisRepository.findRecentInputs(userId, 12);
    const productName = payload.product_name?.trim().toLowerCase();
    return recent
        .map((item) => exports.analysisInputSchema.safeParse(item.inputData).success
        ? exports.analysisInputSchema.parse(item.inputData)
        : null)
        .filter((input) => Boolean(input))
        .filter((input) => {
        if (!productName)
            return true;
        return input.product_name?.trim().toLowerCase() === productName;
    })
        .reverse()
        .slice(-3);
}
function fallbackAnalysis(rawInput, benchmark) {
    const derived = (0, aiService_1.deriveMetrics)(rawInput);
    const input = attributionAdjustedPayload(rawInput, derived);
    const maturity = evidenceMaturity(input, derived);
    const conversionCount = derived.effectiveConversions ?? input.purchases;
    const intentEvents = derived.effectiveIntentEvents ?? input.add_to_cart;
    const conversionLabel = derived.primaryConversionLabel ?? "purchases";
    const intentLabel = derived.intentEventLabel ?? "add-to-carts";
    const thresholds = ACCOUNT_THRESHOLDS[input.account_type ?? "dropship"];
    // Decision
    const enoughTraffic = (input.clicks >= thresholds.minClicks || input.impressions >= thresholds.minImpressions) && maturity.enoughEvidence;
    const weakCreative = benchmark ? input.ctr < benchmark.medianCtr : input.ctr < thresholds.ctrFloor * 0.67;
    const expensiveTraffic = benchmark ? input.cpm > benchmark.medianCpm * 1.25 : input.cpm > thresholds.expensiveCpm;
    const weakPurchaseSignal = input.clicks >= thresholds.weakConversionClicks && conversionCount === 0 && maturity.enoughEvidence;
    const weakDemand = input.clicks >= thresholds.minClicks && intentEvents <= thresholds.weakIntentCeiling && maturity.enoughEvidence;
    const returnDrag = maturity.enoughEvidence &&
        ((input.return_rate ?? 0) > 0 || (input.net_revenue ?? 0) > 0) &&
        (derived.grossRoas ?? derived.roas) >= derived.breakEvenRoas &&
        derived.roas < derived.breakEvenRoas;
    const goodEconomics = conversionCount >= thresholds.scaleConversions &&
        derived.roas >= derived.breakEvenRoas &&
        derived.profit > 0 &&
        input.ctr >= (benchmark ? Math.max(benchmark.medianCtr, thresholds.ctrFloor) : thresholds.ctrFloor);
    let finalDecision = "TEST AGAIN";
    let shortReason = "The sample is still thin. More data is needed before a hard call.";
    let confidence = "low";
    if (returnDrag) {
        finalDecision = derived.profit < 0 ? "KILL" : "FIX";
        shortReason =
            `Gross ROAS looks scalable (${derived.grossRoas ?? derived.roas}x), but net ROAS drops to ${derived.roas}x after ${derived.returnRate ?? 0}% returns. ` +
                "Do not scale until returns/refunds are fixed.";
        confidence = "high";
    }
    else if (goodEconomics) {
        finalDecision = "SCALE";
        shortReason = "The setup is profitable and engagement is healthy. Budget can be increased.";
        confidence = "high";
    }
    else if (weakCreative && enoughTraffic) {
        finalDecision = "FIX";
        shortReason = "CTR is too low for the traffic volume already collected. Creative-level issue.";
        confidence = "high";
    }
    else if (input.clicks >= thresholds.minClicks && intentEvents <= thresholds.weakIntentCeiling && !maturity.enoughEvidence) {
        finalDecision = "TEST AGAIN";
        shortReason =
            `Intent is weak, but this is too early to call it structurally broken: spend is $${round(maturity.spend, 2)} over ` +
                `${maturity.days || "unknown"} days. Wait for about $${round(maturity.target, 2)} spend and 3 active days before killing it.`;
        confidence = "low";
    }
    else if (weakDemand) {
        finalDecision = "KILL";
        shortReason =
            `Product is not generating enough intent after meaningful spend ($${round(maturity.spend, 2)} over ${maturity.days || "unknown"} days). ` +
                "This looks structurally broken rather than early noise.";
        confidence = "high";
    }
    else if (weakPurchaseSignal && intentEvents >= thresholds.intentFixFloor) {
        finalDecision = "FIX";
        shortReason = "Users click and show some cart intent, but the offer or funnel is blocking purchases.";
        confidence = "medium";
    }
    else if (weakPurchaseSignal && expensiveTraffic) {
        finalDecision = "KILL";
        shortReason = "Traffic is expensive and not converting. Setup is structurally weak.";
        confidence = "high";
    }
    else if (enoughTraffic) {
        finalDecision = "TEST AGAIN";
        shortReason = "Mixed signals. Continue only with a tighter iteration, not a blind budget increase.";
        confidence = "medium";
    }
    // Diagnosis
    let mainProblem = "Offer problem";
    let diagWhy = "Commercial intent is not strong enough yet to produce profitable outcomes.";
    let proofMetric = `ROAS ${derived.roas} vs break-even ${derived.breakEvenRoas}`;
    if (weakCreative) {
        mainProblem = "Creative problem";
        diagWhy = "The ad is not winning enough attention at the impression-to-click stage.";
        proofMetric = benchmark ? `CTR is ${input.ctr}% vs ${benchmark.niche}/${benchmark.country} median ${benchmark.medianCtr}%` : `CTR is ${input.ctr}%`;
    }
    else if (expensiveTraffic) {
        mainProblem = "Targeting problem";
        diagWhy = "Traffic acquisition is too expensive relative to click quality.";
        proofMetric = benchmark ? `CPM is ${input.cpm} vs ${benchmark.niche}/${benchmark.country} median ${benchmark.medianCpm}` : `CPM is ${input.cpm}`;
    }
    else if (intentEvents >= 3 && conversionCount === 0) {
        mainProblem = "Funnel problem";
        diagWhy = "Users show intent but something breaks before conversion.";
        proofMetric = `${intentEvents} ${intentLabel} and 0 ${conversionLabel}`;
    }
    else if (input.clicks >= 60 && intentEvents <= 1) {
        mainProblem = "Product problem";
        diagWhy = "Demand collapses once users evaluate the offer.";
        proofMetric = `${input.clicks} clicks and only ${intentEvents} ${intentLabel}`;
    }
    // Action plan
    const actionPlans = {
        "Creative problem": [
            "Test 3 new hooks in the first 3 seconds built around the core pain point.",
            "Launch one UGC-style variant and one founder-style direct response variant.",
            "Cut the intro and move the product demonstration into the first scene.",
        ],
        "Targeting problem": [
            "Split broad and interest audiences into separate ad sets and cap the worst CPM set.",
            "Test one cleaner country cluster or audience segment instead of scaling the current pool.",
            "Refresh the ad with a stronger relevance angle before buying more impressions.",
        ],
        "Funnel problem": [
            "Review checkout friction and remove unnecessary fields or steps.",
            "Add trust proof above the fold on the product page and next to the CTA.",
            "Test a stronger offer: bundle, discount, or shipping incentive on the same traffic.",
        ],
        "Product problem": [
            "Stop budget expansion and test a new product angle before buying more traffic.",
            "Rewrite the product promise to focus on one specific outcome, not a broad claim.",
            "Compare this product against one alternative offer with clearer perceived value.",
        ],
        "Offer problem": [
            "Rewrite the headline around one direct benefit and match it to the ad promise.",
            "Test one stronger price anchor or bundle to improve perceived value.",
            "Add proof blocks: reviews, before-after evidence, or guarantee near the primary CTA.",
        ],
    };
    const actionPlan = actionPlans[mainProblem];
    // Validation
    let verdict = "unclear";
    let validationReason = `Signals are present but not strong enough yet vs break-even ROAS ${derived.breakEvenRoas}.`;
    let shouldContinueTesting = true;
    if (input.ctr >= 1.5 && (intentEvents >= 3 || conversionCount >= 1)) {
        verdict = "high potential";
        validationReason = "The setup shows engagement and at least one commercial signal worth building on.";
    }
    else if (mainProblem === "Product problem" && input.clicks >= 80 && maturity.enoughEvidence) {
        verdict = "low potential";
        validationReason = "Product consumed enough traffic to judge demand. Intent signal remains weak.";
        shouldContinueTesting = false;
    }
    // Profitability
    const isProfitable = derived.currentCpa !== null && derived.currentCpa <= derived.breakEvenCpa;
    // Funnel leak
    const clickRate = input.impressions > 0 ? input.clicks / input.impressions : 0;
    const atcRate = input.clicks > 0 ? intentEvents / input.clicks : 0;
    const purchaseRate = intentEvents > 0 ? conversionCount / intentEvents : 0;
    const stages = [
        {
            weakestStage: "impressions → clicks",
            score: clickRate,
            explanation: "Too few people click after seeing the ad — weak hook or low relevance.",
        },
        {
            weakestStage: "clicks → add to cart",
            score: atcRate,
            explanation: "People click but don't build buying intent — offer or product page issue.",
        },
        {
            weakestStage: "add to cart → purchase",
            score: purchaseRate,
            explanation: "Users show buying intent but drop before purchase — checkout friction or low trust.",
        },
    ].sort((a, b) => a.score - b.score);
    const weakest = stages[0];
    const funnelSeverity = weakest.score < 0.1 ? "high" : weakest.score < 0.25 ? "medium" : "low";
    // Creative angles
    const creativeAngles = mainProblem === "Creative problem"
        ? [
            {
                hookIdea: `Show the frustrating before-state with ${input.product_name ?? "the product"} in the first 3 seconds.`,
                concept: "Open with the problem in real life, then cut to the product solving it.",
                targetEmotion: "relief",
            },
            {
                hookIdea: `Fast problem-solution comparison for ${input.product_name ?? "the product"}.`,
                concept: "Split-screen what life looks like without vs. after using it.",
                targetEmotion: "curiosity",
            },
            {
                hookIdea: `Unexpected result claim tied to ${input.product_name ?? "the product"}.`,
                concept: "Lead with the outcome first, then back it up with a visual demonstration.",
                targetEmotion: "desire",
            },
        ]
        : [
            {
                hookIdea: `Lead with the clearest outcome buyers want from ${input.product_name ?? "the product"}.`,
                concept: "Open with the finished result before explaining how the product helps achieve it.",
                targetEmotion: "desire",
            },
            {
                hookIdea: `Customer-style reaction to ${input.product_name ?? "the product"} as the opening line.`,
                concept: "Make the ad feel like a real user discovered something worth sharing.",
                targetEmotion: "trust",
            },
            {
                hookIdea: "Turn the main buyer objection into the first 3 seconds.",
                concept: "Call out the doubt directly, then answer it with a visual proof moment.",
                targetEmotion: "confidence",
            },
        ];
    // Continue decision
    let continueDecision;
    if (maturity.enoughEvidence && conversionCount === 0) {
        continueDecision = {
            decision: "STOP",
            reason: `Spend is already high relative to break-even ($${round(maturity.spend, 2)} over ${maturity.days || "unknown"} days) and there are still no ${conversionLabel}.`,
            minimumAdditionalTestNeeded: "Change the offer, product angle, or creative first.",
        };
    }
    else if (finalDecision === "SCALE") {
        continueDecision = {
            decision: "CONTINUE",
            reason: "The setup shows profitable signals. Keep pushing while monitoring efficiency.",
            minimumAdditionalTestNeeded: "Increase budget gradually and watch if conversion efficiency holds.",
        };
    }
    else if (!maturity.enoughEvidence) {
        continueDecision = {
            decision: "TEST MORE",
            reason: `This is too early for a hard stop: current spend is $${round(maturity.spend, 2)} over ${maturity.days || "unknown"} days.`,
            minimumAdditionalTestNeeded: `Reach about $${round(maturity.target, 2)} total spend` +
                `${maturity.needsDays > 0 ? ` and ${maturity.needsDays} more active day${maturity.needsDays === 1 ? "" : "s"}` : ""} before making a KILL/SCALE call.`,
        };
    }
    else {
        continueDecision = {
            decision: "TEST MORE",
            reason: "Not enough clarity yet for a full stop or scale. Next test should be more focused.",
            minimumAdditionalTestNeeded: `Run one tighter iteration until at least $${round(maturity.target, 2)} total spend and 3 active days.`,
        };
    }
    return {
        decision: { finalDecision, shortReason, confidence },
        diagnosis: { mainProblem, why: diagWhy, proofMetric },
        actionPlan,
        validation: { verdict, reason: validationReason, shouldContinueTesting },
        profitability: {
            breakEvenCpa: derived.breakEvenCpa,
            breakEvenRoas: derived.breakEvenRoas,
            maxCpcAtCurrentConversion: derived.maxCpcAtCurrentConversion,
            currentCpa: derived.currentCpa,
            isProfitable,
            why: derived.currentCpa === null
                ? "No purchases yet, so acquisition cost is still unproven."
                : isProfitable
                    ? "Current CPA is below break-even, so the setup can support profit at this level."
                    : "Current CPA exceeds break-even, so this setup is losing money at scale.",
        },
        funnelLeak: {
            weakestStage: weakest.weakestStage,
            explanation: weakest.explanation,
            severity: funnelSeverity,
        },
        creativeAngles,
        continueDecision,
        attributionAdjustment: derived.attributionAdjustment ?? undefined,
        benchmarkComparison: (0, communityBenchmarkService_1.buildBenchmarkComparison)(input, benchmark),
        derived,
        provider: "rules",
    };
}
function applyLtvAdjustment(result, input, ltv, confidenceScore) {
    const ltvBreakEvenRoas = ltv.ltvBreakEvenRoas;
    const ltvBreakEvenCpa = ltv.ltvBreakEvenCpa;
    const conversionRate = result.derived.conversionRate;
    const maxCpcAtCurrentConversion = conversionRate > 0 ? round(ltvBreakEvenCpa * (conversionRate / 100), 2) : 0;
    const currentCpa = result.derived.currentCpa;
    const firstOrderProfitable = result.derived.roas >= ltv.firstOrderBreakEvenRoas ||
        (currentCpa !== null && currentCpa <= ltv.firstOrderBreakEvenCpa);
    const ltvProfitable = result.derived.roas >= ltvBreakEvenRoas ||
        (currentCpa !== null && currentCpa <= ltvBreakEvenCpa);
    const ltvChangesCall = !firstOrderProfitable && ltvProfitable;
    const isProfitable = currentCpa !== null && currentCpa <= ltvBreakEvenCpa;
    let finalDecision = result.decision.finalDecision;
    let shortReason = result.decision.shortReason;
    let validation = result.validation;
    let continueDecision = result.continueDecision;
    if (ltvChangesCall) {
        const note = `LTV adjustment changed the call: current ROAS ${result.derived.roas}x is below first-order break-even ` +
            `${ltv.firstOrderBreakEvenRoas}x but above LTV-adjusted break-even ${ltvBreakEvenRoas}x.`;
        shortReason = `${shortReason} ${note}`;
        if (confidenceScore >= 50 && input.purchases >= 2 && input.ctr >= 1.2) {
            finalDecision = "SCALE";
            continueDecision = {
                decision: "CONTINUE",
                reason: "LTV-adjusted economics are viable, so this can continue with careful budget monitoring.",
                minimumAdditionalTestNeeded: "Scale gradually and watch whether repeat-order economics hold.",
            };
        }
        else if (confidenceScore >= 50 && finalDecision === "KILL") {
            finalDecision = "TEST AGAIN";
            continueDecision = {
                decision: "TEST MORE",
                reason: "First-order economics look weak, but Shopify repeat purchase data keeps the setup viable.",
                minimumAdditionalTestNeeded: "Run one more controlled test before stopping this product.",
            };
        }
        validation = {
            verdict: validation.verdict === "low potential" ? "unclear" : validation.verdict,
            reason: `${validation.reason} Shopify LTV data lowers break-even from ${ltv.firstOrderBreakEvenRoas}x to ${ltvBreakEvenRoas}x.`,
            shouldContinueTesting: true,
        };
    }
    return {
        ...result,
        decision: {
            ...result.decision,
            finalDecision,
            shortReason,
        },
        validation,
        profitability: {
            ...result.profitability,
            breakEvenCpa: ltvBreakEvenCpa,
            breakEvenRoas: ltvBreakEvenRoas,
            maxCpcAtCurrentConversion,
            isProfitable,
            why: currentCpa === null
                ? `No purchases yet, so acquisition cost is unproven. LTV-adjusted break-even CPA is ${ltvBreakEvenCpa}.`
                : isProfitable
                    ? `Current CPA is below the LTV-adjusted break-even CPA (${ltvBreakEvenCpa}), so the setup can support profit over customer lifetime.`
                    : `Current CPA exceeds the LTV-adjusted break-even CPA (${ltvBreakEvenCpa}), so repeat purchases do not cover acquisition cost yet.`,
        },
        continueDecision,
        derived: {
            ...result.derived,
            breakEvenRoas: ltvBreakEvenRoas,
            breakEvenCpa: ltvBreakEvenCpa,
            maxCpcAtCurrentConversion,
        },
    };
}
function applyEvidenceMaturityAdjustment(result, input) {
    const maturity = evidenceMaturity(input, result.derived);
    if (maturity.enoughEvidence) {
        if (result.decision.finalDecision === "KILL") {
            return {
                ...result,
                decision: {
                    ...result.decision,
                    shortReason: `${result.decision.shortReason} This is based on meaningful spend ($${round(maturity.spend, 2)} over ${maturity.days || "unknown"} days), so the issue looks structural rather than early noise.`,
                },
                continueDecision: {
                    ...result.continueDecision,
                    minimumAdditionalTestNeeded: result.continueDecision.decision === "STOP"
                        ? "No more spend is needed before stopping this exact setup; change the offer, creative, or product angle first."
                        : result.continueDecision.minimumAdditionalTestNeeded,
                },
            };
        }
        return result;
    }
    return {
        ...result,
        decision: {
            ...result.decision,
            finalDecision: result.decision.finalDecision === "KILL" ? "TEST AGAIN" : result.decision.finalDecision,
            shortReason: `Spend/time evidence is still thin ($${round(maturity.spend, 2)} over ${maturity.days || "unknown"} days), so this is too early for a hard KILL. ${result.decision.shortReason}`,
            confidence: "low",
            confidenceScore: Math.min(result.decision.confidenceScore ?? 45, 45),
        },
        validation: {
            ...result.validation,
            verdict: result.validation.verdict === "low potential" ? "unclear" : result.validation.verdict,
            shouldContinueTesting: true,
        },
        continueDecision: {
            decision: "TEST MORE",
            reason: `This is too early for a hard stop: current spend is $${round(maturity.spend, 2)} over ${maturity.days || "unknown"} days.`,
            minimumAdditionalTestNeeded: `Reach about $${round(maturity.target, 2)} total spend` +
                `${maturity.needsDays > 0 ? ` and ${maturity.needsDays} more active day${maturity.needsDays === 1 ? "" : "s"}` : ""} before making a KILL/SCALE call.`,
        },
    };
}
function applyReturnRateAdjustment(result) {
    const grossRoas = result.derived.grossRoas ?? result.derived.roas;
    const returnRate = result.derived.returnRate ?? 0;
    const returnDrag = returnRate > 0 && grossRoas >= result.derived.breakEvenRoas && result.derived.roas < result.derived.breakEvenRoas;
    if (!returnDrag)
        return result;
    const finalDecision = result.derived.profit < 0 ? "KILL" : "FIX";
    return {
        ...result,
        decision: {
            ...result.decision,
            finalDecision,
            shortReason: `Gross ROAS looks scalable (${grossRoas}x), but net ROAS drops to ${result.derived.roas}x after ${returnRate}% returns. ` +
                "Do not scale until returns/refunds are fixed.",
        },
        validation: {
            ...result.validation,
            verdict: result.validation.verdict === "high potential" ? "unclear" : result.validation.verdict,
            shouldContinueTesting: true,
        },
        continueDecision: {
            decision: "TEST MORE",
            reason: "Returns are changing the economics enough that the gross-revenue verdict is unsafe.",
            minimumAdditionalTestNeeded: "Fix the return/refund driver or verify a lower return rate before increasing budget.",
        },
    };
}
function applySeasonalityAdjustment(result, date = new Date()) {
    const season = (0, seasonality_1.getSeasonContext)(date);
    if (!season.isMaterial)
        return result;
    const currentScore = result.decision.confidenceScore ?? 50;
    const adjustedScore = Math.max(0, Math.min(100, currentScore + season.confidenceBonus));
    const adjustedLevel = confidenceLevel(adjustedScore);
    const seasonalSignal = {
        label: `Season: ${season.label}`,
        detail: season.note ?? `${season.label} — market baseline adjusted`,
        score: Math.max(0, Math.min(100, 50 + season.confidenceBonus)),
        weight: 0,
    };
    const updatedSignals = [...(result.decision.confidenceSignals ?? []), seasonalSignal].slice(0, 5);
    const shortReason = season.note
        ? `${result.decision.shortReason} ${season.note}`
        : result.decision.shortReason;
    return {
        ...result,
        decision: {
            ...result.decision,
            shortReason,
            confidence: adjustedLevel,
            confidenceScore: adjustedScore,
            confidenceSignals: updatedSignals,
        },
        seasonContext: {
            month: season.month,
            weekOfYear: season.weekOfYear,
            label: season.label,
            isMaterial: season.isMaterial,
            note: season.note,
            ctrMultiplier: season.ctrMultiplier,
            convMultiplier: season.convMultiplier,
            confidenceBonus: season.confidenceBonus,
        },
    };
}
async function createAnalysis(userId, payload) {
    let analysisPayload = await enrichBenchmarkBucket(userId, payload);
    analysisPayload = await enrichAttributionFromShopify(userId, analysisPayload).catch(() => analysisPayload);
    const benchmark = await (0, communityBenchmarkService_1.getCommunityBenchmarkForInput)(analysisPayload).catch(() => null);
    const normalizedStage = analysisPayload.stage === "testing"
        ? client_1.AnalysisStage.testing
        : analysisPayload.stage === "scaling"
            ? client_1.AnalysisStage.scaling
            : client_1.AnalysisStage.retesting;
    let shopifyCreds = null;
    try {
        shopifyCreds = await (0, integrationService_1.getShopifyConnectionCredentials)(userId);
        if (shopifyCreds && !analysisPayload.net_revenue && !analysisPayload.return_rate) {
            const returnRate = await (0, shopifyLtvService_1.computeReturnRateFromConnection)(shopifyCreds.storeUrl, shopifyCreds.accessToken, analysisPayload.product_name, 90);
            if (returnRate && returnRate.returnedQuantity > 0) {
                analysisPayload = {
                    ...analysisPayload,
                    return_rate: Math.round(returnRate.returnRate * 10000) / 100,
                };
            }
        }
    }
    catch {
        // Return-rate enrichment is best-effort; user-supplied values still work.
    }
    let partialResult;
    try {
        partialResult = await (0, aiService_1.runAiAnalysis)(analysisPayload);
    }
    catch (error) {
        console.error("[analysis] GigaChat failed, using fallback logic", error);
        partialResult = fallbackAnalysis(analysisPayload, benchmark);
    }
    if (benchmark) {
        partialResult = fallbackAnalysis(analysisPayload, benchmark);
    }
    partialResult = {
        ...partialResult,
        attributionAdjustment: partialResult.derived.attributionAdjustment ?? partialResult.attributionAdjustment,
        benchmarkComparison: partialResult.benchmarkComparison ?? (0, communityBenchmarkService_1.buildBenchmarkComparison)(analysisPayload, benchmark),
    };
    const confidence = computeRecommendationConfidence(analysisPayload, await getRecentComparableInputs(userId, analysisPayload));
    const calibration = await (0, recommendationOutcomeService_1.getUserConfidenceCalibration)(userId);
    const calibratedConfidence = {
        ...confidence,
        score: Math.max(0, Math.min(100, confidence.score + calibration.adjustment)),
    };
    calibratedConfidence.level = confidenceLevel(calibratedConfidence.score);
    if (calibration.adjustment !== 0) {
        calibratedConfidence.signals = [
            ...calibratedConfidence.signals,
            {
                label: "Account accuracy calibration",
                detail: calibration.accuracyPct === null
                    ? "No account-level accuracy history yet"
                    : `Recent Operon verdict accuracy is ${calibration.accuracyPct}% across ${calibration.evaluatedCount} evaluated outcomes`,
                score: calibration.adjustment > 0 ? 85 : 35,
                weight: 10,
            },
        ].slice(0, 4);
    }
    partialResult = {
        ...partialResult,
        decision: {
            ...partialResult.decision,
            finalDecision: calibratedConfidence.score < 50 ? "TEST AGAIN" : partialResult.decision.finalDecision,
            shortReason: calibratedConfidence.score < 50
                ? `Confidence is below 50%, so this is surfaced as Watch until more signal is available. ${partialResult.decision.shortReason}`
                : partialResult.decision.shortReason,
            confidence: calibratedConfidence.level,
            confidenceScore: calibratedConfidence.score,
            confidenceSignals: calibratedConfidence.signals,
        },
    };
    partialResult = applyEvidenceMaturityAdjustment(partialResult, analysisPayload);
    partialResult = applyReturnRateAdjustment(partialResult);
    partialResult = applySeasonalityAdjustment(partialResult);
    let ltvAdjustment;
    try {
        const creds = shopifyCreds ?? await (0, integrationService_1.getShopifyConnectionCredentials)(userId);
        if (creds) {
            const ltvResult = await (0, shopifyLtvService_1.computeLtvFromConnection)(creds.storeUrl, creds.accessToken, analysisPayload.product_price, analysisPayload.cost, analysisPayload.product_name);
            if (ltvResult?.hasEnoughHistory) {
                ltvAdjustment = { ...ltvResult, shopifyConnected: true };
                partialResult = applyLtvAdjustment(partialResult, attributionAdjustedPayload(analysisPayload, partialResult.derived), ltvResult, calibratedConfidence.score);
            }
        }
    }
    catch {
        // LTV enrichment is best-effort; fall back silently
    }
    const result = { ...partialResult, saved: true, ltvAdjustment };
    const analysis = await analysisRepository_1.AnalysisRepository.create({
        userId,
        stage: normalizedStage,
        inputData: analysisPayload,
        result: result,
    });
    await (0, recommendationOutcomeService_1.recordRecommendationOutcomes)(userId, analysis.id, analysisPayload, result).catch((error) => {
        console.error("[recommendation-outcomes] Failed to record recommendation outcome:", error);
    });
    // Attach the DB id so the frontend can reference it
    const finalResult = { ...result, savedId: analysis.id };
    return { ...analysis, result: finalResult };
}
async function listAnalyses(userId) {
    return analysisRepository_1.AnalysisRepository.findByUserId(userId, 20);
}
