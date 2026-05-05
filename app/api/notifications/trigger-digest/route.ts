import { NextResponse } from "next/server";
import { generateAndSendDigest } from "@/src/services/digestService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const summary = await generateAndSendDigest(userId);
    return NextResponse.json({ message: "Digest generated", summary });
  } catch (error) {
    return errorResponse(error);
  }
}
