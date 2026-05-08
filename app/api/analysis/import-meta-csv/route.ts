import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { createAnalysis } from "@/src/services/analysisService";
import { parseMetaAdsCsv } from "@/src/services/metaCsvImportService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = await request.json() as { csv?: string; limit?: number };
    const rows = parseMetaAdsCsv(body.csv ?? "", Math.min(Math.max(body.limit ?? 5, 1), 10));
    if (!rows.length) {
      return NextResponse.json(
        { message: "No usable Meta Ads rows found. Include spend, impressions, clicks, purchases, or revenue columns." },
        { status: 400 },
      );
    }

    const analyses = [];
    for (const row of rows) {
      const analysis = await createAnalysis(userId, row.payload);
      analyses.push({ row, analysis });
    }

    return NextResponse.json({
      imported: analyses.length,
      analyses,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
