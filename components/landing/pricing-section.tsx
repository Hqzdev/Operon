"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type PricingPlan = {
  id: string;
  planId: "free" | "pro" | "business" | "custom";
  userPlan: "STARTER" | "PRO" | "SCALE" | null;
  name: string;
  description: string;
  currency: string;
  price: number;
  formattedPrice: string;
  billingPeriodLabel: string;
  features: string[];
  cta: string;
  popular: boolean;
};

type PricingResponse = {
  currency: string;
  currencies: string[];
  note: string;
  rateFetchedAt: string;
  isFallbackRate: boolean;
  plans: PricingPlan[];
};

const defaultCurrencies = ["USD", "EUR", "GBP", "RUB", "CAD", "AUD", "JPY", "CHF", "CNY"];

const fallbackPricing: PricingResponse = {
  currency: "USD",
  currencies: defaultCurrencies,
  note: "Prices shown in USD at current rates",
  rateFetchedAt: new Date().toISOString(),
  isFallbackRate: false,
  plans: [
    {
      id: "free",
      planId: "free",
      userPlan: "STARTER",
      name: "Free",
      description: "Best for startups",
      currency: "USD",
      price: 0,
      formattedPrice: "$0.00",
      billingPeriodLabel: "per month",
      features: ["10 analyses per month", "Meta and TikTok campaign verdicts", "Email and in-app notifications"],
      cta: "Get Started",
      popular: false,
    },
    {
      id: "pro",
      planId: "pro",
      userPlan: "PRO",
      name: "Pro",
      description: "Scale your ads",
      currency: "USD",
      price: 29.99,
      formattedPrice: "$29.99",
      billingPeriodLabel: "per month",
      features: ["Everything in Free", "Unlimited analyses", "Full AI recommendations", "History tracking", "Priority support"],
      cta: "Subscribe Now",
      popular: true,
    },
    {
      id: "business",
      planId: "business",
      userPlan: "SCALE",
      name: "Business",
      description: "For agencies and teams",
      currency: "USD",
      price: 79.99,
      formattedPrice: "$79.99",
      billingPeriodLabel: "per month",
      features: ["Everything in Pro", "Budget allocation", "Scenario simulator", "Agency workspace", "Priority 24-hour support"],
      cta: "Subscribe Now",
      popular: false,
    },
    {
      id: "custom",
      planId: "custom",
      userPlan: null,
      name: "Custom",
      description: "Enterprise support and billing",
      currency: "USD",
      price: 0,
      formattedPrice: "Custom",
      billingPeriodLabel: "per month",
      features: ["Custom onboarding", "Dedicated support", "Enterprise billing", "Security review"],
      cta: "Contact Sales",
      popular: false,
    },
  ],
};

function planHref(plan: PricingPlan, currency: string) {
  if (plan.planId === "custom") {
    return `mailto:wkeyqwert@gmail.com?subject=${encodeURIComponent("Operon Custom plan")}&body=${encodeURIComponent(`I'd like to discuss the Custom plan in ${currency}.`)}`;
  }

  const params = new URLSearchParams({ plan: plan.userPlan ?? "STARTER", currency });
  return plan.planId === "free" ? `/register?${params.toString()}` : `/register?${params.toString()}&checkout=1`;
}

export function PricingSection() {
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [pricing, setPricing] = useState<PricingResponse>(fallbackPricing);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedCurrency = localStorage.getItem("operon_pricing_currency");
    if (storedCurrency && defaultCurrencies.includes(storedCurrency)) {
      setSelectedCurrency(storedCurrency);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/pricing?currency=${encodeURIComponent(selectedCurrency)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<PricingResponse> : Promise.reject())
      .then((data) => {
        if (!isMounted) return;
        setPricing(data);
        localStorage.setItem("operon_pricing_currency", data.currency);
      })
      .catch(() => {
        if (isMounted) {
          setPricing((current) => ({ ...current, currency: selectedCurrency, note: `Prices shown in ${selectedCurrency} at current rates` }));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCurrency]);

  const currencies = useMemo(() => pricing.currencies.length ? pricing.currencies : defaultCurrencies, [pricing.currencies]);

  return (
    <section id="pricing" className="relative border-t border-foreground/10 py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mx-auto mb-14 max-w-4xl text-center">
          <span className="mb-6 block font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Pricing
          </span>
          <h2 className="mb-6 font-display text-5xl tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Pick a plan.
            <br />
            <span className="text-stroke">Start in two minutes.</span>
          </h2>
          <p className="text-lg text-muted-foreground">Seven days free. One click to cancel.</p>
        </div>

        <div className="mb-10 flex flex-col items-center justify-between gap-4 border-y border-foreground/10 py-4 sm:flex-row">
          <label className="flex items-center gap-3 text-sm font-medium text-foreground">
            Currency:
            <select
              value={selectedCurrency}
              onChange={(event) => setSelectedCurrency(event.target.value)}
              className="h-10 min-w-28 rounded-md border border-foreground/20 bg-background px-3 text-sm outline-none transition hover:border-foreground/50 focus:border-foreground"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <p className="text-center text-sm text-muted-foreground sm:text-right">
            {pricing.note}
            {isLoading ? "..." : ""}
            {pricing.isFallbackRate ? " using cached fallback rates" : ""}
          </p>
        </div>

        <div className="grid gap-px bg-foreground/10 md:grid-cols-2 xl:grid-cols-4">
          {pricing.plans.map((plan, idx) => (
            <div
              key={plan.id}
              className={`relative bg-background p-8 lg:p-10 ${
                plan.popular ? "border-2 border-foreground xl:-my-4 xl:py-14" : ""
              }`}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-8 bg-foreground px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary-foreground">
                  Core plan
                </span>
              ) : null}

              <div className="mb-8">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-3xl text-foreground">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-8 border-b border-foreground/10 pb-8">
                <div className="flex min-h-16 flex-col justify-end gap-2">
                  <span className="font-display text-5xl text-foreground lg:text-6xl">
                    {plan.formattedPrice}
                  </span>
                  <span className="w-fit rounded-full border border-foreground/10 px-2.5 py-1 text-xs text-muted-foreground">
                    {plan.billingPeriodLabel}
                  </span>
                </div>
              </div>

              <ul className="mb-10 min-h-44 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={planHref(plan, pricing.currency)}
                className={`group flex w-full items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
                  plan.popular
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                }`}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          14-day money-back guarantee. Cancel in one click.
        </p>
      </div>
    </section>
  );
}
