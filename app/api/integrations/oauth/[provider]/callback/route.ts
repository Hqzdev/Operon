import { NextResponse } from "next/server";
import { completeOAuth, parseProvider } from "@/src/services/integrationService";
import { errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: providerParam } = await context.params;
    const provider = parseProvider(providerParam);
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.redirect(new URL("/dashboard?integration=failed", request.url));
    }
    await completeOAuth(provider, code, state);
    return NextResponse.redirect(new URL(`/dashboard?integration=${provider.toLowerCase()}-connected`, request.url));
  } catch (error) {
    const response = errorResponse(error);
    if (response.status >= 400) {
      return NextResponse.redirect(new URL("/dashboard?integration=failed", request.url));
    }
    return response;
  }
}
