import crypto from "crypto";
import { UserPlan } from "@prisma/client";
import { env } from "../utils/env";
import { UserRepository } from "../repositories/userRepository";
import { AnalysisRepository } from "../repositories/analysisRepository";
import { FatigueRepository } from "../repositories/fatigueRepository";
import { NotificationRepository } from "../repositories/notificationRepository";
import { DigestRepository } from "../repositories/digestRepository";
import { getSeasonContext } from "../lib/seasonality";

export interface DigestSummary {
  title: string;
  body: string;
  takeaways: string[];
  actionItems: string[];
  alert: string | null;
  bestProduct?: ProductPerformanceSummary | null;
  worstProduct?: ProductPerformanceSummary | null;
  confidenceChanges?: ConfidenceChangeSummary[];
  seasonalForecast?: SeasonalForecastSummary[];
}

type ProductPerformanceSummary = {
  name: string;
  currentRoas: number;
  previousRoas: number | null;
  deltaRoas: number;
  confidenceScore: number | null;
  decision: string | null;
};

type ConfidenceChangeSummary = {
  name: string;
  currentScore: number | null;
  previousScore: number | null;
  delta: number | null;
};

type SeasonalForecastSummary = {
  weekStart: string;
  label: string;
  confidenceBonus: number;
  conversionMultiplier: number;
  cpmMultiplier: number;
  note: string | null;
};

const confidenceRank = { low: 0, medium: 1, high: 2 } as const;

type QuietSettings = {
  quietModeEnabled: boolean;
  quietMinConfidence: string;
  quietMinSpendImpact: number;
  quietNoUrgentDigestAt: Date | null;
};

const QUIET_TIER_DEFAULTS: Record<UserPlan, Pick<QuietSettings, "quietMinConfidence" | "quietMinSpendImpact">> = {
  STARTER: { quietMinConfidence: "medium", quietMinSpendImpact: 0 },
  PRO: { quietMinConfidence: "medium", quietMinSpendImpact: 500 },
  SCALE: { quietMinConfidence: "high", quietMinSpendImpact: 1000 },
};

function confidenceScoreToLevel(score?: number, fallback?: string) {
  if (typeof score === "number") {
    if (score >= 75) return "high";
    if (score >= 50) return "medium";
    return "low";
  }
  return fallback === "high" || fallback === "medium" || fallback === "low" ? fallback : "low";
}

function passesQuietThresholds(
  result: { decision?: { confidence?: string; confidenceScore?: number }; derived?: { spend?: number } },
  settings: QuietSettings,
) {
  if (!settings.quietModeEnabled) return true;
  const minConfidence = settings.quietMinConfidence === "high" || settings.quietMinConfidence === "medium" || settings.quietMinConfidence === "low"
    ? settings.quietMinConfidence
    : "medium";
  const level = confidenceScoreToLevel(result.decision?.confidenceScore, result.decision?.confidence);
  const spend = Number(result.derived?.spend ?? 0);
  return confidenceRank[level] >= confidenceRank[minConfidence] && spend >= settings.quietMinSpendImpact;
}

function shouldSendNoUrgentDigest(lastSent: Date | null) {
  if (!lastSent) return true;
  return Date.now() - lastSent.getTime() >= 7 * 24 * 60 * 60 * 1000;
}

