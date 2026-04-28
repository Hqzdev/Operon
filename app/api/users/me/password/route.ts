import { NextResponse } from "next/server";
import { changeUserPassword } from "@/src/services/userService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const { currentPassword, newPassword } = await request.json();
    await changeUserPassword(userId, { currentPassword, newPassword });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
