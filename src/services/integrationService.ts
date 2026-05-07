import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  IntegrationProvider,
  IntegrationStatus,
  type IntegrationConnection,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../models/prisma";
import { env } from "../utils/env";
import { AppError } from "../utils/appError";
import { runFatigueCheckForAccount } from "./fatigueService";

const analysisInputSchema = z.object({
  product_name: z.string().min(2).max(120).default("Untitled product"),
  product_description: z.string().min(10).max(2000).default("General e-commerce product"),
  product_price: z.coerce.number().positive(),
  cost: z.coerce.number().min(0),
  ctr: z.coerce.number().min(0),
  cpc: z.coerce.number().min(0),
  cpm: z.coerce.number().min(0),
  impressions: z.coerce.number().int().min(0),
  clicks: z.coerce.number().int().min(0),
  add_to_cart: z.coerce.number().int().min(0),
  purchases: z.coerce.number().int().min(0),
  revenue: z.coerce.number().min(0),
  stage: z.enum(["testing", "scaling", "retesting"]),
});

type AnalysisInput = z.infer<typeof analysisInputSchema>;

const providerSchema = z.enum(["META", "TIKTOK", "SHOPIFY"]);
export type ProviderKey = z.infer<typeof providerSchema>;

const OAUTH_SCOPES: Record<ProviderKey, string[]> = {
  META: ["ads_read", "read_insights", "business_management"],
  TIKTOK: ["advertiser.read", "report.read"],
  SHOPIFY: ["read_orders", "read_products", "read_inventory"],
};

type OAuthState = {
  userId: string;
  provider: ProviderKey;
  shop?: string;
  nonce: string;
};

type ProviderAccount = {
  externalAccountId: string;
  accountName?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes: string[];
  metadata?: Prisma.InputJsonValue;
};

type RawMetrics = {
  externalEntityId: string;
  entityName?: string;
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
  frequency?: number;
  product_price?: number;
  cost?: number;
  source?: Prisma.InputJsonValue;
};

function appUrl() {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

function callbackUrl(provider: ProviderKey) {
  return `${appUrl()}/api/integrations/oauth/${provider.toLowerCase()}/callback`;
}

function assertConfigured(provider: ProviderKey) {
  const missing =
    provider === "META"
      ? !env.META_APP_ID || !env.META_APP_SECRET
      : provider === "TIKTOK"
        ? !env.TIKTOK_APP_ID || !env.TIKTOK_APP_SECRET
        : !env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET;

  if (missing) {
    throw new AppError(`${provider} OAuth is not configured`, 503);
  }
}

function tokenKey() {
  const secret = env.INTEGRATION_TOKEN_SECRET ?? env.JWT_SECRET;
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptToken(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) return value;
  const decipher = crypto.createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function day(value = new Date()) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function toAnalysisInput(metrics: RawMetrics): AnalysisInput {
  const spend = metrics.spend;
  const productPrice =
    metrics.product_price && metrics.product_price > 0
      ? metrics.product_price
      : metrics.purchases > 0
        ? metrics.revenue / metrics.purchases
        : 1;
  const input = {
    product_name: metrics.entityName ?? "Synced campaign",
    product_description: `Auto-populated from ${metrics.entityName ?? metrics.externalEntityId} daily performance.`,
    product_price: round(productPrice),
    cost: round(Math.max(metrics.cost ?? 0, 0)),
    ctr: metrics.impressions > 0 ? round((metrics.clicks / metrics.impressions) * 100) : 0,
    cpc: metrics.clicks > 0 ? round(spend / metrics.clicks) : 0,
    cpm: metrics.impressions > 0 ? round((spend / metrics.impressions) * 1000) : 0,
    impressions: Math.round(metrics.impressions),
    clicks: Math.round(metrics.clicks),
    add_to_cart: Math.round(metrics.add_to_cart),
    purchases: Math.round(metrics.purchases),
    revenue: round(metrics.revenue),
    stage: "testing",
  };
  return analysisInputSchema.parse(input);
}

async function providerFetch<T>(url: string, init?: RequestInit, attempts = 3): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < attempts - 1) {
      const retryAfter = Number(res.headers.get("retry-after") ?? 2);
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 10) * 1000));
      continue;
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const message =
        typeof data?.error?.message === "string"
          ? data.error.message
          : typeof data?.message === "string"
            ? data.message
            : `${res.status} provider error`;
      throw new Error(message);
    }
    return data as T;
  }
  throw new Error("Provider rate limit did not clear");
}