function readSpendImpact(metrics: unknown) {
  if (!metrics || typeof metrics !== "object") return 0;
  const values = metrics as { spend?: unknown; dailySpend?: unknown; totalSpend?: unknown; spendImpact?: unknown };
  return Number(values.spendImpact ?? values.dailySpend ?? values.spend ?? values.totalSpend ?? 0) || 0;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDigestWindows(now = new Date()) {
  const today = startOfUtcDay(now);
  const dayOfWeek = today.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const currentWeekStart = addUtcDays(today, -daysSinceMonday);
  const previousWeekStart = addUtcDays(currentWeekStart, -7);
  const nextWeekStart = addUtcDays(currentWeekStart, 7);
  return { previousWeekStart, currentWeekStart, nextWeekStart };
}

function readNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function productNameFromInput(inputData: unknown) {
  if (!inputData || typeof inputData !== "object") return "Untitled product";
  const name = (inputData as { product_name?: unknown; name?: unknown }).product_name ?? (inputData as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : "Untitled product";
}

function roasFromAnalysis(analysis: { inputData: unknown; result: unknown }) {
  if (analysis.result && typeof analysis.result === "object") {
    const derived = (analysis.result as { derived?: { roas?: unknown } }).derived;
    const roas = readNumber(derived?.roas);
    if (roas > 0) return roas;
  }

  if (!analysis.inputData || typeof analysis.inputData !== "object") return 0;
  const input = analysis.inputData as { revenue?: unknown; cpc?: unknown; clicks?: unknown; total_spend?: unknown };
  const spend = readNumber(input.total_spend) || readNumber(input.cpc) * readNumber(input.clicks);
  return spend > 0 ? readNumber(input.revenue) / spend : 0;
}

function confidenceFromResult(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const decision = (result as { decision?: { confidenceScore?: unknown; confidence?: unknown; finalDecision?: unknown } }).decision;
  const numeric = Number(decision?.confidenceScore);
  if (Number.isFinite(numeric)) return numeric;
  if (decision?.confidence === "high") return 85;
  if (decision?.confidence === "medium") return 60;
  if (decision?.confidence === "low") return 35;
  return null;
}

function decisionFromResult(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const value = (result as { decision?: { finalDecision?: unknown } }).decision?.finalDecision;
  return typeof value === "string" ? value : null;
}

function summarizeBucket(rows: Array<{ inputData: unknown; result: unknown }>) {
  const grouped = new Map<string, { roas: number[]; confidence: number[]; decision: string | null }>();
  rows.forEach((row) => {
    const name = productNameFromInput(row.inputData);
    const current = grouped.get(name) ?? { roas: [], confidence: [], decision: null };
    current.roas.push(roasFromAnalysis(row));
    const confidence = confidenceFromResult(row.result);
    if (confidence !== null) current.confidence.push(confidence);
    current.decision = current.decision ?? decisionFromResult(row.result);
    grouped.set(name, current);
  });
  return grouped;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizePortfolio(
  currentRows: Array<{ inputData: unknown; result: unknown }>,
  previousRows: Array<{ inputData: unknown; result: unknown }>,
) {
  const current = summarizeBucket(currentRows);
  const previous = summarizeBucket(previousRows);
  const productNames = new Set([...current.keys(), ...previous.keys()]);

  const products: ProductPerformanceSummary[] = Array.from(productNames).map((name) => {
    const currentRoas = average(current.get(name)?.roas ?? []) ?? 0;
    const previousRoas = average(previous.get(name)?.roas ?? []);
    const confidenceScore = average(current.get(name)?.confidence ?? []);
    return {
      name,
      currentRoas: round(currentRoas),
      previousRoas: previousRoas === null ? null : round(previousRoas),
      deltaRoas: round(currentRoas - (previousRoas ?? 0)),
      confidenceScore: confidenceScore === null ? null : round(confidenceScore, 0),
      decision: current.get(name)?.decision ?? null,
    };
  });

  const confidenceChanges: ConfidenceChangeSummary[] = Array.from(productNames).map((name) => {
    const currentScore = average(current.get(name)?.confidence ?? []);
    const previousScore = average(previous.get(name)?.confidence ?? []);
    return {
      name,
      currentScore: currentScore === null ? null : round(currentScore, 0),
      previousScore: previousScore === null ? null : round(previousScore, 0),
      delta: currentScore === null || previousScore === null ? null : round(currentScore - previousScore, 0),
    };
  }).filter((item) => item.currentScore !== null || item.previousScore !== null);

  const ranked = products
    .filter((product) => product.currentRoas > 0 || product.previousRoas !== null)
    .sort((a, b) => b.deltaRoas - a.deltaRoas);

  return {
    products,
    bestProduct: ranked[0] ?? null,
    worstProduct: ranked[ranked.length - 1] ?? null,
    confidenceChanges,
  };
}

function buildSeasonalForecast(now = new Date()): SeasonalForecastSummary[] {
  const { nextWeekStart } = getDigestWindows(now);
  return [nextWeekStart, addUtcDays(nextWeekStart, 7)].map((weekStart) => {
    const season = getSeasonContext(weekStart);
    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      label: season.label,
      confidenceBonus: season.confidenceBonus,
      conversionMultiplier: season.convMultiplier,
      cpmMultiplier: season.cpmMultiplier,
      note: season.note,
    };
  });
}

function formatRoas(value: number | null) {
  return value === null ? "n/a" : `${round(value)}x`;
}

function buildWeeklyActionItems(input: {
  bestProduct: ProductPerformanceSummary | null;
  worstProduct: ProductPerformanceSummary | null;
  confidenceChanges: ConfidenceChangeSummary[];
  seasonalForecast: SeasonalForecastSummary[];
}) {
  const actions: string[] = [];

  if (input.bestProduct) {
    actions.push(`Scale or protect ${input.bestProduct.name}: ROAS moved ${input.bestProduct.deltaRoas >= 0 ? "+" : ""}${input.bestProduct.deltaRoas}x to ${formatRoas(input.bestProduct.currentRoas)}.`);
  }

  if (input.worstProduct && input.worstProduct.name !== input.bestProduct?.name) {
    actions.push(`Audit ${input.worstProduct.name}: ROAS moved ${input.worstProduct.deltaRoas >= 0 ? "+" : ""}${input.worstProduct.deltaRoas}x to ${formatRoas(input.worstProduct.currentRoas)}.`);
  }

  const biggestConfidenceDrop = input.confidenceChanges
    .filter((item) => typeof item.delta === "number" && item.delta < 0)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0];
  if (biggestConfidenceDrop) {
    actions.push(`Re-check the evidence on ${biggestConfidenceDrop.name}: confidence changed ${biggestConfidenceDrop.delta} points week over week.`);
  }

  const nextSeason = input.seasonalForecast[0];
  if (nextSeason && actions.length < 3) {
    actions.push(`Plan next week's tests around ${nextSeason.label}: conversion multiplier ${nextSeason.conversionMultiplier}x and CPM multiplier ${nextSeason.cpmMultiplier}x.`);
  }

  while (actions.length < 3) {
    actions.push("Refresh one creative angle, one offer test, and one landing-page friction point before adding more budget.");
  }

  return actions.slice(0, 3);
}

async function generateWeeklyDigestContent(userId: string, storeUrl: string, storeName: string): Promise<DigestSummary> {
  const now = new Date();
  const { previousWeekStart, currentWeekStart, nextWeekStart } = getDigestWindows(now);
  const [currentRows, previousRows] = await Promise.all([
    AnalysisRepository.findByUserBetween(userId, currentWeekStart, nextWeekStart, 250),
    AnalysisRepository.findByUserBetween(userId, previousWeekStart, currentWeekStart, 250),
  ]);

  const portfolio = summarizePortfolio(currentRows, previousRows);
  const seasonalForecast = buildSeasonalForecast(now);
  const actionItems = buildWeeklyActionItems({
    bestProduct: portfolio.bestProduct,
    worstProduct: portfolio.worstProduct,
    confidenceChanges: portfolio.confidenceChanges,
    seasonalForecast,
  });

  const title = `Weekly Digest — ${storeName || storeUrl}`;
  const bestText = portfolio.bestProduct
    ? `Best mover: ${portfolio.bestProduct.name} (${portfolio.bestProduct.deltaRoas >= 0 ? "+" : ""}${portfolio.bestProduct.deltaRoas}x ROAS delta).`
    : "No product had enough fresh analysis data to rank this week.";
  const worstText = portfolio.worstProduct
    ? `Worst mover: ${portfolio.worstProduct.name} (${portfolio.worstProduct.deltaRoas >= 0 ? "+" : ""}${portfolio.worstProduct.deltaRoas}x ROAS delta).`
    : "Add more product analyses this week to unlock ROAS movement ranking.";
  const confidenceText = portfolio.confidenceChanges.length
    ? `${portfolio.confidenceChanges[0].name} confidence is now ${portfolio.confidenceChanges[0].currentScore ?? "n/a"}${portfolio.confidenceChanges[0].delta === null ? "" : ` (${portfolio.confidenceChanges[0].delta >= 0 ? "+" : ""}${portfolio.confidenceChanges[0].delta})`}.`
    : "Confidence movement needs at least one scored analysis in the current or previous week.";

  return {
    title,
    body: `${bestText} ${worstText} Next two-week seasonality: ${seasonalForecast.map((item) => item.label).join(" then ")}.`,
    takeaways: [bestText, worstText, confidenceText],
    actionItems,
    alert: portfolio.worstProduct && portfolio.worstProduct.deltaRoas < -1
      ? `${portfolio.worstProduct.name} had a material ROAS drop this week.`
      : null,
    bestProduct: portfolio.bestProduct,
    worstProduct: portfolio.worstProduct,
    confidenceChanges: portfolio.confidenceChanges.slice(0, 5),
    seasonalForecast,
  };
}

function quietDigestSummary(storeName: string, threshold: string): DigestSummary {
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

export function createWeeklyDigestPreferenceToken(userId: string) {
  const signature = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`weekly-digest:${userId}`)
    .digest("hex");
  return Buffer.from(`${userId}.${signature}`, "utf8").toString("base64url");
}

export function verifyWeeklyDigestPreferenceToken(token: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, signature] = decoded.split(".");
    if (!userId || !signature) return null;
    const expected = crypto
      .createHmac("sha256", env.JWT_SECRET)
      .update(`weekly-digest:${userId}`)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? userId : null;
  } catch {
    return null;
  }
}

