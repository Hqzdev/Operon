import { NextResponse } from "next/server";
import { prisma } from "@/src/models/prisma";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    return errorResponse(error);
  }
}
