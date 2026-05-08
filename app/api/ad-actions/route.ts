import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import {
  executeAdAction,
  executeAdActionSchema,
  listAdActionLogs,
} from "@/src/services/adActionService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 100);
    const logs = await listAdActionLogs(userId, limit);
    return NextResponse.json({ logs });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const input = executeAdActionSchema.parse(await request.json());
    const action = await executeAdAction(userId, input);
    return NextResponse.json({ action });
  } catch (error) {
    return errorResponse(error);
  }
}
