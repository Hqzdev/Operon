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
const routes_1 = require("./routes");
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
    app.get("/health", (_req, res) => {
        res.status(200).json({ ok: true });
    });
    app.use("/api", routes_1.apiRoutes);
    app.use(notFound_1.notFound);
    app.use(errorHandler_1.errorHandler);
    return app;
}
