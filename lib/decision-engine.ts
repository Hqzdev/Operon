import {
  type AnalysisDecision,
  type AnalysisInput,
  type AnalysisOutput,
  type ConfidenceLevel,
  type ConfidenceSignal,
} from "@/lib/analysis-schema";

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

export function deriveMetrics(input: AnalysisInput) {
  const spend = input.clicks * input.cpc;
  const roas = spend > 0 ? input.revenue / spend : 0;
  const conversionRate = input.clicks > 0 ? (input.purchases / input.clicks) * 100 : 0;
  const addToCartRate = input.clicks > 0 ? (input.add_to_cart / input.clicks) * 100 : 0;
  const margin = Math.max(input.product_price - input.cost, 0.01);
  const breakEvenRoas = input.product_price / margin;
  const breakEvenCpa = margin;
  const currentCpa = input.purchases > 0 ? spend / input.purchases : null;
  const maxCpcAtCurrentConversion =
    conversionRate > 0 ? breakEvenCpa * (conversionRate / 100) : 0;
  const profit = input.revenue - spend - input.purchases * input.cost;
  const netProfitMargin = input.revenue > 0 ? (profit / input.revenue) * 100 : 0;

  return {
    spend: round(spend),
    roas: round(roas),
    conversionRate: round(conversionRate),
    addToCartRate: round(addToCartRate),
    breakEvenRoas: round(breakEvenRoas),
    breakEvenCpa: round(breakEvenCpa),
    currentCpa: currentCpa === null ? null : round(currentCpa),
    maxCpcAtCurrentConversion: round(maxCpcAtCurrentConversion),
    profit: round(profit),
    netProfitMargin: round(netProfitMargin),
  };
}

function decide(input: AnalysisInput, derived: ReturnType<typeof deriveMetrics>) {
  const enoughTraffic = input.clicks >= 80 || input.impressions >= 5000;
  const weakCreative = input.ctr < 1;
  const expensiveTraffic = input.cpm > 60;
  const weakPurchaseSignal = input.clicks >= 60 && input.purchases === 0;
  const weakDemand = input.clicks >= 80 && input.add_to_cart <= 1;
  const goodEconomics =
    input.purchases >= 2 &&
    derived.roas >= derived.breakEvenRoas &&
    derived.profit > 0 &&
    input.ctr >= 1.5;

  let finalDecision: AnalysisDecision = "TEST AGAIN";
  let shortReason = "The sample is still thin, so the setup needs more data before a hard call.";
  let confidence: ConfidenceLevel = "low";

  if (goodEconomics) {
    finalDecision = "SCALE";
    shortReason = "The setup is profitable and engagement is healthy, so budget can be increased without waiting.";
    confidence = "high";
  } else if (weakCreative && enoughTraffic) {
    finalDecision = "FIX";
    shortReason = "CTR is too low for the traffic volume already collected, which points to a creative-level issue.";
    confidence = "high";
  } else if (weakDemand) {
    finalDecision = "KILL";
    shortReason = "The product is not generating enough intent after meaningful traffic, so keeping spend live is inefficient.";
    confidence = "high";
  } else if (weakPurchaseSignal && input.add_to_cart >= 3) {
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

function confidenceFromSingleInput(input: AnalysisInput, derived: ReturnType<typeof deriveMetrics>) {
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
      label: input.ctr >= 1.5 ? "CTR has initial signal" : "CTR signal is weak",
      detail: `Current CTR is ${input.ctr}%`,
      score: input.ctr >= 2 ? 80 : input.ctr >= 1.2 ? 60 : input.ctr > 0 ? 35 : 20,
      weight: 25,
    },
    {
      label: "CPM direction unavailable",
      detail: input.cpm > 0 ? `Current CPM is ${input.cpm}` : "No CPM value yet",
      score: input.cpm > 0 ? 50 : 25,
      weight: 20,
    },
    {
      label: input.clicks >= 80 ? "Spend has enough sample" : "Spend sample is thin",
      detail: `Current spend is $${derived.spend} from ${input.clicks} clicks`,
      score: input.clicks >= 80 ? 55 : 30,
      weight: 25,
    },
  ];
  const confidenceScore = Math.round(signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / 100);
  const confidence: ConfidenceLevel = confidenceScore >= 75 ? "high" : confidenceScore >= 50 ? "medium" : "low";
  return { confidenceScore, confidence, confidenceSignals: signals };
}

