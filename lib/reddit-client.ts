import { type RedditPostInput } from "@/lib/relevance";

type CacheEntry = {
  fetchedAt: number;
  posts: RedditPostInput[];
  warnings: string[];
};

type RedditListingResponse = {
  data?: {
    children?: Array<{
      data?: {
        id?: string;
        name?: string;
        title?: string;
        selftext?: string;
        ups?: number;
        num_comments?: number;
        created_utc?: number;
        author?: string;
        permalink?: string;
        link_flair_text?: string | null;
        over_18?: boolean;
        stickied?: boolean;
      };
    }>;
  };
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
let lastGlobalFetchAt = 0;
let redditAccessToken: { token: string; expiresAt: number } | null = null;

function normalizeSubreddit(value: string) {
  return value.replace(/^r\//i, "").replace(/[^a-z0-9_]/gi, "").slice(0, 40);
}

function redditUrl(path?: string) {
  if (!path) return "https://www.reddit.com";
  return path.startsWith("http") ? path : `https://www.reddit.com${path}`;
}

function hasRedditCredentials() {
  return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
}

async function getRedditAccessToken() {
  if (redditAccessToken && redditAccessToken.expiresAt > Date.now() + 60_000) {
    return redditAccessToken.token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET");
  }

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.REDDIT_USER_AGENT ?? "OperonRedditLeadFinder/1.0",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reddit OAuth failed with ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Reddit OAuth did not return access_token");

  redditAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return redditAccessToken.token;
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function firstMatch(value: string, pattern: RegExp) {
  return decodeXml(value.match(pattern)?.[1] ?? "");
}

async function fetchSubredditRssPosts(subreddit: string, limit: number) {
  const normalized = normalizeSubreddit(subreddit);
  const response = await fetch(`https://www.reddit.com/r/${normalized}/new/.rss?limit=${limit}`, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "OperonRedditLeadFinder/1.0 (+https://operon.ai)",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Reddit RSS returned ${response.status} for r/${normalized}`);
  }

  const xml = await response.text();
  return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g))
    .slice(0, limit)
    .map((entry): RedditPostInput | null => {
      const block = entry[1] ?? "";
      const title = firstMatch(block, /<title[^>]*>([\s\S]*?)<\/title>/);
      const postUrl = block.match(/<link[^>]+href="([^"]+)"/)?.[1] ?? "";
      const id = firstMatch(block, /<id[^>]*>([\s\S]*?)<\/id>/) || postUrl;
      if (!title || !id) return null;

      return {
        id: `reddit-${id.split("/").filter(Boolean).pop() ?? encodeURIComponent(id).slice(0, 32)}`,
        title,
        body: firstMatch(block, /<content[^>]*>([\s\S]*?)<\/content>/),
        subreddit: `r/${normalized}`,
        upvotes: 0,
        comments: 0,
        postUrl: redditUrl(postUrl),
        author: firstMatch(block, /<name[^>]*>([\s\S]*?)<\/name>/) || "u/unknown",
        postedAt: firstMatch(block, /<updated[^>]*>([\s\S]*?)<\/updated>/) || new Date().toISOString(),
        flairs: [],
      };
    })
    .filter((post): post is RedditPostInput => Boolean(post));
}

async function fetchSubredditPosts(subreddit: string, limit: number) {
  const normalized = normalizeSubreddit(subreddit);
  if (!normalized) return [];

  const token = hasRedditCredentials() ? await getRedditAccessToken() : null;
  const response = await fetch(`${token ? "https://oauth.reddit.com" : "https://www.reddit.com"}/r/${normalized}/new.json?limit=${limit}&raw_json=1`, {
    headers: {
      Accept: "application/json",
      "User-Agent": process.env.REDDIT_USER_AGENT ?? "OperonRedditLeadFinder/1.0",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !token) {
      throw new Error(`Reddit returned ${response.status} for r/${normalized}. Configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to use Reddit OAuth.`);
    }
    if (response.status === 403 || response.status === 429) {
      return fetchSubredditRssPosts(normalized, limit);
    }
    throw new Error(`Reddit returned ${response.status} for r/${normalized}`);
  }

  const data = (await response.json()) as RedditListingResponse;
  return (data.data?.children ?? [])
    .map((child): RedditPostInput | null => {
      const post = child.data;
      if (!post?.id || !post.title || post.over_18 || post.stickied) return null;

      return {
        id: `reddit-${post.id}`,
        title: post.title,
        body: post.selftext ?? "",
        subreddit: `r/${normalized}`,
        upvotes: post.ups ?? 0,
        comments: post.num_comments ?? 0,
        postUrl: redditUrl(post.permalink),
        author: post.author ? `u/${post.author}` : "u/deleted",
        postedAt: new Date((post.created_utc ?? Date.now() / 1000) * 1000).toISOString(),
        flairs: post.link_flair_text ? [post.link_flair_text] : [],
      };
    })
    .filter((post): post is RedditPostInput => Boolean(post));
}

export async function fetchRedditPosts(subreddits: string[], limit: number) {
  const cappedLimit = Math.min(Math.max(limit || 100, 1), 200);
  const normalizedSubreddits = Array.from(new Set(subreddits.map(normalizeSubreddit).filter(Boolean))).slice(0, 12);
  const cacheKey = `${normalizedSubreddits.join(",")}:${cappedLimit}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR_MS) {
    return { posts: cached.posts, warnings: cached.warnings, cached: true, fetchedAt: new Date(cached.fetchedAt).toISOString() };
  }

  if (Date.now() - lastGlobalFetchAt < 60_000 && cached) {
    return { posts: cached.posts, warnings: cached.warnings, cached: true, fetchedAt: new Date(cached.fetchedAt).toISOString() };
  }

  lastGlobalFetchAt = Date.now();
  const settled = await Promise.allSettled(normalizedSubreddits.map((subreddit) => fetchSubredditPosts(subreddit, cappedLimit)));
  const batches = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const warnings = settled.flatMap((result, index) =>
    result.status === "rejected"
      ? [`r/${normalizedSubreddits[index]}: ${result.reason instanceof Error ? result.reason.message : "fetch failed"}`]
      : [],
  );
  const deduped = Array.from(new Map(batches.flat().map((post) => [post.id, post])).values());
  cache.set(cacheKey, { fetchedAt: Date.now(), posts: deduped, warnings });

  return { posts: deduped, warnings, cached: false, fetchedAt: new Date().toISOString() };
}
