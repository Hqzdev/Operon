import type { Request, Response } from "express";
import { allocateBudget, planWeeklyBudget } from "../services/budgetService";
import { asyncHandler } from "../utils/asyncHandler";

export const budgetAllocationController = asyncHandler(async (req: Request, res: Response) => {
  const result = allocateBudget(req.body);
  res.status(200).json(result);
});

export const weeklyBudgetPlanController = asyncHandler(async (req: Request, res: Response) => {
  const result = planWeeklyBudget(req.body);
  res.status(200).json(result);
});
