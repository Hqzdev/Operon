"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackUsage = trackUsage;
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const MONTHLY_LIMITS = {
    STARTER: 10,
    PRO: null,
    SCALE: null,
};
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
async function trackUsage(req, _res, next) {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.auth.userId },
            select: { plan: true, usageCount: true, usageResetAt: true },
        });
        if (!user)
            return next(new appError_1.AppError("User not found", 404));
        const limit = MONTHLY_LIMITS[user.plan];
        const now = new Date();
        let currentCount = user.usageCount;
        if (now.getTime() >= user.usageResetAt.getTime() + THIRTY_DAYS_MS) {
            await prisma_1.prisma.user.update({
                where: { id: req.auth.userId },
                data: { usageCount: 0, usageResetAt: now },
            });
            currentCount = 0;
        }
        if (limit !== null && currentCount >= limit) {
            return next(new appError_1.AppError(`Monthly analysis limit reached (${limit}/month on ${user.plan} plan). Upgrade to continue.`, 429, { limit, used: currentCount, plan: user.plan }));
        }
        await prisma_1.prisma.user.update({
            where: { id: req.auth.userId },
            data: { usageCount: { increment: 1 } },
        });
        next();
    }
    catch (err) {
        next(err);
    }
}
