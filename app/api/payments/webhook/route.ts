import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/src/services/paymentService";
import { errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payment = await handlePaymentWebhook(body);
    return NextResponse.json({ ok: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    return errorResponse(error);
  }
}
