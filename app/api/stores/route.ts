import { NextResponse } from "next/server";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";
import { listStores, upsertStore } from "@/src/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const stores = await listStores(userId);
    return NextResponse.json({ stores });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = await request.json();
    const { name, url } = body as { name?: string; url?: string };
    if (!url) throw new ApiError("Store URL is required", 400);

    const store = await upsertStore(userId, { name, url });
    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
