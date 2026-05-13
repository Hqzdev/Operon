import {
  type AnalysisDecision,
  type AnalysisInput,
  type AnalysisOutput,
  type ConfidenceLevel,
  type ConfidenceSignal,
} from "@/lib/analysis-schema";
import { deriveAttributionAdjustment } from "@/lib/attribution";
import { getSeasonContext, type SeasonContext } from "@/lib/seasonality";

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function normalizedReturnRate(input: AnalysisInput) {
  const raw = input.return_rate ?? 0;
  const decimal = raw > 1 ? raw / 100 : raw;
  return Math.max(0, Math.min(1, decimal));
}

function effectiveRevenue(input: AnalysisInput) {
  if (typeof input.net_revenue === "number" && input.net_revenue > 0) return input.net_revenue;
  return input.revenue * (1 - normalizedReturnRate(input));
}

type AccountMetrics = {
  accountType: AnalysisInput["account_type"];
  conversions: number;
  intentEvents: number;
  revenue: number;
  unitCost: number;
  unitValue: number;
  conversionLabel: string;
  intentLabel: string;
  revenueBasis: "order_revenue" | "subscription_ltv" | "lead_value";
  subscriptionLtv?: number;
  leadValue?: number;
};

const ACCOUNT_THRESHOLDS: Record<NonNullable<AnalysisInput["account_type"]>, {
  minClicks: number;
  minImpressions: number;
  weakIntentCeiling: number;
  weakConversionClicks: number;
  intentFixFloor: number;
  scaleConversions: number;
  ctrFloor: number;
  expensiveCpm: number;
}> = {
  dropship: { minClicks: 80, minImpressions: 5000, weakIntentCeiling: 1, weakConversionClicks: 60, intentFixFloor: 3, scaleConversions: 2, ctrFloor: 1.5, expensiveCpm: 60 },
  dtc: { minClicks: 80, minImpressions: 5000, weakIntentCeiling: 1, weakConversionClicks: 60, intentFixFloor: 3, scaleConversions: 2, ctrFloor: 1.4, expensiveCpm: 70 },
  subscription: { minClicks: 100, minImpressions: 6000, weakIntentCeiling: 1, weakConversionClicks: 80, intentFixFloor: 4, scaleConversions: 2, ctrFloor: 1.2, expensiveCpm: 80 },
  leadgen: { minClicks: 80, minImpressions: 4000, weakIntentCeiling: 1, weakConversionClicks: 50, intentFixFloor: 5, scaleConversions: 3, ctrFloor: 1.0, expensiveCpm: 90 },
  b2b: { minClicks: 60, minImpressions: 3000, weakIntentCeiling: 0, weakConversionClicks: 40, intentFixFloor: 3, scaleConversions: 2, ctrFloor: 0.8, expensiveCpm: 120 },
};

function accountMetrics(input: AnalysisInput): AccountMetrics {
  const accountType = input.account_type ?? "dropship";
  if (accountType === "subscription") {
    const conversions = input.subscription_starts ?? input.purchases;
    const churn = Math.max(input.monthly_churn_rate ?? 0, 0.1);
    const subscriptionLtv = (input.mrr ?? 0) * (1 / (churn / 100));
    return {
      accountType,
      conversions,
      intentEvents: input.add_to_cart,
      revenue: conversions * subscriptionLtv,
      unitCost: input.cost,
      unitValue: subscriptionLtv,
      conversionLabel: "subscription starts",
      intentLabel: "add-to-carts",
      revenueBasis: "subscription_ltv",
      subscriptionLtv: round(subscriptionLtv),
    };
  }

  if (accountType === "leadgen" || accountType === "b2b") {
    const conversions = input.qualified_leads ?? input.purchases;
    const leadValue = input.lead_value && input.lead_value > 0 ? input.lead_value : input.product_price;
    return {
      accountType,
      conversions,
      intentEvents: input.form_starts ?? input.add_to_cart,
      revenue: conversions * leadValue,
      unitCost: input.cost,
      unitValue: leadValue,
      conversionLabel: "qualified leads",
      intentLabel: "form starts",
      revenueBasis: "lead_value",
      leadValue: round(leadValue),
    };
  }

  return {
    accountType,
    conversions: input.purchases,
    intentEvents: input.add_to_cart,
    revenue: input.revenue,
    unitCost: input.cost,
    unitValue: input.product_price,
    conversionLabel: "purchases",
    intentLabel: "add-to-carts",
    revenueBasis: "order_revenue",
  };
}