function diagnose(input: AnalysisInput, derived: ReturnType<typeof deriveMetrics>) {
  if (input.ctr < 1) {
    return {
      mainProblem: "Creative problem" as const,
      why: "The ad is not winning enough attention at the impression-to-click stage.",
      proofMetric: `CTR is ${input.ctr}%`,
    };
  }

  if (input.cpm > 60 && input.ctr >= 1) {
    return {
      mainProblem: "Targeting problem" as const,
      why: "Traffic acquisition is too expensive relative to the quality of the click stream.",
      proofMetric: `CPM is ${input.cpm}`,
    };
  }

  if (input.add_to_cart >= 3 && input.purchases === 0) {
    return {
      mainProblem: "Funnel problem" as const,
      why: "Users are interested enough to add to cart, but something breaks between intent and checkout completion.",
      proofMetric: `${input.add_to_cart} add-to-carts and 0 purchases`,
    };
  }

  if (input.clicks >= 60 && input.add_to_cart <= 1) {
    return {
      mainProblem: "Product problem" as const,
      why: "The audience clicks, but demand collapses once users evaluate the offer.",
      proofMetric: `${input.clicks} clicks and only ${input.add_to_cart} add-to-carts`,
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
  if (input.ctr >= 1.5 && (input.add_to_cart >= 3 || input.purchases >= 1)) {
    return {
      verdict: "high potential" as const,
      reason: "The setup already shows engagement and at least one commercial signal worth building on.",
      shouldContinueTesting: true,
    };
  }

  if (problem.mainProblem === "Product problem" && input.clicks >= 80) {
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
  const atcRate = input.clicks > 0 ? input.add_to_cart / input.clicks : 0;
  const purchaseRate = input.add_to_cart > 0 ? input.purchases / input.add_to_cart : 0;

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
        "People click but do not build enough buying intent after landing, which usually points to the offer or product page.",
    },
    {
      weakestStage: "add to cart → purchase" as const,
      score: purchaseRate,
      explanation:
        "People show buying intent but drop before purchase, which usually points to checkout friction or low trust near the final step.",
    },
  ].sort((a, b) => a.score - b.score);

  const weakest = stages[0];
  const severity =
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
  if (derived.spend >= derived.breakEvenCpa * 3 && input.purchases === 0) {
    return {
      decision: "STOP" as const,
      reason:
        "Spend is already high relative to break-even and there are still no purchases, so continuing this exact setup is hard to justify.",
      minimumAdditionalTestNeeded: "Do not add more budget to this setup. Change the offer, product angle, or creative first.",
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
    minimumAdditionalTestNeeded: "Run one tighter iteration with clearer creative or offer changes before making the next hard decision.",
  };
}

export function runRuleAnalysis(input: AnalysisInput): Omit<AnalysisOutput, "saved" | "savedId"> {
  const derived = deriveMetrics(input);
  const baseDecision = decide(input, derived);
  const confidence = confidenceFromSingleInput(input, derived);
  const decision = {
    ...baseDecision,
    finalDecision: confidence.confidenceScore < 50 ? "TEST AGAIN" as const : baseDecision.finalDecision,
    shortReason:
      confidence.confidenceScore < 50
        ? `Confidence is below 50%, so this is surfaced as Watch until more signal is available. ${baseDecision.shortReason}`
        : baseDecision.shortReason,
    confidence: confidence.confidence,
    confidenceScore: confidence.confidenceScore,
    confidenceSignals: confidence.confidenceSignals,
  };
  const diagnosis = diagnose(input, derived);
  const actionPlan = planActions(diagnosis);
  const validation = validatePotential(input, derived, diagnosis);
  const profitability = calculateProfitability(derived);
  const funnelLeak = detectFunnelLeak(input);
  const creativeAngles = generateCreativeAngles(input, diagnosis);
  const continueDecision = decideContinueOrStop(input, derived, decision);

  return {
    decision,
    diagnosis,
    actionPlan,
    validation,
    profitability,
    funnelLeak,
    creativeAngles,
    continueDecision,
    derived,
    provider: "rules",
  };
}
