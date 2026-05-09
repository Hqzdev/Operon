import { NextResponse } from "next/server";
import { syncDueConnections } from "@/src/services/integrationService";
import { errorResponse, ApiError, constantTimeEquals } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const configuredSecret = process.env.INTEGRATION_SYNC_SECRET;
    if (!configuredSecret) {
      throw new ApiError("Sync secret is not configured", 503);
    }

    const header = request.headers.get("x-integration-sync-secret");
    if (!constantTimeEquals(header, configuredSecret)) {
      throw new ApiError("Invalid sync secret", 401);
    }

    const result = await syncDueConnections();
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
