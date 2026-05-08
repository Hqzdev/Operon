import type { Request, Response } from "express";
import {
  listRedditLeads,
  runRedditAcquisitionScan,
} from "../services/redditAcquisitionService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/appError";
import { env } from "../utils/env";

function hasValidCronSecret(req: Request) {
  if (!env.ACQUISITION_CRON_SECRET) return false;
  return req.headers["x-acquisition-cron-secret"] === env.ACQUISITION_CRON_SECRET;
}

export const getRedditLeads = asyncHandler(async (_req: Request, res: Response) => {
  const leads = await listRedditLeads();
  res.json({ leads });
});

export const runRedditAcquisitionJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth?.userId && !hasValidCronSecret(req)) {
    throw new AppError("Authentication token or cron secret is required", 401);
  }

  const result = await runRedditAcquisitionScan();
  res.json({ result });
});
