import { Router } from "express";
import {
  acceptAgencyInvitationController,
  createAgencyClientController,
  downloadAgencyReportController,
  generateAgencyReportsController,
  getAgencyOverviewController,
  inviteClientViewerController,
  updateAgencyWorkspaceController,
} from "../controllers/agencyController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, getAgencyOverviewController);
router.patch("/", authenticate, updateAgencyWorkspaceController);
router.post("/clients", authenticate, createAgencyClientController);
router.post("/clients/:clientId/invite", authenticate, inviteClientViewerController);
router.post("/invitations/accept", acceptAgencyInvitationController);
router.post("/reports/generate", authenticate, generateAgencyReportsController);
router.get("/reports/:reportId/download", authenticate, downloadAgencyReportController);

export { router as agencyRoutes };
