import { Router } from "express";
import { ltvBreakevenController } from "../controllers/analyticsController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/ltv-breakeven", authenticate, ltvBreakevenController);

export { router as analyticsRoutes };
