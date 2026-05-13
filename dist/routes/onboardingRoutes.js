"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const onboardingController_1 = require("../controllers/onboardingController");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
exports.onboardingRoutes = router;
const analyzeSchema = zod_1.z.object({
    storeUrl: zod_1.z.string().url(),
});
router.post("/analyze", authenticate_1.authenticate, (0, validate_1.validateBody)(analyzeSchema), onboardingController_1.analyzeStoreController);