export function parseProvider(provider: string): ProviderKey {
  return providerSchema.parse(provider.toUpperCase());
}

export function buildOAuthUrl(userId: string, provider: ProviderKey, shop?: string) {
  assertConfigured(provider);
  const normalizedShop = shop?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (provider === "SHOPIFY" && !normalizedShop) {
    throw new AppError("Shopify shop domain is required", 400);
  }

  const state = jwt.sign(
    { userId, provider, shop: normalizedShop, nonce: crypto.randomUUID() } satisfies OAuthState,
    env.JWT_SECRET,
    { expiresIn: "10m" },
  );

  if (provider === "META") {
    const url = new URL(`https://www.facebook.com/${env.META_API_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", env.META_APP_ID!);
    url.searchParams.set("redirect_uri", callbackUrl(provider));
    url.searchParams.set("state", state);
    url.searchParams.set("scope", OAUTH_SCOPES.META.join(","));
    return url.toString();
  }

  if (provider === "TIKTOK") {
    const url = new URL("https://business-api.tiktok.com/portal/auth");
    url.searchParams.set("app_id", env.TIKTOK_APP_ID!);
    url.searchParams.set("redirect_uri", callbackUrl(provider));
    url.searchParams.set("state", state);
    url.searchParams.set("scope", OAUTH_SCOPES.TIKTOK.join(","));
    return url.toString();
  }

  const url = new URL(`https://${normalizedShop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_API_KEY!);
  url.searchParams.set("redirect_uri", callbackUrl(provider));
  url.searchParams.set("state", state);
  url.searchParams.set("scope", OAUTH_SCOPES.SHOPIFY.join(","));
  return url.toString();
}

function verifyState(state: string, provider: ProviderKey) {
  const payload = jwt.verify(state, env.JWT_SECRET) as OAuthState;
  if (payload.provider !== provider) throw new AppError("OAuth state provider mismatch", 400);
  return payload;
}

export async function completeOAuth(provider: ProviderKey, code: string, state: string) {
  assertConfigured(provider);
  const oauthState = verifyState(state, provider);
  const accounts =
    provider === "META"
      ? await exchangeMeta(code)
      : provider === "TIKTOK"
        ? await exchangeTikTok(code)
        : await exchangeShopify(code, oauthState.shop!);

  const saved = [];
  for (const account of accounts) {
    saved.push(await upsertConnection(oauthState.userId, provider, account));
  }
  return saved;
}

async function upsertConnection(userId: string, provider: ProviderKey, account: ProviderAccount) {
  return prisma.integrationConnection.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId,
        provider,
        externalAccountId: account.externalAccountId,
      },
    },
    create: {
      userId,
      provider,
      externalAccountId: account.externalAccountId,
      accountName: account.accountName,
      accessToken: encryptToken(account.accessToken),
      refreshToken: account.refreshToken ? encryptToken(account.refreshToken) : null,
      tokenExpiresAt: account.tokenExpiresAt,
      scopes: account.scopes,
      status: IntegrationStatus.CONNECTED,
      metadata: account.metadata,
      nextSyncAt: new Date(),
      lastError: null,
    },
    update: {
      accountName: account.accountName,
      accessToken: encryptToken(account.accessToken),
      refreshToken: account.refreshToken ? encryptToken(account.refreshToken) : undefined,
      tokenExpiresAt: account.tokenExpiresAt,
      scopes: account.scopes,
      status: IntegrationStatus.CONNECTED,
      metadata: account.metadata,
      nextSyncAt: new Date(),
      lastError: null,
    },
  });
}

