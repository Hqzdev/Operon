import { NextResponse } from "next/server";
import { analyzeSeo } from "@/src/services/seoAnalysisService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const result = await analyzeSeo(userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
