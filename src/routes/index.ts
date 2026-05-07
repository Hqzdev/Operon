import { Router } from "express";
import { analysisRoutes } from "./analysisRoutes";
import { analyticsRoutes } from "./analyticsRoutes";
import { authRoutes } from "./authRoutes";
import { budgetRoutes } from "./budgetRoutes";
import { fatigueRoutes } from "./fatigueRoutes";
import { notificationRoutes } from "./notificationRoutes";
import { onboardingRoutes } from "./onboardingRoutes";
import { paymentRoutes } from "./paymentRoutes";
import { scenarioRoutes } from "./scenarioRoutes";
import { userRoutes } from "./userRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/analysis", analysisRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/notifications", notificationRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/payments", paymentRoutes);
router.use("/budget", budgetRoutes);
router.use("/scenario", scenarioRoutes);
router.use("/fatigue-alerts", fatigueRoutes);

export { router as apiRoutes };
