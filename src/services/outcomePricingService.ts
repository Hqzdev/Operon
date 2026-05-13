import crypto from "node:crypto";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "../models/prisma";
import { env } from "../utils/env";
import { AppError } from "../utils/appError";

const DEFAULT_THRESHOLD_MINOR = 5_000_000;
const DEFAULT_FEE_RATE = 0.12;
const DEFAULT_CAP_MINOR = 1_500_000;
const DEFAULT_CURRENCY = "RUB";

type EnrollmentRow = {
  id: string;
  userId: string;
  status: string;
  currency: string;
  thresholdMinor: number;
  feeRate: number;
  capMinor: number;
  activatedAt: Date;
  firstInvoiceTriggeredAt: Date | null;
};

type InvoiceRow = {
  id: string;
  userId: string;
  enrollmentId: string;
  status: PaymentStatus;
  currency: string;
  savedSpendMinor: number;
  billableSavedSpendMinor: number;
  amountMinor: number;
  feeRate: number;
  capMinor: number;
  providerPaymentId: string | null;
  confirmationUrl: string | null;
  createdAt: Date;
};

type SavedSpendRow = {
  saved_spend: number | null;
  first_saved_at: Date | null;
  last_saved_at: Date | null;
};

function money(valueMinor: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(valueMinor / 100);
}

