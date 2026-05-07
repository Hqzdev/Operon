import { Router } from "express";
import {
  dismissOneFatigueAlert,
  getFatigueAlerts,
  runFatigueJob,
  snoozeOneFatigueAlert,
} from "../controllers/fatigueController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/run", runFatigueJob);

router.use(authenticate);

router.get("/", getFatigueAlerts);
router.patch("/:id/dismiss", dismissOneFatigueAlert);
router.patch("/:id/snooze", snoozeOneFatigueAlert);

export { router as fatigueRoutes };
