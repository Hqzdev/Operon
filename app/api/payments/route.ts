import { NextResponse } from "next/server";
import { listPayments } from "@/src/services/paymentService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const payments = await listPayments(userId);
    return NextResponse.json(payments);
  } catch (error) {
    return errorResponse(error);
  }
}
