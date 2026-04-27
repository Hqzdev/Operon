"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = exports.registerController = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const authService_1 = require("../services/authService");
exports.registerController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, authService_1.registerUser)(req.body);
    res.status(201).json(result);
});
exports.loginController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, authService_1.loginUser)(req.body);
    res.status(200).json(result);
});
