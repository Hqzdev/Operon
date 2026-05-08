import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { getRecommendationTrackRecord } from "@/src/services/recommendationOutcomeService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const trackRecord = await getRecommendationTrackRecord(userId);
    return NextResponse.json(trackRecord);
  } catch (error) {
    return errorResponse(error);
  }
}
