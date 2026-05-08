import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { createAgencyClient } from "@/src/services/agencyService";

export const dynamic = "force-dynamic";

const clientSchema = z.object({
  name: z.string().min(2).max(120),
  contactEmail: z.string().email().optional(),
  storeUrl: z.string().max(240).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = clientSchema.parse(await request.json());
    return NextResponse.json(await createAgencyClient(userId, body), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
