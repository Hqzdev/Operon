import { Router } from "express";
import {
  executeAdActionController,
  listAdActionLogsController,
  undoAdActionController,
  updateActionGuardrailController,
} from "../controllers/adActionController";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";
import {
  executeAdActionSchema,
  guardrailSchema,
} from "../services/adActionService";

const router = Router();

router.use(authenticate);
router.get("/", listAdActionLogsController);
router.post("/", validateBody(executeAdActionSchema), executeAdActionController);
router.post("/:id/undo", undoAdActionController);
router.patch("/guardrails", validateBody(guardrailSchema), updateActionGuardrailController);

export { router as adActionRoutes };
