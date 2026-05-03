"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const userService_1 = require("./userService");
async function registerUser(input) {
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: { email: input.email },
    });
    if (existingUser) {
        throw new appError_1.AppError("A user with this email already exists", 409);
    }
    const password = await (0, password_1.hashPassword)(input.password);
    const user = await prisma_1.prisma.user.create({
        data: {
            email: input.email,
            password,
            name: input.name,
            storeName: input.storeName,
        },
    });
    const token = (0, jwt_1.signToken)({
        userId: user.id,
        email: user.email,
    });
    const profile = await (0, userService_1.getUserProfile)(user.id);
    return {
        token,
        user: profile,
    };
}
async function loginUser(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: input.email },
    });
    if (!user) {
        throw new appError_1.AppError("Invalid email or password", 401);
    }
    const passwordValid = await (0, password_1.comparePassword)(input.password, user.password);
    if (!passwordValid) {
        throw new appError_1.AppError("Invalid email or password", 401);
    }
    const token = (0, jwt_1.signToken)({
        userId: user.id,
        email: user.email,
    });
    const profile = await (0, userService_1.getUserProfile)(user.id);
    return {
        token,
        user: profile,
    };
}
