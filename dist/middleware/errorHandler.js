"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const appError_1 = require("../utils/appError");
function errorHandler(error, _req, res, _next) {
    if (error instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: "Validation failed",
            errors: error.flatten(),
        });
    }
    if (error instanceof appError_1.AppError) {
        return res.status(error.statusCode).json({
            message: error.message,
            details: error.details,
        });
    }
    console.error(error);
    return res.status(500).json({
        message: "Internal server error",
    });
}
