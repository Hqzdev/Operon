"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFatigueJob = exports.snoozeOneFatigueAlert = exports.dismissOneFatigueAlert = exports.getFatigueAlerts = void 0;
const zod_1 = require("zod");
const fatigueService_1 = require("../services/fatigueService");
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
const snoozeSchema = zod_1.z.object({
    days: zod_1.z.coerce.number().int().min(1).max(14).default(3),
});
exports.getFatigueAlerts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.auth.userId;
    const includeHistory = req.query.includeHistory === "true";
    const alerts = await (0, fatigueService_1.listFatigueAlerts)(userId, includeHistory);
    res.json({ alerts });
});
exports.dismissOneFatigueAlert = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.auth.userId;
    const alert = await (0, fatigueService_1.dismissFatigueAlert)(userId, req.params.id);
    res.json({ alert });
});
exports.snoozeOneFatigueAlert = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.auth.userId;
    const { days } = snoozeSchema.parse(req.body ?? {});
    const alert = await (0, fatigueService_1.snoozeFatigueAlert)(userId, req.params.id, days);
    res.json({ alert });
});
exports.runFatigueJob = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (env_1.env.INTEGRATION_SYNC_SECRET) {
        const header = req.headers["x-integration-sync-secret"];
        if (header !== env_1.env.INTEGRATION_SYNC_SECRET)
            throw new appError_1.AppError("Invalid sync secret", 401);
    }
    const result = await (0, fatigueService_1.runFatigueChecksForDueAccounts)();
    res.json({ result });
});
