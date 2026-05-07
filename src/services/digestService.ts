import nodemailer from "nodemailer";
import { prisma } from "../models/prisma";
import { completeGigaChatJson } from "./aiService";
import { env } from "../utils/env";

export interface DigestSummary {
  title: string;
  body: string;
  takeaways: string[];
  actionItems: string[];
  alert: string | null;
}

async function generateDigestContent(storeUrl: string, storeName: string): Promise<DigestSummary> {
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
    return await completeGigaChatJson<DigestSummary>(
      "digest",
      "You are a strict e-commerce analyst. Return valid JSON only. No markdown. No text outside the JSON.",
      prompt,
    );
  } catch {
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

function buildEmailHtml(summary: DigestSummary, recipientName: string): string {
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
              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/notifications"
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

let mailerTransport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!mailerTransport) {
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, storeUrl: true, storeName: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);

  const storeUrl = user.storeUrl ?? user.email;
  const storeName = user.storeName ?? "";

  const summary = await generateDigestContent(storeUrl, storeName);
  const fatigueAlerts = await prisma.fatigueAlert.findMany({
    where: { userId, status: "active" },
    orderBy: { detectedAt: "desc" },
    take: 3,
  });

  if (fatigueAlerts.length > 0) {
    const fatigueSummary = fatigueAlerts
      .map((alert) => `Creative fatigue: ${alert.creativeName}`)
      .join("; ");
    summary.alert = summary.alert ? `${summary.alert} ${fatigueSummary}` : fatigueSummary;
  }

  await prisma.notification.create({
    data: {
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
    },
  });

  await prisma.digestLog.create({
    data: {
      userId,
      summary: summary as object,
    },
  });

  if (env.SMTP_USER) {
    try {
      await getTransport().sendMail({
        from: env.SMTP_FROM,
        to: user.email,
        subject: summary.title,
        html: buildEmailHtml(summary, user.name ?? ""),
      });
    } catch (err) {
      console.error(`[digest] Email delivery failed for ${userId}:`, err);
    }
  }

  return summary;
}

export async function generateDigestsForAllUsers(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { onboardingCompleted: true },
    select: { id: true },
  });

  console.log(`[digest] Running morning digest for ${users.length} users`);

  await Promise.allSettled(
    users.map((u) =>
      generateAndSendDigest(u.id).catch((err) =>
        console.error(`[digest] Failed for user ${u.id}:`, err),
      ),
    ),
  );
}
