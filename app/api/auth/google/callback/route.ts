import { NextResponse } from "next/server";
import { completeGoogleOAuth } from "@/src/services/authService";
import { ApiError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const completeUrl = new URL("/auth/google/complete", request.url);

  if (error) {
    completeUrl.searchParams.set("error", error);
    return NextResponse.redirect(completeUrl);
  }

  try {
    if (!code || !state) {
      throw new ApiError("Missing Google OAuth code or state", 400);
    }

    const result = await completeGoogleOAuth({
      code,
      state,
      redirectUri: new URL("/api/auth/google/callback", request.url).toString(),
    });

    completeUrl.searchParams.set("token", result.token);
    return NextResponse.redirect(completeUrl);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Google sign-in failed";
    completeUrl.searchParams.set("error", message);
    return NextResponse.redirect(completeUrl);
  }
}
