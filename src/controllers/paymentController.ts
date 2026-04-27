import type { Request, Response } from "express";
import { UserPlan } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { createPaymentIntent, handlePaymentWebhook, syncPaymentStatus } from "../services/paymentService";

const paymentCreateSchema = z.object({
  plan: z.nativeEnum(UserPlan),
});

export const createPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const { plan } = paymentCreateSchema.parse(req.body);
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
  const payment = await syncPaymentStatus(req.auth!.userId, req.params.paymentId);
  res.status(200).json({
    ok: true,
    paymentId: payment.id,
    status: payment.status,
  });
});
