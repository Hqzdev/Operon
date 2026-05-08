import { Router } from "express";
import {
  createAnalysisController,
  importMetaCsvController,
  listAnalysesController,
} from "../controllers/analysisController";
import { authenticate } from "../middleware/authenticate";
import { trackUsage } from "../middleware/trackUsage";
import { validateBody } from "../middleware/validate";
import { analysisInputSchema } from "../services/analysisService";

const router = Router();

router.get("/", authenticate, listAnalysesController);
router.post("/import-meta-csv", authenticate, importMetaCsvController);
router.post("/", authenticate, trackUsage, validateBody(analysisInputSchema), createAnalysisController);

export { router as analysisRoutes };
