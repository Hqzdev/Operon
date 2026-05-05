import type { Request, Response } from "express";
import { getLtvBreakeven } from "../services/shopifyLtvService";
import { asyncHandler } from "../utils/asyncHandler";

export const ltvBreakevenController = asyncHandler(async (req: Request, res: Response) => {
  const rawMargin = req.query.profitMargin;
  const profitMargin =
    rawMargin !== undefined && !Number.isNaN(Number(rawMargin))
      ? Math.min(Math.max(Number(rawMargin), 0), 1)
      : 0.4;

  const result = await getLtvBreakeven(profitMargin);
  res.status(200).json(result);
});
