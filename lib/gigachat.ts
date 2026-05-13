import { randomUUID } from "node:crypto";
import https from "node:https";
import { type AnalysisInput } from "@/lib/analysis-schema";
import { deriveMetrics } from "@/lib/decision-engine";

// GigaChat uses Russian CA certs not trusted by Node.js's default store.
// Use node:https.request with rejectUnauthorized:false per-request instead of
// a global NODE_TLS_REJECT_UNAUTHORIZED=0 flag.
async function gigaFetchWithAgent(url: string, init: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr =
      typeof init.body === "string"
        ? init.body
        : init.body instanceof URLSearchParams
          ? init.body.toString()
          : "";
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: Number(parsed.port) || 443,
        path: parsed.pathname + parsed.search,
        method: (init.method ?? "GET").toUpperCase(),
        headers: init.headers as Record<string, string>,
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve(new Response(body, { status: res.statusCode ?? 200, headers: res.headers as HeadersInit }));
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const oauthUrl =
  process.env.GIGACHAT_OAUTH_URL ??
  "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const apiBaseUrl =
  process.env.GIGACHAT_BASE_URL ??
  "https://gigachat.devices.sberbank.ru/api/v1";
const model = process.env.GIGACHAT_MODEL ?? "GigaChat-2-Pro";
const scope = process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS";

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function requireConfig() {
  return Boolean(
    process.env.GIGACHAT_AUTH_KEY || process.env.GIGACHAT_ACCESS_TOKEN,
  );
}

async function getAccessToken() {
  if (process.env.GIGACHAT_ACCESS_TOKEN) {
    return process.env.GIGACHAT_ACCESS_TOKEN;
  }

  const authKey = process.env.GIGACHAT_AUTH_KEY;
  if (!authKey) {
    throw new Error("Missing GIGACHAT_AUTH_KEY or GIGACHAT_ACCESS_TOKEN");
  }

  const response = await gigaFetchWithAgent(oauthUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authKey}`,
      RqUID: randomUUID(),
    },
    body: new URLSearchParams({ scope }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GigaChat OAuth failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("GigaChat OAuth response did not include access_token");
  }

  return data.access_token;
}

function stripCodeFences(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function gigaChatComplete<T>(prompt: string, systemPrompt?: string): Promise<T> {
  return completeJson<T>(prompt, systemPrompt);
}

async function completeJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const token = await getAccessToken();
  const response = await gigaFetchWithAgent(`${apiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            systemPrompt ?? "You are a strict e-commerce operator. Return valid JSON only. No markdown. No code fences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      n: 1,
      stream: false,
      max_tokens: 1024,
      repetition_penalty: 1,
      update_interval: 0,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GigaChat completion failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("GigaChat completion returned empty content");
  }

  return JSON.parse(stripCodeFences(content)) as T;
}

function buildDataBlock(input: AnalysisInput) {
  const derived = deriveMetrics(input);
  const modelInput = derived.attributionAdjustment
    ? {
        ...input,
        pixel_purchases: input.purchases,
        purchases: derived.attributionAdjustment.adjustedPurchases,
        revenue: derived.grossRevenue ?? input.revenue,
      }
    : input;
  return JSON.stringify({ ...modelInput, ...derived }, null, 2);
}

export async function runGigachatAnalysis(input: AnalysisInput) {
  if (!requireConfig()) {
    throw new Error("GigaChat credentials are not configured");
  }

  const dataBlock = buildDataBlock(input);

  const [decision, diagnosis, actionPlan, validation, profitability, funnelLeak, creativeAngles, continueDecision] = await Promise.all([
    completeJson<{
      finalDecision: "SCALE" | "KILL" | "TEST AGAIN" | "FIX";
      shortReason: string;
      confidence: "low" | "medium" | "high";
    }>(`You are a senior e-commerce performance analyst.

Analyze the data below and make a strict decision:
- SCALE (increase budget)
- KILL (stop this product/ad)
- TEST AGAIN (needs more data)
- FIX (identify specific issue)

Rules:
- Be decisive. Do NOT be vague.
- Base decision on metrics efficiency, not opinions.
- Consider CTR, CPC, CPM, conversion rate, and profitability.

Return JSON:
{"finalDecision":"SCALE | KILL | TEST AGAIN | FIX","shortReason":"max 2 sentences","confidence":"low | medium | high"}

Data:
${dataBlock}`),
    completeJson<{
      mainProblem:
        | "Creative problem"
        | "Targeting problem"
        | "Offer problem"
        | "Product problem"
        | "Funnel problem";
      why: string;
      proofMetric: string;
    }>(`You are an expert in diagnosing e-commerce ad performance issues.

Analyze the data and identify the MAIN bottleneck.

Possible areas:
- Creative problem (low CTR)
- Targeting problem (high CPM)
- Offer problem (clicks but no conversions)
- Product problem (low demand)
- Funnel problem

Return JSON:
{"mainProblem":"Creative problem | Targeting problem | Offer problem | Product problem | Funnel problem","why":"clear explanation","proofMetric":"what metric proves it"}

Data:
${dataBlock}`),
    completeJson<string[]>(`You are a performance marketing operator.

Based on the data, give EXACT next actions.

Rules:
- Max 3 actions
- Each action must be specific and executable
- No generic advice

Example of GOOD action:
"Test 3 new video creatives focusing on problem-solution hook in first 3 seconds"

Example of BAD action:
"Improve ads"

Return JSON array with exactly 3 strings.

Data:
${dataBlock}`),
    completeJson<{
      verdict: "high potential" | "unclear" | "low potential";
      reason: string;
      shouldContinueTesting: boolean;
    }>(`You are an e-commerce product validation expert.

Evaluate if this product has real potential based on performance data.

Consider:
- engagement (CTR)
- cost efficiency (CPC/CPM)
- early conversion signals

Return JSON:
{"verdict":"high potential | unclear | low potential","reason":"short reason","shouldContinueTesting":true}

Data:
${dataBlock}`),
    completeJson<{
      breakEvenCpa: number;
      isProfitable: boolean;
      why: string;
    }>(`You are a profitability analyst.

Calculate if this product can be profitable.

Given:
- product price
- cost
- CPC
- conversion rate

Output JSON:
{"breakEvenCpa":0,"isProfitable":true,"why":"strict numeric explanation"}

Be strict and numeric.

Data:
${dataBlock}`),
    completeJson<{
      weakestStage: "impressions → clicks" | "clicks → add to cart" | "add to cart → purchase";
      explanation: string;
      severity: "low" | "medium" | "high";
    }>(`You are a funnel analyst.

Identify where users drop off the most.

Steps:
- impressions → clicks → add to cart → purchase

Output JSON:
{"weakestStage":"impressions → clicks | clicks → add to cart | add to cart → purchase","explanation":"drop-off explanation","severity":"low | medium | high"}

Data:
${dataBlock}`),
    completeJson<
      Array<{
        hookIdea: string;
        concept: string;
        targetEmotion: string;
      }>
    >(`You are a direct-response ad expert.

Generate 3 new ad angles for this product.

Each angle must include:
- hookIdea
- concept
- targetEmotion

No generic ideas.

Return JSON array with exactly 3 objects:
[{"hookIdea":"","concept":"","targetEmotion":""}]

Product:
${input.product_description}`),
    completeJson<{
      decision: "STOP" | "CONTINUE" | "TEST MORE";
      reason: string;
      minimumAdditionalTestNeeded: string;
    }>(`You are a performance decision expert.

Decide if the user should continue testing or stop.

Consider:
- spend
- conversions
- data volume
- stage

Output JSON:
{"decision":"STOP | CONTINUE | TEST MORE","reason":"short reason","minimumAdditionalTestNeeded":"what else is needed if any"}

Data:
${dataBlock}`),
  ]);

  const derived = deriveMetrics(input);
  return {
    decision,
    diagnosis,
    actionPlan: actionPlan.slice(0, 3),
    validation,
    profitability: {
      breakEvenCpa: profitability.breakEvenCpa,
      breakEvenRoas: derived.breakEvenRoas,
      maxCpcAtCurrentConversion: derived.maxCpcAtCurrentConversion,
      currentCpa: derived.currentCpa,
      isProfitable: profitability.isProfitable,
      why: profitability.why,
    },
    funnelLeak,
    creativeAngles: creativeAngles.slice(0, 3),
    continueDecision,
    attributionAdjustment: derived.attributionAdjustment ?? undefined,
    derived,
    provider: "gigachat" as const,
  };
}
