import { Router } from "express";
import { z } from "zod";
import { analyzeStoreController } from "../controllers/onboardingController";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";

const router = Router();

const analyzeSchema = z.object({
  storeUrl: z.string().url(),
});

router.post("/analyze", authenticate, validateBody(analyzeSchema), analyzeStoreController);

export { router as onboardingRoutes };