function effectiveSpend(input: AnalysisInput, derived: ReturnType<typeof deriveMetrics>) {
  return input.total_spend && input.total_spend > 0 ? input.total_spend : derived.spend;
}

function spendTarget(derived: ReturnType<typeof deriveMetrics>) {
  return Math.max(150, derived.breakEvenCpa * 3, derived.breakEvenRoas * 50);
}

function attributionAdjustedInput(input: AnalysisInput, derived: ReturnType<typeof deriveMetrics>): AnalysisInput {
  if (!derived.attributionAdjustment) return input;
  return {
    ...input,
    purchases: derived.attributionAdjustment.adjustedPurchases,
    qualified_leads: input.account_type === "leadgen" || input.account_type === "b2b" ? derived.attributionAdjustment.adjustedPurchases : input.qualified_leads,
    subscription_starts: input.account_type === "subscription" ? derived.attributionAdjustment.adjustedPurchases : input.subscription_starts,
    revenue: derived.grossRevenue ?? input.revenue,
  };
}

function evidenceMaturity(input: AnalysisInput, derived: ReturnType<typeof deriveMetrics>) {
  const spend = effectiveSpend(input, derived);
  const target = spendTarget(derived);
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

export type LtvBreakEvenOverride = {
  ltvBreakEvenRoas: number;
  ltvBreakEvenCpa: number;
};

export type CommunityBenchmarkContext = {
  niche: string;
  country: string;
  sampleSize: number;
  medianCtr: number;
  medianCpc: number;
  medianCpm: number;
  medianAddToCartRate: number;
  medianPurchaseRate: number;
};

function benchmarkDelta(value: number, median: number) {
  if (median <= 0) return 0;
  return Math.round(((value - median) / median) * 100);
}

function buildBenchmarkComparison(input: AnalysisInput, benchmark?: CommunityBenchmarkContext | null) {
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
        value: round(addToCartRate),
        median: benchmark.medianAddToCartRate,
        deltaPct: benchmarkDelta(addToCartRate, benchmark.medianAddToCartRate),
        unit: "%" as const,
      },
      purchaseRate: {
        value: round(purchaseRate),
        median: benchmark.medianPurchaseRate,
        deltaPct: benchmarkDelta(purchaseRate, benchmark.medianPurchaseRate),
        unit: "%" as const,
      },
    },
  };
}

export function deriveMetrics(input: AnalysisInput, ltvOverride?: LtvBreakEvenOverride) {
  const attributionAdjustment = deriveAttributionAdjustment(
    input,
    Number(process.env.IOS_UNDER_ATTRIBUTION_MULTIPLIER ?? 1.25),
  );
  const commercial = accountMetrics(input);
  const spend = input.total_spend && input.total_spend > 0 ? input.total_spend : input.clicks * input.cpc;
  const adjustedPurchases = attributionAdjustment?.adjustedPurchases ?? commercial.conversions;
  const adjustedRevenue = attributionAdjustment ? commercial.revenue * attributionAdjustment.revenueUplift : commercial.revenue;
  const adjustedInput = { ...input, purchases: adjustedPurchases, revenue: adjustedRevenue };
  const netRevenue = effectiveRevenue(adjustedInput);
  const grossRoas = spend > 0 ? adjustedRevenue / spend : 0;
  const roas = spend > 0 ? netRevenue / spend : 0;
  const conversionRate = input.clicks > 0 ? (adjustedPurchases / input.clicks) * 100 : 0;
  const addToCartRate = input.clicks > 0 ? (commercial.intentEvents / input.clicks) * 100 : 0;
  const margin = Math.max(commercial.unitValue - commercial.unitCost, 0.01);
  const firstOrderBreakEvenRoas = commercial.unitValue / margin;
  const firstOrderBreakEvenCpa = margin;
  const breakEvenRoas = ltvOverride?.ltvBreakEvenRoas ?? firstOrderBreakEvenRoas;
  const breakEvenCpa = ltvOverride?.ltvBreakEvenCpa ?? firstOrderBreakEvenCpa;
  const currentCpa = adjustedPurchases > 0 ? spend / adjustedPurchases : null;
  const maxCpcAtCurrentConversion =
    conversionRate > 0 ? breakEvenCpa * (conversionRate / 100) : 0;
  const profit = netRevenue - spend - adjustedPurchases * commercial.unitCost;
  const netProfitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  return {
    accountType: commercial.accountType,
    primaryConversionLabel: commercial.conversionLabel,
    intentEventLabel: commercial.intentLabel,
    revenueBasis: commercial.revenueBasis,
    effectiveConversions: round(adjustedPurchases),
    effectiveIntentEvents: round(commercial.intentEvents),
    subscriptionLtv: commercial.subscriptionLtv,
    leadValue: commercial.leadValue,
    spend: round(spend),
    grossRevenue: round(adjustedRevenue),
    effectiveRevenue: round(netRevenue),
    grossRoas: round(grossRoas),
    returnRate: round(normalizedReturnRate(input) * 100),
    pixelPurchases: round(input.purchases),
    adjustedPurchases: round(adjustedPurchases),
    attributionPurchaseUplift: attributionAdjustment?.purchaseUplift,
    roas: round(roas),
    conversionRate: round(conversionRate),
    addToCartRate: round(addToCartRate),
    breakEvenRoas: round(breakEvenRoas),
    breakEvenCpa: round(breakEvenCpa),
    currentCpa: currentCpa === null ? null : round(currentCpa),
    maxCpcAtCurrentConversion: round(maxCpcAtCurrentConversion),
    profit: round(profit),
    netProfitMargin: round(netProfitMargin),
    attributionAdjustment,
  };
}

