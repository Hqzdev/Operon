import { Router } from "express";
import {
  createPaymentController,
  paymentWebhookController,
  syncPaymentController,
} from "../controllers/paymentController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/create", authenticate, createPaymentController);
router.post("/:paymentId/sync", authenticate, syncPaymentController);
router.post("/webhook", paymentWebhookController);

export { router as paymentRoutes };
