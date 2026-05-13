"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_MATRIX = void 0;
exports.planIdFromUserPlan = planIdFromUserPlan;
exports.logUpgradeMoment = logUpgradeMoment;
exports.getFeatureAccess = getFeatureAccess;
exports.requireFeatureAccess = requireFeatureAccess;
const client_1 = require("@prisma/client");
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
exports.FEATURE_MATRIX = {
    lead_mining_reddit: {
        key: "lead_mining_reddit",
        name: "Lead mining (Reddit)",
        description: "Find high-intent Reddit posts and acquisition leads.",
        tiers: [
            { planId: "free", limit: 5 },
            { planId: "pro", limit: null },
            { planId: "business", limit: null },
            { planId: "custom", limit: null },
        ],
        upgradePlan: "pro",
        upgradeLabel: "Pro",
        upgradePrice: "$29.99/mo",
    },
    lead_mining_other: {
        key: "lead_mining_other",
        name: "Lead mining (other sources)",
        description: "Find leads outside Reddit.",
        tiers: [{ planId: "pro", limit: null }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "pro",
        upgradeLabel: "Pro",
        upgradePrice: "$29.99/mo",
    },
    budget_allocation: {
        key: "budget_allocation",
        name: "Budget Allocation",
        description: "Compare ad sets and distribute budget by efficiency.",
        tiers: [{ planId: "pro", limit: null }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "pro",
        upgradeLabel: "Pro",
        upgradePrice: "$29.99/mo",
    },
    scenario_simulator: {
        key: "scenario_simulator",
        name: "Scenario Simulator",
        description: "Preview budget, CTR, CPC, and conversion changes before acting.",
        tiers: [{ planId: "pro", limit: 10 }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "pro",
        upgradeLabel: "Pro",
        upgradePrice: "$29.99/mo",
    },
    analytics_basic: {
        key: "analytics_basic",
        name: "Analytics (basic)",
        description: "Basic analytics and campaign health views.",
        tiers: [{ planId: "free", limit: null }, { planId: "pro", limit: null }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "free",
        upgradeLabel: "Free",
        upgradePrice: "$0/mo",
    },
    analytics_advanced: {
        key: "analytics_advanced",
        name: "Analytics (advanced)",
        description: "Advanced attribution, LTV, and deeper analytics.",
        tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "business",
        upgradeLabel: "Business",
        upgradePrice: "$79.99/mo",
    },
    custom_reports: {
        key: "custom_reports",
        name: "Custom reports",
        description: "Generate custom client and workspace reports.",
        tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "business",
        upgradeLabel: "Business",
        upgradePrice: "$79.99/mo",
    },
    api_access: {
        key: "api_access",
        name: "API access",
        description: "Use Operon programmatically through API endpoints.",
        tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "business",
        upgradeLabel: "Business",
        upgradePrice: "$79.99/mo",
    },
    team_collaboration: {
        key: "team_collaboration",
        name: "Team collaboration",
        description: "Invite teammates and collaborate in workspaces.",
        tiers: [{ planId: "pro", limit: 3 }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "pro",
        upgradeLabel: "Pro",
        upgradePrice: "$29.99/mo",
    },
    priority_support: {
        key: "priority_support",
        name: "Priority support",
        description: "Priority support and faster response times.",
        tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
        upgradePlan: "business",
        upgradeLabel: "Business",
        upgradePrice: "$79.99/mo",
    },
};
function planIdFromUserPlan(plan) {
    if (plan === client_1.UserPlan.PRO)
        return "pro";
    if (plan === client_1.UserPlan.SCALE)
        return "business";
    return "free";
}
function userPlanFromString(plan) {
    if (plan === "PRO")
        return client_1.UserPlan.PRO;
    if (plan === "SCALE")
        return client_1.UserPlan.SCALE;
    return client_1.UserPlan.STARTER;
}
function tierFor(feature, planId) {
    return exports.FEATURE_MATRIX[feature]?.tiers.find((tier) => tier.planId === planId) ?? null;
}
async function currentSubscriptionStatus(userId) {
    const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT "status"::text AS status FROM "subscriptions" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1`, userId);
    return rows[0]?.status ?? null;
}
async function logFeatureAccess(input) {
    await prisma_1.prisma.$executeRawUnsafe(`INSERT INTO "feature_access_logs" ("id", "userId", "featureKey", "planId", "status", "reason", "metadata")
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, node_crypto_1.default.randomUUID(), input.userId, input.featureKey, input.planId, input.status, input.reason ?? null, JSON.stringify(input.metadata ?? {}));
}
async function logUpgradeMoment(input) {
    const access = await getFeatureAccess(input.userId, input.featureKey, { log: false });
    await prisma_1.prisma.$executeRawUnsafe(`INSERT INTO "upgrade_moment_logs" ("id", "userId", "featureKey", "fromPlanId", "targetPlanId", "source")
     VALUES ($1, $2, $3, $4, $5, $6)`, node_crypto_1.default.randomUUID(), input.userId, input.featureKey, access.planId, input.targetPlanId ?? access.upgradePlan, input.source ?? null);
}
async function usageInWindow(userId, featureKey) {
    const since = new Date(Date.now() - THIRTY_DAYS_MS);
    const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count
     FROM "feature_access_logs"
     WHERE "userId" = $1 AND "featureKey" = $2 AND "status" IN ('allowed', 'limited') AND "createdAt" >= $3`, userId, featureKey, since);
    return Number(rows[0]?.count ?? 0);
}
async function getFeatureAccess(userId, featureKey, options = {}) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, subscriptionStatus: true },
    });
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const subscriptionStatus = await currentSubscriptionStatus(userId);
    const effectivePlan = user.subscriptionStatus === client_1.SubscriptionStatus.EXPIRED || subscriptionStatus === "expired"
        ? client_1.UserPlan.STARTER
        : userPlanFromString(user.plan);
    const planId = planIdFromUserPlan(effectivePlan);
    const rule = exports.FEATURE_MATRIX[featureKey];
    const tier = tierFor(featureKey, planId);
    let allowed = Boolean(tier);
    let reason;
    let remaining = null;
    if (subscriptionStatus === "pending") {
        allowed = false;
        reason = "Your subscription is pending. Full access coming soon!";
    }
    else if (!tier) {
        allowed = false;
        reason = `Available in ${rule.upgradeLabel} (${rule.upgradePrice})`;
    }
    else if (tier.limit !== null) {
        const used = await usageInWindow(userId, featureKey);
        remaining = Math.max(0, tier.limit - used);
        if (used >= tier.limit) {
            allowed = false;
            reason = `Monthly limit reached. Available in ${rule.upgradeLabel} (${rule.upgradePrice})`;
        }
    }
    const status = allowed ? (remaining !== null ? "limited" : "allowed") : "blocked";
    if (options.log !== false) {
        await logFeatureAccess({ userId, featureKey, planId, status, reason, metadata: options.metadata });
    }
    return {
        allowed,
        feature: rule,
        featureKey,
        planId,
        subscriptionStatus: subscriptionStatus ?? user.subscriptionStatus.toLowerCase(),
        limit: tier?.limit ?? null,
        remaining,
        reason,
        upgradePlan: rule.upgradePlan,
        upgradeLabel: rule.upgradeLabel,
        upgradePrice: rule.upgradePrice,
    };
}
async function requireFeatureAccess(userId, featureKey, metadata) {
    const access = await getFeatureAccess(userId, featureKey, { metadata });
    if (!access.allowed) {
        throw new appError_1.AppError(access.reason ?? "Feature is locked for your subscription", 402, {
            featureKey,
            upgradePlan: access.upgradePlan,
            upgradeLabel: access.upgradeLabel,
            upgradePrice: access.upgradePrice,
            subscriptionStatus: access.subscriptionStatus,
        });
    }
    return access;
}
