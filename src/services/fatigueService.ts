import {
  FatigueAlertStatus,
  FatigueSeverity,
  IntegrationProvider,
  IntegrationStatus,
  type Prisma,
} from "@prisma/client";
import { AppError } from "../utils/appError";
import { IntegrationRepository } from "../repositories/integrationRepository";
import { FatigueRepository } from "../repositories/fatigueRepository";
import { NotificationRepository } from "../repositories/notificationRepository";

const CTR_WARNING_DROP = 20;
const CTR_CRITICAL_DROP = 35;
const CVR_WARNING_DROP = 20;
const FREQUENCY_WARNING_THRESHOLD = 3.5;
const IMPRESSION_STABLE_RATIO = 0.85;
const BUDGET_STABLE_RATIO = 0.1;

type MetricPoint = {
  date: Date;
  ctr: number;
  cpc: number;
  impressions: number;
  clicks: number;
  spend: number;
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
  fatigueStartedAt?: string;
  budgetChangePct?: number;
  rotationStrategies?: string[];
};

type FatigueEvaluation = {
  severity: FatigueSeverity;
  triggeredMetrics: TriggeredMetric[];
  recommendation: string;
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

function pctChange(previous: number, current: number): number {
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rotationStrategies(drop: number): string[] {
  const base = [
    "Rotate in a new opening hook for the same product angle",
    "Swap the first 3 seconds or primary image while keeping the winning offer",
    "Refresh the audience proof: new UGC, review, or before-after claim",
  ];

  if (drop >= CTR_CRITICAL_DROP) {
    return [
      "Pause the fatigued creative and launch a fresh concept today",
      "Keep the offer, but test a new visual pattern and first-line hook",
      "Duplicate the ad set with 2-3 new creatives instead of raising budget",
    ];
  }

  return base;
}

function findFatigueStart(window: MetricPoint[]): Date {
  for (let index = 1; index < window.length; index += 1) {
    if (window[index].ctr < window[index - 1].ctr) return window[index].date;
  }
  return window[window.length - 1]?.date ?? new Date();
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
  const spend = asNumber(input.total_spend) || asNumber(input.cpc) * clicks;

  return {
    date: snapshot.date,
    ctr: asNumber(input.ctr),
    cpc: asNumber(input.cpc),
    impressions,
    clicks,
    spend,
    purchases,
    conversionRate: clicks > 0 ? (purchases / clicks) * 100 : 0,
    frequency: extractFrequency(snapshot.metrics),
  };
}

function evaluateFatigue(points: MetricPoint[]): FatigueEvaluation | null {
  const ordered = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const triggeredMetrics: TriggeredMetric[] = [];

  if (ordered.length >= 4) {
    const ctrDropSignals: TriggeredMetric[] = [];

    for (let index = 3; index < ordered.length; index += 1) {
      const baseline = ordered[index - 3];
      const current = ordered[index];
      const window = ordered.slice(index - 3, index + 1);
      const currentBudget = avg(window.slice(1).map((point) => point.spend));
      const budgetChange = pctChange(baseline.spend, currentBudget);
      const sameBudget = baseline.spend > 0 && Math.abs(budgetChange) <= BUDGET_STABLE_RATIO * 100;
      const drop = pctDrop(baseline.ctr, current.ctr);

      if (sameBudget && drop >= CTR_WARNING_DROP) {
        const fatigueStartedAt = findFatigueStart(window);
        ctrDropSignals.push({
          signal: "ctr_decay",
          label: `Creative is fatiguing: CTR dropped ${round(drop, 0)}% in 3 days at the same budget`,
          value: round(current.ctr),
          previousValue: round(baseline.ctr),
          changePct: round(drop, 0),
          windowDays: 3,
          fatigueStartedAt: isoDay(fatigueStartedAt),
          budgetChangePct: round(budgetChange, 1),
          rotationStrategies: rotationStrategies(drop),
        });
      }
    }

    const strongestCtrDrop = ctrDropSignals.sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))[0];
    if (strongestCtrDrop) triggeredMetrics.push(strongestCtrDrop);
  }

  if (ordered.length >= 6) {
    const previousWindow = ordered.slice(-6, -3);
    const currentWindow = ordered.slice(-3);
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

  const recommendation = ctrSignal?.rotationStrategies?.length
    ? `Rotate creative. Start with: ${ctrSignal.rotationStrategies[0]}.`
    : "Pause or refresh creative";

  return { severity, triggeredMetrics, recommendation };
}

export async function runFatigueCheckForAccount(connectionId: string) {
  const connection = await IntegrationRepository.findConnectionById(connectionId);
  if (!connection) return null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 8);

  const snapshots = await IntegrationRepository.findSnapshotsByConnection(connectionId, since);

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
      recommendation: evaluation.recommendation,
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
  recommendation: string;
}) {
  const existing = await FatigueRepository.findActiveForEntity(
    input.userId,
    input.provider,
    input.externalAccountId,
    input.externalEntityId,
    [FatigueAlertStatus.active, FatigueAlertStatus.snoozed],
  );

  const data = {
    connectionId: input.connectionId,
    creativeName: input.creativeName,
    severity: input.severity,
    triggeredMetrics: input.triggeredMetrics as unknown as Prisma.InputJsonValue,
    recommendation: input.recommendation,
    detectedAt: new Date(),
  };

  const alert = existing
    ? await FatigueRepository.update(existing.id, data)
    : await FatigueRepository.create({
        userId: input.userId,
        connectionId: input.connectionId,
        provider: input.provider,
        externalAccountId: input.externalAccountId,
        externalEntityId: input.externalEntityId,
        creativeName: input.creativeName,
        severity: input.severity,
        triggeredMetrics: input.triggeredMetrics as unknown as Prisma.InputJsonValue,
        recommendation: input.recommendation,
      });

  if (!existing || existing.severity !== input.severity) {
    await NotificationRepository.create({
      userId: input.userId,
      title: "Creative fatigue likely detected",
      body: [
        `Ad: "${input.creativeName}"`,
        ...input.triggeredMetrics.map((metric) => metric.label),
        `Recommendation: ${input.recommendation}`,
      ].join("\n"),
      type: "alert",
    });
  }

  return alert;
}

export async function runFatigueChecksForDueAccounts(limit = 50) {
  const connections = await IntegrationRepository.findConnectedAccounts({
    providers: [IntegrationProvider.META, IntegrationProvider.TIKTOK],
    status: IntegrationStatus.CONNECTED,
    limit,
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
  await FatigueRepository.wakeExpiredSnoozes(userId, now);
  return FatigueRepository.findByUser(userId, includeHistory);
}

export async function dismissFatigueAlert(userId: string, alertId: string) {
  const alert = await FatigueRepository.findByIdAndUser(alertId, userId);
  if (!alert) throw new AppError("Fatigue alert not found", 404);

  return FatigueRepository.update(alertId, {
    status: FatigueAlertStatus.dismissed,
    dismissedAt: new Date(),
    snoozeUntil: null,
  });
}

export async function snoozeFatigueAlert(userId: string, alertId: string, days = 3) {
  const alert = await FatigueRepository.findByIdAndUser(alertId, userId);
  if (!alert) throw new AppError("Fatigue alert not found", 404);

  const snoozeUntil = new Date();
  snoozeUntil.setUTCDate(snoozeUntil.getUTCDate() + Math.max(1, Math.min(days, 14)));

  return FatigueRepository.update(alertId, {
    status: FatigueAlertStatus.snoozed,
    snoozeUntil,
    dismissedAt: null,
  });
}