function decide(
  input: AnalysisInput,
  derived: ReturnType<typeof deriveMetrics>,
  season: SeasonContext,
  benchmark?: CommunityBenchmarkContext | null,
) {
  const maturity = evidenceMaturity(input, derived);
  const thresholds = ACCOUNT_THRESHOLDS[input.account_type ?? "dropship"];
  const conversionCount = derived.effectiveConversions ?? input.purchases;
  const intentEvents = derived.effectiveIntentEvents ?? input.add_to_cart;
  const enoughTraffic = (input.clicks >= thresholds.minClicks || input.impressions >= thresholds.minImpressions) && maturity.enoughEvidence;
  const weakCreative = benchmark ? input.ctr < benchmark.medianCtr : input.ctr < thresholds.ctrFloor * 0.67;
  const expensiveTraffic = benchmark ? input.cpm > benchmark.medianCpm * 1.25 : input.cpm > thresholds.expensiveCpm * season.cpmMultiplier;
  const killAtcCeiling = season.killReticence >= 0.5 ? 0 : thresholds.weakIntentCeiling;
  const weakPurchaseSignal = input.clicks >= thresholds.weakConversionClicks && conversionCount === 0 && maturity.enoughEvidence;
  const weakDemand = input.clicks >= thresholds.minClicks && intentEvents <= killAtcCeiling && maturity.enoughEvidence;
  const returnDrag =
    maturity.enoughEvidence &&
    (input.return_rate > 0 || (input.net_revenue ?? 0) > 0) &&
    derived.grossRoas >= derived.breakEvenRoas &&
    derived.roas < derived.breakEvenRoas;
  const ctrFloor = Math.max(thresholds.ctrFloor * 0.75, thresholds.ctrFloor - season.scaleEagerness * 0.5);
  const benchmarkCtrFloor = benchmark ? Math.max(benchmark.medianCtr, ctrFloor) : ctrFloor;
  const roasFloor = derived.breakEvenRoas * Math.max(0.88, 1 - season.scaleEagerness * 0.10);
  const purchasesMin = season.scaleEagerness >= 0.5 ? Math.max(1, thresholds.scaleConversions - 1) : thresholds.scaleConversions;
  const goodEconomics =
    conversionCount >= purchasesMin &&
    derived.roas >= roasFloor &&
    derived.profit > 0 &&
    input.ctr >= benchmarkCtrFloor;

  let finalDecision: AnalysisDecision = "TEST AGAIN";
  let shortReason = "The sample is still thin, so the setup needs more data before a hard call.";
  let confidence: ConfidenceLevel = "low";

  if (returnDrag) {
    finalDecision = derived.profit < 0 ? "KILL" : "FIX";
    shortReason =
      `Gross ROAS looks scalable (${derived.grossRoas}x), but net ROAS drops to ${derived.roas}x after ${derived.returnRate}% returns. ` +
      "Do not scale until returns/refunds are fixed.";
    confidence = "high";
  } else if (goodEconomics) {
    finalDecision = "SCALE";
    shortReason = "The setup is profitable and engagement is healthy, so budget can be increased without waiting.";
    confidence = "high";
  } else if (weakCreative && enoughTraffic) {
    finalDecision = "FIX";
    shortReason = "CTR is too low for the traffic volume already collected, which points to a creative-level issue.";
    confidence = "high";
  } else if (input.clicks >= thresholds.minClicks && intentEvents <= thresholds.weakIntentCeiling && !maturity.enoughEvidence) {
    finalDecision = "TEST AGAIN";
    shortReason =
      `Intent is weak, but this is too early to call a structural failure: spend is $${round(maturity.spend)} over ` +
      `${maturity.days || "unknown"} days. Wait for about $${round(maturity.target)} spend and at least 3 active days before killing it.`;
    confidence = "low";
  } else if (weakDemand) {
    finalDecision = "KILL";
    shortReason =
      `The product is not generating enough intent after meaningful spend ($${round(maturity.spend)} over ${maturity.days || "unknown"} days), ` +
      "so this looks structurally broken rather than just early noise.";
    confidence = "high";
  } else if (weakPurchaseSignal && intentEvents >= thresholds.intentFixFloor) {
    finalDecision = "FIX";
    shortReason = "Users click and show some cart intent, but the offer or funnel is blocking purchases.";
    confidence = "medium";
  } else if (weakPurchaseSignal && expensiveTraffic) {
    finalDecision = "KILL";
    shortReason = "Traffic is expensive and not converting, which makes the current setup structurally weak.";
    confidence = "high";
  } else if (enoughTraffic) {
    finalDecision = "TEST AGAIN";
    shortReason = "The setup has mixed signals. It should continue only with a tighter iteration, not with a blind budget increase.";
    confidence = "medium";
  }

  return { finalDecision, shortReason, confidence };
}

