"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationRepository = void 0;
const prisma_1 = require("../models/prisma");
class IntegrationRepository {
    // ─── Connection queries ─────────────────────────────────────────────────────
    static async findConnectionById(id) {
        return prisma_1.prisma.integrationConnection.findUnique({ where: { id } });
    }
    static async findConnectionByIdSelect(id, select) {
        return prisma_1.prisma.integrationConnection.findUnique({ where: { id }, select });
    }
    static async findConnectionByIdAndUser(id, userId) {
        return prisma_1.prisma.integrationConnection.findFirst({ where: { id, userId } });
    }
    static async findByUser(userId) {
        return prisma_1.prisma.integrationConnection.findMany({
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
    static async findConnectedAccounts(opts) {
        return prisma_1.prisma.integrationConnection.findMany({
            where: { provider: { in: opts.providers }, status: opts.status, lastSyncedAt: { not: null } },
            select: { id: true },
            orderBy: { lastSyncedAt: "desc" },
            take: opts.limit,
        });
    }
    static async findActiveByUser(userId) {
        return prisma_1.prisma.integrationConnection.findMany({
            where: { userId, status: { not: "DISCONNECTED" } },
        });
    }
    static async findDueConnections(limit) {
        return prisma_1.prisma.integrationConnection.findMany({
            where: {
                status: "CONNECTED",
                nextSyncAt: { lte: new Date() },
                OR: [{ syncLockUntil: null }, { syncLockUntil: { lt: new Date() } }],
            },
            take: limit,
            orderBy: { nextSyncAt: "asc" },
        });
    }
    static async findExtensionCandidates() {
        return prisma_1.prisma.integrationConnection.findMany({
            where: {
                status: { not: "DISCONNECTED" },
                scopes: { has: "extension_read" },
            },
            include: {
                user: { select: { email: true, name: true } },
            },
        });
    }
    static async findUserExtensionConnections(userId) {
        return prisma_1.prisma.integrationConnection.findMany({
            where: {
                userId,
                status: { not: "DISCONNECTED" },
                scopes: { has: "extension_read" },
            },
            select: { id: true, metadata: true },
        });
    }
    static async findShopifyConnection(userId) {
        return prisma_1.prisma.integrationConnection.findFirst({
            where: {
                userId,
                provider: "SHOPIFY",
                status: "CONNECTED",
            },
            orderBy: { lastSyncedAt: "desc" },
            select: { externalAccountId: true, accessToken: true },
        });
    }
    static async upsertConnection(userId, provider, externalAccountId, create, update) {
        return prisma_1.prisma.integrationConnection.upsert({
            where: { userId_provider_externalAccountId: { userId, provider, externalAccountId } },
            create,
            update,
        });
    }
    static async upsertExtensionConnection(userId, provider, externalAccountId, create, update) {
        return prisma_1.prisma.integrationConnection.upsert({
            where: { userId_provider_externalAccountId: { userId, provider, externalAccountId } },
            create,
            update,
        });
    }
    static async updateConnection(id, data) {
        return prisma_1.prisma.integrationConnection.update({ where: { id }, data });
    }
    static async updateConnectionGuardrail(connectionId, userId, maxPercent) {
        return prisma_1.prisma.integrationConnection.updateMany({
            where: { id: connectionId, userId },
            data: { maxDailyBudgetChangePercent: maxPercent },
        });
    }
    static async disconnectConnection(connectionId, userId) {
        return prisma_1.prisma.integrationConnection.updateMany({
            where: { id: connectionId, userId },
            data: { status: "DISCONNECTED" },
        });
    }
    // ─── Metric snapshot queries ────────────────────────────────────────────────
    static async upsertSnapshot(params) {
        return prisma_1.prisma.integrationMetricSnapshot.upsert({
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
    static async findSnapshotsByConnection(connectionId, since) {
        return prisma_1.prisma.integrationMetricSnapshot.findMany({
            where: { connectionId, date: { gte: since } },
            orderBy: [{ externalEntityId: "asc" }, { date: "asc" }],
        });
    }
    static async findSnapshotsByEntity(opts) {
        const providerFilter = !opts.provider
            ? { in: ["META", "TIKTOK"] }
            : Array.isArray(opts.provider)
                ? { in: opts.provider }
                : opts.provider;
        return prisma_1.prisma.integrationMetricSnapshot.findMany({
            where: {
                userId: opts.userId,
                externalEntityId: opts.externalEntityId,
                ...(opts.externalAccountId ? { externalAccountId: opts.externalAccountId } : {}),
                provider: providerFilter,
                date: { gte: opts.since },
            },
            orderBy: { date: "asc" },
        });
    }
    static async findSnapshotsByUser(userId) {
        return prisma_1.prisma.integrationMetricSnapshot.findMany({
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
    static async findRecentSnapshotsByProvider(userId, provider, since) {
        return prisma_1.prisma.integrationMetricSnapshot.findMany({
            where: { userId, provider, date: { gte: since } },
            select: { analysisInput: true, metrics: true, date: true },
            orderBy: { date: "desc" },
            take: 50,
        });
    }
    static async findLatestSnapshot(userId) {
        return prisma_1.prisma.integrationMetricSnapshot.findFirst({
            where: { userId },
            orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        });
    }
    static async findRecentSnapshotsForMatching(userId, limit) {
        return prisma_1.prisma.integrationMetricSnapshot.findMany({
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
    static async findSnapshotsByConnectionAndEntity(opts) {
        return prisma_1.prisma.integrationMetricSnapshot.findMany({
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
exports.IntegrationRepository = IntegrationRepository;
