import type { Request, Response } from "express";
import {
  createAnalysis,
  listAnalyses,
} from "../services/analysisService";
import { asyncHandler } from "../utils/asyncHandler";

export const createAnalysisController = asyncHandler(async (req: Request, res: Response) => {
  const analysis = await createAnalysis(req.auth!.userId, req.body);
  res.status(201).json(analysis);
});

export const listAnalysesController = asyncHandler(async (req: Request, res: Response) => {
  const analyses = await listAnalyses(req.auth!.userId);
  res.status(200).json(analyses);
});
