import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import {
  enrollOutcomePricing,
  getOutcomePricingStatus,
  maybeCreateOutcomeInvoice,
} from "@/src/services/outcomePricingService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    await maybeCreateOutcomeInvoice(userId);
    return NextResponse.json(await getOutcomePricingStatus(userId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    await enrollOutcomePricing(userId);
    return NextResponse.json(await getOutcomePricingStatus(userId), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
