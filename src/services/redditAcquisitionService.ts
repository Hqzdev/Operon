import { RedditIntentLevel } from "@prisma/client";
import { env } from "../utils/env";
import { LeadRepository } from "../repositories/leadRepository";

const TARGET_SUBREDDITS = [
  "FacebookAds",
  "PPC",
  "TikTokAds",
  "ecommerce",
  "dropship",
  "GoogleAds",
  "shopify",
] as const;

type RedditChild = {
  data?: {
    id?: string;
    name?: string;
    author?: string;
    subreddit?: string;
    title?: string;
    selftext?: string;
    permalink?: string;
    url?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    over_18?: boolean;
    stickied?: boolean;
  };
};

type RedditListing = {
  data?: {
    children?: RedditChild[];
  };
};

type PainPattern = {
  key: string;
  label: string;
  weight: number;
  phrases: string[];
  summary: string;
  outreachAngle: string;
};

const PAIN_PATTERNS: PainPattern[] = [
  {
    key: "high_cpm",
    label: "High CPM",
    weight: 4,
    phrases: ["cpm so high", "high cpm", "cpm increased", "cpm spike", "expensive impressions"],
    summary: "They are struggling with CPM increases and likely need help diagnosing audience pressure, competition, or creative relevance.",
    outreachAngle: "Lead with a CPM benchmark and show how Operon flags whether the issue is audience cost, creative fatigue, or platform volatility.",
  },
  {
    key: "stopped_converting",
    label: "Ads stopped converting",
    weight: 5,
    phrases: ["ads stopped converting", "not converting anymore", "stopped getting sales", "no conversions", "zero sales"],
    summary: "Their ads have stopped converting and they are looking for a way to identify the broken part of the funnel.",
    outreachAngle: "Offer a quick diagnostic that separates traffic quality, landing page conversion, CPA drift, and fatigue signals.",
  },
  {
    key: "roas_drop",
    label: "ROAS dropped",
    weight: 5,
    phrases: ["roas dropped", "roas tanked", "roas fell", "roas down", "performance dropped overnight"],
    summary: "They saw a sudden ROAS drop and need context on whether to pause, watch, or refresh the campaign.",
    outreachAngle: "Position Operon as a decision layer that explains ROAS drops with confidence scores and concrete next actions.",
  },
  {
    key: "cpa_exploding",
    label: "CPA exploding",
    weight: 5,
    phrases: ["cpa exploding", "cpa increased", "cpa too high", "cost per purchase high", "cost per acquisition high"],
    summary: "They are trying to scale but acquisition costs are rising faster than revenue.",
    outreachAngle: "Offer the budget simulator and scaling confidence score before they raise spend again.",
  },
  {
    key: "creative_fatigue",
    label: "Creative fatigue",
    weight: 4,
    phrases: ["creative fatigue", "ad fatigue", "frequency too high", "refresh creative", "same creative"],
    summary: "They suspect creative fatigue and need a clear threshold for when to pause or refresh ads.",
    outreachAngle: "Lead with Operon's fatigue alerts that track CTR decay, CPC trend, and frequency before waste becomes obvious.",
  },
  {
    key: "not_profitable",
    label: "Not profitable",
    weight: 4,
    phrases: ["not profitable", "meta ads not profitable", "facebook ads not profitable", "losing money", "burning money"],
    summary: "They are spending on ads without profit and need help deciding what to scale, stop, or watch.",
    outreachAngle: "Offer a free read on their key metrics against niche benchmarks and a Scale / Stop / Watch recommendation.",
  },
  {
    key: "ctr_low",
    label: "Low CTR",
    weight: 3,
    phrases: ["low ctr", "ctr dropped", "bad ctr", "click through rate low", "no clicks"],
    summary: "Their CTR is weak or declining, which points to creative mismatch or audience fatigue.",
    outreachAngle: "Lead with benchmark deltas so they can see whether CTR is truly below their niche average.",
  },
];

const PAIN_QUERIES = [
  "\"CPM\"",
  "\"stopped converting\"",
  "\"ROAS\"",
  "\"CPA\"",
  "\"creative fatigue\"",
  "\"not profitable\"",
  "\"low CTR\"",
] as const;