function getReturnUrl(invoiceId: string) {
  const url = new URL(env.YOOKASSA_RETURN_URL, env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("outcomeInvoiceId", invoiceId);
  return url.toString();
}

function mapYooKassaStatus(status: string) {
  if (status === "succeeded") return PaymentStatus.SUCCEEDED;
  if (status === "canceled") return PaymentStatus.CANCELED;
  return PaymentStatus.PENDING;
}

function amountValue(amountMinor: number, currency: string) {
  const fractionDigits = currency === "JPY" ? 0 : 2;
  return (amountMinor / 100).toFixed(fractionDigits);
}

export function outcomePricingEconomics(input?: {
  expectedSavedSpendMinor?: number;
  feeRate?: number;
  capMinor?: number;
  infraCostMinor?: number;
}) {
  const savedSpendMinor = input?.expectedSavedSpendMinor ?? 75_000_00;
  const feeRate = input?.feeRate ?? DEFAULT_FEE_RATE;
  const capMinor = input?.capMinor ?? DEFAULT_CAP_MINOR;
  const infraCostMinor = input?.infraCostMinor ?? 35_000;
  const grossRevenueMinor = Math.min(Math.round(savedSpendMinor * feeRate), capMinor);
  const contributionMinor = grossRevenueMinor - infraCostMinor;

  return {
    assumption: {
      expectedSavedSpend: money(savedSpendMinor),
      feeRate,
      cap: money(capMinor),
      monthlyInfraCost: money(infraCostMinor),
    },
    invoiceAmount: money(grossRevenueMinor),
    contributionMargin: money(contributionMinor),
    contributionMarginPct:
      grossRevenueMinor > 0 ? Math.round((contributionMinor / grossRevenueMinor) * 100) : 0,
    positiveContribution: contributionMinor > 0,
  };
}

export async function enrollOutcomePricing(userId: string) {
  const rows = await prisma.$queryRaw<EnrollmentRow[]>`
    INSERT INTO "outcome_pricing_enrollments" (
      "id", "userId", "status", "currency", "thresholdMinor", "feeRate", "capMinor", "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      'active',
      ${DEFAULT_CURRENCY},
      ${DEFAULT_THRESHOLD_MINOR},
      ${DEFAULT_FEE_RATE},
      ${DEFAULT_CAP_MINOR},
      ${new Date()}
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "status" = 'active',
      "canceledAt" = NULL,
      "updatedAt" = ${new Date()}
    RETURNING *
  `;
  return rows[0];
}

async function getEnrollment(userId: string) {
  const rows = await prisma.$queryRaw<EnrollmentRow[]>`
    SELECT *
    FROM "outcome_pricing_enrollments"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getLatestInvoice(userId: string) {
  const rows = await prisma.$queryRaw<InvoiceRow[]>`
    SELECT *
    FROM "outcome_invoices"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getEligibleSavedSpend(userId: string) {
  const rows = await prisma.$queryRaw<SavedSpendRow[]>`
    WITH eligible AS (
      SELECT DISTINCT ON ("analysisId")
        "analysisId",
        COALESCE(
          NULLIF(("inputSnapshot"->>'total_spend')::double precision, 0),
          COALESCE(("inputSnapshot"->>'cpc')::double precision, 0) * COALESCE(("inputSnapshot"->>'clicks')::double precision, 0)
        ) AS "savedSpend",
        "issuedAt"
      FROM "RecommendationOutcome"
      WHERE "userId" = ${userId}
        AND "verdict" = 'KILL'
        AND "connectionId" IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM "AdActionLog" aal
          WHERE aal."userId" = "RecommendationOutcome"."userId"
            AND aal."verdictId" = "RecommendationOutcome"."analysisId"
            AND aal."actionType" = 'pause'::"AdActionType"
            AND aal."status" = 'succeeded'::"AdActionStatus"
        )
        AND COALESCE(
          NULLIF(("inputSnapshot"->>'total_spend')::double precision, 0),
          COALESCE(("inputSnapshot"->>'cpc')::double precision, 0) * COALESCE(("inputSnapshot"->>'clicks')::double precision, 0)
        ) > 0
        AND (
          COALESCE(("inputSnapshot"->>'revenue')::double precision, 0) /
          COALESCE(
            NULLIF(("inputSnapshot"->>'total_spend')::double precision, 0),
            NULLIF(COALESCE(("inputSnapshot"->>'cpc')::double precision, 0) * COALESCE(("inputSnapshot"->>'clicks')::double precision, 0), 0)
          )
        ) < "breakEvenRoas"
      ORDER BY "analysisId", "evaluationHorizonDays" DESC
    )
    SELECT
      COALESCE(SUM("savedSpend"), 0) AS saved_spend,
      MIN("issuedAt") AS first_saved_at,
      MAX("issuedAt") AS last_saved_at
    FROM eligible
  `;
  const row = rows[0];
  return {
    savedSpendMinor: Math.round(Number(row?.saved_spend ?? 0) * 100),
    firstSavedAt: row?.first_saved_at ?? null,
    lastSavedAt: row?.last_saved_at ?? null,
  };
}

async function updateOutcomeInvoiceProvider(id: string, data: {
  providerPaymentId?: string;
  confirmationUrl?: string | null;
  status?: PaymentStatus;
  webhookPayload?: object;
}) {
  const rows = await prisma.$queryRaw<InvoiceRow[]>`
    UPDATE "outcome_invoices"
    SET
      "providerPaymentId" = COALESCE(${data.providerPaymentId ?? null}, "providerPaymentId"),
      "confirmationUrl" = COALESCE(${data.confirmationUrl ?? null}, "confirmationUrl"),
      "status" = COALESCE(${data.status ? `${data.status}` : null}::"PaymentStatus", "status"),
      "webhookPayload" = COALESCE(${data.webhookPayload ? JSON.stringify(data.webhookPayload) : null}::jsonb, "webhookPayload"),
      "updatedAt" = ${new Date()}
    WHERE "id" = ${id}
    RETURNING *
  `;
  return rows[0];
}

async function createYooKassaOutcomeInvoice(invoice: InvoiceRow) {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    return invoice;
  }

  const auth = Buffer.from(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`).toString("base64");
  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotence-Key": `outcome-${invoice.id}`,
    },
    body: JSON.stringify({
      amount: {
        value: amountValue(invoice.amountMinor, invoice.currency),
        currency: invoice.currency,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: getReturnUrl(invoice.id),
      },
      description: `Operon outcome fee: ${money(invoice.savedSpendMinor, invoice.currency)} saved`,
      metadata: {
        outcome_invoice_id: invoice.id,
        user_id: invoice.userId,
        pricing_model: "outcome",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError("YooKassa outcome invoice creation failed", 502, text);
  }

  const externalPayment = (await response.json()) as {
    id: string;
    status: string;
    confirmation?: { confirmation_url?: string };
  };

  return updateOutcomeInvoiceProvider(invoice.id, {
    providerPaymentId: externalPayment.id,
    confirmationUrl: externalPayment.confirmation?.confirmation_url ?? null,
    status: mapYooKassaStatus(externalPayment.status),
  });
}

export async function maybeCreateOutcomeInvoice(userId: string) {
  const enrollment = await getEnrollment(userId);
  if (!enrollment || enrollment.status !== "active") return null;

  const saved = await getEligibleSavedSpend(userId);
  if (saved.savedSpendMinor < enrollment.thresholdMinor) return null;

  const existing = await getLatestInvoice(userId);
  if (existing && existing.status !== PaymentStatus.CANCELED) return existing;

  const amountMinor = Math.min(Math.round(saved.savedSpendMinor * enrollment.feeRate), enrollment.capMinor);
  const rows = await prisma.$queryRaw<InvoiceRow[]>`
    INSERT INTO "outcome_invoices" (
      "id", "userId", "enrollmentId", "status", "currency",
      "savedSpendMinor", "billableSavedSpendMinor", "amountMinor",
      "feeRate", "capMinor", "thresholdCrossedAt", "periodStart", "periodEnd", "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${enrollment.id},
      'PENDING'::"PaymentStatus",
      ${enrollment.currency},
      ${saved.savedSpendMinor},
      ${saved.savedSpendMinor},
      ${amountMinor},
      ${enrollment.feeRate},
      ${enrollment.capMinor},
      ${saved.lastSavedAt ?? new Date()},
      ${enrollment.activatedAt},
      ${saved.lastSavedAt ?? new Date()},
      ${new Date()}
    )
    RETURNING *
  `;

  await prisma.$executeRaw`
    UPDATE "outcome_pricing_enrollments"
    SET "firstInvoiceTriggeredAt" = COALESCE("firstInvoiceTriggeredAt", ${new Date()}),
        "updatedAt" = ${new Date()}
    WHERE "id" = ${enrollment.id}
  `;

  return createYooKassaOutcomeInvoice(rows[0]);
}

export async function getOutcomePricingStatus(userId: string) {
  const enrollment = await getEnrollment(userId);
  const saved = await getEligibleSavedSpend(userId);
  const latestInvoice = await getLatestInvoice(userId);
  const activeEnrollment = enrollment?.status === "active" ? enrollment : null;
  const thresholdMinor = activeEnrollment?.thresholdMinor ?? DEFAULT_THRESHOLD_MINOR;
  const feeRate = activeEnrollment?.feeRate ?? DEFAULT_FEE_RATE;
  const capMinor = activeEnrollment?.capMinor ?? DEFAULT_CAP_MINOR;
  const amountAtCurrentSavedMinor = Math.min(Math.round(saved.savedSpendMinor * feeRate), capMinor);

  return {
    enrolled: Boolean(activeEnrollment),
    status: enrollment?.status ?? "not_enrolled",
    currency: activeEnrollment?.currency ?? DEFAULT_CURRENCY,
    savedSpendMinor: saved.savedSpendMinor,
    savedSpend: money(saved.savedSpendMinor, activeEnrollment?.currency ?? DEFAULT_CURRENCY),
    thresholdMinor,
    threshold: money(thresholdMinor, activeEnrollment?.currency ?? DEFAULT_CURRENCY),
    remainingToThresholdMinor: Math.max(0, thresholdMinor - saved.savedSpendMinor),
    remainingToThreshold: money(Math.max(0, thresholdMinor - saved.savedSpendMinor), activeEnrollment?.currency ?? DEFAULT_CURRENCY),
    progressPct: Math.min(100, Math.round((saved.savedSpendMinor / thresholdMinor) * 100)),
    feeRate,
    capMinor,
    cap: money(capMinor, activeEnrollment?.currency ?? DEFAULT_CURRENCY),
    projectedInvoiceMinor: amountAtCurrentSavedMinor,
    projectedInvoice: money(amountAtCurrentSavedMinor, activeEnrollment?.currency ?? DEFAULT_CURRENCY),
    formula:
      "Eligible saved spend = deduped connected KILL recommendations where Operon executed PAUSE and the ad set was below break-even at the time of KILL. Fee = saved spend x rate, capped.",
    noDisputeRule:
      "Manual intentions do not count. Operon only counts connected KILL calls that were paused through Operon, once per recommendation.",
    economics: outcomePricingEconomics({ expectedSavedSpendMinor: Math.max(saved.savedSpendMinor, 75_000_00), feeRate, capMinor }),
    latestInvoice: latestInvoice
      ? {
          id: latestInvoice.id,
          status: latestInvoice.status,
          amountMinor: latestInvoice.amountMinor,
          amount: money(latestInvoice.amountMinor, latestInvoice.currency),
          confirmationUrl: latestInvoice.confirmationUrl,
          savedSpend: money(latestInvoice.savedSpendMinor, latestInvoice.currency),
          createdAt: latestInvoice.createdAt.toISOString(),
        }
      : null,
  };
}

export async function syncOutcomeInvoiceFromWebhook(payload: Record<string, unknown>) {
  const object = payload.object as
    | { id?: string; status?: string; metadata?: { outcome_invoice_id?: string } }
    | undefined;
  const invoiceId = object?.metadata?.outcome_invoice_id;
  if (!invoiceId || !object?.status) return null;

  return updateOutcomeInvoiceProvider(invoiceId, {
    providerPaymentId: object.id,
    status: mapYooKassaStatus(object.status),
    webhookPayload: payload,
  });
}
