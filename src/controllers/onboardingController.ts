import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { analyzeStore } from "../services/storeAnalysisService";
import { prisma } from "../models/prisma";

function normalizeNiche(value?: string): string {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("beauty") || normalized.includes("cosmetic") || normalized.includes("skin")) return "beauty";
  if (normalized.includes("fashion") || normalized.includes("apparel") || normalized.includes("clothing")) return "fashion";
  if (normalized.includes("electronic") || normalized.includes("gadget") || normalized.includes("tech")) return "electronics";
  if (normalized.includes("fitness") || normalized.includes("sport") || normalized.includes("wellness")) return "fitness";
  if (normalized.includes("home") || normalized.includes("furniture") || normalized.includes("decor")) return "home_goods";
  return "fashion";
}

export const analyzeStoreController = asyncHandler(async (req: Request, res: Response) => {
  const { storeUrl } = req.body as { storeUrl: string };
  const userId = req.auth!.userId;

  const result = await analyzeStore(storeUrl);

  await prisma.user.update({
    where: { id: userId },
    data: {
      storeUrl,
      niche: normalizeNiche(result.niche),
      onboardingCompleted: true,
    },
  });

  res.status(200).json({ analysis: result });
});
