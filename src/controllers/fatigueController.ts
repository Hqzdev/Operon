import type { Request, Response } from "express";
import { z } from "zod";
import {
  dismissFatigueAlert,
  listFatigueAlerts,
  runFatigueChecksForDueAccounts,
  snoozeFatigueAlert,
} from "../services/fatigueService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/appError";
import { env } from "../utils/env";

const snoozeSchema = z.object({
  days: z.coerce.number().int().min(1).max(14).default(3),
});

export const getFatigueAlerts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const includeHistory = req.query.includeHistory === "true";
  const alerts = await listFatigueAlerts(userId, includeHistory);

  res.json({ alerts });
});

export const dismissOneFatigueAlert = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const alert = await dismissFatigueAlert(userId, req.params.id as string);

  res.json({ alert });
});

export const snoozeOneFatigueAlert = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { days } = snoozeSchema.parse(req.body ?? {});
  const alert = await snoozeFatigueAlert(userId, req.params.id as string, days);

  res.json({ alert });
});

export const runFatigueJob = asyncHandler(async (req: Request, res: Response) => {
  if (env.INTEGRATION_SYNC_SECRET) {
    const header = req.headers["x-integration-sync-secret"];
    if (header !== env.INTEGRATION_SYNC_SECRET) throw new AppError("Invalid sync secret", 401);
  }

  const result = await runFatigueChecksForDueAccounts();
  res.json({ result });
});
