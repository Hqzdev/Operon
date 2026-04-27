"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const appError_1 = require("../utils/appError");
const jwt_1 = require("../utils/jwt");
function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return next(new appError_1.AppError("Authentication token is required", 401));
    }
    const token = header.replace("Bearer ", "");
    try {
        req.auth = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch {
        next(new appError_1.AppError("Invalid or expired authentication token", 401));
    }
}
