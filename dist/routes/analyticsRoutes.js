"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = void 0;
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
exports.analyticsRoutes = router;
router.get("/ltv-breakeven", authenticate_1.authenticate, analyticsController_1.ltvBreakevenController);
