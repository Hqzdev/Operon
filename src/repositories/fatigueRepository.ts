import { prisma } from "../models/prisma";
import type {
  FatigueAlertStatus,
  FatigueSeverity,
  IntegrationProvider,
  Prisma,
} from "@prisma/client";

type AlertUpsertInput = {
  userId: string;
  connectionId: string;
  provider: IntegrationProvider;
  externalAccountId: string;
  externalEntityId: string;
  creativeName: string;
  severity: FatigueSeverity;
  triggeredMetrics: Prisma.InputJsonValue;
};

export class FatigueRepository {
  static async findActiveForEntity(
    userId: string,
    provider: IntegrationProvider,
    externalAccountId: string,
    externalEntityId: string,
    activeStatuses: FatigueAlertStatus[],
  ) {
    return prisma.fatigueAlert.findFirst({
      where: { userId, provider, externalAccountId, externalEntityId, status: { in: activeStatuses } },
      orderBy: { detectedAt: "desc" },
    });
  }

  static async create(data: AlertUpsertInput) {
    return prisma.fatigueAlert.create({
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

  static async update(id: string, data: {
    connectionId?: string;
    creativeName?: string;
    severity?: FatigueSeverity;
    triggeredMetrics?: Prisma.InputJsonValue;
    detectedAt?: Date;
    status?: FatigueAlertStatus;
    dismissedAt?: Date | null;
    snoozeUntil?: Date | null;
  }) {
    return prisma.fatigueAlert.update({ where: { id }, data });
  }

  static async findByIdAndUser(id: string, userId: string) {
    return prisma.fatigueAlert.findFirst({ where: { id, userId } });
  }

  static async wakeExpiredSnoozes(userId: string, now: Date) {
    return prisma.fatigueAlert.updateMany({
      where: { userId, status: "snoozed" as FatigueAlertStatus, snoozeUntil: { lte: now } },
      data: { status: "active" as FatigueAlertStatus, snoozeUntil: null },
    });
  }

  static async findByUser(userId: string, includeHistory: boolean) {
    return prisma.fatigueAlert.findMany({
      where: includeHistory ? { userId } : { userId, status: "active" as FatigueAlertStatus },
      orderBy: [{ status: "asc" }, { severity: "desc" }, { detectedAt: "desc" }],
      take: includeHistory ? 100 : 10,
    });
  }

  static async findActiveAlerts(userId: string, limit: number) {
    return prisma.fatigueAlert.findMany({
      where: { userId, status: "active" as FatigueAlertStatus },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
  }
}
