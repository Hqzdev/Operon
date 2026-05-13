"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateActionGuardrailController = exports.undoAdActionController = exports.listAdActionLogsController = exports.executeAdActionController = void 0;
const adActionService_1 = require("../services/adActionService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.executeAdActionController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const action = await (0, adActionService_1.executeAdAction)(req.auth.userId, req.body);
    res.json({ action });
});
exports.listAdActionLogsController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const logs = await (0, adActionService_1.listAdActionLogs)(req.auth.userId);
    res.json({ logs });
});
exports.undoAdActionController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const action = await (0, adActionService_1.undoAdAction)(req.auth.userId, req.params.id);
    res.json({ action });
});
exports.updateActionGuardrailController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, adActionService_1.updateActionGuardrail)(req.auth.userId, req.body);
    res.json({ result });
});
