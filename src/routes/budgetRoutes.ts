import { Router } from "express";
import { budgetAllocationController } from "../controllers/budgetController";
import { authenticate } from "../middleware/authenticate";
import { requirePlan } from "../middleware/requirePlan";
import { validateBody } from "../middleware/validate";
import { budgetInputSchema } from "../services/budgetService";

const router = Router();

router.post(
  "/allocate",
  authenticate,
  requirePlan("SCALE"),
  validateBody(budgetInputSchema),
  budgetAllocationController,
);

export { router as budgetRoutes };
