import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExtensionConnectionStatus,
  updateExtensionAutopilot,
} from "@/src/services/integrationService";
import { errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  extensionKey: z.string().min(16),
});

const autopilotSchema = statusSchema.extend({
  autopilotEnabled: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = statusSchema.parse(body);
    const status = await getExtensionConnectionStatus(payload.extensionKey);
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const payload = autopilotSchema.parse(body);
    const status = await updateExtensionAutopilot(payload.extensionKey, payload.autopilotEnabled);
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
