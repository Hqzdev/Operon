"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestExtensionMetricsController = exports.createExtensionConnectionController = exports.disconnectConnectionController = exports.listMetricSnapshotsController = exports.syncConnectionsController = exports.listConnectionsController = void 0;
const zod_1 = require("zod");
const integrationService_1 = require("../services/integrationService");
const asyncHandler_1 = require("../utils/asyncHandler");
const extensionConnectionSchema = zod_1.z.object({
    provider: zod_1.z.enum(["META", "TIKTOK", "SHOPIFY"]),
    accountName: zod_1.z.string().max(120).optional(),
});
const metricSchema = zod_1.z.object({
    externalEntityId: zod_1.z.string().optional(),
    entityName: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
    spend: zod_1.z.coerce.number().optional(),
    impressions: zod_1.z.coerce.number().optional(),
    clicks: zod_1.z.coerce.number().optional(),
    add_to_cart: zod_1.z.coerce.number().optional(),
    purchases: zod_1.z.coerce.number().optional(),
    revenue: zod_1.z.coerce.number().optional(),
    return_rate: zod_1.z.coerce.number().optional(),
    net_revenue: zod_1.z.coerce.number().optional(),
    frequency: zod_1.z.coerce.number().optional(),
    product_price: zod_1.z.coerce.number().optional(),
    cost: zod_1.z.coerce.number().optional(),
    source: zod_1.z.unknown().optional(),
});
const extensionSyncSchema = zod_1.z.object({
    provider: zod_1.z.enum(["META", "TIKTOK", "SHOPIFY"]),
    extensionKey: zod_1.z.string().min(12),
    externalAccountId: zod_1.z.string().optional(),
    accountName: zod_1.z.string().optional(),
    metrics: zod_1.z.array(metricSchema).min(1).max(500),
});
exports.listConnectionsController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.status(200).json(await (0, integrationService_1.listConnections)(req.auth.userId));
});
exports.syncConnectionsController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.status(200).json({ result: await (0, integrationService_1.syncUserConnections)(req.auth.userId) });
});
exports.listMetricSnapshotsController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const snapshots = await (0, integrationService_1.listMetricSnapshots)(req.auth.userId);
    res.status(200).json({ snapshots, latestInput: snapshots[0]?.analysisInput ?? null });
});
exports.disconnectConnectionController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await (0, integrationService_1.disconnectConnection)(req.auth.userId, String(req.params.connectionId));
    res.status(204).send();
});
exports.createExtensionConnectionController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = extensionConnectionSchema.parse(req.body);
    res.status(201).json(await (0, integrationService_1.createExtensionConnection)(req.auth.userId, (0, integrationService_1.parseProvider)(body.provider), body.accountName));
});
exports.ingestExtensionMetricsController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = extensionSyncSchema.parse(req.body);
    res.status(200).json(await (0, integrationService_1.ingestExtensionMetrics)({
        ...body,
        provider: (0, integrationService_1.parseProvider)(body.provider),
    }));
});
