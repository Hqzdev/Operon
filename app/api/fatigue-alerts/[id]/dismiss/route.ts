import { NextResponse } from "next/server";
import { dismissFatigueAlert } from "@/src/services/fatigueService";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { id } = await params;
    const alert = await dismissFatigueAlert(userId, id);

    return NextResponse.json({ alert });
  } catch (error) {
    return errorResponse(error);
  }
}
