"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackUsage = trackUsage;
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
async function trackUsage(req, _res, next) {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.auth.userId },
            select: { usageResetAt: true },
        });
        if (!user)
            return next(new appError_1.AppError("User not found", 404));
        const now = new Date();
        if (now.getTime() >= user.usageResetAt.getTime() + THIRTY_DAYS_MS) {
            await prisma_1.prisma.user.update({
                where: { id: req.auth.userId },
                data: { usageCount: 0, usageResetAt: now },
            });
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
