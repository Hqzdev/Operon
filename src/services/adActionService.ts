import {
  AdActionStatus,
  AdActionType,
  IntegrationProvider,
  IntegrationStatus,
  UserPlan,
  type IntegrationConnection,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { env } from "../utils/env";
import {
  decryptIntegrationToken,
  providerFetch,
  refreshIfNeeded,
} from "./integrationService";
import { UserRepository } from "../repositories/userRepository";
import { AdActionRepository } from "../repositories/adActionRepository";
import { maybeCreateOutcomeInvoice } from "./outcomePricingService";
import { IntegrationRepository } from "../repositories/integrationRepository";

export const executeAdActionSchema = z.object({
  connectionId: z.string().min(1),
  externalEntityId: z.string().min(1),
  entityName: z.string().optional(),
  verdictId: z.string().optional(),
  actionType: z.enum(["pause", "increase_budget_20", "decrease_budget_20"]),
  confirmed: z.literal(true),
});

export const guardrailSchema = z.object({
  connectionId: z.string().min(1),
  maxDailyBudgetChangePercent: z.coerce.number().int().min(1).max(100),
});

type ExecuteAdActionInput = z.infer<typeof executeAdActionSchema>;

type EntityState = {
  id: string;
  name?: string | null;
  status?: string | null;
  dailyBudget?: number | null;
  raw: Record<string, unknown>;
};

function writeScopeFor(provider: IntegrationProvider) {
  if (provider === IntegrationProvider.META) return "ads_management";
  if (provider === IntegrationProvider.TIKTOK) return "ad.write";
  return "";
}

function assertCanExecute(connection: IntegrationConnection, userPlan: UserPlan) {
  if (userPlan === UserPlan.STARTER) {
    throw new AppError("One-click ad actions require Pro or Scale", 403);
  }
  if (connection.status !== IntegrationStatus.CONNECTED) {
    throw new AppError("Reconnect this ad account before executing actions", 409);
  }
  if (connection.provider !== IntegrationProvider.META && connection.provider !== IntegrationProvider.TIKTOK) {
    throw new AppError("Write actions are only available for Meta and TikTok ad accounts", 400);
  }
  const requiredScope = writeScopeFor(connection.provider);
  if (!connection.scopes.includes(requiredScope)) {
    throw new AppError(`Reconnect this account with ${requiredScope} permission before executing actions`, 403);
  }
}

function pctChange(before: number, after: number) {
  if (before <= 0) return 100;
  return Math.abs(((after - before) / before) * 100);
}

function nextBudget(actionType: AdActionType, current: number | null | undefined) {
  if (!current || current <= 0) throw new AppError("Daily budget is missing for this ad set", 400);
  if (actionType === AdActionType.increase_budget_20) return Math.round(current * 1.2);
  if (actionType === AdActionType.decrease_budget_20) return Math.round(current * 0.8);
  return current;
}

function asNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

async function getMetaState(connection: IntegrationConnection, externalEntityId: string): Promise<EntityState> {
  const token = decryptIntegrationToken(connection.accessToken);
  const url = new URL(`https://graph.facebook.com/${env.META_API_VERSION}/${externalEntityId}`);
  url.searchParams.set("fields", "id,name,status,daily_budget,lifetime_budget");
  url.searchParams.set("access_token", token);
  const data = await providerFetch<Record<string, unknown>>(url.toString());

  return {
    id: String(data.id ?? externalEntityId),
    name: typeof data.name === "string" ? data.name : null,
    status: typeof data.status === "string" ? data.status : null,
    dailyBudget: data.daily_budget ? asNumber(data.daily_budget) : null,
    raw: data,
  };
}

async function updateMeta(connection: IntegrationConnection, externalEntityId: string, params: Record<string, string | number>) {
  const token = decryptIntegrationToken(connection.accessToken);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) body.set(key, String(value));
  body.set("access_token", token);

  await providerFetch<Record<string, unknown>>(`https://graph.facebook.com/${env.META_API_VERSION}/${externalEntityId}`, {
    method: "POST",
    body,
  });
}

async function getTikTokState(connection: IntegrationConnection, externalEntityId: string): Promise<EntityState> {
  const token = decryptIntegrationToken(connection.accessToken);
  const url = new URL("https://business-api.tiktok.com/open_api/v1.3/adgroup/get/");
  url.searchParams.set("advertiser_id", connection.externalAccountId);
  url.searchParams.set("filtering", JSON.stringify({ adgroup_ids: [externalEntityId] }));
  url.searchParams.set("fields", JSON.stringify(["adgroup_id", "adgroup_name", "operation_status", "budget"]));
  const data = await providerFetch<{ data?: { list?: Array<Record<string, unknown>> } }>(
    url.toString(),
    { headers: { "Access-Token": token } },
  );
  const row = data.data?.list?.[0] ?? {};
  return {
    id: String(row.adgroup_id ?? externalEntityId),
    name: typeof row.adgroup_name === "string" ? row.adgroup_name : null,
    status: typeof row.operation_status === "string" ? row.operation_status : null,
    dailyBudget: row.budget ? asNumber(row.budget) : null,
    raw: row,
  };
}

async function updateTikTok(connection: IntegrationConnection, externalEntityId: string, params: Record<string, unknown>) {
  const token = decryptIntegrationToken(connection.accessToken);
  await providerFetch<Record<string, unknown>>("https://business-api.tiktok.com/open_api/v1.3/adgroup/update/", {
    method: "POST",
    headers: { "Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      advertiser_id: connection.externalAccountId,
      adgroup_id: externalEntityId,
      ...params,
    }),
  });
}