function buildEmailHtml(summary: DigestSummary, recipientName: string, userId: string): string {
  const preferenceToken = createWeeklyDigestPreferenceToken(userId);
  const unsubscribeLink = `${env.NEXT_PUBLIC_APP_URL}/api/email-preferences/weekly-digest?token=${preferenceToken}&action=unsubscribe`;
  const preferenceLink = `${env.NEXT_PUBLIC_APP_URL}/dashboard/settings?section=notifications`;
  const alertBlock = summary.alert
    ? `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
        <strong style="color:#9a3412;">Alert:</strong>
        <span style="color:#9a3412;"> ${escapeHtml(summary.alert)}</span>
       </div>`
    : "";

  const takeawaysHtml = summary.takeaways
    .map((t) => `<li style="margin:6px 0;color:#374151;">${escapeHtml(t)}</li>`)
    .join("");

  const actionsHtml = summary.actionItems
    .map((a) => `<li style="margin:6px 0;color:#374151;">${escapeHtml(a)}</li>`)
    .join("");

  const productRows = [summary.bestProduct, summary.worstProduct]
    .filter((product): product is ProductPerformanceSummary => Boolean(product))
    .map((product, index) => `
      <tr>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#6b7280;">${index === 0 ? "Best" : "Worst"}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-weight:600;">${escapeHtml(product.name)}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;text-align:right;">${formatRoas(product.currentRoas)}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:${product.deltaRoas >= 0 ? "#047857" : "#b91c1c"};text-align:right;">${product.deltaRoas >= 0 ? "+" : ""}${product.deltaRoas}x</td>
      </tr>`)
    .join("");

  const forecastRows = (summary.seasonalForecast ?? [])
    .map((forecast) => `
      <tr>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#6b7280;">${escapeHtml(forecast.weekStart)}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-weight:600;">${escapeHtml(forecast.label)}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;text-align:right;">${forecast.confidenceBonus >= 0 ? "+" : ""}${forecast.confidenceBonus}</td>
      </tr>`)
    .join("");

  const confidenceRows = (summary.confidenceChanges ?? [])
    .slice(0, 3)
    .map((item) => `
      <tr>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-weight:600;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;text-align:right;">${item.currentScore ?? "n/a"}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:${(item.delta ?? 0) >= 0 ? "#047857" : "#b91c1c"};text-align:right;">${item.delta === null ? "n/a" : `${item.delta >= 0 ? "+" : ""}${item.delta}`}</td>
      </tr>`)
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
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Weekly Digest</p>
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${summary.title}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Hi ${escapeHtml(recipientName || "there")},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(summary.body)}</p>

            ${alertBlock}

            ${productRows ? `
            <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#111827;">Product Performance</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;margin-bottom:24px;">
              <tr>
                <th align="left" style="padding:10px 12px;color:#6b7280;font-size:12px;">Rank</th>
                <th align="left" style="padding:10px 12px;color:#6b7280;font-size:12px;">Product</th>
                <th align="right" style="padding:10px 12px;color:#6b7280;font-size:12px;">ROAS</th>
                <th align="right" style="padding:10px 12px;color:#6b7280;font-size:12px;">Delta</th>
              </tr>
              ${productRows}
            </table>` : ""}

            ${confidenceRows ? `
            <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#111827;">Confidence Score Changes</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;margin-bottom:24px;">
              <tr>
                <th align="left" style="padding:10px 12px;color:#6b7280;font-size:12px;">Product</th>
                <th align="right" style="padding:10px 12px;color:#6b7280;font-size:12px;">Current</th>
                <th align="right" style="padding:10px 12px;color:#6b7280;font-size:12px;">Change</th>
              </tr>
              ${confidenceRows}
            </table>` : ""}

            ${forecastRows ? `
            <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#111827;">Seasonal Forecast</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;margin-bottom:24px;">
              <tr>
                <th align="left" style="padding:10px 12px;color:#6b7280;font-size:12px;">Week</th>
                <th align="left" style="padding:10px 12px;color:#6b7280;font-size:12px;">Season</th>
                <th align="right" style="padding:10px 12px;color:#6b7280;font-size:12px;">Confidence</th>
              </tr>
              ${forecastRows}
            </table>` : ""}

            <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#111827;">Weekly Takeaways</h2>
            <ul style="margin:0 0 24px;padding-left:20px;">${takeawaysHtml}</ul>

            <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">Actions This Week</h2>
            <ul style="margin:0 0 24px;padding-left:20px;">${actionsHtml}</ul>

            <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:8px;">
              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/notifications"
                 style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:500;">
                View in Operon
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              You're receiving this because weekly digests are enabled in Operon.
              <a href="${preferenceLink}" style="color:#6b7280;">Preference center</a> ·
              <a href="${unsubscribeLink}" style="color:#6b7280;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type MailTransport = {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<unknown>;
};

