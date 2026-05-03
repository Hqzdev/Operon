"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanMeta = getPlanMeta;
exports.getPlanRank = getPlanRank;
exports.getMonthlyAnalysisLimit = getMonthlyAnalysisLimit;
exports.normalizeUserPlan = normalizeUserPlan;
const client_1 = require("@prisma/client");
const PLAN_META = {
    STARTER: {
        displayName: "Starter",
        legacyName: "starter",
        monthlyAnalysisLimit: 10,
        rank: 0,
    },
    PRO: {
        displayName: "Pro",
        legacyName: "basic",
        monthlyAnalysisLimit: null,
        rank: 1,
    },
    SCALE: {
        displayName: "Scale",
        legacyName: "pro",
        monthlyAnalysisLimit: null,
        rank: 2,
    },
};
function getPlanMeta(plan) {
    return PLAN_META[plan];
}
function getPlanRank(plan) {
    return PLAN_META[plan].rank;
}
function getMonthlyAnalysisLimit(plan) {
    return PLAN_META[plan].monthlyAnalysisLimit;
}
function normalizeUserPlan(value) {
    const normalized = value.trim().toUpperCase();
    if (normalized === client_1.UserPlan.STARTER)
        return client_1.UserPlan.STARTER;
    if (normalized === client_1.UserPlan.PRO)
        return client_1.UserPlan.PRO;
    if (normalized === client_1.UserPlan.SCALE)
        return client_1.UserPlan.SCALE;
    const lower = value.trim().toLowerCase();
    if (lower === "starter")
        return client_1.UserPlan.STARTER;
    if (lower === "basic")
        return client_1.UserPlan.PRO;
    if (lower === "pro")
        return client_1.UserPlan.SCALE;
    return null;
}
