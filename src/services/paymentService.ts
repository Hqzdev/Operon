import crypto from "node:crypto";
import { PaymentStatus, UserPlan, SubscriptionStatus, type Prisma } from "@prisma/client";
import { AppError } from "../utils/appError";
import { env } from "../utils/env";
import { PaymentRepository } from "../repositories/paymentRepository";
import { UserRepository } from "../repositories/userRepository";
import { getPlanPriceForPayment } from "./pricingService";
import { syncOutcomeInvoiceFromWebhook } from "./outcomePricingService";

const planLabels: Record<UserPlan, string> = {
  STARTER: "Free",
  PRO: "Pro",
  SCALE: "Business",
};

function getReturnUrl(paymentId: string) {
  const url = new URL(env.YOOKASSA_RETURN_URL, env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("paymentId", paymentId);
  return url.toString();
}

function mapYooKassaStatus(status: string) {
  if (status === "succeeded") return PaymentStatus.SUCCEEDED;
  if (status === "canceled") return PaymentStatus.CANCELED;
  return PaymentStatus.PENDING;
}

export async function activateSubscription(payment: { userId: string; plan: UserPlan }) {
  const subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await UserRepository.updateSubscription(payment.userId, {
    plan: payment.plan,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscriptionEndDate,
  });
}

async function fetchYooKassaPayment(providerPaymentId: string) {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    throw new AppError("YooKassa credentials are missing", 503);
  }

  const auth = Buffer.from(
    `${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`,
  ).toString("base64");

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${providerPaymentId}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError("YooKassa payment status check failed", 502, text);
  }

  return (await response.json()) as {
    id: string;
    status: string;
  };
}

export async function createPaymentIntent(userId: string, plan: UserPlan, currencyInput?: string) {
  if (plan === UserPlan.STARTER) {
    throw new AppError("Free plan does not require payment", 400);
  }

  const pricing = await getPlanPriceForPayment(plan, currencyInput);

  const payment = await PaymentRepository.create({
    userId,
    plan,
    amount: pricing.amountMinor,
    currency: pricing.currency,
    status: PaymentStatus.PENDING,
  });

  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: pricing.amountMinor,
      currency: pricing.currency,
      provider: "yookassa",
      ready: false,
      message: "YooKassa credentials are missing. Add them to enable live payment creation.",
    };
  }

  const auth = Buffer.from(
    `${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`,
  ).toString("base64");

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotence-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      amount: {
        value: pricing.amountMajor.toFixed(pricing.currency === "JPY" ? 0 : 2),
        currency: pricing.currency,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: getReturnUrl(payment.id),
      },
      description: `Operon ${planLabels[plan]} plan`,
      metadata: {
        internal_payment_id: payment.id,
        user_id: userId,
        plan,
        currency: pricing.currency,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError("YooKassa payment creation failed", 502, text);
  }

  const externalPayment = (await response.json()) as {
    id: string;
    status: string;
    confirmation?: { confirmation_url?: string };
  };

  await PaymentRepository.update(payment.id, {
    providerPaymentId: externalPayment.id,
    confirmationUrl: externalPayment.confirmation?.confirmation_url,
  });

  return {
    paymentId: payment.id,
    providerPaymentId: externalPayment.id,
    status: externalPayment.status,
    amount: pricing.amountMinor,
    currency: pricing.currency,
    confirmationUrl: externalPayment.confirmation?.confirmation_url ?? null,
    ready: true,
  };
}

export async function handlePaymentWebhook(payload: Record<string, unknown>) {
  const object = payload.object as
    | {
        id?: string;
        status?: string;
        payment_method?: {
          card?: { last4?: string };
        };
        metadata?: {
          country?: string;
          customer_name?: string;
        };
      }
    | undefined;

  if (!object?.id || !object.status) {
    throw new AppError("Invalid webhook payload", 400);
  }

  const outcomeInvoice = await syncOutcomeInvoiceFromWebhook(payload);
  if (outcomeInvoice) return outcomeInvoice;

  const payment = await PaymentRepository.findByProviderId(object.id);

  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  const status = mapYooKassaStatus(object.status);

  const updated = await PaymentRepository.update(payment.id, {
    status,
    cardLast4: object.payment_method?.card?.last4,
    country: object.metadata?.country,
    customerName: object.metadata?.customer_name,
    webhookPayload: payload as Prisma.InputJsonValue,
  });

  if (status === PaymentStatus.SUCCEEDED) {
    await activateSubscription(payment);
  }

  return updated;
}

export async function listPayments(userId: string) {
  return PaymentRepository.findByUserId(userId);
}

export async function syncPaymentStatus(userId: string, paymentId: string) {
  const payment = await PaymentRepository.findByIdAndUser(paymentId, userId);

  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  if (!payment.providerPaymentId) {
    return payment;
  }

  const yooKassaPayment = await fetchYooKassaPayment(payment.providerPaymentId);
  const status = mapYooKassaStatus(yooKassaPayment.status);

  const updated = await PaymentRepository.update(payment.id, {
    status,
    webhookPayload: yooKassaPayment as Prisma.InputJsonValue,
  });

  if (status === PaymentStatus.SUCCEEDED) {
    await activateSubscription(payment);
  }

  return updated;
}
