import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/api-auth";
import { runFatigueChecksForDueAccounts } from "@/src/services/fatigueService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const configuredSecret = process.env.INTEGRATION_SYNC_SECRET;
    if (configuredSecret) {
      const header = request.headers.get("x-integration-sync-secret");
      if (header !== configuredSecret) throw new ApiError("Invalid sync secret", 401);
    }

    const result = await runFatigueChecksForDueAccounts();
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
