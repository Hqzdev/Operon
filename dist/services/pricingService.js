"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_PLANS = exports.SUPPORTED_CURRENCIES = void 0;
exports.getUsdExchangeRate = getUsdExchangeRate;
exports.getPricingTiers = getPricingTiers;
exports.getPlanPriceForPayment = getPlanPriceForPayment;
const client_1 = require("@prisma/client");
const prisma_1 = require("../models/prisma");
const appError_1 = require("../utils/appError");
exports.SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "RUB", "CAD", "AUD", "JPY", "CHF", "CNY"];
const RATE_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_USD_RATES = {
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
exports.BASE_PLANS = [
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
function normalizeCurrency(currency) {
    const normalized = (currency ?? "USD").trim().toUpperCase();
    return exports.SUPPORTED_CURRENCIES.includes(normalized)
        ? normalized
        : "USD";
}
function formatPrice(amount, currency) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
}
function roundPrice(amount, currency) {
    if (currency === "JPY")
        return Math.round(amount);
    return Math.round(amount * 100) / 100;
}
async function fetchLiveRates(currency) {
    const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currency}`);
    if (!response.ok) {
        throw new appError_1.AppError("Exchange rate provider unavailable", 502);
    }
    const payload = await response.json();
    const rate = payload.rates?.[currency];
    if (!rate || Number.isNaN(rate)) {
        throw new appError_1.AppError("Exchange rate provider returned an invalid rate", 502);
    }
    return rate;
}
async function getUsdExchangeRate(currencyInput) {
    const currency = normalizeCurrency(currencyInput);
    const client = prisma_1.prisma;
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
                rate: new client_1.Prisma.Decimal(rate),
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
    }
    catch {
        return {
            currency,
            rate: FALLBACK_USD_RATES[currency],
            provider: "fallback",
            fetchedAt: latest?.fetchedAt ?? new Date(),
            isFallback: true,
        };
    }
}
async function getPricingTiers(currencyInput) {
    const currency = normalizeCurrency(currencyInput);
    const rateInfo = await getUsdExchangeRate(currency);
    const client = prisma_1.prisma;
    const usdRows = await client.pricingTier.findMany({
        where: { currency: "USD" },
        orderBy: { price: "asc" },
    });
    const rowByPlan = new Map(usdRows.map((row) => [row.planId, row]));
    const plans = exports.BASE_PLANS.map((base) => {
        const stored = rowByPlan.get(base.planId);
        const usdPrice = stored ? Number(stored.price) : base.baseUsdPrice;
        const convertedPrice = roundPrice(usdPrice * rateInfo.rate, currency);
        const features = Array.isArray(stored?.features) ? stored.features : base.features;
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
        currencies: exports.SUPPORTED_CURRENCIES,
        rate: rateInfo.rate,
        rateProvider: rateInfo.provider,
        rateFetchedAt: rateInfo.fetchedAt.toISOString(),
        isFallbackRate: rateInfo.isFallback,
        note: `Prices shown in ${currency} at current rates`,
        plans,
    };
}
async function getPlanPriceForPayment(plan, currencyInput) {
    const planId = plan === "PRO" ? "pro" : plan === "SCALE" ? "business" : "free";
    const pricing = await getPricingTiers(currencyInput);
    const tier = pricing.plans.find((item) => item.planId === planId);
    if (!tier || tier.price <= 0) {
        throw new appError_1.AppError("Selected plan does not require payment", 400);
    }
    const minorUnitMultiplier = tier.currency === "JPY" ? 1 : 100;
    return {
        amountMinor: Math.round(tier.price * minorUnitMultiplier),
        amountMajor: tier.price,
        currency: tier.currency,
        label: tier.name,
    };
}
