import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { analyzeStore } from "../services/storeAnalysisService";
import { prisma } from "../models/prisma";

export const analyzeStoreController = asyncHandler(async (req: Request, res: Response) => {
  const { storeUrl } = req.body as { storeUrl: string };
  const userId = req.auth!.userId;

  const result = await analyzeStore(storeUrl);

  await prisma.user.update({
    where: { id: userId },
    data: {
      storeUrl,
      onboardingCompleted: true,
    },
  });

  res.status(200).json({ analysis: result });
});
