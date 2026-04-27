"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileController = void 0;
const userService_1 = require("../services/userService");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.profileController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const profile = await (0, userService_1.getUserProfile)(req.auth.userId);
    res.status(200).json(profile);
});
