"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptIntegrationToken = decryptIntegrationToken;
exports.providerFetch = providerFetch;
exports.parseProvider = parseProvider;
exports.buildOAuthUrl = buildOAuthUrl;
exports.completeOAuth = completeOAuth;
exports.listConnections = listConnections;
exports.createExtensionConnection = createExtensionConnection;
exports.getExtensionConnectionStatus = getExtensionConnectionStatus;
exports.updateExtensionAutopilot = updateExtensionAutopilot;
exports.updateUserExtensionAutopilot = updateUserExtensionAutopilot;
exports.ingestExtensionMetrics = ingestExtensionMetrics;
exports.disconnectConnection = disconnectConnection;
exports.syncConnection = syncConnection;
exports.refreshIfNeeded = refreshIfNeeded;
exports.syncUserConnections = syncUserConnections;
exports.syncDueConnections = syncDueConnections;
exports.listMetricSnapshots = listMetricSnapshots;
exports.getLatestAnalysisInput = getLatestAnalysisInput;
exports.getShopifyConnectionCredentials = getShopifyConnectionCredentials;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const env_1 = require("../utils/env");
const appError_1 = require("../utils/appError");
const fatigueService_1 = require("./fatigueService");
const integrationRepository_1 = require("../repositories/integrationRepository");
const analysisInputSchema = zod_1.z.object({
    product_name: zod_1.z.string().min(2).max(120).default("Untitled product"),
    product_description: zod_1.z.string().min(10).max(2000).default("General e-commerce product"),
    product_price: zod_1.z.coerce.number().positive(),
    cost: zod_1.z.coerce.number().min(0),
    ctr: zod_1.z.coerce.number().min(0),
    cpc: zod_1.z.coerce.number().min(0),
    cpm: zod_1.z.coerce.number().min(0),
    impressions: zod_1.z.coerce.number().int().min(0),
    clicks: zod_1.z.coerce.number().int().min(0),
    add_to_cart: zod_1.z.coerce.number().int().min(0),
    purchases: zod_1.z.coerce.number().int().min(0),
    revenue: zod_1.z.coerce.number().min(0),
    return_rate: zod_1.z.coerce.number().min(0).max(100).default(0),
    net_revenue: zod_1.z.coerce.number().min(0).optional(),
    total_spend: zod_1.z.coerce.number().min(0).optional(),
    days_active: zod_1.z.coerce.number().int().min(0).optional(),
    platform_breakdown: zod_1.z.object({
        ios: zod_1.z.coerce.number().min(0).optional(),
        android: zod_1.z.coerce.number().min(0).optional(),
        desktop: zod_1.z.coerce.number().min(0).optional(),
        unknown: zod_1.z.coerce.number().min(0).optional(),
    }).optional(),
    ios_audience_pct: zod_1.z.coerce.number().min(0).max(100).optional(),
    ios_under_attribution_multiplier: zod_1.z.coerce.number().min(0).max(10).optional(),
    pixel_purchases: zod_1.z.coerce.number().min(0).optional(),
    shopify_purchases: zod_1.z.coerce.number().min(0).optional(),
    stage: zod_1.z.enum(["testing", "scaling", "retesting"]),
});
const providerSchema = zod_1.z.enum(["META", "TIKTOK", "SHOPIFY"]);
const OAUTH_SCOPES = {
    META: ["ads_read", "read_insights", "business_management", "ads_management"],
    TIKTOK: ["advertiser.read", "report.read", "ad.write"],
    SHOPIFY: ["read_orders", "read_all_orders", "read_products", "read_inventory"],
};
function appUrl() {
    return env_1.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}
