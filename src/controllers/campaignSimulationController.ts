import type { Request, Response } from "express";
import { simulateCampaignBudget } from "../services/campaignSimulationService";
import { asyncHandler } from "../utils/asyncHandler";

export const simulateCampaignController = asyncHandler(async (req: Request, res: Response) => {
  const simulation = await simulateCampaignBudget(req.auth!.userId, req.body);
  res.status(200).json(simulation);
});