async function exchangeMeta(code: string): Promise<ProviderAccount[]> {
  const tokenUrl = new URL(`https://graph.facebook.com/${env.META_API_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", env.META_APP_ID!);
  tokenUrl.searchParams.set("client_secret", env.META_APP_SECRET!);
  tokenUrl.searchParams.set("redirect_uri", callbackUrl("META"));
  tokenUrl.searchParams.set("code", code);
  const token = await providerFetch<{ access_token: string; expires_in?: number }>(tokenUrl.toString());
  const accounts = await providerFetch<{ data?: Array<{ id: string; account_id?: string; name?: string }> }>(
    `https://graph.facebook.com/${env.META_API_VERSION}/me/adaccounts?fields=name,account_id&access_token=${encodeURIComponent(token.access_token)}`,
  );
  return (accounts.data ?? []).map((account) => ({
    externalAccountId: account.id,
    accountName: account.name ?? account.account_id,
    accessToken: token.access_token,
    tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined,
    scopes: OAUTH_SCOPES.META,
    metadata: { accountId: account.account_id },
  }));
}

async function exchangeTikTok(code: string): Promise<ProviderAccount[]> {
  const token = await providerFetch<{
    data?: { access_token: string; refresh_token?: string; expires_in?: number; advertiser_ids?: string[] };
  }>("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: env.TIKTOK_APP_ID,
      secret: env.TIKTOK_APP_SECRET,
      auth_code: code,
    }),
  });
  const data = token.data;
  if (!data?.access_token) throw new Error("TikTok did not return an access token");
  const advertiserIds = data.advertiser_ids?.length ? data.advertiser_ids : ["default"];
  return advertiserIds.map((advertiserId) => ({
    externalAccountId: advertiserId,
    accountName: advertiserId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    scopes: OAUTH_SCOPES.TIKTOK,
  }));
}

async function exchangeShopify(code: string, shop: string): Promise<ProviderAccount[]> {
  const token = await providerFetch<{ access_token: string; scope?: string }>(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.SHOPIFY_API_KEY,
        client_secret: env.SHOPIFY_API_SECRET,
        code,
      }),
    },
  );
  return [{
    externalAccountId: shop,
    accountName: shop,
    accessToken: token.access_token,
    scopes: token.scope?.split(",") ?? OAUTH_SCOPES.SHOPIFY,
  }];
}

export async function listConnections(userId: string) {
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
      createdAt: true,
    },
    orderBy: [{ provider: "asc" }, { createdAt: "desc" }],
  });
}

export async function disconnectConnection(userId: string, connectionId: string) {
  await prisma.integrationConnection.updateMany({
    where: { id: connectionId, userId },
    data: { status: IntegrationStatus.DISCONNECTED },
  });
}

export async function syncConnection(connectionId: string) {
  const connection = await prisma.integrationConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.status === IntegrationStatus.DISCONNECTED) return null;

  const now = new Date();
  if (connection.syncLockUntil && connection.syncLockUntil > now) return null;

  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: { syncLockUntil: new Date(now.getTime() + 10 * 60 * 1000) },
  });

  try {
    const freshConnection = await refreshIfNeeded(connection);
    const raw =
      freshConnection.provider === IntegrationProvider.META
        ? await fetchMetaMetrics(freshConnection)
        : freshConnection.provider === IntegrationProvider.TIKTOK
          ? await fetchTikTokMetrics(freshConnection)
          : await fetchShopifyMetrics(freshConnection);

    for (const metrics of raw) {
      const analysisInput = toAnalysisInput(metrics);
      await prisma.integrationMetricSnapshot.upsert({
        where: {
          userId_provider_externalAccountId_externalEntityId_date: {
            userId: freshConnection.userId,
            provider: freshConnection.provider,
            externalAccountId: freshConnection.externalAccountId,
            externalEntityId: metrics.externalEntityId,
            date: metrics.date,
          },
        },
        create: {
          userId: freshConnection.userId,
          connectionId: freshConnection.id,
          provider: freshConnection.provider,
          externalAccountId: freshConnection.externalAccountId,
          externalEntityId: metrics.externalEntityId,
          entityName: metrics.entityName,
          date: metrics.date,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          analysisInput: analysisInput as unknown as Prisma.InputJsonValue,
          source: metrics.source,
        },
        update: {
          entityName: metrics.entityName,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          analysisInput: analysisInput as unknown as Prisma.InputJsonValue,
          source: metrics.source,
        },
      });
    }

    await prisma.integrationConnection.update({
      where: { id: freshConnection.id },
      data: {
        status: IntegrationStatus.CONNECTED,
        lastSyncedAt: new Date(),
        nextSyncAt: new Date(Date.now() + 60 * 60 * 1000),
        syncLockUntil: null,
        lastError: null,
      },
    });

    if (freshConnection.provider === IntegrationProvider.META || freshConnection.provider === IntegrationProvider.TIKTOK) {
      await runFatigueCheckForAccount(freshConnection.id).catch((error) => {
        console.error(`[fatigue] Check failed for ${freshConnection.id}:`, error);
      });
    }

    return { connectionId: freshConnection.id, snapshots: raw.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: IntegrationStatus.ERROR,
        nextSyncAt: new Date(Date.now() + 30 * 60 * 1000),
        syncLockUntil: null,
        lastError: message,
      },
    });
    throw error;
  }
}

