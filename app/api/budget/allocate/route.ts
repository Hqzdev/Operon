import { NextResponse } from "next/server";
import { UserPlan } from "@prisma/client";
import { prisma } from "@/src/models/prisma";
import { allocateBudget, budgetInputSchema } from "@/src/services/budgetService";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";

async function requireScalePlan(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) throw new ApiError("User not found", 404);
  const rank: Record<UserPlan, number> = { STARTER: 0, PRO: 1, SCALE: 2 };
  if (rank[user.plan] < rank[UserPlan.SCALE]) {
    throw new ApiError("This feature requires Pro plan or higher", 403, {
      requiredPlan: UserPlan.SCALE,
      currentPlan: user.plan,
    });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    await requireScalePlan(userId);
    const body = await request.json();
    const input = budgetInputSchema.parse(body);
    const result = allocateBudget(input);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
