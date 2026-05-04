import { Router } from "express";
import {
  createPaymentController,
  listPaymentsController,
  paymentWebhookController,
  syncPaymentController,
} from "../controllers/paymentController";
import { authenticate } from "../middleware/authenticate";
import { yookassaIpGuard } from "../middleware/yookassaWebhook";

const router = Router();

router.get("/", authenticate, listPaymentsController);
router.post("/create", authenticate, createPaymentController);
router.post("/:paymentId/sync", authenticate, syncPaymentController);
router.post("/webhook", yookassaIpGuard, paymentWebhookController);

export { router as paymentRoutes };
