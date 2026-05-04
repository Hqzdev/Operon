import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import {
  buildOAuthUrl,
  listConnections,
  parseProvider,
  syncUserConnections,
} from "@/src/services/integrationService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    return NextResponse.json(await listConnections(userId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = await request.json();
    const provider = parseProvider(String(body.provider ?? ""));
    const url = buildOAuthUrl(userId, provider, body.shop ? String(body.shop) : undefined);
    return NextResponse.json({ url });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const result = await syncUserConnections(userId);
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
