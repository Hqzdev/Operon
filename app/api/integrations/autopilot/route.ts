import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { updateUserExtensionAutopilot } from "@/src/services/integrationService";

export const dynamic = "force-dynamic";

const schema = z.object({
  autopilotEnabled: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = schema.parse(await request.json());
    const result = await updateUserExtensionAutopilot(userId, body.autopilotEnabled);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
