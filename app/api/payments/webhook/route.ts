import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/src/services/paymentService";
import { ApiError, constantTimeEquals, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.YOOKASSA_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret = request.headers.get("x-yookassa-webhook-secret");
      if (!constantTimeEquals(providedSecret, expectedSecret)) {
        throw new ApiError("Invalid webhook secret", 401);
      }
    }

    const body = await request.json();
    const payment = await handlePaymentWebhook(body);
    return NextResponse.json({ ok: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    return errorResponse(error);
  }
}
