import { prisma } from "../models/prisma";
import type { CreateAnalysisDTO } from "../types";

export class AnalysisRepository {
  static async create(data: CreateAnalysisDTO & { result?: Record<string, unknown> }) {
    return prisma.analysis.create({ data });
  }

  static async findById(id: string) {
    return prisma.analysis.findUnique({ where: { id } });
  }

  static async findByUserId(userId: string, limit = 50) {
    return prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async findLatestByUserId(userId: string) {
    return prisma.analysis.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async updateResult(id: string, result: Record<string, unknown>) {
    return prisma.analysis.update({ where: { id }, data: { result } });
  }

  static async countByUserSince(userId: string, since: Date) {
    return prisma.analysis.count({
      where: { userId, createdAt: { gte: since } },
    });
  }

  static async findRecentInputs(userId: string, limit: number) {
    return prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { inputData: true },
    });
  }

  static async findRecentResults(userId: string, limit: number) {
    return prisma.analysis.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { result: true },
    });
  }

  static async findByUserSince(userId: string, since: Date, limit: number) {
    return prisma.analysis.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async findByUserBetween(userId: string, since: Date, until: Date, limit: number) {
    return prisma.analysis.findMany({
      where: { userId, createdAt: { gte: since, lt: until } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async delete(id: string) {
    return prisma.analysis.delete({ where: { id } });
  }
}
