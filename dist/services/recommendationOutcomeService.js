"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRecommendationOutcomes = recordRecommendationOutcomes;
exports.recomputeDueRecommendationOutcomes = recomputeDueRecommendationOutcomes;
exports.getRecommendationTrackRecord = getRecommendationTrackRecord;
exports.confidenceAdjustmentFromAccuracy = confidenceAdjustmentFromAccuracy;
exports.getUserConfidenceCalibration = getUserConfidenceCalibration;
const analysis_schema_1 = require("../../lib/analysis-schema");
const integrationRepository_1 = require("../repositories/integrationRepository");
const recommendationOutcomeRepository_1 = require("../repositories/recommendationOutcomeRepository");
const HORIZONS = [7, 14, 30];
function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
function round(value, precision = 2) {
    return Number(value.toFixed(precision));
}
function asNumber(value) {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(num) ? num : 0;
}
function normalize(value) {
    return (value ?? "").trim().toLowerCase();
}
async function findMatchingSnapshot(userId, payload) {
    const snapshots = await integrationRepository_1.IntegrationRepository.findRecentSnapshotsForMatching(userId, 75);
    const productName = normalize(payload.product_name);
    return snapshots.find((snapshot) => {
        const entityName = normalize(snapshot.entityName);
        const externalEntityId = normalize(snapshot.externalEntityId);
        const parsed = analysis_schema_1.analysisInputSchema.safeParse(snapshot.analysisInput);
        const snapshotProductName = parsed.success ? normalize(parsed.data.product_name) : "";
        return Boolean(productName) && (entityName === productName ||
            externalEntityId === productName ||
            snapshotProductName === productName);
    }) ?? snapshots[0] ?? null;
}
async function recordRecommendationOutcomes(userId, analysisId, payload, result, issuedAt = new Date()) {
    const snapshot = await findMatchingSnapshot(userId, payload);
    const confidence = typeof result.decision.confidenceScore === "number"
        ? result.decision.confidenceScore
        : result.decision.confidence === "high"
            ? 85
            : result.decision.confidence === "medium"
                ? 65
                : 35;
    for (const horizon of HORIZONS) {
        await recommendationOutcomeRepository_1.RecommendationOutcomeRepository.insertIfNotExists({
            userId,
            analysisId,
            connectionId: snapshot?.connectionId ?? null,
            provider: snapshot?.provider ?? null,
            externalAccountId: snapshot?.externalAccountId ?? null,
            externalEntityId: snapshot?.externalEntityId ?? null,
            entityName: snapshot?.entityName ?? payload.product_name ?? null,
            inputSnapshot: JSON.stringify(payload),
            verdict: result.decision.finalDecision,
            confidence,
            breakEvenRoas: result.derived.breakEvenRoas,
            breakEvenCpa: result.derived.breakEvenCpa,
            horizon,
            scheduledFor: addDays(issuedAt, horizon),
            issuedAt,
        });
    }
}
function summarizeActuals(inputs, breakEvenRoas) {
    const spend = inputs.reduce((sum, input) => sum + input.cpc * input.clicks, 0);
    const revenue = inputs.reduce((sum, input) => sum + input.revenue, 0);
    const purchases = inputs.reduce((sum, input) => sum + input.purchases, 0);
    const clicks = inputs.reduce((sum, input) => sum + input.clicks, 0);
    const impressions = inputs.reduce((sum, input) => sum + input.impressions, 0);
    const cost = inputs.reduce((sum, input) => sum + input.cost * input.purchases, 0);
    const profit = revenue - spend - cost;
    const roas = spend > 0 ? revenue / spend : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;
    const wastedSpend = Math.max(0, spend - (breakEvenRoas > 0 ? revenue / breakEvenRoas : revenue));
    return {
        spend: round(spend),
        revenue: round(revenue),
        purchases,
        clicks,
        impressions,
        profit: round(profit),
        roas: round(roas),
        ctr: round(ctr),
        conversionRate: round(conversionRate),
        wastedSpend: round(wastedSpend),
    };
}
function judgeOutcome(verdict, actual, breakEvenRoas) {
    if (verdict === "KILL") {
        return {
            wasRight: actual.roas < breakEvenRoas || actual.profit < 0,
            moneySaved: actual.roas < breakEvenRoas ? actual.wastedSpend : 0,
            moneyEarned: 0,
        };
    }
    if (verdict === "SCALE") {
        return {
            wasRight: actual.roas >= breakEvenRoas && actual.profit > 0,
            moneySaved: 0,
            moneyEarned: actual.roas >= breakEvenRoas ? Math.max(0, actual.profit) : 0,
        };
    }
    if (verdict === "FIX") {
        const stillWeak = actual.roas < breakEvenRoas || actual.ctr < 1;
        return {
            wasRight: stillWeak,
            moneySaved: stillWeak ? Math.max(0, actual.wastedSpend) : 0,
            moneyEarned: 0,
        };
    }
    const clearlyBad = actual.roas < breakEvenRoas * 0.6 && actual.spend > 0;
    const clearlyGood = actual.roas >= breakEvenRoas * 1.25 && actual.profit > 0;
    return {
        wasRight: !clearlyBad && !clearlyGood,
        moneySaved: 0,
        moneyEarned: 0,
    };
}
async function recomputeDueRecommendationOutcomes(limit = 100) {
    const due = await recommendationOutcomeRepository_1.RecommendationOutcomeRepository.findDue(limit);
    let evaluated = 0;
    let unavailable = 0;
    for (const outcome of due) {
        if (!outcome.connectionId || !outcome.externalEntityId) {
            await recommendationOutcomeRepository_1.RecommendationOutcomeRepository.markUnavailable(outcome.id);
            unavailable += 1;
            continue;
        }
        const end = addDays(outcome.issuedAt, outcome.evaluationHorizonDays);
        const snapshots = await integrationRepository_1.IntegrationRepository.findSnapshotsByConnectionAndEntity({
            connectionId: outcome.connectionId,
            externalEntityId: outcome.externalEntityId,
            since: outcome.issuedAt,
            until: end,
        });
        const inputs = [];
        for (const snapshot of snapshots) {
            const parsed = analysis_schema_1.analysisInputSchema.safeParse(snapshot.analysisInput);
            if (parsed.success)
                inputs.push(parsed.data);
        }
        if (!inputs.length) {
            if (Date.now() > outcome.scheduledFor.getTime() + 3 * 24 * 60 * 60 * 1000) {
                await recommendationOutcomeRepository_1.RecommendationOutcomeRepository.markUnavailable(outcome.id);
                unavailable += 1;
            }
            continue;
        }
        const actual = summarizeActuals(inputs, outcome.breakEvenRoas);
        const judgment = judgeOutcome(outcome.verdict, actual, outcome.breakEvenRoas);
        await recommendationOutcomeRepository_1.RecommendationOutcomeRepository.markEvaluated(outcome.id, actual, judgment.wasRight, round(judgment.moneySaved), round(judgment.moneyEarned));
        evaluated += 1;
    }
    return { evaluated, unavailable, checked: due.length };
}
async function getRecommendationTrackRecord(userId) {
    const since = addDays(new Date(), -60);
    const row = await recommendationOutcomeRepository_1.RecommendationOutcomeRepository.getAggregate(userId, since);
    const evaluatedCount = Number(row?.evaluated_count ?? 0);
    const correctCount = Number(row?.correct_count ?? 0);
    const accuracyPct = evaluatedCount > 0 ? Math.round((correctCount / evaluatedCount) * 100) : null;
    const recent = await recommendationOutcomeRepository_1.RecommendationOutcomeRepository.getRecent(userId, 8);
    return {
        accuracyPct,
        evaluatedCount,
        pendingCount: Number(row?.pending_count ?? 0),
        moneySaved: round(asNumber(row?.money_saved)),
        moneyEarned: round(asNumber(row?.money_earned)),
        calibrationAdjustment: confidenceAdjustmentFromAccuracy(accuracyPct, evaluatedCount),
        recent: recent.map((item) => ({
            ...item,
            issuedAt: new Date(item.issuedAt).toISOString(),
            evaluatedAt: item.evaluatedAt ? new Date(item.evaluatedAt).toISOString() : null,
        })),
    };
}
function confidenceAdjustmentFromAccuracy(accuracyPct, evaluatedCount) {
    if (accuracyPct === null || evaluatedCount < 5)
        return 0;
    if (accuracyPct >= 80)
        return 8;
    if (accuracyPct >= 70)
        return 5;
    if (accuracyPct >= 60)
        return 2;
    if (accuracyPct < 45)
        return -10;
    if (accuracyPct < 55)
        return -5;
    return 0;
}
async function getUserConfidenceCalibration(userId) {
    const summary = await getRecommendationTrackRecord(userId);
    return {
        accuracyPct: summary.accuracyPct,
        evaluatedCount: summary.evaluatedCount,
        adjustment: summary.calibrationAdjustment,
    };
}
