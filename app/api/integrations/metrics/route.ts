import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import {
  getLatestAnalysisInput,
  listMetricSnapshots,
} from "@/src/services/integrationService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const [snapshots, latestInput] = await Promise.all([
      listMetricSnapshots(userId),
      getLatestAnalysisInput(userId),
    ]);
    return NextResponse.json({ snapshots, latestInput });
  } catch (error) {
    return errorResponse(error);
  }
}
