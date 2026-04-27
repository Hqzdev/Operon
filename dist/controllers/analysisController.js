"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAnalysesController = exports.createAnalysisController = void 0;
const analysisService_1 = require("../services/analysisService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.createAnalysisController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const analysis = await (0, analysisService_1.createAnalysis)(req.auth.userId, req.body);
    res.status(201).json(analysis);
});
exports.listAnalysesController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const analyses = await (0, analysisService_1.listAnalyses)(req.auth.userId);
    res.status(200).json(analyses);
});
