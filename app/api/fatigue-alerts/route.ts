import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { listFatigueAlerts } from "@/src/services/fatigueService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("includeHistory") === "true";
    const alerts = await listFatigueAlerts(userId, includeHistory);

    return NextResponse.json({ alerts });
  } catch (error) {
    return errorResponse(error);
  }
}
