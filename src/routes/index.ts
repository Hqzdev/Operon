import { Router } from "express";
import { analysisRoutes } from "./analysisRoutes";
import { authRoutes } from "./authRoutes";
import { budgetRoutes } from "./budgetRoutes";
import { paymentRoutes } from "./paymentRoutes";
import { scenarioRoutes } from "./scenarioRoutes";
import { userRoutes } from "./userRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/analysis", analysisRoutes);
router.use("/payments", paymentRoutes);
router.use("/budget", budgetRoutes);
router.use("/scenario", scenarioRoutes);

export { router as apiRoutes };
