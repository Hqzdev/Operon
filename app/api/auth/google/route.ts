import { NextResponse } from "next/server";
import { buildGoogleOAuthUrl } from "@/src/services/authService";
import { errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    return NextResponse.redirect(buildGoogleOAuthUrl(redirectUri));
  } catch (error) {
    return errorResponse(error);
  }
}
