"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPaymentController = exports.paymentWebhookController = exports.createPaymentController = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const asyncHandler_1 = require("../utils/asyncHandler");
const paymentService_1 = require("../services/paymentService");
const planService_1 = require("../services/planService");
const paymentCreateSchema = zod_1.z.object({
    plan: zod_1.z.string().min(1),
});
exports.createPaymentController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { plan: rawPlan } = paymentCreateSchema.parse(req.body);
    const plan = (0, planService_1.normalizeUserPlan)(rawPlan);
    if (!plan || plan === client_1.UserPlan.STARTER) {
        res.status(400).json({ error: "Paid plan must be PRO or SCALE" });
        return;
    }
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
exports.syncPaymentController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const paymentId = zod_1.z.string().min(1).parse(req.params.paymentId);
    const payment = await (0, paymentService_1.syncPaymentStatus)(req.auth.userId, paymentId);
    res.status(200).json({
        ok: true,
        paymentId: payment.id,
        status: payment.status,
    });
});
