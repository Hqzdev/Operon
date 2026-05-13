"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthController = healthController;
const fs_1 = require("fs");
const path_1 = require("path");
const prisma_1 = require("../models/prisma");
const { version } = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, "../../package.json"), "utf8"));
async function healthController(_req, res) {
    let dbStatus = "connected";
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
    }
    catch {
        dbStatus = "error";
    }
    const status = dbStatus === "connected" ? "ok" : "degraded";
    res.status(status === "ok" ? 200 : 503).json({
        status,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        db: dbStatus,
        version,
    });
}
