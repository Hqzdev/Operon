import { prisma } from "../models/prisma";
import type { IntegrationProvider, IntegrationStatus, Prisma } from "@prisma/client";

export class IntegrationRepository {
  // ─── Connection queries ─────────────────────────────────────────────────────

  static async findConnectionById(id: string) {
    return prisma.integrationConnection.findUnique({ where: { id } });
  }

  static async findConnectionByIdSelect<S extends Parameters<typeof prisma.integrationConnection.findUnique>[0]["select"]>(
    id: string,
    select: S,
  ) {
    return prisma.integrationConnection.findUnique({ where: { id }, select });
  }

  static async findConnectionByIdAndUser(id: string, userId: string) {
    return prisma.integrationConnection.findFirst({ where: { id, userId } });
  }

  static async findByUser(userId: string) {
    return prisma.integrationConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        externalAccountId: true,
        accountName: true,
        status: true,
        scopes: true,
        lastSyncedAt: true,
        nextSyncAt: true,
        lastError: true,
        maxDailyBudgetChangePercent: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: [{ provider: "asc" }, { createdAt: "desc" }],
    });
  }

  static async findConnectedAccounts(opts: {
    providers: IntegrationProvider[];
    status: IntegrationStatus;
    limit: number;
  }) {
    return prisma.integrationConnection.findMany({
      where: { provider: { in: opts.providers }, status: opts.status, lastSyncedAt: { not: null } },
      select: { id: true },
      orderBy: { lastSyncedAt: "desc" },
      take: opts.limit,
    });
  }

  static async findActiveByUser(userId: string) {
    return prisma.integrationConnection.findMany({
      where: { userId, status: { not: "DISCONNECTED" as IntegrationStatus } },
    });
  }

  static async findDueConnections(limit: number) {
    return prisma.integrationConnection.findMany({
      where: {
        status: "CONNECTED" as IntegrationStatus,
        nextSyncAt: { lte: new Date() },
        OR: [{ syncLockUntil: null }, { syncLockUntil: { lt: new Date() } }],
      },
      take: limit,
      orderBy: { nextSyncAt: "asc" },
    });
  }

  static async findExtensionCandidates() {
    return prisma.integrationConnection.findMany({
      where: {
        status: { not: "DISCONNECTED" as IntegrationStatus },
        scopes: { has: "extension_read" },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });
  }

  static async findUserExtensionConnections(userId: string) {
    return prisma.integrationConnection.findMany({
      where: {
        userId,
        status: { not: "DISCONNECTED" as IntegrationStatus },
        scopes: { has: "extension_read" },
      },
      select: { id: true, metadata: true },
    });
  }

  static async findShopifyConnection(userId: string) {
    return prisma.integrationConnection.findFirst({
      where: {
        userId,
        provider: "SHOPIFY" as IntegrationProvider,
        status: "CONNECTED" as IntegrationStatus,
      },
      orderBy: { lastSyncedAt: "desc" },
      select: { externalAccountId: true, accessToken: true },
    });
  }

  static async upsertConnection(
    userId: string,
    provider: IntegrationProvider,
    externalAccountId: string,
    create: Prisma.IntegrationConnectionCreateInput,
    update: Prisma.IntegrationConnectionUpdateInput,
  ) {
    return prisma.integrationConnection.upsert({
      where: { userId_provider_externalAccountId: { userId, provider, externalAccountId } },
      create,
      update,
    });
  }

  static async upsertExtensionConnection(
    userId: string,
    provider: IntegrationProvider,
    externalAccountId: string,
    create: Prisma.IntegrationConnectionCreateInput,
    update: Prisma.IntegrationConnectionUpdateInput,
  ) {
    return prisma.integrationConnection.upsert({
      where: { userId_provider_externalAccountId: { userId, provider, externalAccountId } },
      create,
      update,
    });
  }

  static async updateConnection(id: string, data: Record<string, unknown>) {
    return prisma.integrationConnection.update({ where: { id }, data });
  }

  static async updateConnectionGuardrail(connectionId: string, userId: string, maxPercent: number) {
    return prisma.integrationConnection.updateMany({
      where: { id: connectionId, userId },
      data: { maxDailyBudgetChangePercent: maxPercent },
    });
  }

  static async disconnectConnection(connectionId: string, userId: string) {
    return prisma.integrationConnection.updateMany({
      where: { id: connectionId, userId },
      data: { status: "DISCONNECTED" as IntegrationStatus },
    });
  }

  // ─── Metric snapshot queries ────────────────────────────────────────────────

  static async upsertSnapshot(params: {
    userId: string;
    connectionId: string;
    provider: IntegrationProvider;
    externalAccountId: string;
    externalEntityId: string;
    entityName?: string;
    date: Date;
    metrics: Prisma.InputJsonValue;
    analysisInput: Prisma.InputJsonValue;
    source?: Prisma.InputJsonValue;
  }) {
    return prisma.integrationMetricSnapshot.upsert({
      where: {
        userId_provider_externalAccountId_externalEntityId_date: {
          userId: params.userId,
          provider: params.provider,
          externalAccountId: params.externalAccountId,
          externalEntityId: params.externalEntityId,
          date: params.date,
        },
      },
      create: {
        userId: params.userId,
        connectionId: params.connectionId,
        provider: params.provider,
        externalAccountId: params.externalAccountId,
        externalEntityId: params.externalEntityId,
        entityName: params.entityName,
        date: params.date,
        metrics: params.metrics,
        analysisInput: params.analysisInput,
        source: params.source,
      },
      update: {
        entityName: params.entityName,
        metrics: params.metrics,
        analysisInput: params.analysisInput,
        source: params.source,
      },
    });
  }

  static async findSnapshotsByConnection(connectionId: string, since: Date) {
    return prisma.integrationMetricSnapshot.findMany({
      where: { connectionId, date: { gte: since } },
      orderBy: [{ externalEntityId: "asc" }, { date: "asc" }],
    });
  }

  static async findSnapshotsByEntity(opts: {
    userId: string;
    externalEntityId: string;
    externalAccountId?: string;
    provider?: IntegrationProvider | IntegrationProvider[];
    since: Date;
  }) {
    const providerFilter = !opts.provider
      ? { in: ["META", "TIKTOK"] as IntegrationProvider[] }
      : Array.isArray(opts.provider)
        ? { in: opts.provider }
        : opts.provider;

    return prisma.integrationMetricSnapshot.findMany({
      where: {
        userId: opts.userId,
        externalEntityId: opts.externalEntityId,
        ...(opts.externalAccountId ? { externalAccountId: opts.externalAccountId } : {}),
        provider: providerFilter as Parameters<typeof prisma.integrationMetricSnapshot.findMany>[0]["where"]["provider"],
        date: { gte: opts.since },
      },
      orderBy: { date: "asc" },
    });
  }

  static async findSnapshotsByUser(userId: string) {
    return prisma.integrationMetricSnapshot.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        externalAccountId: true,
        externalEntityId: true,
        entityName: true,
        date: true,
        analysisInput: true,
        metrics: true,
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      take: 50,
    });
  }

  static async findRecentSnapshotsByProvider(userId: string, provider: IntegrationProvider, since: Date) {
    return prisma.integrationMetricSnapshot.findMany({
      where: { userId, provider, date: { gte: since } },
      select: { analysisInput: true, metrics: true, date: true },
      orderBy: { date: "desc" },
      take: 50,
    });
  }

  static async findLatestSnapshot(userId: string) {
    return prisma.integrationMetricSnapshot.findFirst({
      where: { userId },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    });
  }

  static async findRecentSnapshotsForMatching(userId: string, limit: number) {
    return prisma.integrationMetricSnapshot.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      take: limit,
      select: {
        connectionId: true,
        provider: true,
        externalAccountId: true,
        externalEntityId: true,
        entityName: true,
        analysisInput: true,
        date: true,
      },
    });
  }

  static async findSnapshotsByConnectionAndEntity(opts: {
    connectionId: string;
    externalEntityId: string;
    since: Date;
    until: Date;
  }) {
    return prisma.integrationMetricSnapshot.findMany({
      where: {
        connectionId: opts.connectionId,
        externalEntityId: opts.externalEntityId,
        date: { gte: opts.since, lte: opts.until },
      },
      select: { analysisInput: true },
      orderBy: { date: "asc" },
    });
  }
}
