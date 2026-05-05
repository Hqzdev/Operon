import { NextResponse } from "next/server";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";
import { getLtvBreakeven } from "@/src/services/shopifyLtvService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    getAuthUserId(request);

    const { searchParams } = new URL(request.url);
    const rawMargin = searchParams.get("profitMargin");
    const profitMargin =
      rawMargin !== null && !Number.isNaN(Number(rawMargin))
        ? Math.min(Math.max(Number(rawMargin), 0), 1)
        : 0.4;

    const result = await getLtvBreakeven(profitMargin);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
