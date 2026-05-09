import { NextResponse } from "next/server";
import { inferStatusFromContent, normalizeShopKeywords, withRelevance, type RedditPostInput } from "@/lib/relevance";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { posts?: RedditPostInput[]; shopKeywords?: string[] };
    const shopKeywords = normalizeShopKeywords(body.shopKeywords ?? []);
    const posts = Array.isArray(body.posts) ? body.posts.slice(0, 1500) : [];

    if (shopKeywords.length === 0) {
      return NextResponse.json({ message: "At least one valid shop keyword is required" }, { status: 400 });
    }

    const scoredPosts = withRelevance(posts, shopKeywords).map((post) => ({
      ...post,
      status: inferStatusFromContent(post),
    }));

    return NextResponse.json({ posts: scoredPosts });
  } catch {
    return NextResponse.json({ message: "Unable to calculate relevance" }, { status: 400 });
  }
}
