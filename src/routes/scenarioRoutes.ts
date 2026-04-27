import { Router } from "express";
import { scenarioSimulatorController } from "../controllers/scenarioController";
import { authenticate } from "../middleware/authenticate";
import { requirePlan } from "../middleware/requirePlan";
import { validateBody } from "../middleware/validate";
import { scenarioInputSchema } from "../services/scenarioService";

const router = Router();

router.post(
  "/simulate",
  authenticate,
  requirePlan("SCALE"),
  validateBody(scenarioInputSchema),
  scenarioSimulatorController,
);

export { router as scenarioRoutes };
