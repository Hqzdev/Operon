"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCampaignController = void 0;
const campaignSimulationService_1 = require("../services/campaignSimulationService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.simulateCampaignController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const simulation = await (0, campaignSimulationService_1.simulateCampaignBudget)(req.auth.userId, req.body);
    res.status(200).json(simulation);
});