function confidenceFromSingleInput(
  input: AnalysisInput,
  derived: ReturnType<typeof deriveMetrics>,
  season: SeasonContext,
  benchmark?: CommunityBenchmarkContext | null,
) {
  const maturity = evidenceMaturity(input, derived);
  const signals: ConfidenceSignal[] = [
    {
      label: derived.currentCpa ? "CPA has purchase signal" : "CPA stability has limited data",
      detail: derived.currentCpa
        ? `Current CPA is $${derived.currentCpa}`
        : "Need purchase-bearing checks for a stronger CPA stability signal",
      score: derived.currentCpa ? 45 : 25,
      weight: 30,
    },
    {
      label: benchmark
        ? input.ctr >= benchmark.medianCtr ? "CTR beats niche median" : "CTR trails niche median"
        : input.ctr >= 1.5 ? "CTR has initial signal" : "CTR signal is weak",
      detail: benchmark
        ? `Current CTR is ${input.ctr}% vs ${benchmark.niche}/${benchmark.country} median ${benchmark.medianCtr}%`
        : `Current CTR is ${input.ctr}%`,
      score: benchmark
        ? input.ctr >= benchmark.medianCtr * 1.15 ? 80 : input.ctr >= benchmark.medianCtr ? 65 : input.ctr >= benchmark.medianCtr * 0.8 ? 45 : 25
        : input.ctr >= 2 ? 80 : input.ctr >= 1.2 ? 60 : input.ctr > 0 ? 35 : 20,
      weight: 25,
    },
    {
      label: "CPM direction unavailable",
      detail: input.cpm > 0 ? `Current CPM is ${input.cpm}` : "No CPM value yet",
      score: input.cpm > 0 ? 50 : 25,
      weight: 20,
    },
    {
      label: maturity.enoughEvidence ? "Spend and time sample are mature" : "Spend or time sample is thin",
      detail:
        `Current spend is $${round(maturity.spend)} over ${maturity.days || "unknown"} days; ` +
        `target is about $${round(maturity.target)} and 3 active days`,
      score: maturity.enoughEvidence ? 75 : maturity.lowSpend ? 20 : 40,
      weight: 25,
    },
  ];
  if (season.isMaterial) {
    signals.push({
      label: `Season: ${season.label}`,
      detail: season.note ?? `${season.label} — market baseline adjusted`,
      score: Math.max(0, Math.min(100, 50 + season.confidenceBonus)),
      weight: 0,
    });
  }
  let confidenceScore = Math.round(signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / 100);
  confidenceScore = Math.max(0, Math.min(100, confidenceScore + season.confidenceBonus));
  if (maturity.lowSpend || !maturity.enoughTime) {
    confidenceScore = Math.min(confidenceScore, 45);
  } else if (maturity.enoughEvidence && input.clicks >= 80) {
    confidenceScore = Math.min(100, confidenceScore + 8);
  }
  const confidence: ConfidenceLevel = confidenceScore >= 75 ? "high" : confidenceScore >= 50 ? "medium" : "low";
  return { confidenceScore, confidence, confidenceSignals: signals };
}

