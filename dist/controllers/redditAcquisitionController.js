"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRedditAcquisitionJob = exports.getRedditLeads = void 0;
const redditAcquisitionService_1 = require("../services/redditAcquisitionService");
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
function hasValidCronSecret(req) {
    if (!env_1.env.ACQUISITION_CRON_SECRET)
        return false;
    return req.headers["x-acquisition-cron-secret"] === env_1.env.ACQUISITION_CRON_SECRET;
}
exports.getRedditLeads = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const leads = await (0, redditAcquisitionService_1.listRedditLeads)();
    res.json({ leads });
});
exports.runRedditAcquisitionJob = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.auth?.userId && !hasValidCronSecret(req)) {
        throw new appError_1.AppError("Authentication token or cron secret is required", 401);
    }
    const result = await (0, redditAcquisitionService_1.runRedditAcquisitionScan)();
    res.json({ result });
});