function normalized(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function postUrl(permalink?: string, fallback?: string) {
  if (permalink) return `https://www.reddit.com${permalink}`;
  return fallback ?? "https://www.reddit.com";
}

function detectPain(title: string, body: string) {
  const text = normalized(`${title} ${body}`);
  const matches = PAIN_PATTERNS.filter((pattern) =>
    pattern.phrases.some((phrase) => text.includes(phrase)),
  );
  const score = matches.reduce((total, pattern) => total + pattern.weight, 0);
  return { matches, score };
}

function inferIntent(score: number, commentCount: number, title: string) {
  const urgentWords = ["urgent", "help", "fix", "overnight", "what should i do", "please"];
  const urgencyBonus = urgentWords.some((word) => normalized(title).includes(word)) ? 2 : 0;
  const discussionBonus = commentCount >= 5 ? 1 : 0;
  const finalScore = score + urgencyBonus + discussionBonus;

  if (finalScore >= 8) return RedditIntentLevel.high;
  if (finalScore >= 4) return RedditIntentLevel.medium;
  return RedditIntentLevel.low;
}

function summarizeProblem(matches: PainPattern[], title: string) {
  if (matches.length === 0) {
    return `They are asking for help with ad performance: "${title.slice(0, 120)}".`;
  }
  const primary = matches[0];
  return primary.summary;
}

function suggestedOutreach(matches: PainPattern[]) {
  if (matches.length === 0) {
    return "Offer a no-pressure metric diagnostic and ask which campaign metric changed first.";
  }
  return matches[0].outreachAngle;
}

async function fetchRedditListing(url: string, subreddit: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": env.REDDIT_USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reddit request failed for r/${subreddit}: ${response.status}`);
  }

  const listing = await response.json() as RedditListing;
  return listing.data?.children ?? [];
}

async function fetchSubredditPosts(subreddit: string) {
  const children: RedditChild[] = [];
  children.push(...await fetchRedditListing(`https://www.reddit.com/r/${subreddit}/new.json?limit=100`, subreddit));

  for (const query of PAIN_QUERIES) {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&t=day&limit=25`;
    children.push(...await fetchRedditListing(url, subreddit));
  }

  return Array.from(new Map(children.map((child) => [child.data?.id, child])).values());
}

function mapPost(child: RedditChild) {
  const data = child.data;
  if (!data?.id || !data.title || !data.subreddit) return null;
  if (data.over_18 || data.stickied) return null;

  const body = data.selftext ?? "";
  const { matches, score } = detectPain(data.title, body);
  if (matches.length === 0) return null;

  const commentCount = data.num_comments ?? 0;
  const intentLevel = inferIntent(score, commentCount, data.title);
  const postedAt = new Date((data.created_utc ?? Date.now() / 1000) * 1000);

  return {
    redditPostId: data.id,
    username: data.author ?? "unknown",
    subreddit: data.subreddit,
    postUrl: postUrl(data.permalink, data.url),
    title: data.title,
    body: body.slice(0, 5000),
    problemSummary: summarizeProblem(matches, data.title),
    intentLevel,
    outreachAngle: suggestedOutreach(matches),
    painSignals: matches.map((match) => match.label),
    score,
    upvotes: data.score ?? 0,
    commentCount,
    postedAt,
  };
}

export async function runRedditAcquisitionScan() {
  const startedAt = Date.now();
  const posts = [];
  const errors: string[] = [];

  for (const subreddit of TARGET_SUBREDDITS) {
    try {
      const children = await fetchSubredditPosts(subreddit);
      posts.push(...children.map(mapPost).filter((post): post is NonNullable<ReturnType<typeof mapPost>> => Boolean(post)));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unable to scan r/${subreddit}`);
    }
  }

  const uniquePosts = Array.from(
    new Map(posts.map((post) => [post.redditPostId, post])).values(),
  ).sort((a, b) => b.score - a.score || b.postedAt.getTime() - a.postedAt.getTime());

  let saved = 0;
  for (const post of uniquePosts) {
    await LeadRepository.upsert(post);
    saved += 1;
  }

  return {
    scannedSubreddits: TARGET_SUBREDDITS.length,
    matchedPosts: uniquePosts.length,
    saved,
    errors,
    durationMs: Date.now() - startedAt,
  };
}

export async function listRedditLeads(limit = 100) {
  return LeadRepository.findRecent(limit);
}

export async function listTrendingAdProblems(limit = 10) {
  const since = new Date();
  since.setUTCHours(since.getUTCHours() - 24);

  const leads = await LeadRepository.findTrending(since, limit);

  return leads.map((lead) => ({
    id: lead.id,
    subreddit: lead.subreddit,
    postUrl: lead.postUrl,
    title: lead.title,
    problemSummary: lead.problemSummary,
    intentLevel: lead.intentLevel,
    painSignals: lead.painSignals,
    upvotes: lead.upvotes,
    commentCount: lead.commentCount,
    postedAt: lead.postedAt,
  }));
}
