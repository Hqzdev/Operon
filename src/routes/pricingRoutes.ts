import { Router } from "express";
import { listPricingController } from "../controllers/pricingController";

const router = Router();

router.get("/", listPricingController);

export { router as pricingRoutes };
