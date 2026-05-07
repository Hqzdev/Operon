import { NextResponse } from "next/server";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
} from "@/src/services/userService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const profile = await getUserProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const { name, storeName, niche } = await request.json();
    const profile = await updateUserProfile(userId, { name, storeName, niche });
    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const { password } = await request.json();
    await deleteUserAccount(userId, { password });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
