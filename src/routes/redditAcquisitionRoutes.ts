import { Router } from "express";
import {
  getRedditLeads,
  runRedditAcquisitionJob,
} from "../controllers/redditAcquisitionController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/run", runRedditAcquisitionJob);
router.post("/", authenticate, runRedditAcquisitionJob);
router.get("/", authenticate, getRedditLeads);

export { router as redditAcquisitionRoutes };
