import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";
import { analyzeStore } from "@/src/services/storeAnalysisService";
import { upsertStore } from "@/src/services/storeService";
import { normalizeNiche } from "@/lib/benchmark-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = await request.json();
    const { storeUrl } = body as { storeUrl?: string };

    if (!storeUrl) {
      throw new ApiError("storeUrl is required", 400);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(storeUrl);
    } catch {
      throw new ApiError("Invalid URL format", 400);
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new ApiError("URL must use http or https", 400);
    }

    const analysis = await analyzeStore(storeUrl);

    await upsertStore(userId, {
      url: storeUrl,
      name: analysis.storeName,
      platform: analysis.platform,
      description: analysis.storeDescription,
      niche: normalizeNiche(analysis.niche),
      analysis: JSON.parse(JSON.stringify(analysis)) as Prisma.InputJsonValue,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    return errorResponse(error);
  }
}
