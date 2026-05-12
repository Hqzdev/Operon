import { Prisma, type UserPlan } from "@prisma/client";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "RUB", "CAD", "AUD", "JPY", "CHF", "CNY"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type BillingInterval = "monthly" | "annual" | "one-time";
export type PublicPlanId = "free" | "pro" | "business" | "custom";

type BasePlan = {
  planId: PublicPlanId;
  userPlan: UserPlan | null;
  name: string;
  description: string;
  baseUsdPrice: number;
  billingInterval: BillingInterval;
  features: string[];
  cta: string;
  popular?: boolean;
};

type PricingTierRow = {
  planId: string;
  price: Prisma.Decimal | number | string;
  billingInterval: BillingInterval;
  features: unknown;
};

const RATE_TTL_MS = 24 * 60 * 60 * 1000;

const FALLBACK_USD_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  RUB: 92,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 154,
  CHF: 0.9,
  CNY: 7.24,
};

export const BASE_PLANS: BasePlan[] = [
  {
    planId: "free",
    userPlan: "STARTER",
    name: "Free",
    description: "Best for startups",
    baseUsdPrice: 0,
    billingInterval: "monthly",
    features: ["10 analyses per month", "Meta and TikTok campaign verdicts", "Email and in-app notifications"],
    cta: "Get Started",
  },
  {
    planId: "pro",
    userPlan: "PRO",
    name: "Pro",
    description: "Scale your ads",
    baseUsdPrice: 29.99,
    billingInterval: "monthly",
    features: ["Everything in Free", "Unlimited analyses", "Full AI recommendations", "History tracking", "Priority support"],
    cta: "Subscribe Now",
    popular: true,
  },
  {
    planId: "business",
    userPlan: "SCALE",
    name: "Business",
    description: "For agencies and teams",
    baseUsdPrice: 79.99,
    billingInterval: "monthly",
    features: ["Everything in Pro", "Budget allocation", "Scenario simulator", "Agency workspace", "Priority 24-hour support"],
    cta: "Subscribe Now",
  },
  {
    planId: "custom",
    userPlan: null,
    name: "Custom",
    description: "Enterprise support and billing",
    baseUsdPrice: 0,
    billingInterval: "monthly",
    features: ["Custom onboarding", "Dedicated support", "Enterprise billing", "Security review"],
    cta: "Contact Sales",
  },
];

function normalizeCurrency(currency?: string | null): SupportedCurrency {
  const normalized = (currency ?? "USD").trim().toUpperCase();
  return SUPPORTED_CURRENCIES.includes(normalized as SupportedCurrency)
    ? normalized as SupportedCurrency
    : "USD";
}

function formatPrice(amount: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}

function roundPrice(amount: number, currency: SupportedCurrency) {
  if (currency === "JPY") return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

async function fetchLiveRates(currency: SupportedCurrency) {
  const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currency}`);
  if (!response.ok) {
    throw new AppError("Exchange rate provider unavailable", 502);
  }

  const payload = await response.json() as { rates?: Record<string, number> };
  const rate = payload.rates?.[currency];
  if (!rate || Number.isNaN(rate)) {
    throw new AppError("Exchange rate provider returned an invalid rate", 502);
  }

  return rate;
}

export async function getUsdExchangeRate(currencyInput?: string | null) {
  const currency = normalizeCurrency(currencyInput);
  const client = prisma as typeof prisma & {
    exchangeRate: {
      findFirst: (args: unknown) => Promise<{ rate: Prisma.Decimal | number | string; provider: string; fetchedAt: Date } | null>;
      create: (args: unknown) => Promise<{ rate: Prisma.Decimal | number | string; provider: string; fetchedAt: Date }>;
    };
  };

  if (currency === "USD") {
    return { currency, rate: 1, provider: "base", fetchedAt: new Date(), isFallback: false };
  }

  const latest = await client.exchangeRate.findFirst({
    where: { baseCurrency: "USD", quoteCurrency: currency },
    orderBy: { fetchedAt: "desc" },
  });

  if (latest && Date.now() - latest.fetchedAt.getTime() < RATE_TTL_MS) {
    return {
      currency,
      rate: Number(latest.rate),
      provider: latest.provider,
      fetchedAt: latest.fetchedAt,
      isFallback: false,
    };
  }

  try {
    const rate = await fetchLiveRates(currency);
    const saved = await client.exchangeRate.create({
      data: {
        baseCurrency: "USD",
        quoteCurrency: currency,
        rate: new Prisma.Decimal(rate),
        provider: "frankfurter",
      },
    });

    return {
      currency,
      rate: Number(saved.rate),
      provider: saved.provider,
      fetchedAt: saved.fetchedAt,
      isFallback: false,
    };
  } catch {
    return {
      currency,
      rate: FALLBACK_USD_RATES[currency],
      provider: "fallback",
      fetchedAt: latest?.fetchedAt ?? new Date(),
      isFallback: true,
    };
  }
}

export async function getPricingTiers(currencyInput?: string | null) {
  const currency = normalizeCurrency(currencyInput);
  const rateInfo = await getUsdExchangeRate(currency);
  const client = prisma as typeof prisma & {
    pricingTier: {
      findMany: (args: unknown) => Promise<PricingTierRow[]>;
    };
  };

  const usdRows = await client.pricingTier.findMany({
    where: { currency: "USD" },
    orderBy: { price: "asc" },
  });

  const rowByPlan = new Map(usdRows.map((row) => [row.planId, row]));

  const plans = BASE_PLANS.map((base) => {
    const stored = rowByPlan.get(base.planId);
    const usdPrice = stored ? Number(stored.price) : base.baseUsdPrice;
    const convertedPrice = roundPrice(usdPrice * rateInfo.rate, currency);
    const features = Array.isArray(stored?.features) ? stored.features as string[] : base.features;

    return {
      id: base.planId,
      planId: base.planId,
      userPlan: base.userPlan,
      name: base.name,
      description: base.description,
      currency,
      price: convertedPrice,
      formattedPrice: base.planId === "custom" ? "Custom" : formatPrice(convertedPrice, currency),
      billingInterval: stored?.billingInterval ?? base.billingInterval,
      billingPeriodLabel: stored?.billingInterval === "annual" ? "per year" : "per month",
      features,
      cta: base.cta,
      popular: Boolean(base.popular),
    };
  });

  return {
    currency,
    currencies: SUPPORTED_CURRENCIES,
    rate: rateInfo.rate,
    rateProvider: rateInfo.provider,
    rateFetchedAt: rateInfo.fetchedAt.toISOString(),
    isFallbackRate: rateInfo.isFallback,
    note: `Prices shown in ${currency} at current rates`,
    plans,
  };
}

export async function getPlanPriceForPayment(plan: UserPlan, currencyInput?: string | null) {
  const planId: PublicPlanId = plan === "PRO" ? "pro" : plan === "SCALE" ? "business" : "free";
  const pricing = await getPricingTiers(currencyInput);
  const tier = pricing.plans.find((item) => item.planId === planId);
  if (!tier || tier.price <= 0) {
    throw new AppError("Selected plan does not require payment", 400);
  }

  const minorUnitMultiplier = tier.currency === "JPY" ? 1 : 100;
  return {
    amountMinor: Math.round(tier.price * minorUnitMultiplier),
    amountMajor: tier.price,
    currency: tier.currency,
    label: tier.name,
  };
}
