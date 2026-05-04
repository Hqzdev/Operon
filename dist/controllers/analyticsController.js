"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ltvBreakevenController = void 0;
const shopifyLtvService_1 = require("../services/shopifyLtvService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.ltvBreakevenController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const rawMargin = req.query.profitMargin;
    const profitMargin = rawMargin !== undefined && !Number.isNaN(Number(rawMargin))
        ? Math.min(Math.max(Number(rawMargin), 0), 1)
        : 0.4;
    const result = await (0, shopifyLtvService_1.getLtvBreakeven)(profitMargin);
    res.status(200).json(result);
});
