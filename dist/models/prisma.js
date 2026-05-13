"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const env_1 = require("../utils/env");
function createPrismaClient() {
    const adapter = new adapter_pg_1.PrismaPg({ connectionString: env_1.env.DATABASE_URL });
    return new client_1.PrismaClient({ adapter, log: ["warn", "error"] });
}
function getPrismaClient() {
    if (!global.__prisma__) {
        global.__prisma__ = createPrismaClient();
    }
    return global.__prisma__;
}
exports.prisma = new Proxy({}, {
    get(_, property) {
        const client = getPrismaClient();
        const value = client[property];
        return typeof value === "function" ? value.bind(client) : value;
    },
});
