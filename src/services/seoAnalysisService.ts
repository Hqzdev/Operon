import { gigaChatComplete } from "@/lib/gigachat";
import { AppError } from "../utils/appError";
import { UserRepository } from "../repositories/userRepository";
import { SeoRepository } from "../repositories/seoRepository";

export interface SeoIssue {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

export interface MarketingImprovement {
  title: string;
  description: string;
  whyItMatters: string;
}

export interface MetaTagAnalysis {
  current: string;
  quality: "good" | "average" | "poor";
  suggestion: string;
}

export interface SeoAnalysisResult {
  storeUrl: string;
  seoScore: number;
  issues: SeoIssue[];
  titleAnalysis: MetaTagAnalysis;
  descriptionAnalysis: MetaTagAnalysis;
  marketingImprovements: MarketingImprovement[];
  contentGaps: string[];
  competitorPositioning: string;
  socialMediaRecommendations: string[];
  analyzedAt: string;
}

interface ExtractedSeoData {
  title: string;
  metaDescription: string;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  imageAlts: string[];
  canonicalUrl: string;
  robotsMeta: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  schemaMarkup: boolean;
  internalLinkCount: number;
  externalLinkCount: number;
  topKeywords: string[];
  platform: string;
}

function extractSeoData(html: string, url: string): ExtractedSeoData {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();

  const metaDescription = (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
    ""
  ).trim();

  const h1Tags = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map((m) => m[1].trim()).slice(0, 5);
  const h2Tags = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[1].trim()).slice(0, 5);
  const h3Tags = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi)].map((m) => m[1].trim()).slice(0, 5);

  const imageAlts = [...html.matchAll(/<img[^>]+alt=["']([^"']+)["']/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean)
    .slice(0, 10);

  const canonicalUrl = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? "").trim();
  const robotsMeta = (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "").trim();

  const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "").trim();
  const ogDescription = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "").trim();
  const ogImage = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "").trim();

  const schemaMarkup = html.includes("application/ld+json");

  const internalLinks = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((href) => href.startsWith("/") || href.includes(new URL(url).hostname));
  const externalLinks = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((href) => href.startsWith("http") && !href.includes(new URL(url).hostname));

  const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const words = textContent.toLowerCase().match(/\b[a-zа-я]{4,}\b/g) ?? [];
  const freq: Record<string, number> = {};
  const stopWords = new Set(["that", "this", "with", "from", "have", "will", "your", "more", "they", "been", "were", "what"]);
  for (const w of words) {
    if (!stopWords.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  }
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);

  let platform = "Custom / Unknown";
  if (html.includes("cdn.shopify.com") || html.includes("Shopify.shop") || url.includes("myshopify.com")) platform = "Shopify";
  else if (html.includes("woocommerce") || html.includes("WooCommerce")) platform = "WooCommerce";
  else if (html.includes("bigcommerce") || url.includes("bigcommerce.com")) platform = "BigCommerce";
  else if (html.includes("squarespace") || url.includes("squarespace.com")) platform = "Squarespace";
  else if (html.includes("wix.com") || html.includes("_wix_")) platform = "Wix";

  return {
    title,
    metaDescription,
    h1Tags,
    h2Tags,
    h3Tags,
    imageAlts,
    canonicalUrl,
    robotsMeta,
    ogTitle,
    ogDescription,
    ogImage,
    schemaMarkup,
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    topKeywords,
    platform,
  };
}

async function fetchStoreHtml(storeUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(storeUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OperonBot/1.0)" },
    });
    clearTimeout(timeout);
    return await response.text();
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

const SEO_SYSTEM = `You are an expert SEO and digital marketing consultant for e-commerce stores.
Analyze the provided store data and return valid JSON only. No markdown. No code fences.`;

