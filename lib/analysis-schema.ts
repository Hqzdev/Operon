import { z } from "zod";

export const analysisInputSchema = z.object({
  product_name: z.string().min(2).max(120).default("Untitled product"),
  product_description: z.string().min(10).max(2000).default("General e-commerce product"),
  product_price: z.coerce.number().positive(),
  cost: z.coerce.number().min(0),
  ctr: z.coerce.number().min(0),
  cpc: z.coerce.number().min(0),
  cpm: z.coerce.number().min(0),
  impressions: z.coerce.number().int().min(0),
  clicks: z.coerce.number().int().min(0),
  add_to_cart: z.coerce.number().int().min(0),
  purchases: z.coerce.number().int().min(0),
  revenue: z.coerce.number().min(0),
  return_rate: z.coerce.number().min(0).max(100).default(0),
  net_revenue: z.coerce.number().min(0).optional(),
  total_spend: z.coerce.number().min(0).optional(),
  days_active: z.coerce.number().int().min(0).optional(),
  stage: z.enum(["testing", "scaling", "retesting"]),
});

export type AnalysisInput = z.infer<typeof analysisInputSchema>;

export type AnalysisDecision = "SCALE" | "KILL" | "TEST AGAIN" | "FIX";

export type ConfidenceLevel = "low" | "medium" | "high";

export type ConfidenceSignal = {
  label: string;
  detail: string;
  score: number;
  weight: number;
};

export type AnalysisOutput = {
  decision: {
    finalDecision: AnalysisDecision;
    shortReason: string;
    confidence: ConfidenceLevel;
    confidenceScore?: number;
    confidenceSignals?: ConfidenceSignal[];
  };
  diagnosis: {
    mainProblem:
      | "Creative problem"
      | "Targeting problem"
      | "Offer problem"
      | "Product problem"
      | "Funnel problem";
    why: string;
    proofMetric: string;
  };
  actionPlan: string[];
  validation: {
    verdict: "high potential" | "unclear" | "low potential";
    reason: string;
    shouldContinueTesting: boolean;
  };
  profitability: {
    breakEvenCpa: number;
    breakEvenRoas: number;
    maxCpcAtCurrentConversion: number;
    currentCpa: number | null;
    isProfitable: boolean;
    why: string;
  };
  funnelLeak: {
    weakestStage:
      | "impressions → clicks"
      | "clicks → add to cart"
      | "add to cart → purchase";
    explanation: string;
    severity: "low" | "medium" | "high";
  };
  creativeAngles: Array<{
    hookIdea: string;
    concept: string;
    targetEmotion: string;
  }>;
  continueDecision: {
    decision: "STOP" | "CONTINUE" | "TEST MORE";
    reason: string;
    minimumAdditionalTestNeeded: string;
  };
  ltvAdjustment?: {
    ltv: number;
    aov: number;
    repeatPurchaseRate: number;
    repeatPurchaseRate90?: number;
    repeatPurchaseRate180?: number;
    expectedRepeats?: number;
    ltvBreakEvenRoas: number;
    ltvBreakEvenCpa: number;
    firstOrderBreakEvenRoas: number;
    firstOrderBreakEvenCpa: number;
    shopifyConnected: boolean;
    ordersAnalyzed: number;
    customersAnalyzed: number;
    hasEnoughHistory: boolean;
    productMatched?: boolean;
    windowDays?: number;
  };
  derived: {
    spend: number;
    grossRevenue?: number;
    effectiveRevenue?: number;
    grossRoas?: number;
    returnRate?: number;
    roas: number;
    conversionRate: number;
    addToCartRate: number;
    breakEvenRoas: number;
    breakEvenCpa: number;
    currentCpa: number | null;
    maxCpcAtCurrentConversion: number;
    profit: number;
    netProfitMargin: number;
  };
  provider: "rules" | "gigachat";
  saved: boolean;
  savedId?: string;
};

export type AnalysisHistoryItem = {
  id: string;
  createdAt: string;
  input: AnalysisInput;
  output: AnalysisOutput;
};