let mailerTransport: MailTransport | null = null;

async function getTransport(): Promise<MailTransport> {
  if (!mailerTransport) {
    const nodemailer = await import("nodemailer");
    mailerTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    });
  }
  return mailerTransport;
}

export async function generateAndSendDigest(userId: string): Promise<DigestSummary> {
  const user = await UserRepository.findDigestFields(userId);
  if (!user) throw new Error(`User ${userId} not found`);
  if (!user.weeklyDigestEnabled) {
    return quietDigestSummary(user.storeName ?? "", "weekly digest disabled");
  }

  const storeUrl = user.storeUrl ?? user.email;
  const storeName = user.storeName ?? "";

  const tierDefaults = QUIET_TIER_DEFAULTS[user.plan];
  const settings: QuietSettings = {
    quietModeEnabled: user.quietModeEnabled,
    quietMinConfidence: user.quietMinConfidence || tierDefaults.quietMinConfidence,
    quietMinSpendImpact: user.quietMinSpendImpact >= 0 ? user.quietMinSpendImpact : tierDefaults.quietMinSpendImpact,
    quietNoUrgentDigestAt: user.quietNoUrgentDigestAt,
  };

  const recentAnalyses = await AnalysisRepository.findRecentResults(userId, 20);
  const urgentAnalyses = recentAnalyses.filter((analysis) =>
    passesQuietThresholds(analysis.result as Parameters<typeof passesQuietThresholds>[0], settings)
  );

  const thresholdText = `${settings.quietMinConfidence || "medium"} confidence / ₽${Math.round(settings.quietMinSpendImpact || 0)}`;
  if (settings.quietModeEnabled && urgentAnalyses.length === 0) {
    if (!shouldSendNoUrgentDigest(settings.quietNoUrgentDigestAt)) {
      return quietDigestSummary(storeName, thresholdText);
    }

    const summary = quietDigestSummary(storeName, thresholdText);
    await UserRepository.update(userId, { quietNoUrgentDigestAt: new Date() } as never);
    await NotificationRepository.create({
      userId,
      title: summary.title,
      body: summary.body,
      type: "digest",
    });
    await DigestRepository.create(userId, summary as object);
    if (env.SMTP_USER) {
      const transport = await getTransport();
      await transport.sendMail({
        from: env.SMTP_FROM,
        to: user.email,
        subject: summary.title,
        html: buildEmailHtml(summary, user.name ?? "", userId),
      }).catch((err) => console.error(`[digest] Quiet email delivery failed for ${userId}:`, err));
    }
    return summary;
  }

  const summary = await generateWeeklyDigestContent(userId, storeUrl, storeName);
  const fatigueAlerts = await FatigueRepository.findActiveAlerts(userId, 10);
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

  await NotificationRepository.create({
    userId,
    title: summary.title,
    body: [
      summary.body,
      "",
      "Takeaways:",
      ...summary.takeaways.map((t) => `- ${t}`),
      "",
      "Action items:",
      ...summary.actionItems.map((a) => `- ${a}`),
      ...(summary.alert ? ["", `Alert: ${summary.alert}`] : []),
    ].join("\n"),
    type: "digest",
  });

  await DigestRepository.create(userId, summary as object);

  if (env.SMTP_USER) {
    try {
      const transport = await getTransport();
      await transport.sendMail({
        from: env.SMTP_FROM,
        to: user.email,
        subject: summary.title,
        html: buildEmailHtml(summary, user.name ?? "", userId),
      });
    } catch (err) {
      console.error(`[digest] Email delivery failed for ${userId}:`, err);
    }
  }

  return summary;
}

export async function generateDigestsForAllUsers(): Promise<void> {
  const users = await DigestRepository.findUsersForDigest();

  console.log(`[digest] Running weekly digest for ${users.length} users`);

  await Promise.allSettled(
    users.map((u) =>
      generateAndSendDigest(u.id).catch((err) =>
        console.error(`[digest] Failed for user ${u.id}:`, err),
      ),
    ),
  );
}