async function runGigaChatSeoAnalysis(seoData: ExtractedSeoData, storeUrl: string) {
  const dataBlock = JSON.stringify(seoData, null, 2);

  const [scoreAndIssues, titleAndDesc, marketing, contentAndCompetitor] = await Promise.all([
    gigaChatComplete<{
      seoScore: number;
      issues: Array<{ title: string; description: string; severity: "critical" | "warning" | "info" }>;
    }>(
      `Analyze this e-commerce store SEO data and return a score and top 5 issues.

Store URL: ${storeUrl}
SEO Data:
${dataBlock}

Return JSON:
{
  "seoScore": <number 0-100>,
  "issues": [
    {"title": "issue name", "description": "what to fix and how", "severity": "critical|warning|info"},
    ...max 5 items
  ]
}

Scoring rules:
- Start at 100, deduct points for missing title (-15), missing meta description (-15), missing h1 (-10), no og tags (-10), no schema markup (-10), poor keyword density (-10), missing canonical (-5), images without alt (-5), etc.`,
      SEO_SYSTEM,
    ),

    gigaChatComplete<{
      titleAnalysis: { quality: "good" | "average" | "poor"; suggestion: string };
      descriptionAnalysis: { quality: "good" | "average" | "poor"; suggestion: string };
    }>(
      `Analyze the title tag and meta description for this e-commerce store.

Store URL: ${storeUrl}
Current title: "${seoData.title}"
Current meta description: "${seoData.metaDescription}"
Platform: ${seoData.platform}
Top keywords found: ${seoData.topKeywords.slice(0, 8).join(", ")}

Return JSON:
{
  "titleAnalysis": {
    "quality": "good|average|poor",
    "suggestion": "rewritten title tag (max 60 chars, include brand and top keyword)"
  },
  "descriptionAnalysis": {
    "quality": "good|average|poor",
    "suggestion": "rewritten meta description (max 160 chars, include call to action)"
  }
}`,
      SEO_SYSTEM,
    ),

    gigaChatComplete<{
      improvements: Array<{ title: string; description: string; whyItMatters: string }>;
      socialMediaRecommendations: string[];
    }>(
      `Generate top 5 marketing improvements and social media recommendations for this e-commerce store.

Store URL: ${storeUrl}
Platform: ${seoData.platform}
Has schema markup: ${seoData.schemaMarkup}
Internal links: ${seoData.internalLinkCount}
External links: ${seoData.externalLinkCount}
Top keywords: ${seoData.topKeywords.slice(0, 10).join(", ")}
OG tags present: ${Boolean(seoData.ogTitle)}

Return JSON:
{
  "improvements": [
    {"title": "improvement name", "description": "specific actionable steps", "whyItMatters": "business impact explanation"},
    ...exactly 5 items
  ],
  "socialMediaRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`,
      SEO_SYSTEM,
    ),

    gigaChatComplete<{
      contentGaps: string[];
      competitorPositioning: string;
    }>(
      `Analyze content gaps and competitor positioning for this e-commerce store.

Store URL: ${storeUrl}
Platform: ${seoData.platform}
Current keywords: ${seoData.topKeywords.join(", ")}
H1 tags: ${seoData.h1Tags.join(", ") || "none"}
H2 tags: ${seoData.h2Tags.join(", ") || "none"}

Return JSON:
{
  "contentGaps": ["missing topic/keyword 1", "missing topic/keyword 2", ...up to 6 items],
  "competitorPositioning": "2-3 sentence advice on how to differentiate from competitors and position this store better in the market"
}`,
      SEO_SYSTEM,
    ),
  ]);

  return {
    seoScore: Math.max(0, Math.min(100, scoreAndIssues.seoScore)),
    issues: scoreAndIssues.issues.slice(0, 5),
    titleAnalysis: {
      current: seoData.title,
      quality: titleAndDesc.titleAnalysis.quality,
      suggestion: titleAndDesc.titleAnalysis.suggestion,
    },
    descriptionAnalysis: {
      current: seoData.metaDescription,
      quality: titleAndDesc.descriptionAnalysis.quality,
      suggestion: titleAndDesc.descriptionAnalysis.suggestion,
    },
    marketingImprovements: marketing.improvements.slice(0, 5),
    contentGaps: contentAndCompetitor.contentGaps.slice(0, 6),
    competitorPositioning: contentAndCompetitor.competitorPositioning,
    socialMediaRecommendations: marketing.socialMediaRecommendations.slice(0, 3),
  };
}

export async function analyzeSeo(userId: string): Promise<SeoAnalysisResult> {
  const user = await UserRepository.findById(userId);

  if (!user?.storeUrl) {
    throw new AppError("No store URL configured. Please add your store URL in settings.", 400);
  }

  const html = await fetchStoreHtml(user.storeUrl);
  const seoData = extractSeoData(html, user.storeUrl);
  const aiResult = await runGigaChatSeoAnalysis(seoData, user.storeUrl);

  const result: SeoAnalysisResult = {
    storeUrl: user.storeUrl,
    analyzedAt: new Date().toISOString(),
    ...aiResult,
  };

  await SeoRepository.upsert(userId, user.storeUrl, result);

  return result;
}

export async function getCachedSeoResult(userId: string): Promise<SeoAnalysisResult | null> {
  return SeoRepository.findByUserId<SeoAnalysisResult>(userId);
}
