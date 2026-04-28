import { NextResponse } from "next/server";
import { UserPlan } from "@prisma/client";
import { createPaymentIntent } from "@/src/services/paymentService";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const { plan } = await request.json();
    if (!plan || !Object.values(UserPlan).includes(plan)) {
      throw new ApiError("Valid plan is required", 400);
    }
    const payment = await createPaymentIntent(userId, plan as UserPlan);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
