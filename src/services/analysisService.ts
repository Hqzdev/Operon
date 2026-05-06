import { AnalysisStage, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../models/prisma";
import { runAiAnalysis, deriveMetrics, type AiAnalysisResult } from "./aiService";
import { getShopifyConnectionCredentials } from "./integrationService";
import { computeLtvFromConnection, type LtvComputeResult } from "./shopifyLtvService";

export const analysisInputSchema = z.object({
  product_name: z.string().min(2).max(120).optional(),
  product_description: z.string().min(10).max(4000).optional(),
  product_price: z.number().positive(),
  cost: z.number().min(0),
  ctr: z.number().min(0),
  cpc: z.number().min(0),
  cpm: z.number().min(0),
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  add_to_cart: z.number().int().min(0),
  purchases: z.number().int().min(0),
  revenue: z.number().min(0),
  stage: z.enum(["testing", "scaling", "retesting"]).default("testing"),
});

export type AnalysisPayload = z.infer<typeof analysisInputSchema>;

type AnalysisResult = Omit<AiAnalysisResult, "provider"> & {
  provider: "gigachat" | "rules";
  saved: boolean;
  savedId?: string;
  ltvAdjustment?: LtvComputeResult & { shopifyConnected: boolean };
};

function fallbackAnalysis(input: AnalysisPayload): Omit<AnalysisResult, "saved" | "savedId"> {
  const derived = deriveMetrics(input);

  // Decision
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

  let finalDecision: "SCALE" | "KILL" | "TEST AGAIN" | "FIX" = "TEST AGAIN";
  let shortReason = "The sample is still thin. More data is needed before a hard call.";
  let confidence: "low" | "medium" | "high" = "low";

  if (goodEconomics) {
    finalDecision = "SCALE";
    shortReason = "The setup is profitable and engagement is healthy. Budget can be increased.";
    confidence = "high";
  } else if (weakCreative && enoughTraffic) {
    finalDecision = "FIX";
    shortReason = "CTR is too low for the traffic volume already collected. Creative-level issue.";
    confidence = "high";
  } else if (weakDemand) {
    finalDecision = "KILL";
    shortReason = "Product is not generating enough intent after meaningful traffic.";
    confidence = "high";
  } else if (weakPurchaseSignal && input.add_to_cart >= 3) {
    finalDecision = "FIX";
    shortReason = "Users click and show some cart intent, but the offer or funnel is blocking purchases.";
    confidence = "medium";
  } else if (weakPurchaseSignal && expensiveTraffic) {
    finalDecision = "KILL";
    shortReason = "Traffic is expensive and not converting. Setup is structurally weak.";
    confidence = "high";
  } else if (enoughTraffic) {
    finalDecision = "TEST AGAIN";
    shortReason = "Mixed signals. Continue only with a tighter iteration, not a blind budget increase.";
    confidence = "medium";
  }

  // Diagnosis
  let mainProblem: AiAnalysisResult["diagnosis"]["mainProblem"] = "Offer problem";
  let diagWhy = "Commercial intent is not strong enough yet to produce profitable outcomes.";
  let proofMetric = `ROAS ${derived.roas} vs break-even ${derived.breakEvenRoas}`;

  if (input.ctr < 1) {
    mainProblem = "Creative problem";
    diagWhy = "The ad is not winning enough attention at the impression-to-click stage.";
    proofMetric = `CTR is ${input.ctr}%`;
  } else if (input.cpm > 60 && input.ctr >= 1) {
    mainProblem = "Targeting problem";
    diagWhy = "Traffic acquisition is too expensive relative to click quality.";
    proofMetric = `CPM is ${input.cpm}`;
  } else if (input.add_to_cart >= 3 && input.purchases === 0) {
    mainProblem = "Funnel problem";
    diagWhy = "Users add to cart but something breaks between intent and checkout.";
    proofMetric = `${input.add_to_cart} add-to-carts and 0 purchases`;
  } else if (input.clicks >= 60 && input.add_to_cart <= 1) {
    mainProblem = "Product problem";
    diagWhy = "Demand collapses once users evaluate the offer.";
    proofMetric = `${input.clicks} clicks and only ${input.add_to_cart} add-to-carts`;
  }

  // Action plan
  const actionPlans: Record<AiAnalysisResult["diagnosis"]["mainProblem"], string[]> = {
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
  let verdict: "high potential" | "unclear" | "low potential" = "unclear";
  let validationReason = `Signals are present but not strong enough yet vs break-even ROAS ${derived.breakEvenRoas}.`;
  let shouldContinueTesting = true;

  if (input.ctr >= 1.5 && (input.add_to_cart >= 3 || input.purchases >= 1)) {
    verdict = "high potential";
    validationReason = "The setup shows engagement and at least one commercial signal worth building on.";
  } else if (mainProblem === "Product problem" && input.clicks >= 80) {
    verdict = "low potential";
    validationReason = "Product consumed enough traffic to judge demand. Intent signal remains weak.";
    shouldContinueTesting = false;
  }

  // Profitability
  const isProfitable =
    derived.currentCpa !== null && derived.currentCpa <= derived.breakEvenCpa;

  // Funnel leak
  const clickRate = input.impressions > 0 ? input.clicks / input.impressions : 0;
  const atcRate = input.clicks > 0 ? input.add_to_cart / input.clicks : 0;
  const purchaseRate = input.add_to_cart > 0 ? input.purchases / input.add_to_cart : 0;
  const stages = [
    {
      weakestStage: "impressions → clicks" as const,
      score: clickRate,
      explanation: "Too few people click after seeing the ad — weak hook or low relevance.",
    },
    {
      weakestStage: "clicks → add to cart" as const,
      score: atcRate,
      explanation: "People click but don't build buying intent — offer or product page issue.",
    },
    {
      weakestStage: "add to cart → purchase" as const,
      score: purchaseRate,
      explanation: "Users show buying intent but drop before purchase — checkout friction or low trust.",
    },
  ].sort((a, b) => a.score - b.score);
  const weakest = stages[0];
  const funnelSeverity: "low" | "medium" | "high" =
    weakest.score < 0.1 ? "high" : weakest.score < 0.25 ? "medium" : "low";

  // Creative angles
  const creativeAngles =
    mainProblem === "Creative problem"
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
  let continueDecision: AiAnalysisResult["continueDecision"];
  if (derived.spend >= derived.breakEvenCpa * 3 && input.purchases === 0) {
    continueDecision = {
      decision: "STOP",
      reason: "Spend is already high relative to break-even and there are still no purchases.",
      minimumAdditionalTestNeeded: "Change the offer, product angle, or creative first.",
    };
  } else if (finalDecision === "SCALE") {
    continueDecision = {
      decision: "CONTINUE",
      reason: "The setup shows profitable signals. Keep pushing while monitoring efficiency.",
      minimumAdditionalTestNeeded: "Increase budget gradually and watch if conversion efficiency holds.",
    };
  } else {
    continueDecision = {
      decision: "TEST MORE",
      reason: "Not enough clarity yet for a full stop or scale. Next test should be more focused.",
      minimumAdditionalTestNeeded: "Run one tighter iteration with clearer creative or offer changes.",
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
      why:
        derived.currentCpa === null
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
    derived,
    provider: "rules",
  };
}

export async function createAnalysis(userId: string, payload: AnalysisPayload) {
  const normalizedStage =
    payload.stage === "testing"
      ? AnalysisStage.testing
      : payload.stage === "scaling"
        ? AnalysisStage.scaling
        : AnalysisStage.retesting;

  let partialResult: Omit<AnalysisResult, "saved" | "savedId">;

  try {
    partialResult = await runAiAnalysis(payload);
  } catch (error) {
    console.error("[analysis] GigaChat failed, using fallback logic", error);
    partialResult = fallbackAnalysis(payload);
  }

  let ltvAdjustment: (LtvComputeResult & { shopifyConnected: boolean }) | undefined;
  try {
    const creds = await getShopifyConnectionCredentials(userId);
    if (creds) {
      const ltvResult = await computeLtvFromConnection(
        creds.storeUrl,
        creds.accessToken,
        payload.product_price,
        payload.cost,
      );
      if (ltvResult?.hasEnoughHistory) {
        ltvAdjustment = { ...ltvResult, shopifyConnected: true };
        const derived = partialResult.derived;
        // Append LTV note to shortReason when LTV changes the verdict
        if (
          derived.roas >= ltvResult.ltvBreakEvenRoas &&
          derived.roas < ltvResult.firstOrderBreakEvenRoas
        ) {
          partialResult = {
            ...partialResult,
            decision: {
              ...partialResult.decision,
              shortReason:
                `${partialResult.decision.shortReason} LTV adjustment: your current ROAS (${derived.roas}x) is below the first-order break-even (${ltvResult.firstOrderBreakEvenRoas}x) but above the LTV-adjusted break-even (${ltvResult.ltvBreakEvenRoas}x), so this setup is already profitable over the customer lifetime.`,
            },
          };
        }
      }
    }
  } catch {
    // LTV enrichment is best-effort; fall back silently
  }

  const result: AnalysisResult = { ...partialResult, saved: true, ltvAdjustment };

  const analysis = await prisma.analysis.create({
    data: {
      userId,
      stage: normalizedStage,
      inputData: payload as Prisma.InputJsonValue,
      result: result as Prisma.InputJsonValue,
    },
  });

  // Attach the DB id so the frontend can reference it
  const finalResult: AnalysisResult = { ...result, savedId: analysis.id };
  return { ...analysis, result: finalResult };
}

export async function listAnalyses(userId: string) {
  return prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
