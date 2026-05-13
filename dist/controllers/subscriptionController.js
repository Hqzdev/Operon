"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionActionController = exports.getSubscriptionController = void 0;
const zod_1 = require("zod");
const asyncHandler_1 = require("../utils/asyncHandler");
const subscriptionService_1 = require("../services/subscriptionService");
const actionSchema = zod_1.z.object({
    action: zod_1.z.enum(["check-status", "downgrade-free", "cancel", "cancel-request"]),
    reason: zod_1.z.string().max(1000).optional(),
});
exports.getSubscriptionController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const overview = await (0, subscriptionService_1.getSubscriptionOverview)(req.auth.userId);
    res.status(200).json(overview);
});
exports.subscriptionActionController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const input = actionSchema.parse(req.body);
    const result = await (0, subscriptionService_1.handleSubscriptionAction)(req.auth.userId, input);
    res.status(200).json(result);
});
