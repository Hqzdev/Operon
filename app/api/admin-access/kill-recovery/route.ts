import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-access";
import { errorResponse } from "@/lib/api-auth";
import { prisma } from "@/src/models/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const listings = await prisma.killRecoveryListing.findMany({
      where: status ? { status: status as "pending" | "reviewing" | "matched" | "closed" } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, storeName: true } },
      },
    });

    return NextResponse.json(listings);
  } catch (error) {
    return errorResponse(error);
  }
}

const patchSchema = z.object({
  status: z.enum(["pending", "reviewing", "matched", "closed"]).optional(),
  adminNotes: z.string().max(2000).optional(),
  revenueUsd: z.number().min(0).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("id query param is required");

    const body = patchSchema.parse(await request.json());
    const data: Record<string, unknown> = { ...body };
    if (body.status === "matched" && !("matchedAt" in data)) {
      data.matchedAt = new Date();
    }

    const listing = await prisma.killRecoveryListing.update({
      where: { id },
      data,
    });

    return NextResponse.json(listing);
  } catch (error) {
    return errorResponse(error);
  }
}