async function refreshIfNeeded(connection: IntegrationConnection) {
  if (!connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() > Date.now() + 10 * 60 * 1000) {
    return connection;
  }
  if (!connection.refreshToken) {
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { status: IntegrationStatus.ACTION_REQUIRED, lastError: "Token expired; reconnect required" },
    });
    throw new Error("Token expired; reconnect required");
  }

  if (connection.provider === IntegrationProvider.TIKTOK) {
    const token = await providerFetch<{
      data?: { access_token: string; refresh_token?: string; expires_in?: number };
    }>("https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: env.TIKTOK_APP_ID,
        secret: env.TIKTOK_APP_SECRET,
        refresh_token: decryptToken(connection.refreshToken),
      }),
    });
    if (!token.data?.access_token) throw new Error("TikTok refresh failed");
    return prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptToken(token.data.access_token),
        refreshToken: token.data.refresh_token ? encryptToken(token.data.refresh_token) : undefined,
        tokenExpiresAt: token.data.expires_in ? new Date(Date.now() + token.data.expires_in * 1000) : undefined,
        status: IntegrationStatus.CONNECTED,
      },
    });
  }

  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: { status: IntegrationStatus.ACTION_REQUIRED, lastError: "Token expired; reconnect required" },
  });
  throw new Error("Token expired; reconnect required");
}

function sumActions(actions: unknown, names: string[]) {
  if (!Array.isArray(actions)) return 0;
  return actions.reduce((sum, action) => {
    const item = action as { action_type?: string; value?: string | number };
    return names.includes(item.action_type ?? "") ? sum + asNumber(item.value) : sum;
  }, 0);
}

async function fetchMetaMetrics(connection: IntegrationConnection): Promise<RawMetrics[]> {
  const token = decryptToken(connection.accessToken);
  const url = new URL(`https://graph.facebook.com/${env.META_API_VERSION}/${connection.externalAccountId}/insights`);
  url.searchParams.set("level", "adset");
  url.searchParams.set("date_preset", "last_7d");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("fields", "adset_id,adset_name,date_start,spend,impressions,clicks,ctr,cpc,cpm,frequency,actions,action_values");
  url.searchParams.set("access_token", token);
  const data = await providerFetch<{ data?: Array<Record<string, unknown>> }>(url.toString());
  return (data.data ?? []).map((row) => ({
    externalEntityId: String(row.adset_id ?? "account"),
    entityName: String(row.adset_name ?? connection.accountName ?? "Meta ad set"),
    date: day(new Date(String(row.date_start))),
    spend: asNumber(row.spend),
    impressions: asNumber(row.impressions),
    clicks: asNumber(row.clicks),
    add_to_cart: sumActions(row.actions, ["add_to_cart", "omni_add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"]),
    purchases: sumActions(row.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]),
    revenue: sumActions(row.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]),
    frequency: asNumber(row.frequency),
    source: row as Prisma.InputJsonValue,
  }));
}

