import {
  FatigueAlertStatus,
  FatigueSeverity,
  IntegrationProvider,
  IntegrationStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

const CTR_WARNING_DROP = 20;
const CTR_CRITICAL_DROP = 35;
const CVR_WARNING_DROP = 20;
const FREQUENCY_WARNING_THRESHOLD = 3.5;
const IMPRESSION_STABLE_RATIO = 0.85;

type MetricPoint = {
  date: Date;
  ctr: number;
  cpc: number;
  impressions: number;
  clicks: number;
  purchases: number;
  conversionRate: number;
  frequency: number | null;
};

type TriggeredMetric = {
  signal: "ctr_decay" | "cpc_rising" | "frequency_high" | "conversion_rate_drop";
  label: string;
  value: number;
  previousValue?: number;
  changePct?: number;
  windowDays?: number;
};

type FatigueEvaluation = {
  severity: FatigueSeverity;
  triggeredMetrics: TriggeredMetric[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function round(value: number, precision = 2): number {
  return Number(value.toFixed(precision));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pctDrop(previous: number, current: number): number {
  if (previous <= 0) return 0;
  return ((previous - current) / previous) * 100;
}

function extractFrequency(metrics: unknown): number | null {
  const data = asRecord(metrics);
  const direct = asNumber(data.frequency);
  if (direct > 0) return direct;

  const source = asRecord(data.source);
  const nested = asNumber(source.frequency);
  return nested > 0 ? nested : null;
}

function toPoint(snapshot: {
  date: Date;
  metrics: Prisma.JsonValue;
  analysisInput: Prisma.JsonValue;
}): MetricPoint {
  const input = asRecord(snapshot.analysisInput);
  const impressions = asNumber(input.impressions);
  const clicks = asNumber(input.clicks);
  const purchases = asNumber(input.purchases);

  return {
    date: snapshot.date,
    ctr: asNumber(input.ctr),
    cpc: asNumber(input.cpc),
    impressions,
    clicks,
    purchases,
    conversionRate: clicks > 0 ? (purchases / clicks) * 100 : 0,
    frequency: extractFrequency(snapshot.metrics),
  };
}

function evaluateFatigue(points: MetricPoint[]): FatigueEvaluation | null {
  const ordered = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const triggeredMetrics: TriggeredMetric[] = [];

  if (ordered.length >= 6) {
    const previousWindow = ordered.slice(-6, -3);
    const currentWindow = ordered.slice(-3);
    const previousCtr = avg(previousWindow.map((p) => p.ctr));
    const currentCtr = avg(currentWindow.map((p) => p.ctr));
    const drop = pctDrop(previousCtr, currentCtr);

    if (drop >= CTR_WARNING_DROP) {
      triggeredMetrics.push({
        signal: "ctr_decay",
        label: `CTR down ${round(drop, 0)}% over 3 days`,
        value: round(currentCtr),
        previousValue: round(previousCtr),
        changePct: round(drop, 0),
        windowDays: 3,
      });
    }

    const previousCvr = avg(previousWindow.map((p) => p.conversionRate));
    const currentCvr = avg(currentWindow.map((p) => p.conversionRate));
    const cvrDrop = pctDrop(previousCvr, currentCvr);
    const previousImpressions = previousWindow.reduce((sum, p) => sum + p.impressions, 0);
    const currentImpressions = currentWindow.reduce((sum, p) => sum + p.impressions, 0);

    if (
      cvrDrop >= CVR_WARNING_DROP &&
      previousImpressions > 0 &&
      currentImpressions >= previousImpressions * IMPRESSION_STABLE_RATIO
    ) {
      triggeredMetrics.push({
        signal: "conversion_rate_drop",
        label: `Conversion rate down ${round(cvrDrop, 0)}% while impressions held steady`,
        value: round(currentCvr),
        previousValue: round(previousCvr),
        changePct: round(cvrDrop, 0),
        windowDays: 3,
      });
    }
  }

  if (ordered.length >= 4) {
    const recentCpc = ordered.slice(-4).map((p) => p.cpc);
    const rising = recentCpc.every((value, index) => index === 0 || value > recentCpc[index - 1]);
    if (rising && recentCpc[0] > 0) {
      const increase = ((recentCpc[recentCpc.length - 1] - recentCpc[0]) / recentCpc[0]) * 100;
      triggeredMetrics.push({
        signal: "cpc_rising",
        label: `CPC up ${round(increase, 0)}% with 3 consecutive daily increases`,
        value: round(recentCpc[recentCpc.length - 1]),
        previousValue: round(recentCpc[0]),
        changePct: round(increase, 0),
        windowDays: 4,
      });
    }
  }

  const latestWithFrequency = [...ordered].reverse().find((point) => point.frequency !== null);
  if (latestWithFrequency?.frequency && latestWithFrequency.frequency > FREQUENCY_WARNING_THRESHOLD) {
    triggeredMetrics.push({
      signal: "frequency_high",
      label: `Frequency: ${round(latestWithFrequency.frequency, 1)}`,
      value: round(latestWithFrequency.frequency, 1),
    });
  }

  if (!triggeredMetrics.length) return null;

  const ctrSignal = triggeredMetrics.find((metric) => metric.signal === "ctr_decay");
  const severity =
    (ctrSignal?.changePct ?? 0) >= CTR_CRITICAL_DROP || triggeredMetrics.length >= 2
      ? FatigueSeverity.critical
      : FatigueSeverity.warning;

  return { severity, triggeredMetrics };
}

export async function runFatigueCheckForAccount(connectionId: string) {
  const connection = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      userId: true,
      provider: true,
      externalAccountId: true,
    },
  });
  if (!connection) return null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 8);

  const snapshots = await prisma.integrationMetricSnapshot.findMany({
    where: {
      connectionId,
      date: { gte: since },
    },
    orderBy: [{ externalEntityId: "asc" }, { date: "asc" }],
  });

  const byCreative = new Map<string, typeof snapshots>();
  for (const snapshot of snapshots) {
    const bucket = byCreative.get(snapshot.externalEntityId) ?? [];
    bucket.push(snapshot);
    byCreative.set(snapshot.externalEntityId, bucket);
  }

  const alerts = [];
  for (const creativeSnapshots of byCreative.values()) {
    const latest = creativeSnapshots[creativeSnapshots.length - 1];
    const evaluation = evaluateFatigue(creativeSnapshots.map(toPoint));
    if (!evaluation || !latest) continue;

    alerts.push(await upsertFatigueAlert({
      userId: connection.userId,
      connectionId: connection.id,
      provider: connection.provider,
      externalAccountId: connection.externalAccountId,
      externalEntityId: latest.externalEntityId,
      creativeName: latest.entityName ?? latest.externalEntityId,
      severity: evaluation.severity,
      triggeredMetrics: evaluation.triggeredMetrics,
    }));
  }

  return { connectionId, alerts: alerts.length };
}

