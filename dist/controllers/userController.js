"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccountController = exports.changePasswordController = exports.updateProfileController = exports.profileController = void 0;
const userService_1 = require("../services/userService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.profileController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const profile = await (0, userService_1.getUserProfile)(req.auth.userId);
    res.status(200).json(profile);
});
exports.updateProfileController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, storeName, niche, accountType } = req.body;
    const profile = await (0, userService_1.updateUserProfile)(req.auth.userId, { name, storeName, niche, accountType });
    res.status(200).json(profile);
});
exports.changePasswordController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await (0, userService_1.changeUserPassword)(req.auth.userId, { currentPassword, newPassword });
    res.status(200).json({ ok: true });
});
exports.deleteAccountController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { password } = req.body;
    await (0, userService_1.deleteUserAccount)(req.auth.userId, { password });
    res.status(200).json({ ok: true });
});
