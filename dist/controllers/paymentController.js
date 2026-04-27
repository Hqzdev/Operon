"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentWebhookController = exports.createPaymentController = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const asyncHandler_1 = require("../utils/asyncHandler");
const paymentService_1 = require("../services/paymentService");
const paymentCreateSchema = zod_1.z.object({
    plan: zod_1.z.nativeEnum(client_1.UserPlan),
});
exports.createPaymentController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { plan } = paymentCreateSchema.parse(req.body);
    const payment = await (0, paymentService_1.createPaymentIntent)(req.auth.userId, plan);
    res.status(201).json(payment);
});
exports.paymentWebhookController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payment = await (0, paymentService_1.handlePaymentWebhook)(req.body);
    res.status(200).json({
        ok: true,
        paymentId: payment.id,
        status: payment.status,
    });
});
