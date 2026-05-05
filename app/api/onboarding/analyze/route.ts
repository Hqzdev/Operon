import { NextResponse } from "next/server";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";
import { analyzeStore } from "@/src/services/storeAnalysisService";
import { prisma } from "@/src/models/prisma";

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

    await prisma.user.update({
      where: { id: userId },
      data: {
        storeUrl,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    return errorResponse(error);
  }
}
