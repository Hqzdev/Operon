import { prisma } from "../models/prisma";
import type { AdActionStatus, AdActionType, IntegrationProvider, Prisma } from "@prisma/client";

type CreateLogData = {
  userId: string;
  connectionId: string;
  provider: IntegrationProvider;
  externalAccountId: string;
  externalEntityId: string;
  entityName?: string | null;
  verdictId?: string | null;
  actionType: AdActionType;
  status: AdActionStatus;
  beforeState: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  errorMessage?: string | null;
  undoUntil?: Date | null;
};

export class AdActionRepository {
  static async create(data: CreateLogData) {
    return prisma.adActionLog.create({ data });
  }

  static async update(id: string, data: {
    status?: AdActionStatus;
    undoneAt?: Date | null;
    afterState?: Prisma.InputJsonValue;
  }) {
    return prisma.adActionLog.update({ where: { id }, data });
  }

  static async findByIdAndUser(id: string, userId: string) {
    return prisma.adActionLog.findFirst({
      where: { id, userId },
      include: { connection: true },
    });
  }

  static async findByUserId(userId: string, limit = 50) {
    return prisma.adActionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async updateConnectionGuardrail(connectionId: string, userId: string, maxDailyBudgetChangePercent: number) {
    return prisma.integrationConnection.updateMany({
      where: { id: connectionId, userId },
      data: { maxDailyBudgetChangePercent },
    });
  }
}
