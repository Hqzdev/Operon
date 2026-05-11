import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { errorResponse, ApiError } from "@/lib/api-auth";
import { verifyToken } from "@/src/utils/jwt";
import { getUserProfile } from "@/src/services/userService";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "operon_google_oauth_token";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) throw new ApiError("Google sign-in session expired", 401);

    const payload = verifyToken(token);
    const user = await getUserProfile(payload.userId);
    const response = NextResponse.json({ token, user });
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
