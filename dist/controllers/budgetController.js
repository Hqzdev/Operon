"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetAllocationController = void 0;
const budgetService_1 = require("../services/budgetService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.budgetAllocationController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = (0, budgetService_1.allocateBudget)(req.body);
    res.status(200).json(result);
});