function diagnose(input: AnalysisInput, derived: ReturnType<typeof deriveMetrics>, benchmark?: CommunityBenchmarkContext | null) {
  const weakCtr = benchmark ? input.ctr < benchmark.medianCtr : input.ctr < 1;
  const expensiveCpm = benchmark ? input.cpm > benchmark.medianCpm * 1.25 : input.cpm > 60;
  const conversionCount = derived.effectiveConversions ?? input.purchases;
  const intentEvents = derived.effectiveIntentEvents ?? input.add_to_cart;
  const conversionLabel = derived.primaryConversionLabel ?? "purchases";
  const intentLabel = derived.intentEventLabel ?? "add-to-carts";
  if (weakCtr) {
    return {
      mainProblem: "Creative problem" as const,
      why: "The ad is not winning enough attention at the impression-to-click stage.",
      proofMetric: benchmark ? `CTR is ${input.ctr}% vs ${benchmark.niche}/${benchmark.country} median ${benchmark.medianCtr}%` : `CTR is ${input.ctr}%`,
    };
  }

  if (expensiveCpm && !weakCtr) {
    return {
      mainProblem: "Targeting problem" as const,
      why: "Traffic acquisition is too expensive relative to the quality of the click stream.",
      proofMetric: benchmark ? `CPM is ${input.cpm} vs ${benchmark.niche}/${benchmark.country} median ${benchmark.medianCpm}` : `CPM is ${input.cpm}`,
    };
  }

  if (intentEvents >= 3 && conversionCount === 0) {
    return {
      mainProblem: "Funnel problem" as const,
      why: "Users are interested enough to add to cart, but something breaks between intent and checkout completion.",
      proofMetric: `${intentEvents} ${intentLabel} and 0 ${conversionLabel}`,
    };
  }

  if (input.clicks >= 60 && intentEvents <= 1) {
    return {
      mainProblem: "Product problem" as const,
      why: "The audience clicks, but demand collapses once users evaluate the offer.",
      proofMetric: `${input.clicks} clicks and only ${intentEvents} ${intentLabel}`,
    };
  }

  return {
    mainProblem: "Offer problem" as const,
    why: "The click signal exists, but commercial intent is not strong enough to produce profitable outcomes yet.",
    proofMetric: `ROAS is ${derived.roas} against break-even ${derived.breakEvenRoas}`,
  };
}

function planActions(problem: ReturnType<typeof diagnose>) {
  switch (problem.mainProblem) {
    case "Creative problem":
      return [
        "Test 3 new hooks in the first 3 seconds built around the core pain point.",
        "Launch one UGC-style variant and one founder-style direct response variant.",
        "Cut the intro and move the product demonstration into the first scene.",
      ];
    case "Targeting problem":
      return [
        "Split broad and interest audiences into separate ad sets and cap the worst CPM set.",
        "Test one cleaner country cluster or audience segment instead of scaling the current pool.",
        "Refresh the ad with a stronger relevance angle before buying more impressions.",
      ];
    case "Funnel problem":
      return [
        "Review checkout friction and remove unnecessary fields or steps.",
        "Add trust proof above the fold on the product page and next to the CTA.",
        "Test a stronger offer: bundle, discount, or shipping incentive on the same traffic source.",
      ];
    case "Product problem":
      return [
        "Stop budget expansion and test a new product angle before buying more traffic.",
        "Rewrite the product promise to focus on one specific outcome, not a broad claim.",
        "Compare this product against one alternative offer with clearer perceived value.",
      ];
    case "Offer problem":
    default:
      return [
        "Rewrite the headline around one direct benefit and match it to the ad promise.",
        "Test one stronger price anchor or bundle to improve perceived value.",
        "Add proof blocks: reviews, before-after evidence, or guarantee near the primary CTA.",
      ];
  }
}

