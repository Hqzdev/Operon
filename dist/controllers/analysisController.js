"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importMetaCsvController = exports.listAnalysesController = exports.createAnalysisController = void 0;
const analysisService_1 = require("../services/analysisService");
const metaCsvImportService_1 = require("../services/metaCsvImportService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.createAnalysisController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const analysis = await (0, analysisService_1.createAnalysis)(req.auth.userId, req.body);
    res.status(201).json(analysis);
});
exports.listAnalysesController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const analyses = await (0, analysisService_1.listAnalyses)(req.auth.userId);
    res.status(200).json(analyses);
});
exports.importMetaCsvController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const rows = (0, metaCsvImportService_1.parseMetaAdsCsv)(req.body?.csv ?? "", Math.min(Math.max(req.body?.limit ?? 5, 1), 10));
    if (!rows.length) {
        res.status(400).json({
            message: "No usable Meta Ads rows found. Include spend, impressions, clicks, purchases, or revenue columns.",
        });
        return;
    }
    const analyses = [];
    for (const row of rows) {
        const analysis = await (0, analysisService_1.createAnalysis)(req.auth.userId, row.payload);
        analyses.push({ row, analysis });
    }
    res.status(201).json({ imported: analyses.length, analyses });
});
