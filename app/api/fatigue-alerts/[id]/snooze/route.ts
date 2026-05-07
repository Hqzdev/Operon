import { NextResponse } from "next/server";
import { z } from "zod";
import { snoozeFatigueAlert } from "@/src/services/fatigueService";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const snoozeSchema = z.object({
  days: z.coerce.number().int().min(1).max(14).default(3),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { days } = snoozeSchema.parse(body);
    const alert = await snoozeFatigueAlert(userId, id, days);

    return NextResponse.json({ alert });
  } catch (error) {
    return errorResponse(error);
  }
}