function validatePotential(
  input: AnalysisInput,
  derived: ReturnType<typeof deriveMetrics>,
  problem: ReturnType<typeof diagnose>,
) {
  const conversionCount = derived.effectiveConversions ?? input.purchases;
  const intentEvents = derived.effectiveIntentEvents ?? input.add_to_cart;
  if (input.ctr >= 1.5 && (intentEvents >= 3 || conversionCount >= 1)) {
    return {
      verdict: "high potential" as const,
      reason: "The setup already shows engagement and at least one commercial signal worth building on.",
      shouldContinueTesting: true,
    };
  }

  if (problem.mainProblem === "Product problem" && input.clicks >= 80 && evidenceMaturity(input, derived).enoughEvidence) {
    return {
      verdict: "low potential" as const,
      reason: "The product is consuming enough traffic to judge demand, and the intent signal remains weak.",
      shouldContinueTesting: false,
    };
  }

  return {
    verdict: "unclear" as const,
    reason: `There are some signals, but they are not strong enough yet versus break-even ROAS ${derived.breakEvenRoas}.`,
    shouldContinueTesting: true,
  };
}

function calculateProfitability(derived: ReturnType<typeof deriveMetrics>) {
  const isProfitable =
    derived.currentCpa !== null && derived.currentCpa <= derived.breakEvenCpa;

  return {
    breakEvenCpa: derived.breakEvenCpa,
    breakEvenRoas: derived.breakEvenRoas,
    maxCpcAtCurrentConversion: derived.maxCpcAtCurrentConversion,
    currentCpa: derived.currentCpa,
    isProfitable,
    why:
      derived.currentCpa === null
        ? "There are no purchases yet, so current acquisition cost is still unproven."
        : isProfitable
          ? "Current acquisition cost is below break-even, so the setup can support profit at this level."
          : "Current acquisition cost is above break-even, so this setup is mathematically losing money right now.",
  };
}

function detectFunnelLeak(input: AnalysisInput) {
  const clickRate = input.impressions > 0 ? input.clicks / input.impressions : 0;
  const metrics = accountMetrics(input);
  const atcRate = input.clicks > 0 ? metrics.intentEvents / input.clicks : 0;
  const purchaseRate = metrics.intentEvents > 0 ? metrics.conversions / metrics.intentEvents : 0;

  const stages = [
    {
      weakestStage: "impressions → clicks" as const,
      score: clickRate,
      explanation:
        "People see the ad but too few of them click, which usually points to a weak hook or low ad relevance.",
    },
    {
      weakestStage: "clicks → add to cart" as const,
      score: atcRate,
      explanation:
        `People click but do not start enough ${metrics.intentLabel}, which usually points to the offer or landing page.`,
    },
    {
      weakestStage: "add to cart → purchase" as const,
      score: purchaseRate,
      explanation:
        `People show intent but drop before ${metrics.conversionLabel}, which usually points to final-step friction or low trust.`,
    },
  ].sort((a, b) => a.score - b.score);

  const weakest = stages[0];
  const severity: "low" | "medium" | "high" =
    weakest.score < 0.1 ? "high" : weakest.score < 0.25 ? "medium" : "low";

  return {
    weakestStage: weakest.weakestStage,
    explanation: weakest.explanation,
    severity,
  };
}

function generateCreativeAngles(input: AnalysisInput, problem: ReturnType<typeof diagnose>) {
  const baseName = input.product_name;
  if (problem.mainProblem === "Creative problem") {
    return [
      {
        hookIdea: `Show the frustrating before-state with ${baseName} in the first 3 seconds.`,
        concept: "Open with the problem happening in real life, then cut straight to the product solving it.",
        targetEmotion: "relief",
      },
      {
        hookIdea: `Use a fast problem-solution comparison for ${baseName}.`,
        concept: "Split-screen what life looks like without the product versus after using it.",
        targetEmotion: "curiosity",
      },
      {
        hookIdea: `Start with an unexpected result claim tied to ${baseName}.`,
        concept: "Lead with the outcome first, then back it up with a short visual demonstration.",
        targetEmotion: "desire",
      },
    ];
  }

  return [
    {
      hookIdea: `Lead with the clearest outcome buyers want from ${baseName}.`,
      concept: "Open with the finished result before explaining how the product helps achieve it.",
      targetEmotion: "desire",
    },
    {
      hookIdea: `Use a customer-style reaction to ${baseName} as the opening line.`,
      concept: "Make the ad feel like a real user discovered something worth sharing.",
      targetEmotion: "trust",
    },
    {
      hookIdea: `Turn the main buyer objection into the first 3 seconds.`,
      concept: "Call out the doubt directly, then answer it with a visual proof moment.",
      targetEmotion: "confidence",
    },
  ];
}

