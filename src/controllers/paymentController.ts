import type { Request, Response } from "express";
import { UserPlan } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { createPaymentIntent, handlePaymentWebhook, syncPaymentStatus } from "../services/paymentService";
import { normalizeUserPlan } from "../services/planService";

const paymentCreateSchema = z.object({
  plan: z.string().min(1),
});

export const createPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const { plan: rawPlan } = paymentCreateSchema.parse(req.body);
  const plan = normalizeUserPlan(rawPlan);
  if (!plan || plan === UserPlan.STARTER) {
    res.status(400).json({ error: "Paid plan must be PRO or SCALE" });
    return;
  }
  const payment = await createPaymentIntent(req.auth!.userId, plan);
  res.status(201).json(payment);
});

export const paymentWebhookController = asyncHandler(async (req: Request, res: Response) => {
  const payment = await handlePaymentWebhook(req.body);
  res.status(200).json({
    ok: true,
    paymentId: payment.id,
    status: payment.status,
  });
});

export const syncPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const paymentId = z.string().min(1).parse(req.params.paymentId);
  const payment = await syncPaymentStatus(req.auth!.userId, paymentId);
  res.status(200).json({
    ok: true,
    paymentId: payment.id,
    status: payment.status,
  });
});
