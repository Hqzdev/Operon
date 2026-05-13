"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingRoutes = void 0;
const express_1 = require("express");
const pricingController_1 = require("../controllers/pricingController");
const router = (0, express_1.Router)();
exports.pricingRoutes = router;
router.get("/", pricingController_1.listPricingController);
