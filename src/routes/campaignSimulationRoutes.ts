import { Router } from "express";
import { simulateCampaignController } from "../controllers/campaignSimulationController";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";
import { campaignSimulationInputSchema } from "../services/campaignSimulationService";

const router = Router();

router.post(
  "/",
  authenticate,
  validateBody(campaignSimulationInputSchema),
  simulateCampaignController,
);

export { router as campaignSimulationRoutes };
