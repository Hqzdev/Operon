"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAiAnalysis = runAiAnalysis;
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const env_1 = require("../utils/env");
const prompts_1 = require("../utils/prompts");
const openai = new openai_1.default({
    apiKey: env_1.env.OPENAI_API_KEY,
});
const decisionSchema = zod_1.z.object({
    decision: zod_1.z.enum(["SCALE", "KILL", "TEST", "FIX"]),
    confidence: zod_1.z.enum(["low", "medium", "high"]),
    reason: zod_1.z.string().min(5).max(300),
});
const diagnosisSchema = zod_1.z.object({
    problem: zod_1.z.enum([
        "creative problem",
        "targeting problem",
        "offer problem",
        "product problem",
        "funnel problem",
    ]),
    diagnosis: zod_1.z.string().min(5).max(400),
});
const actionsSchema = zod_1.z.object({
    actions: zod_1.z.array(zod_1.z.string().min(5)).length(3),
});
const funnelLeakSchema = zod_1.z.object({
    weakest_stage: zod_1.z.enum([
        "impressions → clicks",
        "clicks → add to cart",
        "add to cart → purchase",
    ]),
    explanation: zod_1.z.string().min(5).max(400),
    severity: zod_1.z.enum(["low", "medium", "high"]),
});
const profitabilitySchema = zod_1.z.object({
    break_even_cpa: zod_1.z.number(),
    is_profitable: zod_1.z.boolean(),
    reason: zod_1.z.string().min(5).max(400),
});
const continueSchema = zod_1.z.object({
    decision: zod_1.z.enum(["STOP", "CONTINUE", "TEST MORE"]),
    reason: zod_1.z.string().min(5).max(400),
    minimum_additional_test_needed: zod_1.z.string().min(5).max(400),
});
const creativeSchema = zod_1.z.object({
    creative_angles: zod_1.z
        .array(zod_1.z.object({
        hook_idea: zod_1.z.string().min(5).max(240),
        concept: zod_1.z.string().min(5).max(400),
        target_emotion: zod_1.z.string().min(2).max(80),
    }))
        .length(3),
});
const validationSchema = zod_1.z.object({
    verdict: zod_1.z.enum(["high potential", "unclear", "low potential"]),
    reason: zod_1.z.string().min(5).max(400),
    should_continue_testing: zod_1.z.boolean(),
});
function stripCodeFences(content) {
    return content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}
async function complete(schemaName, schema, prompt) {
    const response = await openai.chat.completions.create({
        model: env_1.env.OPENAI_MODEL,
        messages: [
            {
                role: "system",
                content: "You are a strict e-commerce performance analyst. Return valid JSON only.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
        temperature: 0.2,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error(`Empty OpenAI response for ${schemaName}`);
    }
    return schema.parse(JSON.parse(stripCodeFences(content)));
}
async function runAiAnalysis(input) {
    if (!env_1.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
    }
    const [decision, diagnosis, actions, funnelLeak, profitability, continueTesting, creativeAngles, validation,] = await Promise.all([
        complete("decision_result", decisionSchema, prompts_1.prompts.decision(input)),
        complete("diagnosis_result", diagnosisSchema, prompts_1.prompts.diagnosis(input)),
        complete("actions_result", actionsSchema, prompts_1.prompts.actionPlan(input)),
        complete("funnel_result", funnelLeakSchema, prompts_1.prompts.funnelLeak(input)),
        complete("profitability_result", profitabilitySchema, prompts_1.prompts.breakEven(input)),
        complete("continue_result", continueSchema, prompts_1.prompts.continueOrStop(input)),
        complete("creative_result", creativeSchema, prompts_1.prompts.creativeGenerator(input)),
        complete("validation_result", validationSchema, prompts_1.prompts.validation(input)),
    ]);
    return {
        decision: decision.decision,
        confidence: decision.confidence,
        problem: diagnosis.problem,
        diagnosis: diagnosis.diagnosis,
        actions: actions.actions,
        funnel_issue: funnelLeak.weakest_stage,
        funnelLeak,
        profitability: {
            break_even_cpa: profitability.break_even_cpa,
            is_profitable: profitability.is_profitable,
            reason: profitability.reason,
        },
        continue_testing: continueTesting,
        creative_angles: creativeAngles.creative_angles,
        product_validation: validation,
        provider: "openai",
    };
}
