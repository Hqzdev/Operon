"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveMetrics = deriveMetrics;
exports.runAiAnalysis = runAiAnalysis;
const node_https_1 = __importDefault(require("node:https"));
const node_crypto_1 = require("node:crypto");
const env_1 = require("../utils/env");
// GigaChat uses Russian CA certificates not in the default trust store
const tlsAgent = new node_https_1.default.Agent({ rejectUnauthorized: false });
let cachedToken = null;
function httpsPost(url, headers, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = node_https_1.default.request({
            hostname: u.hostname,
            port: u.port ? Number(u.port) : 443,
            path: u.pathname + u.search,
            method: "POST",
            headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
            agent: tlsAgent,
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk.toString(); });
            res.on("end", () => resolve({ status: res.statusCode ?? 0, text: data }));
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}
async function getAccessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
        return cachedToken.value;
    }
    const res = await httpsPost(env_1.env.GIGACHAT_OAUTH_URL, {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${env_1.env.GIGACHAT_AUTH_KEY}`,
        "RqUID": (0, node_crypto_1.randomUUID)(),
        "Accept": "application/json",
    }, `scope=${encodeURIComponent(env_1.env.GIGACHAT_SCOPE)}`);
    if (res.status < 200 || res.status >= 300) {
        throw new Error(`GigaChat OAuth error ${res.status}: ${res.text}`);
    }
    const data = JSON.parse(res.text);
    cachedToken = { value: data.access_token, expiresAt: data.expires_at };
    return cachedToken.value;
}
function stripCodeFences(content) {
    return content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}
async function complete(schemaName, systemPrompt, userPrompt) {
    const token = await getAccessToken();
    const body = JSON.stringify({
        model: env_1.env.GIGACHAT_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        stream: false,
        max_tokens: 512,
    });
    const res = await httpsPost(`${env_1.env.GIGACHAT_BASE_URL}/chat/completions`, {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }, body);
    if (res.status < 200 || res.status >= 300) {
        throw new Error(`GigaChat API error ${res.status} for ${schemaName}: ${res.text}`);
    }
    const data = JSON.parse(res.text);
    const content = data.choices[0]?.message?.content;
    if (!content)
        throw new Error(`Empty GigaChat response for ${schemaName}`);
    return JSON.parse(stripCodeFences(content));
}
const SYSTEM = "You are a strict e-commerce performance analyst. Return valid JSON only — no markdown, no text outside the JSON.";
function round(n, p = 2) { return Number(n.toFixed(p)); }
function deriveMetrics(input) {
    const spend = input.clicks * input.cpc;
    const roas = spend > 0 ? input.revenue / spend : 0;
    const conversionRate = input.clicks > 0 ? (input.purchases / input.clicks) * 100 : 0;
    const addToCartRate = input.clicks > 0 ? (input.add_to_cart / input.clicks) * 100 : 0;
    const margin = Math.max(input.product_price - input.cost, 0.01);
    const breakEvenRoas = input.product_price / margin;
    const breakEvenCpa = margin;
    const currentCpa = input.purchases > 0 ? spend / input.purchases : null;
    const maxCpcAtCurrentConversion = conversionRate > 0 ? breakEvenCpa * (conversionRate / 100) : 0;
    const profit = input.revenue - spend - input.purchases * input.cost;
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
    };
}
async function runAiAnalysis(input) {
    if (!env_1.env.GIGACHAT_AUTH_KEY)
        throw new Error("GIGACHAT_AUTH_KEY is not configured");
    const derived = deriveMetrics(input);
    const dataBlock = JSON.stringify({ ...input, ...derived }, null, 2);
    const [decision, diagnosis, actionPlan, validation, funnelLeak, creativeAngles, continueDecision] = await Promise.all([
        complete("decision", SYSTEM, `Analyze this ad campaign and return one strict decision.

Decisions: SCALE (profitable, CTR ≥ 1.5%), KILL (spend ≥ 3× break-even with 0 purchases), FIX (CTR < 1%), TEST AGAIN (not enough data).

Return JSON:
{"finalDecision":"SCALE|KILL|TEST AGAIN|FIX","shortReason":"1–2 sentences","confidence":"low|medium|high"}

Data:
${dataBlock}`),
        complete("diagnosis", SYSTEM, `Identify the single main performance problem.

Options: "Creative problem" (low CTR), "Targeting problem" (high CPM/low CTR), "Offer problem" (clicks but no conversion), "Product problem" (no demand), "Funnel problem" (cart but no purchase).

Return JSON:
{"mainProblem":"Creative problem|Targeting problem|Offer problem|Product problem|Funnel problem","why":"explanation","proofMetric":"specific number"}

Data:
${dataBlock}`),
        complete("actionPlan", SYSTEM, `Give exactly 3 specific executable next actions. No generic advice.

Return JSON:
{"actionPlan":["action 1","action 2","action 3"]}

Data:
${dataBlock}`),
        complete("validation", SYSTEM, `Evaluate if this product has real market potential.

Return JSON:
{"verdict":"high potential|unclear|low potential","reason":"short reason based on numbers","shouldContinueTesting":true|false}

Data:
${dataBlock}`),
        complete("funnelLeak", SYSTEM, `Find the weakest stage: "impressions → clicks", "clicks → add to cart", or "add to cart → purchase".

Return JSON:
{"weakestStage":"impressions → clicks|clicks → add to cart|add to cart → purchase","explanation":"what causes the drop","severity":"low|medium|high"}

Data:
${dataBlock}`),
        complete("creativeAngles", SYSTEM, `Generate 3 direct-response ad angles for this product. No generic ideas.

Return JSON:
{"creativeAngles":[{"hookIdea":"opening line max 20 words","concept":"what the ad communicates","targetEmotion":"core emotion"}]}

Product: ${input.product_description ?? input.product_name ?? "e-commerce product"}
Context: CTR ${input.ctr}%, ${input.purchases} purchases from ${input.clicks} clicks`),
        complete("continueDecision", SYSTEM, `Decide whether to continue testing or stop this campaign.

Return JSON:
{"decision":"STOP|CONTINUE|TEST MORE","reason":"based on numbers","minimumAdditionalTestNeeded":"what to test next or 'nothing'"}

Data:
${dataBlock}`),
    ]);
    const isProfitable = derived.currentCpa !== null && derived.currentCpa <= derived.breakEvenCpa;
    return {
        decision,
        diagnosis,
        actionPlan: (actionPlan.actionPlan ?? []).slice(0, 3),
        validation,
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
        funnelLeak,
        creativeAngles: (creativeAngles.creativeAngles ?? []).slice(0, 3),
        continueDecision,
        derived,
        provider: "gigachat",
    };
}
