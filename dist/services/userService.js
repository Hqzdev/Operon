"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
async function getUserProfile(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            storeName: true,
            plan: true,
            createdAt: true,
        },
    });
    if (!user) {
        throw new appError_1.AppError("User not found", 404);
    }
    return user;
}
