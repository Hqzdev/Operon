import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  getNotifications,
  markAllRead,
  markOneRead,
  triggerDigest,
} from "../controllers/notificationController";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markOneRead);
router.post("/trigger-digest", triggerDigest);

export { router as notificationRoutes };
