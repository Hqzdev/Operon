import { NextResponse } from "next/server";
import { prisma } from "@/src/models/prisma";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new ApiError("Notification not found", 404);

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ notification: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
