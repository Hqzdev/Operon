"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisRepository = void 0;
const prisma_1 = require("../models/prisma");
class AnalysisRepository {
    static async create(data) {
        return prisma_1.prisma.analysis.create({ data });
    }
    static async findById(id) {
        return prisma_1.prisma.analysis.findUnique({ where: { id } });
    }
    static async findByUserId(userId, limit = 50) {
        return prisma_1.prisma.analysis.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
    static async findLatestByUserId(userId) {
        return prisma_1.prisma.analysis.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    static async updateResult(id, result) {
        return prisma_1.prisma.analysis.update({ where: { id }, data: { result } });
    }
    static async countByUserSince(userId, since) {
        return prisma_1.prisma.analysis.count({
            where: { userId, createdAt: { gte: since } },
        });
    }
    static async findRecentInputs(userId, limit) {
        return prisma_1.prisma.analysis.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: { inputData: true },
        });
    }
    static async findRecentResults(userId, limit) {
        return prisma_1.prisma.analysis.findMany({
            where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: { result: true },
        });
    }
    static async findByUserSince(userId, since, limit) {
        return prisma_1.prisma.analysis.findMany({
            where: { userId, createdAt: { gte: since } },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
    static async findByUserBetween(userId, since, until, limit) {
        return prisma_1.prisma.analysis.findMany({
            where: { userId, createdAt: { gte: since, lt: until } },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
    static async delete(id) {
        return prisma_1.prisma.analysis.delete({ where: { id } });
    }
}
exports.AnalysisRepository = AnalysisRepository;
