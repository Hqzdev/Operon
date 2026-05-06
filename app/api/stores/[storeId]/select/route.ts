import { NextResponse } from "next/server";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";
import { selectStore } from "@/src/services/storeService";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { storeId } = await params;
    const store = await selectStore(userId, storeId);
    return NextResponse.json({ store });
  } catch (error) {
    return errorResponse(error);
  }
}
