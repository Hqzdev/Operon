"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlan = requirePlan;
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const planService_1 = require("../services/planService");
function requirePlan(minimumPlan) {
    return async (req, _res, next) => {
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.auth.userId },
                select: { plan: true },
            });
            if (!user)
                return next(new appError_1.AppError("User not found", 404));
            if ((0, planService_1.getPlanRank)(user.plan) < (0, planService_1.getPlanRank)(minimumPlan)) {
                return next(new appError_1.AppError(`This feature requires ${(0, planService_1.getPlanMeta)(minimumPlan).displayName} plan or higher`, 403, { requiredPlan: minimumPlan, currentPlan: user.plan }));
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
