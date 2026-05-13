import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { getSubscriptionOverview, handleSubscriptionAction } from "../services/subscriptionService";

const actionSchema = z.object({
  action: z.enum(["check-status", "downgrade-free", "cancel", "cancel-request"]),
  reason: z.string().max(1000).optional(),
});

export const getSubscriptionController = asyncHandler(async (req: Request, res: Response) => {
  const overview = await getSubscriptionOverview(req.auth!.userId);
  res.status(200).json(overview);
});

export const subscriptionActionController = asyncHandler(async (req: Request, res: Response) => {
  const input = actionSchema.parse(req.body);
  const result = await handleSubscriptionAction(req.auth!.userId, input);
  res.status(200).json(result);
});
