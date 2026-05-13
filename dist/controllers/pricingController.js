"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPricingController = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const pricingService_1 = require("../services/pricingService");
exports.listPricingController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const pricing = await (0, pricingService_1.getPricingTiers)(String(req.query.currency ?? "USD"));
    res.status(200).json(pricing);
});
