"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.changeUserPassword = changeUserPassword;
exports.deleteUserAccount = deleteUserAccount;
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const password_1 = require("../utils/password");
const profileSelect = {
    id: true,
    email: true,
    name: true,
    storeName: true,
    plan: true,
    subscriptionStatus: true,
    subscriptionEndDate: true,
    usageCount: true,
    usageResetAt: true,
    createdAt: true,
};
async function getUserProfile(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: profileSelect,
    });
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    return user;
}
async function updateUserProfile(userId, input) {
    const user = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { name: input.name, storeName: input.storeName },
        select: profileSelect,
    });
    return user;
}
async function changeUserPassword(userId, input) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const valid = await (0, password_1.comparePassword)(input.currentPassword, user.password);
    if (!valid)
        throw new appError_1.AppError("Current password is incorrect", 400);
    if (input.newPassword.length < 8) {
        throw new appError_1.AppError("New password must be at least 8 characters", 400);
    }
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { password: await (0, password_1.hashPassword)(input.newPassword) },
    });
}
async function deleteUserAccount(userId, input) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const valid = await (0, password_1.comparePassword)(input.password, user.password);
    if (!valid)
        throw new appError_1.AppError("Password is incorrect", 400);
    // Cascade deletes analyses and payments via Prisma schema onDelete: Cascade
    await prisma_1.prisma.user.delete({ where: { id: userId } });
}
