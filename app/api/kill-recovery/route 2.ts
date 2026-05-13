import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/models/prisma";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  analysisId: z.string().optional(),
  productName: z.string().min(1).max(200),
  productPrice: z.number().min(0),
  cost: z.number().min(0),
  killReason: z.string().min(1).max(2000),
  mainProblem: z.string().min(1).max(200),
  adAnglesTested: z.array(z.string().max(300)).max(20).default([]),
  totalSpendWasted: z.number().min(0).optional(),
  inventoryQty: z.number().int().min(0).optional(),
  supplierUrl: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = submitSchema.parse(await request.json());

    const listing = await prisma.killRecoveryListing.create({
      data: {
        userId,
        analysisId: body.analysisId ?? null,
        productName: body.productName,
        productPrice: body.productPrice,
        cost: body.cost,
        killReason: body.killReason,
        mainProblem: body.mainProblem,
        adAnglesTested: body.adAnglesTested,
        totalSpendWasted: body.totalSpendWasted ?? null,
        inventoryQty: body.inventoryQty ?? null,
        supplierUrl: body.supplierUrl ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: listing.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const listings = await prisma.killRecoveryListing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        productName: true,
        productPrice: true,
        cost: true,
        totalSpendWasted: true,
        status: true,
        revenueUsd: true,
        matchedAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json(listings);
  } catch (error) {
    return errorResponse(error);
  }
}
