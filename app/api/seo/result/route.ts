import { NextResponse } from "next/server";
import { getCachedSeoResult } from "@/src/services/seoAnalysisService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const result = await getCachedSeoResult(userId);
    return NextResponse.json(result ?? null);
  } catch (error) {
    return errorResponse(error);
  }
}
