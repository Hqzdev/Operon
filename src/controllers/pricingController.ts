import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getPricingTiers } from "../services/pricingService";

export const listPricingController = asyncHandler(async (req: Request, res: Response) => {
  const pricing = await getPricingTiers(String(req.query.currency ?? "USD"));
  res.status(200).json(pricing);
});
