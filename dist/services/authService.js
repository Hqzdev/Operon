"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.buildGoogleOAuthUrl = buildGoogleOAuthUrl;
exports.completeGoogleOAuth = completeGoogleOAuth;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const userService_1 = require("./userService");
const userRepository_1 = require("../repositories/userRepository");
async function registerUser(input) {
    const existingUser = await userRepository_1.UserRepository.findByEmail(input.email);
    if (existingUser) {
        throw new appError_1.AppError("A user with this email already exists", 409);
    }
    const password = await (0, password_1.hashPassword)(input.password);
    const user = await userRepository_1.UserRepository.create({
        email: input.email,
        password,
        name: input.name,
        storeName: input.storeName,
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
    const user = await userRepository_1.UserRepository.findByEmail(input.email);
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
function assertGoogleOAuthConfigured() {
    if (!env_1.env.GOOGLE_CLIENT_ID || !env_1.env.GOOGLE_CLIENT_SECRET) {
        throw new appError_1.AppError("Google OAuth is not configured", 503);
    }
}
function buildGoogleOAuthUrl(redirectUri) {
    assertGoogleOAuthConfigured();
    const state = jsonwebtoken_1.default.sign({
        provider: "google",
        redirectUri,
        nonce: node_crypto_1.default.randomUUID(),
    }, env_1.env.JWT_SECRET, { expiresIn: "10m" });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env_1.env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
}
function verifyGoogleState(state, redirectUri) {
    const payload = jsonwebtoken_1.default.verify(state, env_1.env.JWT_SECRET);
    if (payload.provider !== "google" || payload.redirectUri !== redirectUri) {
        throw new appError_1.AppError("Google OAuth state mismatch", 400);
    }
}
async function exchangeGoogleCode(code, redirectUri) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: env_1.env.GOOGLE_CLIENT_ID,
            client_secret: env_1.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });
    const token = (await response.json());
    if (!response.ok || !token.access_token) {
        throw new appError_1.AppError(token.error_description ?? token.error ?? "Google token exchange failed", 400);
    }
    return token.access_token;
}
async function fetchGoogleUserInfo(accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = (await response.json());
    if (!response.ok || !profile.email) {
        throw new appError_1.AppError("Unable to read Google profile", 400);
    }
    if (!profile.email_verified) {
        throw new appError_1.AppError("Google email is not verified", 400);
    }
    return {
        email: profile.email.toLowerCase(),
        name: profile.name,
        avatarUrl: profile.picture,
    };
}
async function completeGoogleOAuth(input) {
    assertGoogleOAuthConfigured();
    verifyGoogleState(input.state, input.redirectUri);
    const accessToken = await exchangeGoogleCode(input.code, input.redirectUri);
    const googleUser = await fetchGoogleUserInfo(accessToken);
    const user = await userRepository_1.UserRepository.upsertByEmail(googleUser.email, {
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
        password: await (0, password_1.hashPassword)(`google-oauth:${node_crypto_1.default.randomBytes(32).toString("hex")}`),
    }, {
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
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
