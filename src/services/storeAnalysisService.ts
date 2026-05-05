import { completeGigaChatJson } from "./aiService";

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

function fallbackStoreAnalysis(
  storeUrl: string,
  platform: string,
  meta: { title: string; description: string; siteName: string },
): Partial<StoreAnalysisResult> {
  const storeName = meta.siteName || meta.title || new URL(storeUrl).hostname.replace(/^www\./, "");
  const description = meta.description || meta.title || "Online store";

  return {
    niche: "General E-commerce",
    targetAudience: "Online shoppers interested in this store's products",
    estimatedPriceRange: "Unknown",
    topCategories: [],
    suggestedMetrics: ["ROAS", "CTR", "AOV", "CVR", "Cart Abandonment Rate"],
    platform,
    storeName,
    storeDescription: description,
  };
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
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

  let parsed: Partial<StoreAnalysisResult>;
  try {
    parsed = await completeGigaChatJson<Partial<StoreAnalysisResult>>(
      "storeAnalysis",
      "You are a strict e-commerce analyst. Return valid JSON only. No markdown. No text outside the JSON.",
      prompt,
    );
  } catch (error) {
    console.error("[onboarding] GigaChat store analysis failed, using local fallback", error);
    parsed = fallbackStoreAnalysis(storeUrl, platform, meta);
  }

  return {
    niche: parsed.niche ?? "General E-commerce",
    targetAudience: parsed.targetAudience ?? "Online shoppers",
    estimatedPriceRange: parsed.estimatedPriceRange ?? "Unknown",
    topCategories: normalizeStringArray(parsed.topCategories, []),
    suggestedMetrics: normalizeStringArray(parsed.suggestedMetrics, ["ROAS", "CTR", "AOV", "CVR"]),
    platform,
    storeName: parsed.storeName ?? meta.title ?? storeUrl,
    storeDescription: parsed.storeDescription ?? "",
  };
}
