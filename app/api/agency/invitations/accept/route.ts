import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api-auth";
import { acceptAgencyInvitation } from "@/src/services/agencyService";

export const dynamic = "force-dynamic";

const acceptSchema = z.object({
  token: z.string().min(12),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const body = acceptSchema.parse(await request.json());
    return NextResponse.json(await acceptAgencyInvitation(body), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
