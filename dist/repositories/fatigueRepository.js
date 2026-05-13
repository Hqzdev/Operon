"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FatigueRepository = void 0;
const prisma_1 = require("../models/prisma");
class FatigueRepository {
    static async findActiveForEntity(userId, provider, externalAccountId, externalEntityId, activeStatuses) {
        return prisma_1.prisma.fatigueAlert.findFirst({
            where: { userId, provider, externalAccountId, externalEntityId, status: { in: activeStatuses } },
            orderBy: { detectedAt: "desc" },
        });
    }
    static async create(data) {
        return prisma_1.prisma.fatigueAlert.create({
            data: {
                userId: data.userId,
                provider: data.provider,
                externalAccountId: data.externalAccountId,
                externalEntityId: data.externalEntityId,
                connectionId: data.connectionId,
                creativeName: data.creativeName,
                severity: data.severity,
                triggeredMetrics: data.triggeredMetrics,
                detectedAt: new Date(),
            },
        });
    }
    static async update(id, data) {
        return prisma_1.prisma.fatigueAlert.update({ where: { id }, data });
    }
    static async findByIdAndUser(id, userId) {
        return prisma_1.prisma.fatigueAlert.findFirst({ where: { id, userId } });
    }
    static async wakeExpiredSnoozes(userId, now) {
        return prisma_1.prisma.fatigueAlert.updateMany({
            where: { userId, status: "snoozed", snoozeUntil: { lte: now } },
            data: { status: "active", snoozeUntil: null },
        });
    }
    static async findByUser(userId, includeHistory) {
        return prisma_1.prisma.fatigueAlert.findMany({
            where: includeHistory ? { userId } : { userId, status: "active" },
            orderBy: [{ status: "asc" }, { severity: "desc" }, { detectedAt: "desc" }],
            take: includeHistory ? 100 : 10,
        });
    }
    static async findActiveAlerts(userId, limit) {
        return prisma_1.prisma.fatigueAlert.findMany({
            where: { userId, status: "active" },
            orderBy: { detectedAt: "desc" },
            take: limit,
        });
    }
}
exports.FatigueRepository = FatigueRepository;
