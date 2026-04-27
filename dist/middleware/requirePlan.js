"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlan = requirePlan;
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const PLAN_RANK = {
    STARTER: 0,
    PRO: 1,
    SCALE: 2,
};
const PLAN_LABEL = {
    STARTER: "Starter",
    PRO: "Basic",
    SCALE: "Pro",
};
function requirePlan(minimumPlan) {
    return async (req, _res, next) => {
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.auth.userId },
                select: { plan: true },
            });
            if (!user)
                return next(new appError_1.AppError("User not found", 404));
            if (PLAN_RANK[user.plan] < PLAN_RANK[minimumPlan]) {
                return next(new appError_1.AppError(`This feature requires ${PLAN_LABEL[minimumPlan]} plan or higher`, 403, { requiredPlan: minimumPlan, currentPlan: user.plan }));
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