function decideContinueOrStop(
  input: AnalysisInput,
  derived: ReturnType<typeof deriveMetrics>,
  decision: ReturnType<typeof decide>,
) {
  const maturity = evidenceMaturity(input, derived);
  const conversionCount = derived.effectiveConversions ?? input.purchases;
  const conversionLabel = derived.primaryConversionLabel ?? "purchases";
  if (maturity.enoughEvidence && conversionCount === 0) {
    return {
      decision: "STOP" as const,
      reason:
        `Spend is already high relative to break-even ($${round(maturity.spend)} over ${maturity.days || "unknown"} days) and there are still no ${conversionLabel}, so continuing this exact setup is hard to justify.`,
      minimumAdditionalTestNeeded: "Do not add more budget to this setup. Change the offer, product angle, or creative first.",
    };
  }

  if (!maturity.enoughEvidence) {
    return {
      decision: "TEST MORE" as const,
      reason:
        `This is too early for a hard stop: current spend is $${round(maturity.spend)} over ${maturity.days || "unknown"} days.`,
      minimumAdditionalTestNeeded:
        `Reach about $${round(maturity.target)} total spend` +
        `${maturity.needsDays > 0 ? ` and ${maturity.needsDays} more active day${maturity.needsDays === 1 ? "" : "s"}` : ""} before making a KILL/SCALE call.`,
    };
  }

  if (decision.finalDecision === "SCALE") {
    return {
      decision: "CONTINUE" as const,
      reason:
        "The setup is already showing profitable signals, so it makes sense to keep pushing while monitoring efficiency.",
      minimumAdditionalTestNeeded: "Increase budget gradually and watch if conversion efficiency holds.",
    };
  }

  return {
    decision: "TEST MORE" as const,
    reason:
      "There is not enough clarity yet for a full stop or full scale, but the next test should be more focused than the last one.",
    minimumAdditionalTestNeeded:
      `Run one tighter iteration until at least $${round(maturity.target)} total spend and 3 active days before making the next hard decision.`,
  };
}

export function runRuleAnalysis(
  input: AnalysisInput,
  ltvOverride?: LtvBreakEvenOverride,
  analysisDate?: Date,
  benchmark?: CommunityBenchmarkContext | null,
): Omit<AnalysisOutput, "saved" | "savedId"> {
  const season = getSeasonContext(analysisDate);
  const derived = deriveMetrics(input, ltvOverride);
  const signalInput = attributionAdjustedInput(input, derived);
  const baseDecision = decide(signalInput, derived, season, benchmark);
  const confidence = confidenceFromSingleInput(signalInput, derived, season, benchmark);
  const baseShortReason =
    confidence.confidenceScore < 50
      ? `Confidence is below 50%, so this is surfaced as Watch until more signal is available. ${baseDecision.shortReason}`
      : baseDecision.shortReason;
  const finalShortReason =
    season.isMaterial && season.note
      ? `${baseShortReason} ${season.note}`
      : baseShortReason;
  const decision = {
    ...baseDecision,
    finalDecision: confidence.confidenceScore < 50 ? "TEST AGAIN" as const : baseDecision.finalDecision,
    shortReason: finalShortReason,
    confidence: confidence.confidence,
    confidenceScore: confidence.confidenceScore,
    confidenceSignals: confidence.confidenceSignals,
  };
  const diagnosis = diagnose(signalInput, derived, benchmark);
  const actionPlan = planActions(diagnosis);
  const validation = validatePotential(signalInput, derived, diagnosis);
  const profitability = calculateProfitability(derived);
  const funnelLeak = detectFunnelLeak(signalInput);
  const creativeAngles = generateCreativeAngles(input, diagnosis);
  const continueDecision = decideContinueOrStop(signalInput, derived, decision);

  return {
    decision,
    diagnosis,
    actionPlan,
    validation,
    profitability,
    funnelLeak,
    creativeAngles,
    continueDecision,
    attributionAdjustment: derived.attributionAdjustment ?? undefined,
    benchmarkComparison: buildBenchmarkComparison(signalInput, benchmark),
    derived,
    provider: "rules",
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
