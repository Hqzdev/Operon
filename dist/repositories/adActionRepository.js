"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdActionRepository = void 0;
const prisma_1 = require("../models/prisma");
class AdActionRepository {
    static async create(data) {
        return prisma_1.prisma.adActionLog.create({ data });
    }
    static async update(id, data) {
        return prisma_1.prisma.adActionLog.update({ where: { id }, data });
    }
    static async findByIdAndUser(id, userId) {
        return prisma_1.prisma.adActionLog.findFirst({
            where: { id, userId },
            include: { connection: true },
        });
    }
    static async findByUserId(userId, limit = 50) {
        return prisma_1.prisma.adActionLog.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
    static async updateConnectionGuardrail(connectionId, userId, maxDailyBudgetChangePercent) {
        return prisma_1.prisma.integrationConnection.updateMany({
            where: { id: connectionId, userId },
            data: { maxDailyBudgetChangePercent },
        });
    }
}
exports.AdActionRepository = AdActionRepository;
