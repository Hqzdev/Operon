"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioSimulatorController = void 0;
const scenarioService_1 = require("../services/scenarioService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.scenarioSimulatorController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = (0, scenarioService_1.runScenario)(req.body);
    res.status(200).json(result);
});
