import { Router } from "express";
import { budgetAllocationController, weeklyBudgetPlanController } from "../controllers/budgetController";
import { authenticate } from "../middleware/authenticate";
import { requirePlan } from "../middleware/requirePlan";
import { validateBody } from "../middleware/validate";
import { budgetInputSchema, weeklyBudgetPlanInputSchema } from "../services/budgetService";

const router = Router();

router.post(
  "/allocate",
  authenticate,
  requirePlan("SCALE"),
  validateBody(budgetInputSchema),
  budgetAllocationController,
);

router.post(
  "/weekly-plan",
  authenticate,
  requirePlan("SCALE"),
  validateBody(weeklyBudgetPlanInputSchema),
  weeklyBudgetPlanController,
);

export { router as budgetRoutes };
