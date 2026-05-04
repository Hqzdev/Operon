import { NextResponse } from "next/server";
import { disconnectConnection } from "@/src/services/integrationService";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { connectionId } = await context.params;
    await disconnectConnection(userId, connectionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
