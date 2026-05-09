import { NextResponse } from "next/server";
import { DEFAULT_DROPSHIPPING_SUBREDDITS } from "@/lib/reddit";
import { fetchRedditPosts } from "@/lib/reddit-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subreddits = searchParams.get("subreddits")?.split(",").filter(Boolean) ?? DEFAULT_DROPSHIPPING_SUBREDDITS;
    const limit = Number(searchParams.get("limit") ?? 100);
    const result = await fetchRedditPosts(subreddits, limit);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to fetch Reddit posts" },
      { status: 502 },
    );
  }
}
