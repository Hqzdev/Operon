import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import {
  guardrailSchema,
  updateActionGuardrail,
} from "@/src/services/adActionService";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const input = guardrailSchema.parse(await request.json());
    const result = await updateActionGuardrail(userId, input);
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
