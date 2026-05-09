import { type RedditLeadPost } from "@/lib/relevance";

export const DEFAULT_DROPSHIPPING_SUBREDDITS = [
  "dropshipping",
  "ecommerce",
  "shopify",
  "entrepreneur",
  "sidehustle",
  "BusinessIntelligence",
  "OnlineStores",
];

export type RedditSortMode = "Quality" | "Recent" | "Most Engaged";
export type ReplyStyle = "Casual" | "Professional" | "Humorous";

export type RedditLeadsStorage = {
  posts: RedditLeadPost[];
  lastFetchedAt: string | null;
  shopKeywords: string[];
  productDescription: string;
  shopName: string;
};

export const REDDIT_LEADS_STORAGE_KEY = "redditLeads";

export function emptyRedditLeadsStorage(): RedditLeadsStorage {
  return {
    posts: [],
    lastFetchedAt: null,
    shopKeywords: [],
    productDescription: "",
    shopName: "",
  };
}

export function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(diffMs)) return "now";

  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function engagementOf(post: Pick<RedditLeadPost, "upvotes" | "comments">) {
  return post.upvotes + post.comments;
}

export function sortRedditPosts(posts: RedditLeadPost[], sortMode: RedditSortMode) {
  return [...posts].sort((a, b) => {
    if (sortMode === "Recent") return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    if (sortMode === "Most Engaged") return engagementOf(b) - engagementOf(a);
    return b.relevanceScore - a.relevanceScore;
  });
}

export function readRedditLeadsStorage() {
  if (typeof window === "undefined") return emptyRedditLeadsStorage();

  try {
    const raw = window.localStorage.getItem(REDDIT_LEADS_STORAGE_KEY);
    if (!raw) return emptyRedditLeadsStorage();
    const parsed = JSON.parse(raw) as Partial<RedditLeadsStorage>;
    return {
      ...emptyRedditLeadsStorage(),
      ...parsed,
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      shopKeywords: Array.isArray(parsed.shopKeywords) ? parsed.shopKeywords : [],
    };
  } catch {
    return emptyRedditLeadsStorage();
  }
}

export function writeRedditLeadsStorage(storage: RedditLeadsStorage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REDDIT_LEADS_STORAGE_KEY, JSON.stringify(storage));
}

export function mergePosts(existing: RedditLeadPost[], incoming: RedditLeadPost[]) {
  const byId = new Map<string, RedditLeadPost>();
  existing.forEach((post) => byId.set(post.id, post));

  incoming.forEach((post) => {
    const current = byId.get(post.id);
    byId.set(post.id, current ? { ...post, ...current, relevanceScore: post.relevanceScore } : post);
  });

  return Array.from(byId.values());
}
