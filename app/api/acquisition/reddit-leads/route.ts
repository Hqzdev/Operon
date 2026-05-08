import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId, AppError } from "@/lib/api-auth";
import {
  listRedditLeads,
  runRedditAcquisitionScan,
} from "@/src/services/redditAcquisitionService";

export const dynamic = "force-dynamic";

function hasValidCronSecret(request: Request) {
  const expected = process.env.ACQUISITION_CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("x-acquisition-cron-secret") === expected;
}

function authorizeCronOrUser(request: Request) {
  if (hasValidCronSecret(request)) return;
  getAuthUserId(request);
}

export async function GET(request: Request) {
  try {
    getAuthUserId(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 250);
    const leads = await listRedditLeads(limit);

    return NextResponse.json({ leads });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    authorizeCronOrUser(request);
    const result = await runRedditAcquisitionScan();

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error);
    return errorResponse(error);
  }
}