async function getEntityState(connection: IntegrationConnection, externalEntityId: string) {
  if (connection.provider === IntegrationProvider.META) return getMetaState(connection, externalEntityId);
  if (connection.provider === IntegrationProvider.TIKTOK) return getTikTokState(connection, externalEntityId);
  throw new AppError("Unsupported provider", 400);
}

async function applyAction(connection: IntegrationConnection, externalEntityId: string, actionType: AdActionType, before: EntityState) {
  if (actionType === AdActionType.pause) {
    if (connection.provider === IntegrationProvider.META) {
      await updateMeta(connection, externalEntityId, { status: "PAUSED" });
    } else {
      await updateTikTok(connection, externalEntityId, { operation_status: "DISABLE" });
    }
    return getEntityState(connection, externalEntityId);
  }

  const dailyBudget = nextBudget(actionType, before.dailyBudget);
  const change = pctChange(before.dailyBudget ?? 0, dailyBudget);
  if (change > connection.maxDailyBudgetChangePercent) {
    throw new AppError(`Budget change exceeds ${connection.maxDailyBudgetChangePercent}% account guardrail`, 400);
  }

  if (connection.provider === IntegrationProvider.META) {
    await updateMeta(connection, externalEntityId, { daily_budget: dailyBudget });
  } else {
    await updateTikTok(connection, externalEntityId, { budget: dailyBudget });
  }
  return getEntityState(connection, externalEntityId);
}

async function restoreBudget(connection: IntegrationConnection, externalEntityId: string, budget: number) {
  if (connection.provider === IntegrationProvider.META) {
    await updateMeta(connection, externalEntityId, { daily_budget: budget });
  } else {
    await updateTikTok(connection, externalEntityId, { budget });
  }
  return getEntityState(connection, externalEntityId);
}

export async function executeAdAction(userId: string, input: ExecuteAdActionInput) {
  const user = await UserRepository.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const originalConnection = await IntegrationRepository.findConnectionByIdAndUser(input.connectionId, userId);
  if (!originalConnection) throw new AppError("Ad account connection not found", 404);

  assertCanExecute(originalConnection, user.plan);
  const connection = await refreshIfNeeded(originalConnection);
  const actionType = input.actionType as AdActionType;
  const before = await getEntityState(connection, input.externalEntityId);

  try {
    const after = await applyAction(connection, input.externalEntityId, actionType, before);
    const isBudgetChange = actionType === AdActionType.increase_budget_20 || actionType === AdActionType.decrease_budget_20;
    const log = await AdActionRepository.create({
      userId,
      connectionId: connection.id,
      provider: connection.provider,
      externalAccountId: connection.externalAccountId,
      externalEntityId: input.externalEntityId,
      entityName: input.entityName ?? before.name ?? after.name,
      verdictId: input.verdictId,
      actionType,
      status: AdActionStatus.succeeded,
      beforeState: before as unknown as Prisma.InputJsonValue,
      afterState: after as unknown as Prisma.InputJsonValue,
      undoUntil: isBudgetChange ? new Date(Date.now() + 60 * 60 * 1000) : null,
    });
    if (actionType === AdActionType.pause) {
      await maybeCreateOutcomeInvoice(userId).catch((error) => {
        console.error("[outcome-pricing] Failed to create invoice after pause:", error);
      });
    }
    return log;
  } catch (error) {
    await AdActionRepository.create({
      userId,
      connectionId: connection.id,
      provider: connection.provider,
      externalAccountId: connection.externalAccountId,
      externalEntityId: input.externalEntityId,
      entityName: input.entityName ?? before.name,
      verdictId: input.verdictId,
      actionType,
      status: AdActionStatus.failed,
      beforeState: before as unknown as Prisma.InputJsonValue,
      errorMessage: error instanceof Error ? error.message : "Action failed",
    });
    throw error;
  }
}

export async function undoAdAction(userId: string, actionLogId: string) {
  const log = await AdActionRepository.findByIdAndUser(actionLogId, userId);
  if (!log) throw new AppError("Action log not found", 404);
  if (log.status !== AdActionStatus.succeeded) throw new AppError("Only successful actions can be undone", 400);
  if (!log.undoUntil || log.undoUntil < new Date()) throw new AppError("Undo window has expired", 400);
  if (log.actionType !== AdActionType.increase_budget_20 && log.actionType !== AdActionType.decrease_budget_20) {
    throw new AppError("Only budget changes can be undone", 400);
  }

  const before = log.beforeState as unknown as EntityState;
  if (!before.dailyBudget) throw new AppError("Original budget is missing", 400);
  const connection = await refreshIfNeeded(log.connection);
  const undoBefore = await getEntityState(connection, log.externalEntityId);
  const after = await restoreBudget(connection, log.externalEntityId, before.dailyBudget);

  await AdActionRepository.update(log.id, {
    status: AdActionStatus.undone,
    undoneAt: new Date(),
    afterState: after as unknown as Prisma.InputJsonValue,
  });

  return AdActionRepository.create({
    userId,
    connectionId: connection.id,
    provider: connection.provider,
    externalAccountId: connection.externalAccountId,
    externalEntityId: log.externalEntityId,
    entityName: log.entityName,
    verdictId: log.verdictId,
    actionType: AdActionType.undo_budget_change,
    status: AdActionStatus.succeeded,
    beforeState: undoBefore as unknown as Prisma.InputJsonValue,
    afterState: after as unknown as Prisma.InputJsonValue,
  });
}

export async function listAdActionLogs(userId: string, limit = 50) {
  return AdActionRepository.findByUserId(userId, limit);
}

export async function updateActionGuardrail(userId: string, input: z.infer<typeof guardrailSchema>) {
  return IntegrationRepository.updateConnectionGuardrail(input.connectionId, userId, input.maxDailyBudgetChangePercent);
}
