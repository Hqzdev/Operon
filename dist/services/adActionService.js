"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardrailSchema = exports.executeAdActionSchema = void 0;
exports.executeAdAction = executeAdAction;
exports.undoAdAction = undoAdAction;
exports.listAdActionLogs = listAdActionLogs;
exports.updateActionGuardrail = updateActionGuardrail;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const appError_1 = require("../utils/appError");
const env_1 = require("../utils/env");
const integrationService_1 = require("./integrationService");
const userRepository_1 = require("../repositories/userRepository");
const adActionRepository_1 = require("../repositories/adActionRepository");
const integrationRepository_1 = require("../repositories/integrationRepository");
exports.executeAdActionSchema = zod_1.z.object({
    connectionId: zod_1.z.string().min(1),
    externalEntityId: zod_1.z.string().min(1),
    entityName: zod_1.z.string().optional(),
    verdictId: zod_1.z.string().optional(),
    actionType: zod_1.z.enum(["pause", "increase_budget_20", "decrease_budget_20"]),
    confirmed: zod_1.z.literal(true),
});
exports.guardrailSchema = zod_1.z.object({
    connectionId: zod_1.z.string().min(1),
    maxDailyBudgetChangePercent: zod_1.z.coerce.number().int().min(1).max(100),
});
function writeScopeFor(provider) {
    if (provider === client_1.IntegrationProvider.META)
        return "ads_management";
    if (provider === client_1.IntegrationProvider.TIKTOK)
        return "ad.write";
    return "";
}
function assertCanExecute(connection, userPlan) {
    if (userPlan === client_1.UserPlan.STARTER) {
        throw new appError_1.AppError("One-click ad actions require Pro or Scale", 403);
    }
    if (connection.status !== client_1.IntegrationStatus.CONNECTED) {
        throw new appError_1.AppError("Reconnect this ad account before executing actions", 409);
    }
    if (connection.provider !== client_1.IntegrationProvider.META && connection.provider !== client_1.IntegrationProvider.TIKTOK) {
        throw new appError_1.AppError("Write actions are only available for Meta and TikTok ad accounts", 400);
    }
    const requiredScope = writeScopeFor(connection.provider);
    if (!connection.scopes.includes(requiredScope)) {
        throw new appError_1.AppError(`Reconnect this account with ${requiredScope} permission before executing actions`, 403);
    }
}
function pctChange(before, after) {
    if (before <= 0)
        return 100;
    return Math.abs(((after - before) / before) * 100);
}
function nextBudget(actionType, current) {
    if (!current || current <= 0)
        throw new appError_1.AppError("Daily budget is missing for this ad set", 400);
    if (actionType === client_1.AdActionType.increase_budget_20)
        return Math.round(current * 1.2);
    if (actionType === client_1.AdActionType.decrease_budget_20)
        return Math.round(current * 0.8);
    return current;
}
function asNumber(value) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
}
async function getMetaState(connection, externalEntityId) {
    const token = (0, integrationService_1.decryptIntegrationToken)(connection.accessToken);
    const url = new URL(`https://graph.facebook.com/${env_1.env.META_API_VERSION}/${externalEntityId}`);
    url.searchParams.set("fields", "id,name,status,daily_budget,lifetime_budget");
    url.searchParams.set("access_token", token);
    const data = await (0, integrationService_1.providerFetch)(url.toString());
    return {
        id: String(data.id ?? externalEntityId),
        name: typeof data.name === "string" ? data.name : null,
        status: typeof data.status === "string" ? data.status : null,
        dailyBudget: data.daily_budget ? asNumber(data.daily_budget) : null,
        raw: data,
    };
}
async function updateMeta(connection, externalEntityId, params) {
    const token = (0, integrationService_1.decryptIntegrationToken)(connection.accessToken);
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
        body.set(key, String(value));
    body.set("access_token", token);
    await (0, integrationService_1.providerFetch)(`https://graph.facebook.com/${env_1.env.META_API_VERSION}/${externalEntityId}`, {
        method: "POST",
        body,
    });
}
async function getTikTokState(connection, externalEntityId) {
    const token = (0, integrationService_1.decryptIntegrationToken)(connection.accessToken);
    const url = new URL("https://business-api.tiktok.com/open_api/v1.3/adgroup/get/");
    url.searchParams.set("advertiser_id", connection.externalAccountId);
    url.searchParams.set("filtering", JSON.stringify({ adgroup_ids: [externalEntityId] }));
    url.searchParams.set("fields", JSON.stringify(["adgroup_id", "adgroup_name", "operation_status", "budget"]));
    const data = await (0, integrationService_1.providerFetch)(url.toString(), { headers: { "Access-Token": token } });
    const row = data.data?.list?.[0] ?? {};
    return {
        id: String(row.adgroup_id ?? externalEntityId),
        name: typeof row.adgroup_name === "string" ? row.adgroup_name : null,
        status: typeof row.operation_status === "string" ? row.operation_status : null,
        dailyBudget: row.budget ? asNumber(row.budget) : null,
        raw: row,
    };
}
async function updateTikTok(connection, externalEntityId, params) {
    const token = (0, integrationService_1.decryptIntegrationToken)(connection.accessToken);
    await (0, integrationService_1.providerFetch)("https://business-api.tiktok.com/open_api/v1.3/adgroup/update/", {
        method: "POST",
        headers: { "Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
            advertiser_id: connection.externalAccountId,
            adgroup_id: externalEntityId,
            ...params,
        }),
    });
}
async function getEntityState(connection, externalEntityId) {
    if (connection.provider === client_1.IntegrationProvider.META)
        return getMetaState(connection, externalEntityId);
    if (connection.provider === client_1.IntegrationProvider.TIKTOK)
        return getTikTokState(connection, externalEntityId);
    throw new appError_1.AppError("Unsupported provider", 400);
}
async function applyAction(connection, externalEntityId, actionType, before) {
    if (actionType === client_1.AdActionType.pause) {
        if (connection.provider === client_1.IntegrationProvider.META) {
            await updateMeta(connection, externalEntityId, { status: "PAUSED" });
        }
        else {
            await updateTikTok(connection, externalEntityId, { operation_status: "DISABLE" });
        }
        return getEntityState(connection, externalEntityId);
    }
    const dailyBudget = nextBudget(actionType, before.dailyBudget);
    const change = pctChange(before.dailyBudget ?? 0, dailyBudget);
    if (change > connection.maxDailyBudgetChangePercent) {
        throw new appError_1.AppError(`Budget change exceeds ${connection.maxDailyBudgetChangePercent}% account guardrail`, 400);
    }
    if (connection.provider === client_1.IntegrationProvider.META) {
        await updateMeta(connection, externalEntityId, { daily_budget: dailyBudget });
    }
    else {
        await updateTikTok(connection, externalEntityId, { budget: dailyBudget });
    }
    return getEntityState(connection, externalEntityId);
}
async function restoreBudget(connection, externalEntityId, budget) {
    if (connection.provider === client_1.IntegrationProvider.META) {
        await updateMeta(connection, externalEntityId, { daily_budget: budget });
    }
    else {
        await updateTikTok(connection, externalEntityId, { budget });
    }
    return getEntityState(connection, externalEntityId);
}
async function executeAdAction(userId, input) {
    const user = await userRepository_1.UserRepository.findById(userId);
    if (!user)
        throw new appError_1.AppError("User not found", 404);
    const originalConnection = await integrationRepository_1.IntegrationRepository.findConnectionByIdAndUser(input.connectionId, userId);
    if (!originalConnection)
        throw new appError_1.AppError("Ad account connection not found", 404);
    assertCanExecute(originalConnection, user.plan);
    const connection = await (0, integrationService_1.refreshIfNeeded)(originalConnection);
    const actionType = input.actionType;
    const before = await getEntityState(connection, input.externalEntityId);
    try {
        const after = await applyAction(connection, input.externalEntityId, actionType, before);
        const isBudgetChange = actionType === client_1.AdActionType.increase_budget_20 || actionType === client_1.AdActionType.decrease_budget_20;
        return adActionRepository_1.AdActionRepository.create({
            userId,
            connectionId: connection.id,
            provider: connection.provider,
            externalAccountId: connection.externalAccountId,
            externalEntityId: input.externalEntityId,
            entityName: input.entityName ?? before.name ?? after.name,
            verdictId: input.verdictId,
            actionType,
            status: client_1.AdActionStatus.succeeded,
            beforeState: before,
            afterState: after,
            undoUntil: isBudgetChange ? new Date(Date.now() + 60 * 60 * 1000) : null,
        });
    }
    catch (error) {
        await adActionRepository_1.AdActionRepository.create({
            userId,
            connectionId: connection.id,
            provider: connection.provider,
            externalAccountId: connection.externalAccountId,
            externalEntityId: input.externalEntityId,
            entityName: input.entityName ?? before.name,
            verdictId: input.verdictId,
            actionType,
            status: client_1.AdActionStatus.failed,
            beforeState: before,
            errorMessage: error instanceof Error ? error.message : "Action failed",
        });
        throw error;
    }
}
async function undoAdAction(userId, actionLogId) {
    const log = await adActionRepository_1.AdActionRepository.findByIdAndUser(actionLogId, userId);
    if (!log)
        throw new appError_1.AppError("Action log not found", 404);
    if (log.status !== client_1.AdActionStatus.succeeded)
        throw new appError_1.AppError("Only successful actions can be undone", 400);
    if (!log.undoUntil || log.undoUntil < new Date())
        throw new appError_1.AppError("Undo window has expired", 400);
    if (log.actionType !== client_1.AdActionType.increase_budget_20 && log.actionType !== client_1.AdActionType.decrease_budget_20) {
        throw new appError_1.AppError("Only budget changes can be undone", 400);
    }
    const before = log.beforeState;
    if (!before.dailyBudget)
        throw new appError_1.AppError("Original budget is missing", 400);
    const connection = await (0, integrationService_1.refreshIfNeeded)(log.connection);
    const undoBefore = await getEntityState(connection, log.externalEntityId);
    const after = await restoreBudget(connection, log.externalEntityId, before.dailyBudget);
    await adActionRepository_1.AdActionRepository.update(log.id, {
        status: client_1.AdActionStatus.undone,
        undoneAt: new Date(),
        afterState: after,
    });
    return adActionRepository_1.AdActionRepository.create({
        userId,
        connectionId: connection.id,
        provider: connection.provider,
        externalAccountId: connection.externalAccountId,
        externalEntityId: log.externalEntityId,
        entityName: log.entityName,
        verdictId: log.verdictId,
        actionType: client_1.AdActionType.undo_budget_change,
        status: client_1.AdActionStatus.succeeded,
        beforeState: undoBefore,
        afterState: after,
    });
}
async function listAdActionLogs(userId, limit = 50) {
    return adActionRepository_1.AdActionRepository.findByUserId(userId, limit);
}
async function updateActionGuardrail(userId, input) {
    return integrationRepository_1.IntegrationRepository.updateConnectionGuardrail(input.connectionId, userId, input.maxDailyBudgetChangePercent);
}
