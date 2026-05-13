"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const originGuard_1 = require("./middleware/originGuard");
const routes_1 = require("./routes");
const healthRoutes_1 = require("./routes/healthRoutes");
const schedulerService_1 = require("./services/schedulerService");
const env_1 = require("./utils/env");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: [env_1.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"],
        credentials: false,
    }));
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use((0, pino_http_1.default)());
    app.use(rateLimiter_1.apiRateLimiter);
    app.use(originGuard_1.originGuard);
    app.use("/health", healthRoutes_1.healthRoutes);
    app.use("/api", routes_1.apiRoutes);
    app.use(notFound_1.notFound);
    app.use(errorHandler_1.errorHandler);
    (0, schedulerService_1.startScheduler)();
    return app;
}
