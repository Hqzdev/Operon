"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndSendDigest = generateAndSendDigest;
exports.generateDigestsForAllUsers = generateDigestsForAllUsers;
const aiService_1 = require("./aiService");
const env_1 = require("../utils/env");
const userRepository_1 = require("../repositories/userRepository");
const analysisRepository_1 = require("../repositories/analysisRepository");
const fatigueRepository_1 = require("../repositories/fatigueRepository");
const notificationRepository_1 = require("../repositories/notificationRepository");
const digestRepository_1 = require("../repositories/digestRepository");
const confidenceRank = { low: 0, medium: 1, high: 2 };
const QUIET_TIER_DEFAULTS = {
    STARTER: { quietMinConfidence: "medium", quietMinSpendImpact: 0 },
    PRO: { quietMinConfidence: "medium", quietMinSpendImpact: 500 },
    SCALE: { quietMinConfidence: "high", quietMinSpendImpact: 1000 },
};
function confidenceScoreToLevel(score, fallback) {
    if (typeof score === "number") {
        if (score >= 75)
            return "high";
        if (score >= 50)
            return "medium";
        return "low";
    }
    return fallback === "high" || fallback === "medium" || fallback === "low" ? fallback : "low";
}
function passesQuietThresholds(result, settings) {
    if (!settings.quietModeEnabled)
        return true;
    const minConfidence = settings.quietMinConfidence === "high" || settings.quietMinConfidence === "medium" || settings.quietMinConfidence === "low"
        ? settings.quietMinConfidence
        : "medium";
    const level = confidenceScoreToLevel(result.decision?.confidenceScore, result.decision?.confidence);
    const spend = Number(result.derived?.spend ?? 0);
    return confidenceRank[level] >= confidenceRank[minConfidence] && spend >= settings.quietMinSpendImpact;
}
function shouldSendNoUrgentDigest(lastSent) {
    if (!lastSent)
        return true;
    return Date.now() - lastSent.getTime() >= 7 * 24 * 60 * 60 * 1000;
}
function readSpendImpact(metrics) {
    if (!metrics || typeof metrics !== "object")
        return 0;
    const values = metrics;
    return Number(values.spendImpact ?? values.dailySpend ?? values.spend ?? values.totalSpend ?? 0) || 0;
}
function quietDigestSummary(storeName, threshold) {
    return {
        title: `Nothing urgent — ${storeName || "Operon"}`,
        body: `Nothing crossed your ${threshold} threshold. Don't touch anything today.`,
        takeaways: [
            "No high-impact verdicts need action right now",
            "Quiet mode is filtering low-confidence noise",
            "Your time is better spent away from the dashboard today",
        ],
        actionItems: ["No action needed"],
        alert: null,
    };
}
async function generateDigestContent(storeUrl, storeName) {
    const prompt = `You are an e-commerce performance assistant. Generate a concise morning digest for an online store owner.

Store: ${storeName || storeUrl}
Store URL: ${storeUrl}
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

Return ONLY a JSON object:
{
  "title": "Morning Digest — <store name>",
  "body": "1-2 sentence summary of what to focus on today",
  "takeaways": ["key takeaway 1 from yesterday", "key takeaway 2", "key takeaway 3"],
  "actionItems": ["specific action 1", "specific action 2", "specific action 3"],
  "alert": "critical alert if something needs urgent attention, or null if nothing urgent"
}`;
    try {
        return await (0, aiService_1.completeGigaChatJson)("digest", "You are a strict e-commerce analyst. Return valid JSON only. No markdown. No text outside the JSON.", prompt);
    }
    catch {
        return {
            title: `Morning Digest — ${storeName || storeUrl}`,
            body: "Start your day with a quick review of your store's key metrics and plan your top priorities.",
            takeaways: [
                "Review your conversion rate trends from yesterday",
                "Check ad spend efficiency and ROAS",
                "Monitor cart abandonment patterns",
            ],
            actionItems: [
                "Audit your top-performing ad creatives",
                "Review any customer support tickets from yesterday",
                "Check inventory levels for bestsellers",
            ],
            alert: null,
        };
    }
}
function buildEmailHtml(summary, recipientName) {
    const alertBlock = summary.alert
        ? `<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
        <strong style="color:#856404;">⚠ Alert:</strong>
        <span style="color:#856404;"> ${summary.alert}</span>
       </div>`
        : "";
    const takeawaysHtml = summary.takeaways
        .map((t) => `<li style="margin:6px 0;color:#374151;">${t}</li>`)
        .join("");
    const actionsHtml = summary.actionItems
        .map((a) => `<li style="margin:6px 0;color:#374151;">${a}</li>`)
        .join("");
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#000000;padding:20px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Operon</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Morning Digest</p>
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${summary.title}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Hi ${recipientName || "there"},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${summary.body}</p>

            ${alertBlock}

            <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#111827;">Yesterday's Key Takeaways</h2>
            <ul style="margin:0 0 24px;padding-left:20px;">${takeawaysHtml}</ul>

            <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">Today's Action Items</h2>
            <ul style="margin:0 0 24px;padding-left:20px;">${actionsHtml}</ul>

            <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:8px;">
              <a href="${env_1.env.NEXT_PUBLIC_APP_URL}/dashboard/notifications"
                 style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:500;">
                View in Operon →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you have a morning digest enabled in Operon.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
let mailerTransport = null;
async function getTransport() {
    if (!mailerTransport) {
        const nodemailer = await Promise.resolve().then(() => __importStar(require("nodemailer")));
        mailerTransport = nodemailer.createTransport({
            host: env_1.env.SMTP_HOST,
            port: env_1.env.SMTP_PORT,
            secure: env_1.env.SMTP_PORT === 465,
            auth: env_1.env.SMTP_USER
                ? { user: env_1.env.SMTP_USER, pass: env_1.env.SMTP_PASS }
                : undefined,
        });
    }
    return mailerTransport;
}
async function generateAndSendDigest(userId) {
    const user = await userRepository_1.UserRepository.findDigestFields(userId);
    if (!user)
        throw new Error(`User ${userId} not found`);
    const storeUrl = user.storeUrl ?? user.email;
    const storeName = user.storeName ?? "";
    const tierDefaults = QUIET_TIER_DEFAULTS[user.plan];
    const settings = {
        quietModeEnabled: user.quietModeEnabled,
        quietMinConfidence: user.quietMinConfidence || tierDefaults.quietMinConfidence,
        quietMinSpendImpact: user.quietMinSpendImpact >= 0 ? user.quietMinSpendImpact : tierDefaults.quietMinSpendImpact,
        quietNoUrgentDigestAt: user.quietNoUrgentDigestAt,
    };
    const recentAnalyses = await analysisRepository_1.AnalysisRepository.findRecentResults(userId, 20);
    const urgentAnalyses = recentAnalyses.filter((analysis) => passesQuietThresholds(analysis.result, settings));
    const thresholdText = `${settings.quietMinConfidence || "medium"} confidence / ₽${Math.round(settings.quietMinSpendImpact || 0)}`;
    if (settings.quietModeEnabled && urgentAnalyses.length === 0) {
        if (!shouldSendNoUrgentDigest(settings.quietNoUrgentDigestAt)) {
            return quietDigestSummary(storeName, thresholdText);
        }
        const summary = quietDigestSummary(storeName, thresholdText);
        await userRepository_1.UserRepository.update(userId, { quietNoUrgentDigestAt: new Date() });
        await notificationRepository_1.NotificationRepository.create({
            userId,
            title: summary.title,
            body: summary.body,
            type: "digest",
        });
        await digestRepository_1.DigestRepository.create(userId, summary);
        if (env_1.env.SMTP_USER) {
            const transport = await getTransport();
            await transport.sendMail({
                from: env_1.env.SMTP_FROM,
                to: user.email,
                subject: summary.title,
                html: buildEmailHtml(summary, user.name ?? ""),
            }).catch((err) => console.error(`[digest] Quiet email delivery failed for ${userId}:`, err));
        }
        return summary;
    }
    const summary = await generateDigestContent(storeUrl, storeName);
    const fatigueAlerts = await fatigueRepository_1.FatigueRepository.findActiveAlerts(userId, 10);
    const visibleFatigueAlerts = settings.quietModeEnabled
        ? fatigueAlerts.filter((alert) => readSpendImpact(alert.triggeredMetrics) >= settings.quietMinSpendImpact)
        : fatigueAlerts;
    if (visibleFatigueAlerts.length > 0) {
        const fatigueSummary = visibleFatigueAlerts
            .slice(0, 3)
            .map((alert) => `Creative fatigue: ${alert.creativeName}`)
            .join("; ");
        summary.alert = summary.alert ? `${summary.alert} ${fatigueSummary}` : fatigueSummary;
    }
    await notificationRepository_1.NotificationRepository.create({
        userId,
        title: summary.title,
        body: [
            summary.body,
            "",
            "Takeaways:",
            ...summary.takeaways.map((t) => `• ${t}`),
            "",
            "Action items:",
            ...summary.actionItems.map((a) => `• ${a}`),
            ...(summary.alert ? ["", `⚠ Alert: ${summary.alert}`] : []),
        ].join("\n"),
        type: "digest",
    });
    await digestRepository_1.DigestRepository.create(userId, summary);
    if (env_1.env.SMTP_USER) {
        try {
            const transport = await getTransport();
            await transport.sendMail({
                from: env_1.env.SMTP_FROM,
                to: user.email,
                subject: summary.title,
                html: buildEmailHtml(summary, user.name ?? ""),
            });
        }
        catch (err) {
            console.error(`[digest] Email delivery failed for ${userId}:`, err);
        }
    }
    return summary;
}
async function generateDigestsForAllUsers() {
    const users = await digestRepository_1.DigestRepository.findUsersForDigest();
    console.log(`[digest] Running morning digest for ${users.length} users`);
    await Promise.allSettled(users.map((u) => generateAndSendDigest(u.id).catch((err) => console.error(`[digest] Failed for user ${u.id}:`, err))));
}
