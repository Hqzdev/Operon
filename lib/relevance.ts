export type RedditLeadStatus =
  | "Queued"
  | "Contacted"
  | "Interested"
  | "Frustrated with current solution";

export type RedditLeadPost = {
  id: string;
  title: string;
  body: string;
  relevanceScore: number;
  subreddit: string;
  upvotes: number;
  comments: number;
  postUrl: string;
  author: string;
  postedAt: string;
  flairs: string[];
  status: RedditLeadStatus;
  addedAt: string;
  dmGenerated: boolean;
  dmTemplate: string | null;
};

export type RedditPostInput = Omit<
  RedditLeadPost,
  "relevanceScore" | "status" | "addedAt" | "dmGenerated" | "dmTemplate"
> & {
  relevanceScore?: number;
};

const PROBLEM_KEYWORDS = [
  "problem",
  "issue",
  "help",
  "struggling",
  "stuck",
  "how to",
  "does anyone",
  "anyone know",
  "can't figure",
  "frustrated",
  "not working",
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "have",
  "into",
  "our",
  "that",
  "the",
  "this",
  "with",
  "your",
]);

const KEYWORD_EXPANSIONS: Array<{ triggers: string[]; keywords: string[] }> = [
  {
    triggers: ["dropshipping", "drop shipping", "дропшип", "дропшиппинг"],
    keywords: [
      "dropshipping",
      "drop shipping",
      "supplier",
      "product research",
      "winning product",
      "fulfillment",
      "shopify",
    ],
  },
  {
    triggers: ["ecommerce", "e-commerce", "online store", "store", "shop", "магазин", "интернет магазин"],
    keywords: ["ecommerce", "e-commerce", "online store", "store", "shop", "conversion", "checkout", "traffic"],
  },
  {
    triggers: ["marketing", "ads", "advertising", "traffic", "маркетинг", "реклама", "трафик"],
    keywords: ["marketing", "ads", "advertising", "traffic", "facebook ads", "tiktok ads", "organic traffic"],
  },
  {
    triggers: ["clothing", "fashion", "apparel", "одежда", "фэшн"],
    keywords: ["clothing", "fashion", "apparel", "brand", "boutique"],
  },
  {
    triggers: ["jewelry", "jewellery", "украшения", "ювелир"],
    keywords: ["jewelry", "jewellery", "accessories", "gift"],
  },
  {
    triggers: ["beauty", "cosmetic", "skincare", "косметика", "уход"],
    keywords: ["beauty", "cosmetic", "skincare", "makeup"],
  },
];

const DEFAULT_LEAD_INTENT_KEYWORDS = [
  "dropshipping",
  "ecommerce",
  "shopify",
  "store",
  "supplier",
  "product",
  "traffic",
  "marketing",
  "ads",
  "conversion",
];

export function normalizeShopKeywords(keywords: string[]) {
  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length >= 2 && keyword.length <= 40),
    ),
  ).slice(0, 30);
}

export function extractShopKeywords(description: string) {
  const normalizedDescription = description.toLowerCase();
  const words = description
    .toLowerCase()
    .replace(/[^\p{L}0-9\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const phrases = description
    .toLowerCase()
    .split(/[,.;\n]/)
    .map((part) => part.trim())
    .filter((part) => part.split(/\s+/).length >= 2 && part.length <= 40);

  const expansions = KEYWORD_EXPANSIONS.flatMap(({ triggers, keywords }) =>
    triggers.some((trigger) => normalizedDescription.includes(trigger)) ? keywords : [],
  );

  return normalizeShopKeywords([...phrases, ...words, ...expansions, ...DEFAULT_LEAD_INTENT_KEYWORDS]);
}

export function calculateRelevanceScore(post: Pick<RedditPostInput, "title" | "body" | "upvotes" | "comments">, shopKeywords: string[]) {
  const keywords = normalizeShopKeywords(shopKeywords);
  if (keywords.length === 0) return 0;

  const title = post.title.toLowerCase();
  const body = post.body.toLowerCase();
  let score = 0;

  const titleMatches = keywords.filter((keyword) => title.includes(keyword)).length;
  score += Math.min(titleMatches * 10, 40);

  const bodyMatches = keywords.filter((keyword) => body.includes(keyword)).length;
  score += Math.min(bodyMatches * 7, 35);

  const problemCount = PROBLEM_KEYWORDS.filter((keyword) => body.includes(keyword) || title.includes(keyword)).length;
  if (problemCount > 0) score += 15;

  const engagement = Math.max(0, post.upvotes) + Math.max(0, post.comments);
  score += engagement > 10 ? 10 : (engagement / 10) * 10;

  return Math.min(Math.round(score), 100);
}

export function withRelevance(posts: RedditPostInput[], shopKeywords: string[]): RedditLeadPost[] {
  const now = new Date().toISOString();

  return posts.map((post) => ({
    ...post,
    relevanceScore: calculateRelevanceScore(post, shopKeywords),
    status: "Queued",
    addedAt: now,
    dmGenerated: false,
    dmTemplate: null,
  }));
}

export function inferStatusFromContent(post: Pick<RedditLeadPost, "title" | "body">): RedditLeadStatus {
  const content = `${post.title} ${post.body}`.toLowerCase();
  if (["frustrated", "sick of", "tired of", "switching from", "current solution"].some((term) => content.includes(term))) {
    return "Frustrated with current solution";
  }
  return "Queued";
}
