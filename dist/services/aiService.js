"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeGigaChatJson = completeGigaChatJson;
exports.deriveMetrics = deriveMetrics;
exports.runAiAnalysis = runAiAnalysis;
const node_https_1 = __importDefault(require("node:https"));
const node_crypto_1 = require("node:crypto");
const env_1 = require("../utils/env");
const attributionService_1 = require("./attributionService");
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
async function completeGigaChatJson(schemaName, systemPrompt, userPrompt) {
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
const complete = completeGigaChatJson;
const SYSTEM = "You are a strict e-commerce performance analyst. Return valid JSON only — no markdown, no text outside the JSON.";
function round(n, p = 2) { return Number(n.toFixed(p)); }
function normalizedReturnRate(input) {
    const raw = input.return_rate ?? 0;
    const decimal = raw > 1 ? raw / 100 : raw;
    return Math.max(0, Math.min(1, decimal));
}
function effectiveRevenue(input) {
    if (typeof input.net_revenue === "number" && input.net_revenue > 0)
        return input.net_revenue;
    return input.revenue * (1 - normalizedReturnRate(input));
}
function accountMetrics(input) {
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
function deriveMetrics(input) {
    const attributionAdjustment = (0, attributionService_1.deriveAttributionAdjustment)(input, env_1.env.IOS_UNDER_ATTRIBUTION_MULTIPLIER);
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
    const breakEvenRoas = commercial.unitValue / margin;
    const breakEvenCpa = margin;
    const currentCpa = adjustedPurchases > 0 ? spend / adjustedPurchases : null;
    const maxCpcAtCurrentConversion = conversionRate > 0 ? breakEvenCpa * (conversionRate / 100) : 0;
    const profit = netRevenue - spend - adjustedPurchases * commercial.unitCost;
    const netProfitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
    return {
        accountType: commercial.accountType,
        primaryConversionLabel: commercial.conversionLabel,
        intentEventLabel: commercial.intentLabel,
        revenueBasis: commercial.revenueBasis,
        effectiveConversions: round(adjustedPurchases),
        effectiveIntentEvents: round(commercial.intentEvents),
        subscriptionLtv: "subscriptionLtv" in commercial ? commercial.subscriptionLtv : undefined,
        leadValue: "leadValue" in commercial ? commercial.leadValue : undefined,
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
async function runAiAnalysis(input) {
    if (!env_1.env.GIGACHAT_AUTH_KEY)
        throw new Error("GIGACHAT_AUTH_KEY is not configured");
    const derived = deriveMetrics(input);
    const modelInput = derived.attributionAdjustment
        ? {
            ...input,
            pixel_purchases: input.purchases,
            purchases: derived.attributionAdjustment.adjustedPurchases,
            qualified_leads: input.account_type === "leadgen" || input.account_type === "b2b" ? derived.attributionAdjustment.adjustedPurchases : input.qualified_leads,
            subscription_starts: input.account_type === "subscription" ? derived.attributionAdjustment.adjustedPurchases : input.subscription_starts,
            revenue: derived.grossRevenue ?? input.revenue,
        }
        : input;
    const dataBlock = JSON.stringify({ ...modelInput, ...derived }, null, 2);
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
Context: CTR ${input.ctr}%, ${modelInput.purchases} purchases from ${input.clicks} clicks`),
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
        attributionAdjustment: derived.attributionAdjustment ?? undefined,
        funnelLeak,
        creativeAngles: (creativeAngles.creativeAngles ?? []).slice(0, 3),
        continueDecision,
        derived,
        provider: "gigachat",
    };
}
