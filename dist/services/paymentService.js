"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = createPaymentIntent;
exports.handlePaymentWebhook = handlePaymentWebhook;
exports.listPayments = listPayments;
exports.syncPaymentStatus = syncPaymentStatus;
const node_crypto_1 = __importDefault(require("node:crypto"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
const planAmounts = {
    STARTER: 0,
    PRO: 109000,
    SCALE: 219000,
};
const planLabels = {
    STARTER: "Starter",
    PRO: "Basic",
    SCALE: "Pro",
};
function getReturnUrl(paymentId) {
    const url = new URL(env_1.env.YOOKASSA_RETURN_URL, env_1.env.NEXT_PUBLIC_APP_URL);
    url.searchParams.set("paymentId", paymentId);
    return url.toString();
}
function mapYooKassaStatus(status) {
    if (status === "succeeded")
        return client_1.PaymentStatus.SUCCEEDED;
    if (status === "canceled")
        return client_1.PaymentStatus.CANCELED;
    return client_1.PaymentStatus.PENDING;
}
async function activateSubscription(payment) {
    const subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma_1.prisma.user.update({
        where: { id: payment.userId },
        data: {
            plan: payment.plan,
            subscriptionStatus: "ACTIVE",
            subscriptionEndDate,
        },
    });
}
async function fetchYooKassaPayment(providerPaymentId) {
    if (!env_1.env.YOOKASSA_SHOP_ID || !env_1.env.YOOKASSA_SECRET_KEY) {
        throw new appError_1.AppError("YooKassa credentials are missing", 503);
    }
    const auth = Buffer.from(`${env_1.env.YOOKASSA_SHOP_ID}:${env_1.env.YOOKASSA_SECRET_KEY}`).toString("base64");
    const response = await fetch(`https://api.yookassa.ru/v3/payments/${providerPaymentId}`, {
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new appError_1.AppError("YooKassa payment status check failed", 502, text);
    }
    return (await response.json());
}
async function createPaymentIntent(userId, plan) {
    const amount = planAmounts[plan];
    if (plan === client_1.UserPlan.STARTER || amount <= 0) {
        throw new appError_1.AppError("Starter plan does not require payment", 400);
    }
    const payment = await prisma_1.prisma.payment.create({
        data: {
            userId,
            plan,
            amount,
            status: client_1.PaymentStatus.PENDING,
        },
    });
    if (!env_1.env.YOOKASSA_SHOP_ID || !env_1.env.YOOKASSA_SECRET_KEY) {
        return {
            paymentId: payment.id,
            status: payment.status,
            amount,
            currency: "RUB",
            provider: "yookassa",
            ready: false,
            message: "YooKassa credentials are missing. Add them to enable live payment creation.",
        };
    }
    const auth = Buffer.from(`${env_1.env.YOOKASSA_SHOP_ID}:${env_1.env.YOOKASSA_SECRET_KEY}`).toString("base64");
    const response = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
            "Idempotence-Key": node_crypto_1.default.randomUUID(),
        },
        body: JSON.stringify({
            amount: {
                value: (amount / 100).toFixed(2),
                currency: "RUB",
            },
            capture: true,
            confirmation: {
                type: "redirect",
                return_url: getReturnUrl(payment.id),
            },
            description: `Operon ${planLabels[plan]} plan`,
            metadata: {
                internal_payment_id: payment.id,
                user_id: userId,
                plan,
            },
        }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new appError_1.AppError("YooKassa payment creation failed", 502, text);
    }
    const externalPayment = (await response.json());
    await prisma_1.prisma.payment.update({
        where: { id: payment.id },
        data: {
            providerPaymentId: externalPayment.id,
            confirmationUrl: externalPayment.confirmation?.confirmation_url,
        },
    });
    return {
        paymentId: payment.id,
        providerPaymentId: externalPayment.id,
        status: externalPayment.status,
        amount,
        currency: "RUB",
        confirmationUrl: externalPayment.confirmation?.confirmation_url ?? null,
        ready: true,
    };
}
async function handlePaymentWebhook(payload) {
    const object = payload.object;
    if (!object?.id || !object.status) {
        throw new appError_1.AppError("Invalid webhook payload", 400);
    }
    const payment = await prisma_1.prisma.payment.findFirst({
        where: {
            providerPaymentId: object.id,
        },
    });
    if (!payment) {
        throw new appError_1.AppError("Payment not found", 404);
    }
    const status = mapYooKassaStatus(object.status);
    const updated = await prisma_1.prisma.payment.update({
        where: { id: payment.id },
        data: {
            status,
            webhookPayload: payload,
        },
    });
    if (status === client_1.PaymentStatus.SUCCEEDED) {
        await activateSubscription(payment);
    }
    return updated;
}
async function listPayments(userId) {
    return prisma_1.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            plan: true,
            amount: true,
            currency: true,
            status: true,
            provider: true,
            providerPaymentId: true,
            confirmationUrl: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}
async function syncPaymentStatus(userId, paymentId) {
    const payment = await prisma_1.prisma.payment.findFirst({
        where: { id: paymentId, userId },
    });
    if (!payment) {
        throw new appError_1.AppError("Payment not found", 404);
    }
    if (!payment.providerPaymentId) {
        return payment;
    }
    const yooKassaPayment = await fetchYooKassaPayment(payment.providerPaymentId);
    const status = mapYooKassaStatus(yooKassaPayment.status);
    const updated = await prisma_1.prisma.payment.update({
        where: { id: payment.id },
        data: {
            status,
            webhookPayload: yooKassaPayment,
        },
    });
    if (status === client_1.PaymentStatus.SUCCEEDED) {
        await activateSubscription(payment);
    }
    return updated;
}
