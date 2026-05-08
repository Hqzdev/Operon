import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/trending-ad-problems", "/alternatives/", "/vs/", "/privacy", "/terms", "/register", "/login", "/llms.txt", "/pricing.txt"],
        disallow: ["/dashboard/", "/api/", "/onboarding", "/auth/"],
      },
      // Explicitly allow AI search bots to index public pages
      { userAgent: "GPTBot", allow: ["/", "/trending-ad-problems", "/alternatives/", "/vs/", "/llms.txt", "/pricing.txt"] },
      { userAgent: "ChatGPT-User", allow: ["/", "/trending-ad-problems", "/alternatives/", "/vs/", "/llms.txt", "/pricing.txt"] },
      { userAgent: "PerplexityBot", allow: ["/", "/trending-ad-problems", "/alternatives/", "/vs/", "/llms.txt", "/pricing.txt"] },
      { userAgent: "ClaudeBot", allow: ["/", "/trending-ad-problems", "/alternatives/", "/vs/", "/llms.txt", "/pricing.txt"] },
      { userAgent: "anthropic-ai", allow: ["/", "/trending-ad-problems", "/alternatives/", "/vs/", "/llms.txt", "/pricing.txt"] },
      { userAgent: "Google-Extended", allow: ["/", "/trending-ad-problems", "/alternatives/", "/vs/", "/llms.txt", "/pricing.txt"] },
      // Block Common Crawl (training data scraper, not search)
      { userAgent: "CCBot", disallow: ["/"] },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
