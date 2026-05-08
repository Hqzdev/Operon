import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { ensureAgencyWorkspace, generateWeeklyAgencyReports } from "@/src/services/agencyService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    await ensureAgencyWorkspace(userId);
    return NextResponse.json(await generateWeeklyAgencyReports());
  } catch (error) {
    return errorResponse(error);
  }
}