async function fetchTikTokMetrics(connection: IntegrationConnection): Promise<RawMetrics[]> {
  const token = decryptToken(connection.accessToken);
  const url = new URL("https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/");
  url.searchParams.set("advertiser_id", connection.externalAccountId);
  url.searchParams.set("report_type", "BASIC");
  url.searchParams.set("data_level", "AUCTION_ADGROUP");
  url.searchParams.set("dimensions", JSON.stringify(["adgroup_id", "stat_time_day"]));
  url.searchParams.set("metrics", JSON.stringify([
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "complete_payment",
    "total_complete_payment_rate",
    "total_complete_payment_value",
    "add_to_cart",
    "frequency",
  ]));
  url.searchParams.set("start_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  url.searchParams.set("end_date", new Date().toISOString().slice(0, 10));
  const data = await providerFetch<{ data?: { list?: Array<{ dimensions?: Record<string, string>; metrics?: Record<string, unknown> }> } }>(
    url.toString(),
    { headers: { "Access-Token": token } },
  );
  return (data.data?.list ?? []).map((row) => {
    const dimensions = row.dimensions ?? {};
    const metrics = row.metrics ?? {};
    return {
      externalEntityId: dimensions.adgroup_id ?? "account",
      entityName: `TikTok ad group ${dimensions.adgroup_id ?? connection.externalAccountId}`,
      date: day(new Date(dimensions.stat_time_day ?? Date.now())),
      spend: asNumber(metrics.spend),
      impressions: asNumber(metrics.impressions),
      clicks: asNumber(metrics.clicks),
      add_to_cart: asNumber(metrics.add_to_cart),
      purchases: asNumber(metrics.complete_payment),
      revenue: asNumber(metrics.total_complete_payment_value),
      frequency: asNumber(metrics.frequency),
      source: row as Prisma.InputJsonValue,
    };
  });
}

async function fetchShopifyMetrics(connection: IntegrationConnection): Promise<RawMetrics[]> {
  const token = decryptToken(connection.accessToken);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(`https://${connection.externalAccountId}/admin/api/${env.SHOPIFY_API_VERSION}/orders.json`);
  url.searchParams.set("status", "any");
  url.searchParams.set("financial_status", "paid,partially_refunded,refunded");
  url.searchParams.set("created_at_min", since);
  url.searchParams.set("limit", "250");
  const data = await providerFetch<{ orders?: Array<Record<string, unknown>> }>(
    url.toString(),
    { headers: { "X-Shopify-Access-Token": token } },
  );
  const byDay = new Map<string, RawMetrics>();
  for (const order of data.orders ?? []) {
    const date = day(new Date(String(order.created_at ?? Date.now())));
    const key = date.toISOString();
    const current = byDay.get(key) ?? {
      externalEntityId: "shopify-store",
      entityName: connection.accountName ?? connection.externalAccountId,
      date,
      spend: 0,
      impressions: 0,
      clicks: 0,
      add_to_cart: 0,
      purchases: 0,
      revenue: 0,
      cost: 0,
      source: { orderIds: [] },
    };
    current.purchases += 1;
    current.revenue += asNumber(order.total_price);
    byDay.set(key, current);
  }
  return [...byDay.values()];
}

export async function syncUserConnections(userId: string) {
  const connections = await prisma.integrationConnection.findMany({
    where: { userId, status: { not: IntegrationStatus.DISCONNECTED } },
  });
  const results = [];
  for (const connection of connections) {
    results.push(await syncConnection(connection.id));
  }
  return results.filter(Boolean);
}

export async function syncDueConnections(limit = 25) {
  const connections = await prisma.integrationConnection.findMany({
    where: {
      status: IntegrationStatus.CONNECTED,
      nextSyncAt: { lte: new Date() },
      OR: [{ syncLockUntil: null }, { syncLockUntil: { lt: new Date() } }],
    },
    take: limit,
    orderBy: { nextSyncAt: "asc" },
  });
  const results = [];
  for (const connection of connections) {
    try {
      results.push(await syncConnection(connection.id));
    } catch {
      results.push({ connectionId: connection.id, failed: true });
    }
  }
  return results;
}

export async function listMetricSnapshots(userId: string) {
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

export async function getLatestAnalysisInput(userId: string) {
  const latest = await prisma.integrationMetricSnapshot.findFirst({
    where: { userId },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
  });
  if (!latest) return null;
  return analysisInputSchema.parse(latest.analysisInput);
}

export async function getShopifyConnectionCredentials(userId: string) {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      userId,
      provider: IntegrationProvider.SHOPIFY,
      status: IntegrationStatus.CONNECTED,
    },
    orderBy: { lastSyncedAt: "desc" },
    select: { externalAccountId: true, accessToken: true },
  });
  if (!connection) return null;
  return {
    storeUrl: connection.externalAccountId,
    accessToken: decryptToken(connection.accessToken),
  };
}