async function upsertFatigueAlert(input: {
  userId: string;
  connectionId: string;
  provider: IntegrationProvider;
  externalAccountId: string;
  externalEntityId: string;
  creativeName: string;
  severity: FatigueSeverity;
  triggeredMetrics: TriggeredMetric[];
}) {
  const existing = await prisma.fatigueAlert.findFirst({
    where: {
      userId: input.userId,
      provider: input.provider,
      externalAccountId: input.externalAccountId,
      externalEntityId: input.externalEntityId,
      status: { in: [FatigueAlertStatus.active, FatigueAlertStatus.snoozed] },
    },
    orderBy: { detectedAt: "desc" },
  });

  const data = {
    connectionId: input.connectionId,
    creativeName: input.creativeName,
    severity: input.severity,
    triggeredMetrics: input.triggeredMetrics as unknown as Prisma.InputJsonValue,
    detectedAt: new Date(),
  };

  const alert = existing
    ? await prisma.fatigueAlert.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.fatigueAlert.create({
        data: {
          userId: input.userId,
          provider: input.provider,
          externalAccountId: input.externalAccountId,
          externalEntityId: input.externalEntityId,
          ...data,
        },
      });

  if (!existing || existing.severity !== input.severity) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: "Creative fatigue likely detected",
        body: [
          `Ad: "${input.creativeName}"`,
          ...input.triggeredMetrics.map((metric) => metric.label),
          "Recommendation: Pause or refresh creative",
        ].join("\n"),
        type: "alert",
      },
    });
  }

  return alert;
}

export async function runFatigueChecksForDueAccounts(limit = 50) {
  const connections = await prisma.integrationConnection.findMany({
    where: {
      provider: { in: [IntegrationProvider.META, IntegrationProvider.TIKTOK] },
      status: IntegrationStatus.CONNECTED,
      lastSyncedAt: { not: null },
    },
    select: { id: true },
    orderBy: { lastSyncedAt: "desc" },
    take: limit,
  });

  const results = [];
  for (const connection of connections) {
    try {
      results.push(await runFatigueCheckForAccount(connection.id));
    } catch {
      results.push({ connectionId: connection.id, failed: true });
    }
  }
  return results.filter(Boolean);
}

export async function listFatigueAlerts(userId: string, includeHistory = false) {
  const now = new Date();

  await prisma.fatigueAlert.updateMany({
    where: {
      userId,
      status: FatigueAlertStatus.snoozed,
      snoozeUntil: { lte: now },
    },
    data: { status: FatigueAlertStatus.active, snoozeUntil: null },
  });

  return prisma.fatigueAlert.findMany({
    where: includeHistory
      ? { userId }
      : {
          userId,
          status: FatigueAlertStatus.active,
        },
    orderBy: [{ status: "asc" }, { severity: "desc" }, { detectedAt: "desc" }],
    take: includeHistory ? 100 : 10,
  });
}

export async function dismissFatigueAlert(userId: string, alertId: string) {
  const alert = await prisma.fatigueAlert.findFirst({ where: { id: alertId, userId } });
  if (!alert) throw new AppError("Fatigue alert not found", 404);

  return prisma.fatigueAlert.update({
    where: { id: alertId },
    data: {
      status: FatigueAlertStatus.dismissed,
      dismissedAt: new Date(),
      snoozeUntil: null,
    },
  });
}

export async function snoozeFatigueAlert(userId: string, alertId: string, days = 3) {
  const alert = await prisma.fatigueAlert.findFirst({ where: { id: alertId, userId } });
  if (!alert) throw new AppError("Fatigue alert not found", 404);

  const snoozeUntil = new Date();
  snoozeUntil.setUTCDate(snoozeUntil.getUTCDate() + Math.max(1, Math.min(days, 14)));

  return prisma.fatigueAlert.update({
    where: { id: alertId },
    data: {
      status: FatigueAlertStatus.snoozed,
      snoozeUntil,
      dismissedAt: null,
    },
  });
}
