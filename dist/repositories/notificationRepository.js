"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const prisma_1 = require("../models/prisma");
class NotificationRepository {
    static async create(data) {
        return prisma_1.prisma.notification.create({ data: data });
    }
    static async findByUserId(userId, limit = 20) {
        return prisma_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
    static async markRead(id, userId) {
        return prisma_1.prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true },
        });
    }
    static async markAllRead(userId) {
        return prisma_1.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }
}
exports.NotificationRepository = NotificationRepository;
