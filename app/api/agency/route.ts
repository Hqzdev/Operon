import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { getAgencyOverview, updateAgencyWorkspace } from "@/src/services/agencyService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    return NextResponse.json(await getAgencyOverview(userId));
  } catch (error) {
    return errorResponse(error);
  }
}

const workspaceSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = workspaceSchema.parse(await request.json());
    return NextResponse.json(await updateAgencyWorkspace(userId, body));
  } catch (error) {
    return errorResponse(error);
  }
}
