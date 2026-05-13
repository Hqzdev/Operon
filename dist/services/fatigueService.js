"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFatigueCheckForAccount = runFatigueCheckForAccount;
exports.runFatigueChecksForDueAccounts = runFatigueChecksForDueAccounts;
exports.listFatigueAlerts = listFatigueAlerts;
exports.dismissFatigueAlert = dismissFatigueAlert;
exports.snoozeFatigueAlert = snoozeFatigueAlert;
const client_1 = require("@prisma/client");
const appError_1 = require("../utils/appError");
const integrationRepository_1 = require("../repositories/integrationRepository");
const fatigueRepository_1 = require("../repositories/fatigueRepository");
const notificationRepository_1 = require("../repositories/notificationRepository");
const CTR_WARNING_DROP = 20;
const CTR_CRITICAL_DROP = 35;
const CVR_WARNING_DROP = 20;
const FREQUENCY_WARNING_THRESHOLD = 3.5;
const IMPRESSION_STABLE_RATIO = 0.85;
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
function asNumber(value) {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(num) ? num : 0;
}
function round(value, precision = 2) {
    return Number(value.toFixed(precision));
}
function avg(values) {
    if (!values.length)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function pctDrop(previous, current) {
    if (previous <= 0)
        return 0;
    return ((previous - current) / previous) * 100;
}
function extractFrequency(metrics) {
    const data = asRecord(metrics);
    const direct = asNumber(data.frequency);
    if (direct > 0)
        return direct;
    const source = asRecord(data.source);
    const nested = asNumber(source.frequency);
    return nested > 0 ? nested : null;
}
function toPoint(snapshot) {
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
function evaluateFatigue(points) {
    const ordered = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
    const triggeredMetrics = [];
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
        if (cvrDrop >= CVR_WARNING_DROP &&
            previousImpressions > 0 &&
            currentImpressions >= previousImpressions * IMPRESSION_STABLE_RATIO) {
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
    if (!triggeredMetrics.length)
        return null;
    const ctrSignal = triggeredMetrics.find((metric) => metric.signal === "ctr_decay");
    const severity = (ctrSignal?.changePct ?? 0) >= CTR_CRITICAL_DROP || triggeredMetrics.length >= 2
        ? client_1.FatigueSeverity.critical
        : client_1.FatigueSeverity.warning;
    return { severity, triggeredMetrics };
}
async function runFatigueCheckForAccount(connectionId) {
    const connection = await integrationRepository_1.IntegrationRepository.findConnectionById(connectionId);
    if (!connection)
        return null;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 8);
    const snapshots = await integrationRepository_1.IntegrationRepository.findSnapshotsByConnection(connectionId, since);
    const byCreative = new Map();
    for (const snapshot of snapshots) {
        const bucket = byCreative.get(snapshot.externalEntityId) ?? [];
        bucket.push(snapshot);
        byCreative.set(snapshot.externalEntityId, bucket);
    }
    const alerts = [];
    for (const creativeSnapshots of byCreative.values()) {
        const latest = creativeSnapshots[creativeSnapshots.length - 1];
        const evaluation = evaluateFatigue(creativeSnapshots.map(toPoint));
        if (!evaluation || !latest)
            continue;
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
async function upsertFatigueAlert(input) {
    const existing = await fatigueRepository_1.FatigueRepository.findActiveForEntity(input.userId, input.provider, input.externalAccountId, input.externalEntityId, [client_1.FatigueAlertStatus.active, client_1.FatigueAlertStatus.snoozed]);
    const data = {
        connectionId: input.connectionId,
        creativeName: input.creativeName,
        severity: input.severity,
        triggeredMetrics: input.triggeredMetrics,
        detectedAt: new Date(),
    };
    const alert = existing
        ? await fatigueRepository_1.FatigueRepository.update(existing.id, data)
        : await fatigueRepository_1.FatigueRepository.create({
            userId: input.userId,
            connectionId: input.connectionId,
            provider: input.provider,
            externalAccountId: input.externalAccountId,
            externalEntityId: input.externalEntityId,
            creativeName: input.creativeName,
            severity: input.severity,
            triggeredMetrics: input.triggeredMetrics,
        });
    if (!existing || existing.severity !== input.severity) {
        await notificationRepository_1.NotificationRepository.create({
            userId: input.userId,
            title: "Creative fatigue likely detected",
            body: [
                `Ad: "${input.creativeName}"`,
                ...input.triggeredMetrics.map((metric) => metric.label),
                "Recommendation: Pause or refresh creative",
            ].join("\n"),
            type: "alert",
        });
    }
    return alert;
}
async function runFatigueChecksForDueAccounts(limit = 50) {
    const connections = await integrationRepository_1.IntegrationRepository.findConnectedAccounts({
        providers: [client_1.IntegrationProvider.META, client_1.IntegrationProvider.TIKTOK],
        status: client_1.IntegrationStatus.CONNECTED,
        limit,
    });
    const results = [];
    for (const connection of connections) {
        try {
            results.push(await runFatigueCheckForAccount(connection.id));
        }
        catch {
            results.push({ connectionId: connection.id, failed: true });
        }
    }
    return results.filter(Boolean);
}
async function listFatigueAlerts(userId, includeHistory = false) {
    const now = new Date();
    await fatigueRepository_1.FatigueRepository.wakeExpiredSnoozes(userId, now);
    return fatigueRepository_1.FatigueRepository.findByUser(userId, includeHistory);
}
async function dismissFatigueAlert(userId, alertId) {
    const alert = await fatigueRepository_1.FatigueRepository.findByIdAndUser(alertId, userId);
    if (!alert)
        throw new appError_1.AppError("Fatigue alert not found", 404);
    return fatigueRepository_1.FatigueRepository.update(alertId, {
        status: client_1.FatigueAlertStatus.dismissed,
        dismissedAt: new Date(),
        snoozeUntil: null,
    });
}
async function snoozeFatigueAlert(userId, alertId, days = 3) {
    const alert = await fatigueRepository_1.FatigueRepository.findByIdAndUser(alertId, userId);
    if (!alert)
        throw new appError_1.AppError("Fatigue alert not found", 404);
    const snoozeUntil = new Date();
    snoozeUntil.setUTCDate(snoozeUntil.getUTCDate() + Math.max(1, Math.min(days, 14)));
    return fatigueRepository_1.FatigueRepository.update(alertId, {
        status: client_1.FatigueAlertStatus.snoozed,
        snoozeUntil,
        dismissedAt: null,
    });
}
