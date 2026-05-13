import { Router } from "express";
import { getSubscriptionController, subscriptionActionController } from "../controllers/subscriptionController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, getSubscriptionController);
router.post("/", authenticate, subscriptionActionController);

export { router as subscriptionRoutes };
