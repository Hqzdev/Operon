"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.originGuard = originGuard;
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
function parseOrigin(value) {
    try {
        return new URL(value).origin;
    }
    catch {
        return "invalid";
    }
}
function allowedOrigins() {
    const origins = new Set();
    origins.add(parseOrigin(env_1.env.NEXT_PUBLIC_APP_URL));
    if (process.env.NODE_ENV !== "production") {
        origins.add("http://localhost:3000");
        origins.add("http://127.0.0.1:3000");
    }
    return origins;
}
function originGuard(req, _res, next) {
    if (!MUTATING_METHODS.has(req.method)) {
        return next();
    }
    const origin = req.get("origin") ?? (req.get("referer") ? parseOrigin(req.get("referer")) : null);
    if (origin && !allowedOrigins().has(origin)) {
        return next(new appError_1.AppError("Invalid request origin", 403));
    }
    next();
}