function callbackUrl(provider) {
    return `${appUrl()}/api/integrations/oauth/${provider.toLowerCase()}/callback`;
}
function assertConfigured(provider) {
    const missing = provider === "META"
        ? !env_1.env.META_APP_ID || !env_1.env.META_APP_SECRET
        : provider === "TIKTOK"
            ? !env_1.env.TIKTOK_APP_ID || !env_1.env.TIKTOK_APP_SECRET
            : !env_1.env.SHOPIFY_API_KEY || !env_1.env.SHOPIFY_API_SECRET;
    if (missing) {
        throw new appError_1.AppError(`${provider} OAuth is not configured`, 503);
    }
}
function tokenKey() {
    const secret = env_1.env.INTEGRATION_TOKEN_SECRET ?? env_1.env.JWT_SECRET;
    return crypto_1.default.createHash("sha256").update(secret).digest();
}
function encryptToken(value) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", tokenKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}
function decryptIntegrationToken(value) {
    const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw)
        return value;
    const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, "base64")),
        decipher.final(),
    ]).toString("utf8");
}
function asNumber(value) {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(num) ? num : 0;
}
function day(value = new Date()) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
function round(value, precision = 2) {
    return Number(value.toFixed(precision));
}
function toAnalysisInput(metrics) {
    const spend = metrics.total_spend && metrics.total_spend > 0 ? metrics.total_spend : metrics.spend;
    const productPrice = metrics.product_price && metrics.product_price > 0
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
        return_rate: round(metrics.return_rate ?? 0),
        net_revenue: metrics.net_revenue !== undefined ? round(metrics.net_revenue) : undefined,
        total_spend: round(spend),
        days_active: metrics.days_active ?? 1,
        platform_breakdown: metrics.platform_breakdown,
        ios_audience_pct: metrics.ios_audience_pct,
        pixel_purchases: metrics.pixel_purchases ?? metrics.purchases,
        shopify_purchases: metrics.shopify_purchases,
        stage: "testing",
    };
    return analysisInputSchema.parse(input);
}
async function providerFetch(url, init, attempts = 3) {
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
            const message = typeof data?.error?.message === "string"
                ? data.error.message
                : typeof data?.message === "string"
                    ? data.message
                    : `${res.status} provider error`;
            throw new Error(message);
        }
        return data;
    }
    throw new Error("Provider rate limit did not clear");
}
function parseProvider(provider) {
    return providerSchema.parse(provider.toUpperCase());
}
function buildOAuthUrl(userId, provider, shop) {
    assertConfigured(provider);
    const normalizedShop = shop?.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (provider === "SHOPIFY" && !normalizedShop) {
        throw new appError_1.AppError("Shopify shop domain is required", 400);
    }
    const state = jsonwebtoken_1.default.sign({ userId, provider, shop: normalizedShop, nonce: crypto_1.default.randomUUID() }, env_1.env.JWT_SECRET, { expiresIn: "10m" });
    if (provider === "META") {
        const url = new URL(`https://www.facebook.com/${env_1.env.META_API_VERSION}/dialog/oauth`);
        url.searchParams.set("client_id", env_1.env.META_APP_ID);
        url.searchParams.set("redirect_uri", callbackUrl(provider));
        url.searchParams.set("state", state);
        url.searchParams.set("scope", OAUTH_SCOPES.META.join(","));
        return url.toString();
    }
    if (provider === "TIKTOK") {
        const url = new URL("https://business-api.tiktok.com/portal/auth");
        url.searchParams.set("app_id", env_1.env.TIKTOK_APP_ID);
        url.searchParams.set("redirect_uri", callbackUrl(provider));
        url.searchParams.set("state", state);
        url.searchParams.set("scope", OAUTH_SCOPES.TIKTOK.join(","));
        return url.toString();
    }
    const url = new URL(`https://${normalizedShop}/admin/oauth/authorize`);
    url.searchParams.set("client_id", env_1.env.SHOPIFY_API_KEY);
    url.searchParams.set("redirect_uri", callbackUrl(provider));
    url.searchParams.set("state", state);
    url.searchParams.set("scope", OAUTH_SCOPES.SHOPIFY.join(","));
    return url.toString();
}
function verifyState(state, provider) {
    const payload = jsonwebtoken_1.default.verify(state, env_1.env.JWT_SECRET);
    if (payload.provider !== provider)
        throw new appError_1.AppError("OAuth state provider mismatch", 400);
    return payload;
}
async function completeOAuth(provider, code, state) {
    assertConfigured(provider);
    const oauthState = verifyState(state, provider);
    const accounts = provider === "META"
        ? await exchangeMeta(code)
        : provider === "TIKTOK"
            ? await exchangeTikTok(code)
            : await exchangeShopify(code, oauthState.shop);
    const saved = [];
    for (const account of accounts) {
        saved.push(await upsertConnection(oauthState.userId, provider, account));
    }
    return saved;
}
async function upsertConnection(userId, provider, account) {
    return integrationRepository_1.IntegrationRepository.upsertConnection(userId, provider, account.externalAccountId, {
        userId,
        provider: provider,
        externalAccountId: account.externalAccountId,
        accountName: account.accountName,
        accessToken: encryptToken(account.accessToken),
        refreshToken: account.refreshToken ? encryptToken(account.refreshToken) : null,
        tokenExpiresAt: account.tokenExpiresAt,
        scopes: account.scopes,
        status: client_1.IntegrationStatus.CONNECTED,
        metadata: account.metadata,
        nextSyncAt: new Date(),
        lastError: null,
    }, {
        accountName: account.accountName,
        accessToken: encryptToken(account.accessToken),
        refreshToken: account.refreshToken ? encryptToken(account.refreshToken) : undefined,
        tokenExpiresAt: account.tokenExpiresAt,
        scopes: account.scopes,
        status: client_1.IntegrationStatus.CONNECTED,
        metadata: account.metadata,
        nextSyncAt: new Date(),
        lastError: null,
    });
}
async function exchangeMeta(code) {
    const tokenUrl = new URL(`https://graph.facebook.com/${env_1.env.META_API_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", env_1.env.META_APP_ID);
    tokenUrl.searchParams.set("client_secret", env_1.env.META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", callbackUrl("META"));
    tokenUrl.searchParams.set("code", code);
    const token = await providerFetch(tokenUrl.toString());
    const accounts = await providerFetch(`https://graph.facebook.com/${env_1.env.META_API_VERSION}/me/adaccounts?fields=name,account_id&access_token=${encodeURIComponent(token.access_token)}`);
    return (accounts.data ?? []).map((account) => ({
        externalAccountId: account.id,
        accountName: account.name ?? account.account_id,
        accessToken: token.access_token,
        tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined,
        scopes: OAUTH_SCOPES.META,
        metadata: { accountId: account.account_id },
    }));
}
async function exchangeTikTok(code) {
    const token = await providerFetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            app_id: env_1.env.TIKTOK_APP_ID,
            secret: env_1.env.TIKTOK_APP_SECRET,
            auth_code: code,
        }),
    });
    const data = token.data;
    if (!data?.access_token)
        throw new Error("TikTok did not return an access token");
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
async function exchangeShopify(code, shop) {
    const token = await providerFetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: env_1.env.SHOPIFY_API_KEY,
            client_secret: env_1.env.SHOPIFY_API_SECRET,
            code,
        }),
    });
    return [{
            externalAccountId: shop,
            accountName: shop,
            accessToken: token.access_token,
            scopes: token.scope?.split(",") ?? OAUTH_SCOPES.SHOPIFY,
        }];
}
async function listConnections(userId) {
    return integrationRepository_1.IntegrationRepository.findByUser(userId);
}
async function persistMetricSnapshots(connection, raw) {
    for (const metrics of raw) {
        const analysisInput = toAnalysisInput(metrics);
        await integrationRepository_1.IntegrationRepository.upsertSnapshot({
            userId: connection.userId,
            connectionId: connection.id,
            provider: connection.provider,
            externalAccountId: connection.externalAccountId,
            externalEntityId: metrics.externalEntityId,
            entityName: metrics.entityName,
            date: metrics.date,
            metrics: metrics,
            analysisInput: analysisInput,
            source: metrics.source,
        });
    }
}
async function createExtensionConnection(userId, provider, accountName) {
    if (provider !== "META" && provider !== "TIKTOK" && provider !== "SHOPIFY") {
        throw new appError_1.AppError("Unsupported extension provider", 400);
    }
    const extensionKey = crypto_1.default.randomBytes(24).toString("hex");
    const externalAccountId = `extension-${provider.toLowerCase()}-${userId}`;
    const connection = await integrationRepository_1.IntegrationRepository.upsertExtensionConnection(userId, provider, externalAccountId, {
        userId,
        provider: provider,
        externalAccountId,
        accountName: accountName || `${provider} extension`,
        accessToken: encryptToken(extensionKey),
        scopes: ["extension_read"],
        status: client_1.IntegrationStatus.CONNECTED,
        metadata: { source: "extension", writeCapable: false, autopilotEnabled: false },
        lastSyncedAt: null,
        nextSyncAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }, {
        accountName: accountName || `${provider} extension`,
        accessToken: encryptToken(extensionKey),
        scopes: ["extension_read"],
        status: client_1.IntegrationStatus.CONNECTED,
        metadata: { source: "extension", writeCapable: false, autopilotEnabled: false },
        lastError: null,
        nextSyncAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    return { connectionId: connection.id, provider, extensionKey };
}
async function findExtensionConnectionByKey(extensionKey) {
    const candidates = await integrationRepository_1.IntegrationRepository.findExtensionCandidates();
    return candidates.find((candidate) => decryptIntegrationToken(candidate.accessToken) === extensionKey) ?? null;
}
function extensionMetadata(metadata) {
    return typeof metadata === "object" && metadata !== null ? metadata : {};
}
async function getExtensionConnectionStatus(extensionKey) {
    const connection = await findExtensionConnectionByKey(extensionKey);
    if (!connection)
        throw new appError_1.AppError("Invalid extension key", 401);
    const metadata = extensionMetadata(connection.metadata);
    return {
        connectionId: connection.id,
        provider: connection.provider,
        accountName: connection.accountName,
        userEmail: connection.user.email,
        userName: connection.user.name,
        autopilotEnabled: Boolean(metadata.autopilotEnabled),
        lastSyncedAt: connection.lastSyncedAt,
    };
}
async function updateExtensionAutopilot(extensionKey, enabled) {
    const connection = await findExtensionConnectionByKey(extensionKey);
    if (!connection)
        throw new appError_1.AppError("Invalid extension key", 401);
    const metadata = extensionMetadata(connection.metadata);
    const updated = await integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
        metadata: {
            ...metadata,
            source: "extension",
            writeCapable: false,
            autopilotEnabled: enabled,
            autopilotUpdatedAt: new Date().toISOString(),
        },
        nextSyncAt: enabled ? new Date() : connection.nextSyncAt,
    });
    return {
        connectionId: updated.id,
        provider: updated.provider,
        accountName: updated.accountName,
        autopilotEnabled: enabled,
    };
}
async function updateUserExtensionAutopilot(userId, enabled) {
    const connections = await integrationRepository_1.IntegrationRepository.findUserExtensionConnections(userId);
    await Promise.all(connections.map((connection) => {
        const metadata = extensionMetadata(connection.metadata);
        return integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
            metadata: {
                ...metadata,
                source: "extension",
                writeCapable: false,
                autopilotEnabled: enabled,
                autopilotUpdatedAt: new Date().toISOString(),
            },
            nextSyncAt: enabled ? new Date() : undefined,
        });
    }));
    return { autopilotEnabled: enabled, updatedConnections: connections.length };
}
function extensionMetricToRaw(metric, fallback) {
    const date = metric.date ? day(new Date(metric.date)) : day();
    return {
        externalEntityId: metric.externalEntityId || "extension-account",
        entityName: metric.entityName || fallback.accountName || fallback.accountId,
        date,
        spend: asNumber(metric.spend),
        impressions: asNumber(metric.impressions),
        clicks: asNumber(metric.clicks),
        add_to_cart: asNumber(metric.add_to_cart),
        purchases: asNumber(metric.purchases),
        revenue: asNumber(metric.revenue),
        return_rate: asNumber(metric.return_rate),
        net_revenue: metric.net_revenue !== undefined ? asNumber(metric.net_revenue) : undefined,
        frequency: asNumber(metric.frequency),
        product_price: asNumber(metric.product_price),
        cost: asNumber(metric.cost),
        total_spend: asNumber(metric.total_spend || metric.spend),
        days_active: asNumber(metric.days_active || 1),
        platform_breakdown: metric.platform_breakdown,
        ios_audience_pct: metric.ios_audience_pct,
        pixel_purchases: metric.pixel_purchases ?? metric.purchases,
        shopify_purchases: metric.shopify_purchases,
        source: (metric.source ?? metric),
    };
}
async function ingestExtensionMetrics(input) {
    const provider = input.provider;
    const connection = await findExtensionConnectionByKey(input.extensionKey);
    if (!connection)
        throw new appError_1.AppError("Invalid extension key", 401);
    if (connection.provider !== provider)
        throw new appError_1.AppError("Extension key provider mismatch", 400);
    const accountId = input.externalAccountId || connection.externalAccountId;
    const raw = input.metrics.map((metric) => extensionMetricToRaw(metric, {
        accountId,
        accountName: input.accountName || connection.accountName || undefined,
    }));
    await persistMetricSnapshots(connection, raw);
    await integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
        accountName: input.accountName || connection.accountName,
        lastSyncedAt: new Date(),
        lastError: null,
        status: client_1.IntegrationStatus.CONNECTED,
        metadata: {
            ...extensionMetadata(connection.metadata),
            source: "extension",
            writeCapable: false,
        },
    });
    if (connection.provider === client_1.IntegrationProvider.META || connection.provider === client_1.IntegrationProvider.TIKTOK) {
        await (0, fatigueService_1.runFatigueCheckForAccount)(connection.id).catch((error) => {
            console.error(`[fatigue] Extension check failed for ${connection.id}:`, error);
        });
    }
    return { connectionId: connection.id, snapshots: raw.length };
}
async function disconnectConnection(userId, connectionId) {
    await integrationRepository_1.IntegrationRepository.disconnectConnection(connectionId, userId);
}
async function syncConnection(connectionId) {
    const connection = await integrationRepository_1.IntegrationRepository.findConnectionById(connectionId);
    if (!connection || connection.status === client_1.IntegrationStatus.DISCONNECTED)
        return null;
    const now = new Date();
    if (connection.syncLockUntil && connection.syncLockUntil > now)
        return null;
    await integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
        syncLockUntil: new Date(now.getTime() + 10 * 60 * 1000),
    });
    try {
        if (connection.metadata?.source === "extension") {
            await integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
                syncLockUntil: null,
                nextSyncAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                lastError: null,
            });
            return { connectionId: connection.id, snapshots: 0, source: "extension" };
        }
        const freshConnection = await refreshIfNeeded(connection);
        const raw = freshConnection.provider === client_1.IntegrationProvider.META
            ? await fetchMetaMetrics(freshConnection)
            : freshConnection.provider === client_1.IntegrationProvider.TIKTOK
                ? await fetchTikTokMetrics(freshConnection)
                : await fetchShopifyMetrics(freshConnection);
        await persistMetricSnapshots(freshConnection, raw);
        await integrationRepository_1.IntegrationRepository.updateConnection(freshConnection.id, {
            status: client_1.IntegrationStatus.CONNECTED,
            lastSyncedAt: new Date(),
            nextSyncAt: new Date(Date.now() + 60 * 60 * 1000),
            syncLockUntil: null,
            lastError: null,
        });
        if (freshConnection.provider === client_1.IntegrationProvider.META || freshConnection.provider === client_1.IntegrationProvider.TIKTOK) {
            await (0, fatigueService_1.runFatigueCheckForAccount)(freshConnection.id).catch((error) => {
                console.error(`[fatigue] Check failed for ${freshConnection.id}:`, error);
            });
        }
        return { connectionId: freshConnection.id, snapshots: raw.length };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed";
        await integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
            status: client_1.IntegrationStatus.ERROR,
            nextSyncAt: new Date(Date.now() + 30 * 60 * 1000),
            syncLockUntil: null,
            lastError: message,
        });
        throw error;
    }
}
async function refreshIfNeeded(connection) {
    if (!connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() > Date.now() + 10 * 60 * 1000) {
        return connection;
    }
    if (!connection.refreshToken) {
        await integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
            status: client_1.IntegrationStatus.ACTION_REQUIRED,
            lastError: "Token expired; reconnect required",
        });
        throw new Error("Token expired; reconnect required");
    }
    if (connection.provider === client_1.IntegrationProvider.TIKTOK) {
        const token = await providerFetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                app_id: env_1.env.TIKTOK_APP_ID,
                secret: env_1.env.TIKTOK_APP_SECRET,
                refresh_token: decryptIntegrationToken(connection.refreshToken),
            }),
        });
        if (!token.data?.access_token)
            throw new Error("TikTok refresh failed");
        return integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
            accessToken: encryptToken(token.data.access_token),
            refreshToken: token.data.refresh_token ? encryptToken(token.data.refresh_token) : undefined,
            tokenExpiresAt: token.data.expires_in ? new Date(Date.now() + token.data.expires_in * 1000) : undefined,
            status: client_1.IntegrationStatus.CONNECTED,
        });
    }
    await integrationRepository_1.IntegrationRepository.updateConnection(connection.id, {
        status: client_1.IntegrationStatus.ACTION_REQUIRED,
        lastError: "Token expired; reconnect required",
    });
    throw new Error("Token expired; reconnect required");
}
function sumActions(actions, names) {
    if (!Array.isArray(actions))
        return 0;
    return actions.reduce((sum, action) => {
        const item = action;
        return names.includes(item.action_type ?? "") ? sum + asNumber(item.value) : sum;
    }, 0);
}
function platformKey(value) {
    const device = String(value ?? "").toLowerCase();
    if (device.includes("iphone") || device.includes("ipad") || device.includes("ios"))
        return "ios";
    if (device.includes("android"))
        return "android";
    if (device.includes("desktop"))
        return "desktop";
    return "unknown";
}
function addPlatformAudience(current, row) {
    const key = platformKey(row.impression_device);
    const impressions = asNumber(row.impressions);
    current.platform_breakdown = current.platform_breakdown ?? {};
    current.platform_breakdown[key] = (current.platform_breakdown[key] ?? 0) + impressions;
    const total = Object.values(current.platform_breakdown).reduce((sum, value) => sum + asNumber(value), 0);
    current.ios_audience_pct = total > 0 ? round(((current.platform_breakdown.ios ?? 0) / total) * 100) : undefined;
}
async function fetchMetaMetrics(connection) {
    const token = decryptIntegrationToken(connection.accessToken);
    const url = new URL(`https://graph.facebook.com/${env_1.env.META_API_VERSION}/${connection.externalAccountId}/insights`);
    url.searchParams.set("level", "adset");
    url.searchParams.set("date_preset", "last_7d");
    url.searchParams.set("time_increment", "1");
    url.searchParams.set("breakdowns", "impression_device");
    url.searchParams.set("fields", "adset_id,adset_name,date_start,impression_device,spend,impressions,clicks,ctr,cpc,cpm,frequency,actions,action_values");
    url.searchParams.set("access_token", token);
    const data = await providerFetch(url.toString());
    const aggregated = new Map();
    for (const row of data.data ?? []) {
        const externalEntityId = String(row.adset_id ?? "account");
        const date = day(new Date(String(row.date_start)));
        const key = `${externalEntityId}:${date.toISOString()}`;
        const current = aggregated.get(key) ?? {
            externalEntityId,
            entityName: String(row.adset_name ?? connection.accountName ?? "Meta ad set"),
            date,
            spend: 0,
            impressions: 0,
            clicks: 0,
            add_to_cart: 0,
            purchases: 0,
            revenue: 0,
            frequency: 0,
            source: { rows: [] },
        };
        current.spend += asNumber(row.spend);
        current.impressions += asNumber(row.impressions);
        current.clicks += asNumber(row.clicks);
        current.add_to_cart += sumActions(row.actions, ["add_to_cart", "omni_add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"]);
        current.purchases += sumActions(row.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
        current.revenue += sumActions(row.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
        current.frequency = Math.max(current.frequency ?? 0, asNumber(row.frequency));
        current.pixel_purchases = current.purchases;
        addPlatformAudience(current, row);
        current.source.rows.push(row);
        aggregated.set(key, current);
    }
    return [...aggregated.values()];
}
async function fetchTikTokMetrics(connection) {
    const token = decryptIntegrationToken(connection.accessToken);
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
    const data = await providerFetch(url.toString(), { headers: { "Access-Token": token } });
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
            source: row,
        };
    });
}
async function fetchShopifyMetrics(connection) {
    const token = decryptIntegrationToken(connection.accessToken);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const url = new URL(`https://${connection.externalAccountId}/admin/api/${env_1.env.SHOPIFY_API_VERSION}/orders.json`);
    url.searchParams.set("status", "any");
    url.searchParams.set("financial_status", "paid,partially_refunded,refunded");
    url.searchParams.set("created_at_min", since);
    url.searchParams.set("limit", "250");
    const data = await providerFetch(url.toString(), { headers: { "X-Shopify-Access-Token": token } });
    const byDay = new Map();
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
async function syncUserConnections(userId) {
    const connections = await integrationRepository_1.IntegrationRepository.findActiveByUser(userId);
    const results = [];
    for (const connection of connections) {
        results.push(await syncConnection(connection.id));
    }
    return results.filter(Boolean);
}
async function syncDueConnections(limit = 25) {
    const connections = await integrationRepository_1.IntegrationRepository.findDueConnections(limit);
    const results = [];
    for (const connection of connections) {
        try {
            results.push(await syncConnection(connection.id));
        }
        catch {
            results.push({ connectionId: connection.id, failed: true });
        }
    }
    return results;
}
async function listMetricSnapshots(userId) {
    return integrationRepository_1.IntegrationRepository.findSnapshotsByUser(userId);
}
async function getLatestAnalysisInput(userId) {
    const latest = await integrationRepository_1.IntegrationRepository.findLatestSnapshot(userId);
    if (!latest)
        return null;
    return analysisInputSchema.parse(latest.analysisInput);
}
async function getShopifyConnectionCredentials(userId) {
    const connection = await integrationRepository_1.IntegrationRepository.findShopifyConnection(userId);
    if (!connection)
        return null;
    return {
        storeUrl: connection.externalAccountId,
        accessToken: decryptIntegrationToken(connection.accessToken),
    };
}
