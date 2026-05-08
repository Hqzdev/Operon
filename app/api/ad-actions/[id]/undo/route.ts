import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { undoAdAction } from "@/src/services/adActionService";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { id } = await params;
    const action = await undoAdAction(userId, id);
    return NextResponse.json({ action });
  } catch (error) {
    return errorResponse(error);
  }
}
