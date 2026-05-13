import { NextResponse } from "next/server";
import { errorResponse, ApiError } from "@/lib/api-auth";
import { env } from "@/src/utils/env";
import { recomputeCommunityBenchmarks } from "@/src/services/communityBenchmarkService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const header = request.headers.get("x-integration-sync-secret");
    if (env.INTEGRATION_SYNC_SECRET && header !== env.INTEGRATION_SYNC_SECRET) {
      throw new ApiError("Invalid benchmark recompute secret", 401);
    }

    return NextResponse.json(await recomputeCommunityBenchmarks());
  } catch (error) {
    return errorResponse(error);
  }
}
