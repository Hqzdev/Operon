import { Router } from "express";
import {
  createExtensionConnectionController,
  disconnectConnectionController,
  ingestExtensionMetricsController,
  listConnectionsController,
  listMetricSnapshotsController,
  syncConnectionsController,
} from "../controllers/integrationController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, listConnectionsController);
router.patch("/", authenticate, syncConnectionsController);
router.get("/metrics", authenticate, listMetricSnapshotsController);
router.post("/extension", authenticate, createExtensionConnectionController);
router.post("/extension/sync", ingestExtensionMetricsController);
router.delete("/:connectionId", authenticate, disconnectConnectionController);

export { router as integrationRoutes };
