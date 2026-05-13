"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSeo = analyzeSeo;
exports.getCachedSeoResult = getCachedSeoResult;
const gigachat_1 = require("@/lib/gigachat");
const appError_1 = require("../utils/appError");
const userRepository_1 = require("../repositories/userRepository");
const seoRepository_1 = require("../repositories/seoRepository");
function extractSeoData(html, url) {
    const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
    const metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
        "").trim();
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
    const freq = {};
    const stopWords = new Set(["that", "this", "with", "from", "have", "will", "your", "more", "they", "been", "were", "what"]);
    for (const w of words) {
        if (!stopWords.has(w))
            freq[w] = (freq[w] ?? 0) + 1;
    }
    const topKeywords = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([w]) => w);
    let platform = "Custom / Unknown";
    if (html.includes("cdn.shopify.com") || html.includes("Shopify.shop") || url.includes("myshopify.com"))
        platform = "Shopify";
    else if (html.includes("woocommerce") || html.includes("WooCommerce"))
        platform = "WooCommerce";
    else if (html.includes("bigcommerce") || url.includes("bigcommerce.com"))
        platform = "BigCommerce";
    else if (html.includes("squarespace") || url.includes("squarespace.com"))
        platform = "Squarespace";
    else if (html.includes("wix.com") || html.includes("_wix_"))
        platform = "Wix";
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
async function fetchStoreHtml(storeUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(storeUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; OperonBot/1.0)" },
        });
        clearTimeout(timeout);
        return await response.text();
    }
    catch {
        clearTimeout(timeout);
        return "";
    }
}
const SEO_SYSTEM = `You are an expert SEO and digital marketing consultant for e-commerce stores.
Analyze the provided store data and return valid JSON only. No markdown. No code fences.`;
async function runGigaChatSeoAnalysis(seoData, storeUrl) {
    const dataBlock = JSON.stringify(seoData, null, 2);
    const [scoreAndIssues, titleAndDesc, marketing, contentAndCompetitor] = await Promise.all([
        (0, gigachat_1.gigaChatComplete)(`Analyze this e-commerce store SEO data and return a score and top 5 issues.

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
- Start at 100, deduct points for missing title (-15), missing meta description (-15), missing h1 (-10), no og tags (-10), no schema markup (-10), poor keyword density (-10), missing canonical (-5), images without alt (-5), etc.`, SEO_SYSTEM),
        (0, gigachat_1.gigaChatComplete)(`Analyze the title tag and meta description for this e-commerce store.

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
}`, SEO_SYSTEM),
        (0, gigachat_1.gigaChatComplete)(`Generate top 5 marketing improvements and social media recommendations for this e-commerce store.

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
}`, SEO_SYSTEM),
        (0, gigachat_1.gigaChatComplete)(`Analyze content gaps and competitor positioning for this e-commerce store.

Store URL: ${storeUrl}
Platform: ${seoData.platform}
Current keywords: ${seoData.topKeywords.join(", ")}
H1 tags: ${seoData.h1Tags.join(", ") || "none"}
H2 tags: ${seoData.h2Tags.join(", ") || "none"}

Return JSON:
{
  "contentGaps": ["missing topic/keyword 1", "missing topic/keyword 2", ...up to 6 items],
  "competitorPositioning": "2-3 sentence advice on how to differentiate from competitors and position this store better in the market"
}`, SEO_SYSTEM),
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
async function analyzeSeo(userId) {
    if (!process.env.GIGACHAT_AUTH_KEY && !process.env.GIGACHAT_ACCESS_TOKEN) {
        throw new appError_1.AppError("SEO analysis is not available: AI provider not configured.", 503);
    }
    const user = await userRepository_1.UserRepository.findById(userId);
    if (!user?.storeUrl) {
        throw new appError_1.AppError("No store URL configured. Please add your store URL in settings.", 400);
    }
    const html = await fetchStoreHtml(user.storeUrl);
    const seoData = extractSeoData(html, user.storeUrl);
    const aiResult = await runGigaChatSeoAnalysis(seoData, user.storeUrl);
    const result = {
        storeUrl: user.storeUrl,
        analyzedAt: new Date().toISOString(),
        ...aiResult,
    };
    await seoRepository_1.SeoRepository.upsert(userId, user.storeUrl, result);
    return result;
}
async function getCachedSeoResult(userId) {
    return seoRepository_1.SeoRepository.findByUserId(userId);
}
