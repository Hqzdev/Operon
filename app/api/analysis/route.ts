import { NextResponse } from "next/server";
import { UserPlan } from "@prisma/client";
import { prisma } from "@/src/models/prisma";
import { createAnalysis, listAnalyses, analysisInputSchema } from "@/src/services/analysisService";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const MONTHLY_LIMITS: Record<UserPlan, number | null> = {
  STARTER: null,
  PRO: null,
  SCALE: null,
};
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function checkAndTrackUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, usageCount: true, usageResetAt: true },
  });
  if (!user) throw new ApiError("User not found", 404);

  const limit = MONTHLY_LIMITS[user.plan];
  const now = new Date();
  let currentCount = user.usageCount;

  if (now.getTime() >= user.usageResetAt.getTime() + THIRTY_DAYS_MS) {
    await prisma.user.update({
      where: { id: userId },
      data: { usageCount: 0, usageResetAt: now },
    });
    currentCount = 0;
  }

  if (limit !== null && currentCount >= limit) {
    throw new ApiError(
      `Monthly analysis limit reached (${limit}/month on ${user.plan} plan). Upgrade to continue.`,
      429,
      { limit, used: currentCount, plan: user.plan },
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { usageCount: { increment: 1 } },
  });
}

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const analyses = await listAnalyses(userId);
    return NextResponse.json(analyses);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    await checkAndTrackUsage(userId);
    const body = await request.json();
    const payload = analysisInputSchema.parse(body);
    const analysis = await createAnalysis(userId, payload);
    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
