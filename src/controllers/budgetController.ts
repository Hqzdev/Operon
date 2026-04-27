import type { Request, Response } from "express";
import { allocateBudget } from "../services/budgetService";
import { asyncHandler } from "../utils/asyncHandler";

export const budgetAllocationController = asyncHandler(async (req: Request, res: Response) => {
  const result = allocateBudget(req.body);
  res.status(200).json(result);
});
