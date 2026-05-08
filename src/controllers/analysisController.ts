import type { Request, Response } from "express";
import {
  createAnalysis,
  listAnalyses,
} from "../services/analysisService";
import { parseMetaAdsCsv } from "../services/metaCsvImportService";
import { asyncHandler } from "../utils/asyncHandler";

export const createAnalysisController = asyncHandler(async (req: Request, res: Response) => {
  const analysis = await createAnalysis(req.auth!.userId, req.body);
  res.status(201).json(analysis);
});

export const listAnalysesController = asyncHandler(async (req: Request, res: Response) => {
  const analyses = await listAnalyses(req.auth!.userId);
  res.status(200).json(analyses);
});

export const importMetaCsvController = asyncHandler(async (req: Request, res: Response) => {
  const rows = parseMetaAdsCsv(req.body?.csv ?? "", Math.min(Math.max(req.body?.limit ?? 5, 1), 10));
  if (!rows.length) {
    res.status(400).json({
      message: "No usable Meta Ads rows found. Include spend, impressions, clicks, purchases, or revenue columns.",
    });
    return;
  }

  const analyses = [];
  for (const row of rows) {
    const analysis = await createAnalysis(req.auth!.userId, row.payload);
    analyses.push({ row, analysis });
  }

  res.status(201).json({ imported: analyses.length, analyses });
});
