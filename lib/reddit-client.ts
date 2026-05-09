import { type RedditPostInput } from "@/lib/relevance";

type CacheEntry = {
  fetchedAt: number;
  posts: RedditPostInput[];
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

function normalizeSubreddit(value: string) {
  return value.replace(/^r\//i, "").replace(/[^a-z0-9_]/gi, "").slice(0, 40);
}

function redditUrl(path?: string) {
  if (!path) return "https://www.reddit.com";
  return path.startsWith("http") ? path : `https://www.reddit.com${path}`;
}

async function fetchSubredditPosts(subreddit: string, limit: number) {
  const normalized = normalizeSubreddit(subreddit);
  if (!normalized) return [];

  const response = await fetch(`https://www.reddit.com/r/${normalized}/new.json?limit=${limit}&raw_json=1`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OperonRedditLeadFinder/1.0",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
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
    return { posts: cached.posts, cached: true, fetchedAt: new Date(cached.fetchedAt).toISOString() };
  }

  if (Date.now() - lastGlobalFetchAt < 60_000 && cached) {
    return { posts: cached.posts, cached: true, fetchedAt: new Date(cached.fetchedAt).toISOString() };
  }

  lastGlobalFetchAt = Date.now();
  const batches = await Promise.all(normalizedSubreddits.map((subreddit) => fetchSubredditPosts(subreddit, cappedLimit)));
  const deduped = Array.from(new Map(batches.flat().map((post) => [post.id, post])).values());
  cache.set(cacheKey, { fetchedAt: Date.now(), posts: deduped });

  return { posts: deduped, cached: false, fetchedAt: new Date().toISOString() };
}
