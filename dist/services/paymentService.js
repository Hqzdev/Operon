"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateSubscription = activateSubscription;
exports.createPaymentIntent = createPaymentIntent;
exports.handlePaymentWebhook = handlePaymentWebhook;
exports.listPayments = listPayments;
exports.syncPaymentStatus = syncPaymentStatus;
const node_crypto_1 = __importDefault(require("node:crypto"));
const client_1 = require("@prisma/client");
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
const paymentRepository_1 = require("../repositories/paymentRepository");
const userRepository_1 = require("../repositories/userRepository");
const pricingService_1 = require("./pricingService");
const outcomePricingService_1 = require("./outcomePricingService");
const planLabels = {
    STARTER: "Free",
    PRO: "Pro",
    SCALE: "Business",
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
    await userRepository_1.UserRepository.updateSubscription(payment.userId, {
        plan: payment.plan,
        subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
        subscriptionEndDate,
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
async function createPaymentIntent(userId, plan, currencyInput) {
    if (plan === client_1.UserPlan.STARTER) {
        throw new appError_1.AppError("Free plan does not require payment", 400);
    }
    const pricing = await (0, pricingService_1.getPlanPriceForPayment)(plan, currencyInput);
    const payment = await paymentRepository_1.PaymentRepository.create({
        userId,
        plan,
        amount: pricing.amountMinor,
        currency: pricing.currency,
        status: client_1.PaymentStatus.PENDING,
    });
    if (!env_1.env.YOOKASSA_SHOP_ID || !env_1.env.YOOKASSA_SECRET_KEY) {
        return {
            paymentId: payment.id,
            status: payment.status,
            amount: pricing.amountMinor,
            currency: pricing.currency,
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
                value: pricing.amountMajor.toFixed(pricing.currency === "JPY" ? 0 : 2),
                currency: pricing.currency,
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
                currency: pricing.currency,
            },
        }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new appError_1.AppError("YooKassa payment creation failed", 502, text);
    }
    const externalPayment = (await response.json());
    await paymentRepository_1.PaymentRepository.update(payment.id, {
        providerPaymentId: externalPayment.id,
        confirmationUrl: externalPayment.confirmation?.confirmation_url,
    });
    return {
        paymentId: payment.id,
        providerPaymentId: externalPayment.id,
        status: externalPayment.status,
        amount: pricing.amountMinor,
        currency: pricing.currency,
        confirmationUrl: externalPayment.confirmation?.confirmation_url ?? null,
        ready: true,
    };
}
async function handlePaymentWebhook(payload) {
    const object = payload.object;
    if (!object?.id || !object.status) {
        throw new appError_1.AppError("Invalid webhook payload", 400);
    }
    const outcomeInvoice = await (0, outcomePricingService_1.syncOutcomeInvoiceFromWebhook)(payload);
    if (outcomeInvoice)
        return outcomeInvoice;
    const payment = await paymentRepository_1.PaymentRepository.findByProviderId(object.id);
    if (!payment) {
        throw new appError_1.AppError("Payment not found", 404);
    }
    const status = mapYooKassaStatus(object.status);
    const updated = await paymentRepository_1.PaymentRepository.update(payment.id, {
        status,
        cardLast4: object.payment_method?.card?.last4,
        country: object.metadata?.country,
        customerName: object.metadata?.customer_name,
        webhookPayload: payload,
    });
    if (status === client_1.PaymentStatus.SUCCEEDED) {
        await activateSubscription(payment);
    }
    return updated;
}
async function listPayments(userId) {
    return paymentRepository_1.PaymentRepository.findByUserId(userId);
}
async function syncPaymentStatus(userId, paymentId) {
    const payment = await paymentRepository_1.PaymentRepository.findByIdAndUser(paymentId, userId);
    if (!payment) {
        throw new appError_1.AppError("Payment not found", 404);
    }
    if (!payment.providerPaymentId) {
        return payment;
    }
    const yooKassaPayment = await fetchYooKassaPayment(payment.providerPaymentId);
    const status = mapYooKassaStatus(yooKassaPayment.status);
    const updated = await paymentRepository_1.PaymentRepository.update(payment.id, {
        status,
        webhookPayload: yooKassaPayment,
    });
    if (status === client_1.PaymentStatus.SUCCEEDED) {
        await activateSubscription(payment);
    }
    return updated;
}
