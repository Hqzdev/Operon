"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePendingSubscriptionForPayment = ensurePendingSubscriptionForPayment;
exports.activateManagedSubscription = activateManagedSubscription;
exports.getSubscriptionOverview = getSubscriptionOverview;
exports.handleSubscriptionAction = handleSubscriptionAction;
exports.runSubscriptionRenewalJobs = runSubscriptionRenewalJobs;
const client_1 = require("@prisma/client");
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
const paymentEmailService_1 = require("./paymentEmailService");
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
function addBillingMonth(date = new Date()) {
    return new Date(date.getTime() + MONTH_MS);
}
function planIdForUserPlan(plan) {
    if (plan === client_1.UserPlan.SCALE)
        return "business";
    if (plan === client_1.UserPlan.PRO)
        return "pro";
    return "free";
}
function userPlanForPlanId(planId) {
    if (planId === "business")
        return client_1.UserPlan.SCALE;
    if (planId === "pro")
        return client_1.UserPlan.PRO;
    return client_1.UserPlan.STARTER;
}
function planLabel(planId) {
    if (planId === "business")
        return "Business";
    if (planId === "pro")
        return "Pro";
    return "Free";
}
function majorAmount(amountMinor, currency = "USD") {
    if (!amountMinor)
        return new client_1.Prisma.Decimal(0);
    return new client_1.Prisma.Decimal(currency === "JPY" ? amountMinor : amountMinor / 100);
}
function formattedAmount(amount, currency) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(Number(amount));
}
function statusLabel(status) {
    if (status === "active")
        return "Active";
    if (status === "pending")
        return "Pending";
    if (status === "expired")
        return "Expired";
    if (status === "canceled")
        return "Canceled";
    return status;
}
async function currentSubscription(userId) {
    return prisma_1.prisma.subscription.findFirst({
        where: { userId },
        orderBy: [{ createdAt: "desc" }],
        include: {
            payment: true,
            history: { orderBy: { createdAt: "desc" }, take: 20 },
        },
    });
}
async function ensurePendingSubscriptionForPayment(payment) {
    const planId = planIdForUserPlan(payment.plan);
    const now = new Date();
    const existing = await prisma_1.prisma.subscription.findFirst({
        where: { userId: payment.userId, status: "pending" },
        orderBy: { createdAt: "desc" },
    });
    const subscription = existing
        ? await prisma_1.prisma.subscription.update({
            where: { id: existing.id },
            data: {
                planId,
                paymentId: payment.id,
                renewDate: addBillingMonth(now),
            },
        })
        : await prisma_1.prisma.subscription.create({
            data: {
                userId: payment.userId,
                planId,
                status: "pending",
                startDate: now,
                renewDate: addBillingMonth(now),
                paymentId: payment.id,
            },
        });
    await prisma_1.prisma.subscriptionHistory.create({
        data: {
            subscriptionId: subscription.id,
            event: "started",
            planId,
            amount: majorAmount(payment.amount, payment.currency),
            currency: payment.currency,
            status: "Pending review",
        },
    });
    return subscription;
}
async function activateManagedSubscription(payment) {
    const planId = planIdForUserPlan(payment.plan);
    const now = new Date();
    const renewDate = addBillingMonth(now);
    const currency = payment.currency ?? "USD";
    const subscription = await prisma_1.prisma.subscription.upsert({
        where: { id: (await currentSubscription(payment.userId))?.id ?? "" },
        create: {
            userId: payment.userId,
            planId,
            status: "active",
            startDate: now,
            renewDate,
            paymentId: payment.id,
        },
        update: {
            planId,
            status: "active",
            startDate: now,
            renewDate,
            canceledDate: null,
            paymentId: payment.id,
        },
    });
    await prisma_1.prisma.subscriptionHistory.create({
        data: {
            subscriptionId: subscription.id,
            event: "started",
            planId,
            amount: majorAmount(payment.amount, currency),
            currency,
            status: "Completed",
        },
    });
    await prisma_1.prisma.user.update({
        where: { id: payment.userId },
        data: {
            plan: payment.plan,
            subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
            subscriptionEndDate: renewDate,
        },
    });
    return subscription;
}
async function getSubscriptionOverview(userId) {
    const [user, subscription] = await Promise.all([
        prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, plan: true, subscriptionStatus: true, subscriptionEndDate: true } }),
        currentSubscription(userId),
    ]);
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const status = subscription?.status ?? (user.subscriptionStatus === client_1.SubscriptionStatus.EXPIRED ? "expired" : user.plan === client_1.UserPlan.STARTER ? "canceled" : "active");
    const planId = subscription?.planId ?? planIdForUserPlan(user.plan);
    const payment = subscription?.payment ?? null;
    const currency = payment?.currency ?? "USD";
    const amountMajor = payment ? Number(majorAmount(payment.amount, currency)) : planId === "pro" ? 99 : 0;
    const renewDate = subscription?.renewDate ?? user.subscriptionEndDate ?? new Date("2026-05-15T00:00:00.000Z");
    return {
        subscription: {
            id: subscription?.id ?? null,
            planId,
            planName: planLabel(planId),
            status,
            statusLabel: statusLabel(status),
            renewDate: renewDate.toISOString(),
            amount: amountMajor,
            currency,
            amountLabel: `${formattedAmount(amountMajor, currency)} ${currency} per month`,
            cardLast4: payment?.cardLast4 ?? "4242",
            cardDisplay: `•••• ${payment?.cardLast4 ?? "4242"}`,
            pendingMessage: status === "pending" ? "Awaiting admin approval..." : null,
            limitedAccess: status === "pending",
        },
        history: subscription?.history.length
            ? subscription.history.map((item) => ({
                id: item.id,
                date: item.createdAt.toISOString(),
                event: item.event,
                label: item.event === "started" ? "Subscription started" : item.event === "renewed" ? "Subscription renewed" : `${item.event[0].toUpperCase()}${item.event.slice(1)}`,
                amount: Number(item.amount),
                currency: item.currency,
                amountLabel: formattedAmount(item.amount, item.currency),
                status: item.status,
            }))
            : [
                { id: "sample-2026-05-09", date: "2026-05-09T00:00:00.000Z", event: "started", label: "Subscription started", amount: 99, currency: "USD", amountLabel: "$99.00", status: "Completed" },
                { id: "sample-2026-04-09", date: "2026-04-09T00:00:00.000Z", event: "renewed", label: "Payment received", amount: 0, currency: "USD", amountLabel: "$0.00", status: "Pending review" },
                { id: "sample-2026-03-09", date: "2026-03-09T00:00:00.000Z", event: "renewed", label: "Subscription renewed", amount: 99, currency: "USD", amountLabel: "$99.00", status: "Completed" },
            ],
    };
}
async function handleSubscriptionAction(userId, input) {
    const subscription = await currentSubscription(userId);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    if (input.action === "check-status") {
        return { ok: true, message: subscription?.status === "pending" ? "Awaiting admin approval..." : "Subscription status is up to date." };
    }
    if (!subscription)
        throw new appError_1.AppError("Subscription not found", 404);
    if (input.action === "cancel-request") {
        await prisma_1.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "canceled", canceledDate: new Date() },
        });
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { plan: client_1.UserPlan.STARTER, subscriptionStatus: client_1.SubscriptionStatus.NONE, subscriptionEndDate: null },
        });
        return { ok: true, message: "Subscription request canceled. You are back on Free." };
    }
    const event = input.action === "cancel" ? "canceled" : "downgraded";
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.subscription.update({
            where: { id: subscription.id },
            data: {
                status: input.action === "cancel" ? "canceled" : "active",
                planId: "free",
                canceledDate: new Date(),
            },
        });
        await tx.subscriptionHistory.create({
            data: {
                subscriptionId: subscription.id,
                event,
                planId: "free",
                amount: new client_1.Prisma.Decimal(0),
                currency: subscription.payment?.currency ?? "USD",
                status: input.reason ? `Completed - ${input.reason.slice(0, 80)}` : "Completed",
            },
        });
        await tx.user.update({
            where: { id: userId },
            data: { plan: client_1.UserPlan.STARTER, subscriptionStatus: client_1.SubscriptionStatus.NONE, subscriptionEndDate: null },
        });
    });
    if (input.action === "cancel") {
        await (0, paymentEmailService_1.sendSubscriptionExitEmail)({
            to: user.email,
            reactivationUrl: `${env_1.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?section=billing`,
        });
    }
    return { ok: true, message: input.action === "cancel" ? "Subscription canceled. You are back on Free." : "Plan downgraded to Free." };
}
async function runSubscriptionRenewalJobs(now = new Date()) {
    const renewalWindowStart = new Date(now.getTime() + WEEK_MS - 60 * 60 * 1000);
    const renewalWindowEnd = new Date(now.getTime() + WEEK_MS + 60 * 60 * 1000);
    const coming = await prisma_1.prisma.subscription.findMany({
        where: {
            status: "active",
            renewDate: { gte: renewalWindowStart, lte: renewalWindowEnd },
            renewalEmailSentAt: null,
        },
        include: { user: { select: { email: true } } },
    });
    for (const subscription of coming) {
        await (0, paymentEmailService_1.sendRenewalComingEmail)({
            to: subscription.user.email,
            plan: planLabel(subscription.planId),
            renewDate: subscription.renewDate,
        });
        await prisma_1.prisma.subscription.update({ where: { id: subscription.id }, data: { renewalEmailSentAt: now } });
    }
    const due = await prisma_1.prisma.subscription.findMany({
        where: {
            status: { in: ["active", "pending"] },
            renewDate: { lte: now },
        },
        include: {
            payment: true,
            user: { select: { email: true } },
        },
    });
    let renewed = 0;
    let expired = 0;
    for (const subscription of due) {
        if (subscription.payment?.status === client_1.PaymentStatus.SUCCEEDED) {
            const nextRenewDate = addBillingMonth(now);
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.subscription.update({
                    where: { id: subscription.id },
                    data: { status: "active", renewDate: nextRenewDate, renewalEmailSentAt: null },
                });
                await tx.subscriptionHistory.create({
                    data: {
                        subscriptionId: subscription.id,
                        event: "renewed",
                        planId: subscription.planId,
                        amount: majorAmount(subscription.payment?.amount, subscription.payment?.currency ?? "USD"),
                        currency: subscription.payment?.currency ?? "USD",
                        status: "Completed",
                    },
                });
                await tx.user.update({
                    where: { id: subscription.userId },
                    data: {
                        plan: userPlanForPlanId(subscription.planId),
                        subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
                        subscriptionEndDate: nextRenewDate,
                    },
                });
            });
            await (0, paymentEmailService_1.sendSubscriptionRenewedEmail)({ to: subscription.user.email, plan: planLabel(subscription.planId), renewDate: nextRenewDate });
            renewed += 1;
        }
        else if (subscription.payment?.status === client_1.PaymentStatus.CANCELED || subscription.status === "pending") {
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.subscription.update({ where: { id: subscription.id }, data: { status: "expired" } });
                await tx.user.update({
                    where: { id: subscription.userId },
                    data: { plan: client_1.UserPlan.STARTER, subscriptionStatus: client_1.SubscriptionStatus.EXPIRED, subscriptionEndDate: now },
                });
            });
            await (0, paymentEmailService_1.sendSubscriptionExpiredEmail)({ to: subscription.user.email, plan: planLabel(subscription.planId) });
            expired += 1;
        }
    }
    return { renewalNotices: coming.length, renewed, expired };
}
