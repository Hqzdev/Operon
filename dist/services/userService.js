"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.changeUserPassword = changeUserPassword;
exports.deleteUserAccount = deleteUserAccount;
const appError_1 = require("../utils/appError");
const password_1 = require("../utils/password");
const planService_1 = require("./planService");
const userRepository_1 = require("../repositories/userRepository");
async function getUserProfile(userId) {
    const user = await userRepository_1.UserRepository.findProfileById(userId);
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const planMeta = (0, planService_1.getPlanMeta)(user.plan);
    const usageLimit = (0, planService_1.getMonthlyAnalysisLimit)(user.plan);
    return {
        ...user,
        planDisplay: planMeta.displayName,
        legacyPlan: planMeta.legacyName,
        usageLimit,
        analysisCount: user.usageCount,
        analysisLimit: usageLimit,
    };
}
async function updateUserProfile(userId, input) {
    const quietMinConfidence = input.quietMinConfidence && ["low", "medium", "high"].includes(input.quietMinConfidence)
        ? input.quietMinConfidence
        : undefined;
    return userRepository_1.UserRepository.updateProfile(userId, {
        name: input.name,
        storeName: input.storeName,
        niche: input.niche,
        accountType: input.accountType,
        quietModeEnabled: input.quietModeEnabled,
        quietMinConfidence,
        quietMinSpendImpact: input.quietMinSpendImpact,
        weeklyDigestEnabled: input.weeklyDigestEnabled,
    });
}
async function changeUserPassword(userId, input) {
    const user = await userRepository_1.UserRepository.findById(userId);
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const valid = await (0, password_1.comparePassword)(input.currentPassword, user.password);
    if (!valid)
        throw new appError_1.AppError("Current password is incorrect", 400);
    if (input.newPassword.length < 8) {
        throw new appError_1.AppError("New password must be at least 8 characters", 400);
    }
    await userRepository_1.UserRepository.updatePassword(userId, await (0, password_1.hashPassword)(input.newPassword));
}
async function deleteUserAccount(userId, input) {
    const user = await userRepository_1.UserRepository.findById(userId);
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const valid = await (0, password_1.comparePassword)(input.password, user.password);
    if (!valid)
        throw new appError_1.AppError("Password is incorrect", 400);
    await userRepository_1.UserRepository.delete(userId);
}
