import https from "https";

export interface StoreAnalysisResult {
  niche: string;
  targetAudience: string;
  estimatedPriceRange: string;
  topCategories: string[];
  suggestedMetrics: string[];
  platform: string;
  storeName: string;
  storeDescription: string;
}

function detectPlatform(html: string, url: string): string {
  if (html.includes("cdn.shopify.com") || html.includes("Shopify.shop") || url.includes("myshopify.com")) {
    return "Shopify";
  }
  if (html.includes("woocommerce") || html.includes("WooCommerce")) {
    return "WooCommerce";
  }
  if (html.includes("bigcommerce") || url.includes("bigcommerce.com")) {
    return "BigCommerce";
  }
  if (html.includes("squarespace") || url.includes("squarespace.com")) {
    return "Squarespace";
  }
  if (html.includes("wix.com") || html.includes("_wix_")) {
    return "Wix";
  }
  if (html.includes("magento") || html.includes("Magento")) {
    return "Magento";
  }
  return "Custom / Unknown";
}

function extractMeta(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : "";

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : "";

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : "";

  const ogSiteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const siteName = ogSiteName ? ogSiteName[1].trim() : "";

  return {
    title: ogTitle || title,
    description: ogDescription || description,
    siteName,
  };
}

function httpsPost(url: string, headers: Record<string, string>, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyBuffer = Buffer.from(body, "utf-8");
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || "443",
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": bodyBuffer.length,
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: string) => { data += chunk; });
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}

async function getGigaChatToken(): Promise<string> {
  const authKey = process.env.GIGACHAT_AUTH_KEY ?? "";
  const oauthUrl = process.env.GIGACHAT_OAUTH_URL ?? "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  const scope = process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS";

  const responseText = await httpsPost(
    oauthUrl,
    {
      "Authorization": `Basic ${authKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    `scope=${encodeURIComponent(scope)}`
  );

  const data = JSON.parse(responseText) as { access_token: string };
  return data.access_token;
}

async function gigaChatComplete(token: string, prompt: string): Promise<string> {
  const baseUrl = process.env.GIGACHAT_BASE_URL ?? "https://gigachat.devices.sberbank.ru/api/v1";
  const model = process.env.GIGACHAT_MODEL ?? "GigaChat";

  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.3,
  });

  const responseText = await httpsPost(
    `${baseUrl}/chat/completions`,
    {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body
  );

  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "{}";
}

export async function analyzeStore(storeUrl: string): Promise<StoreAnalysisResult> {
  let html = "";
  let meta = { title: "", description: "", siteName: "" };
  let platform = "Unknown";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(storeUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OperonBot/1.0)",
      },
    });
    clearTimeout(timeout);
    html = await response.text();
    meta = extractMeta(html);
    platform = detectPlatform(html, storeUrl);
  } catch {
    // Proceed with empty data if scraping fails
  }

  const prompt = `You are an e-commerce analyst. Analyze this online store and return a JSON object.

Store URL: ${storeUrl}
Platform detected: ${platform}
Page title: ${meta.title || "(not available)"}
Meta description: ${meta.description || "(not available)"}
Site name: ${meta.siteName || "(not available)"}

Return ONLY a JSON object with these exact fields:
{
  "niche": "brief niche description (e.g. 'Women's Fashion', 'Pet Supplies', 'Home Decor')",
  "targetAudience": "description of the target audience",
  "estimatedPriceRange": "price range (e.g. '$10-$50', '$50-$200', 'Premium $200+')",
  "topCategories": ["category1", "category2", "category3"],
  "suggestedMetrics": ["metric1", "metric2", "metric3", "metric4"],
  "storeName": "store name from the page title or URL",
  "storeDescription": "one sentence summary of what this store sells"
}

Suggested metrics should be specific KPIs relevant to this store's niche (e.g. 'ROAS', 'Cart Abandonment Rate', 'Average Order Value', 'Customer Lifetime Value', 'Return Rate', 'Email CTR').`;

  const token = await getGigaChatToken();
  const raw = await gigaChatComplete(token, prompt);

  // GigaChat may wrap the JSON in markdown code fences
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : raw;
  const parsed = JSON.parse(jsonStr) as Partial<StoreAnalysisResult>;

  return {
    niche: parsed.niche ?? "General E-commerce",
    targetAudience: parsed.targetAudience ?? "Online shoppers",
    estimatedPriceRange: parsed.estimatedPriceRange ?? "Unknown",
    topCategories: parsed.topCategories ?? [],
    suggestedMetrics: parsed.suggestedMetrics ?? ["ROAS", "CTR", "AOV", "CVR"],
    platform,
    storeName: parsed.storeName ?? meta.title ?? storeUrl,
    storeDescription: parsed.storeDescription ?? "",
  };
}
