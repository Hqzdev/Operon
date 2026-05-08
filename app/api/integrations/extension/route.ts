import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { createExtensionConnection, parseProvider } from "@/src/services/integrationService";

export const dynamic = "force-dynamic";

const extensionConnectionSchema = z.object({
  provider: z.enum(["META", "TIKTOK", "SHOPIFY"]),
  accountName: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = extensionConnectionSchema.parse(await request.json());
    const provider = parseProvider(body.provider);
    const result = await createExtensionConnection(userId, provider, body.accountName);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
