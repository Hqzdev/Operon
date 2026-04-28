import { NextResponse } from "next/server";
import { syncPaymentStatus } from "@/src/services/paymentService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { paymentId } = await params;
    const payment = await syncPaymentStatus(userId, paymentId);
    return NextResponse.json({ ok: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    return errorResponse(error);
  }
}
