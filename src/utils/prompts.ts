import type { AnalysisPayload } from "../services/analysisService";

function dataBlock(input: AnalysisPayload) {
  return JSON.stringify(input, null, 2);
}

const BASE_SYSTEM =
  "You are a strict e-commerce performance analyst. Return valid JSON only — no markdown, no text outside the JSON object.";

export const prompts = {
  decision: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Analyze this ad campaign and return one strict decision.

Possible decisions:
- SCALE  — profitable, CTR ≥ 1.5%, purchases confirmed
- KILL   — spend ≥ 3× break-even CPA with zero or near-zero purchases
- FIX    — CTR < 1% or clear targeting/creative problem
- TEST   — early data, not enough signal to SCALE or KILL

Return JSON:
{
  "decision": "SCALE" | "KILL" | "TEST" | "FIX",
  "confidence": "low" | "medium" | "high",
  "reason": "1–2 sentences, specific to the numbers"
}

Campaign data:
${dataBlock(input)}`,
  }),

  diagnosis: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Identify the single main performance problem in this campaign.

Possible problems:
- creative problem   — low CTR, weak ad hook
- targeting problem  — poor audience match, high CPM with low CTR
- offer problem      — page gets traffic but low conversion
- product problem    — product-market fit is not proven
- funnel problem     — add-to-cart but no purchase

Return JSON:
{
  "problem": "<one of the five above>",
  "diagnosis": "2–3 sentences explaining exactly what the data shows",
  "proof_metric": "the specific number that proves the diagnosis"
}

Campaign data:
${dataBlock(input)}`,
  }),

  actionPlan: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Give exactly 3 specific next actions for this campaign.

Rules:
- Each action must be concrete and executable, not generic
- Actions must directly address the current performance data
- No fluff, no obvious advice

Return JSON:
{
  "actions": ["action 1", "action 2", "action 3"]
}

Campaign data:
${dataBlock(input)}`,
  }),

  funnelLeak: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Find the weakest stage in this conversion funnel.

Funnel stages to evaluate:
- impressions → clicks
- clicks → add to cart
- add to cart → purchase

Return JSON:
{
  "weakest_stage": "impressions → clicks" | "clicks → add to cart" | "add to cart → purchase",
  "explanation": "what is causing the drop at this stage",
  "severity": "low" | "medium" | "high"
}

Campaign data:
${dataBlock(input)}`,
  }),

  breakEven: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Assess profitability of this campaign.

Calculate:
- break-even CPA = product_price - cost
- break-even ROAS = product_price / (product_price - cost)
- is_profitable = actual CPA ≤ break-even CPA (if purchases > 0)

Return JSON:
{
  "break_even_cpa": <number>,
  "is_profitable": <boolean>,
  "reason": "one sentence why it is or isn't profitable"
}

Campaign data:
${dataBlock(input)}`,
  }),

  continueOrStop: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Decide whether to continue testing this campaign or stop.

Consider:
- total spend vs break-even CPA
- number of purchases
- stage (testing / scaling / retesting)
- data volume relative to statistical significance

Return JSON:
{
  "decision": "CONTINUE" | "TEST MORE" | "STOP",
  "reason": "why this decision based on the numbers",
  "minimum_additional_test_needed": "what exactly to test next, or 'nothing' if stopping"
}

Campaign data:
${dataBlock(input)}`,
  }),

  creativeGenerator: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Generate 3 new direct-response ad angles for this product.

Rules:
- Each angle must address a real pain point or desire
- Hooks must be specific, not generic
- No clichés like "transform your life"

Return JSON:
{
  "creative_angles": [
    {
      "hook_idea": "opening line or visual concept (max 20 words)",
      "concept": "what the full ad communicates and how",
      "target_emotion": "the core emotion this triggers"
    }
  ]
}

Product: ${input.product_description ?? input.product_name ?? "e-commerce product"}
Performance context: CTR ${input.ctr}%, ${input.purchases} purchases from ${input.clicks} clicks`,
  }),

  validation: (input: AnalysisPayload) => ({
    system: BASE_SYSTEM,
    user: `Evaluate if this product has real market potential based on early performance data.

Consider:
- click-through rate as interest signal
- add-to-cart rate as intent signal
- conversion rate as demand confirmation
- cost efficiency relative to price

Return JSON:
{
  "verdict": "high potential" | "unclear" | "low potential",
  "reason": "2–3 sentences based on the actual numbers",
  "should_continue_testing": <boolean>
}

Campaign data:
${dataBlock(input)}`,
  }),
};
