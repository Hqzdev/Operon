import type { Request, Response } from "express";
import { z } from "zod";
import {
  createExtensionConnection,
  disconnectConnection,
  ingestExtensionMetrics,
  listConnections,
  listMetricSnapshots,
  parseProvider,
  syncUserConnections,
} from "../services/integrationService";
import { asyncHandler } from "../utils/asyncHandler";

const extensionConnectionSchema = z.object({
  provider: z.enum(["META", "TIKTOK", "SHOPIFY"]),
  accountName: z.string().max(120).optional(),
});

const metricSchema = z.object({
  externalEntityId: z.string().optional(),
  entityName: z.string().optional(),
  date: z.string().optional(),
  spend: z.coerce.number().optional(),
  impressions: z.coerce.number().optional(),
  clicks: z.coerce.number().optional(),
  add_to_cart: z.coerce.number().optional(),
  purchases: z.coerce.number().optional(),
  revenue: z.coerce.number().optional(),
  return_rate: z.coerce.number().optional(),
  net_revenue: z.coerce.number().optional(),
  frequency: z.coerce.number().optional(),
  product_price: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  source: z.unknown().optional(),
});

const extensionSyncSchema = z.object({
  provider: z.enum(["META", "TIKTOK", "SHOPIFY"]),
  extensionKey: z.string().min(12),
  externalAccountId: z.string().optional(),
  accountName: z.string().optional(),
  metrics: z.array(metricSchema).min(1).max(500),
});

export const listConnectionsController = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await listConnections(req.auth!.userId));
});

export const syncConnectionsController = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ result: await syncUserConnections(req.auth!.userId) });
});

export const listMetricSnapshotsController = asyncHandler(async (req: Request, res: Response) => {
  const snapshots = await listMetricSnapshots(req.auth!.userId);
  res.status(200).json({ snapshots, latestInput: snapshots[0]?.analysisInput ?? null });
});

export const disconnectConnectionController = asyncHandler(async (req: Request, res: Response) => {
  await disconnectConnection(req.auth!.userId, String(req.params.connectionId));
  res.status(204).send();
});

export const createExtensionConnectionController = asyncHandler(async (req: Request, res: Response) => {
  const body = extensionConnectionSchema.parse(req.body);
  res.status(201).json(await createExtensionConnection(req.auth!.userId, parseProvider(body.provider), body.accountName));
});

export const ingestExtensionMetricsController = asyncHandler(async (req: Request, res: Response) => {
  const body = extensionSyncSchema.parse(req.body);
  res.status(200).json(await ingestExtensionMetrics({
    ...body,
    provider: parseProvider(body.provider),
  }));
});
