"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const env_1 = require("../utils/env");
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: env_1.env.DATABASE_URL,
});
exports.prisma = global.__prisma__ ??
    new client_1.PrismaClient({
        adapter,
        log: ["warn", "error"],
    });
if (process.env.NODE_ENV !== "production") {
    global.__prisma__ = exports.prisma;
}
