import { NextResponse } from "next/server";
import { getPricingTiers } from "@/src/services/pricingService";
import { errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pricing = await getPricingTiers(searchParams.get("currency"));
    return NextResponse.json(pricing);
  } catch (error) {
    return errorResponse(error);
  }
}
