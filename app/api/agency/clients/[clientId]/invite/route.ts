import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { inviteClientViewer } from "@/src/services/agencyService";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({ email: z.string().email() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { clientId } = await params;
    const body = inviteSchema.parse(await request.json());
    return NextResponse.json(await inviteClientViewer(userId, clientId, body.email));
  } catch (error) {
    return errorResponse(error);
  }
}
