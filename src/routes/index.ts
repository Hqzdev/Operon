import { Router } from "express";
import { analysisRoutes } from "./analysisRoutes";
import { analyticsRoutes } from "./analyticsRoutes";
import { adActionRoutes } from "./adActionRoutes";
import { agencyRoutes } from "./agencyRoutes";
import { authRoutes } from "./authRoutes";
import { budgetRoutes } from "./budgetRoutes";
import { campaignSimulationRoutes } from "./campaignSimulationRoutes";
import { fatigueRoutes } from "./fatigueRoutes";
import { notificationRoutes } from "./notificationRoutes";
import { onboardingRoutes } from "./onboardingRoutes";
import { paymentRoutes } from "./paymentRoutes";
import { redditAcquisitionRoutes } from "./redditAcquisitionRoutes";
import { scenarioRoutes } from "./scenarioRoutes";
import { userRoutes } from "./userRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/analysis", analysisRoutes);
router.use("/ad-actions", adActionRoutes);
router.use("/agency", agencyRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/notifications", notificationRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/payments", paymentRoutes);
router.use("/budget", budgetRoutes);
router.use("/scenario", scenarioRoutes);
router.use("/fatigue-alerts", fatigueRoutes);
router.use("/campaign-simulations", campaignSimulationRoutes);
router.use("/acquisition/reddit-leads", redditAcquisitionRoutes);

export { router as apiRoutes };
