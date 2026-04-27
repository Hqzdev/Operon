"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisInputSchema = void 0;
exports.deriveMetrics = deriveMetrics;
exports.createAnalysis = createAnalysis;
exports.listAnalyses = listAnalyses;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma_1 = require("../models/prisma");
const aiService_1 = require("./aiService");
exports.analysisInputSchema = zod_1.z.object({
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
    stage: zod_1.z.enum(["testing", "scaling", "retesting"]).default("testing"),
});
function round(value, precision = 2) {
    return Number(value.toFixed(precision));
}
function deriveMetrics(input) {
    const spend = input.clicks * input.cpc;
    const conversionRate = input.clicks > 0 ? (input.purchases / input.clicks) * 100 : 0;
    const addToCartRate = input.clicks > 0 ? (input.add_to_cart / input.clicks) * 100 : 0;
    const margin = Math.max(input.product_price - input.cost, 0.01);
    const breakEvenCpa = margin;
    const breakEvenRoas = input.product_price / margin;
    const currentCpa = input.purchases > 0 ? spend / input.purchases : null;
    const roas = spend > 0 ? input.revenue / spend : 0;
    const maxCpcAtCurrentConversion = conversionRate > 0 ? breakEvenCpa * (conversionRate / 100) : 0;
    return {
        spend: round(spend),
        conversionRate: round(conversionRate),
        addToCartRate: round(addToCartRate),
        breakEvenCpa: round(breakEvenCpa),
        breakEvenRoas: round(breakEvenRoas),
        currentCpa: currentCpa === null ? null : round(currentCpa),
        roas: round(roas),
        maxCpcAtCurrentConversion: round(maxCpcAtCurrentConversion),
        isProfitable: currentCpa !== null ? currentCpa <= breakEvenCpa : false,
    };
}
function fallbackAnalysis(input) {
    const derived = deriveMetrics(input);
    const decision = derived.isProfitable && input.ctr >= 1.5
        ? "SCALE"
        : input.ctr < 1
            ? "FIX"
            : input.purchases === 0 && input.clicks >= 60
                ? "KILL"
                : "TEST";
    return {
        decision,
        confidence: derived.isProfitable ? "high" : "medium",
        problem: input.ctr < 1
            ? "creative problem"
            : input.add_to_cart > 0 && input.purchases === 0
                ? "funnel problem"
                : "offer problem",
        diagnosis: input.ctr < 1
            ? "The ad is not getting enough attention at the click stage."
            : "The setup is getting interest, but not enough buying action yet.",
        actions: [
            "Test 3 new creatives with a stronger opening hook",
            "Adjust the main offer so the value is clearer on first view",
            "Run one cleaner retest before increasing budget again",
        ],
        funnel_issue: input.add_to_cart > 0 && input.purchases === 0
            ? "add_to_cart_to_purchase"
            : "impressions_to_clicks",
        funnelLeak: {
            weakest_stage: input.add_to_cart > 0 && input.purchases === 0
                ? "add to cart → purchase"
                : "impressions → clicks",
            explanation: input.add_to_cart > 0 && input.purchases === 0
                ? "Users show buying intent but drop before purchase."
                : "Too few users are clicking after seeing the ad.",
            severity: input.purchases === 0 ? "high" : "medium",
        },
        profitability: {
            break_even_cpa: derived.breakEvenCpa,
            current_cpa: derived.currentCpa,
            break_even_roas: derived.breakEvenRoas,
            max_cpc: derived.maxCpcAtCurrentConversion,
            is_profitable: derived.isProfitable,
            reason: derived.isProfitable
                ? "Current results are inside the break-even range."
                : "Current results are outside the break-even range.",
        },
        continue_testing: {
            decision: input.purchases === 0 && derived.spend >= derived.breakEvenCpa * 3
                ? "STOP"
                : "TEST MORE",
            reason: input.purchases === 0 && derived.spend >= derived.breakEvenCpa * 3
                ? "Spend is already too high for the current signal quality."
                : "One tighter test is still justified before a final stop.",
            minimum_additional_test_needed: "One new creative angle and one stronger offer variant.",
        },
        creative_angles: [
            {
                hook_idea: "Show the main pain point in the first 3 seconds.",
                concept: "Start with the problem, then show the product solving it immediately.",
                target_emotion: "relief",
            },
            {
                hook_idea: "Lead with a surprising before-and-after contrast.",
                concept: "Compare life without the product against the result after using it.",
                target_emotion: "curiosity",
            },
            {
                hook_idea: "Use a customer-style reaction as the opening line.",
                concept: "Make the ad feel like a real recommendation instead of a polished brand ad.",
                target_emotion: "trust",
            },
        ],
        product_validation: {
            verdict: input.ctr >= 1.5 ? "high potential" : "unclear",
            reason: input.ctr >= 1.5
                ? "The product is getting enough attention to justify more testing."
                : "The product still needs stronger market proof before scaling.",
            should_continue_testing: input.ctr >= 1,
        },
        derived_metrics: derived,
        provider: "fallback",
    };
}
async function createAnalysis(userId, payload) {
    const normalizedStage = payload.stage === "testing"
        ? client_1.AnalysisStage.testing
        : payload.stage === "scaling"
            ? client_1.AnalysisStage.scaling
            : client_1.AnalysisStage.retesting;
    let result;
    try {
        result = (await (0, aiService_1.runAiAnalysis)(payload));
    }
    catch (error) {
        console.error("[analysis] OpenAI failed, using fallback logic", error);
        result = fallbackAnalysis(payload);
    }
    const analysis = await prisma_1.prisma.analysis.create({
        data: {
            userId,
            stage: normalizedStage,
            inputData: payload,
            result,
        },
    });
    return analysis;
}
async function listAnalyses(userId) {
    return prisma_1.prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
    });
}
