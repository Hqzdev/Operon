CREATE TABLE "pricing_tiers" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "provider" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pricing_tiers_planId_currency_billingInterval_key" ON "pricing_tiers"("planId", "currency", "billingInterval");
CREATE INDEX "pricing_tiers_currency_billingInterval_idx" ON "pricing_tiers"("currency", "billingInterval");
CREATE INDEX "exchange_rates_baseCurrency_quoteCurrency_fetchedAt_idx" ON "exchange_rates"("baseCurrency", "quoteCurrency", "fetchedAt");

INSERT INTO "pricing_tiers" ("id", "planId", "currency", "price", "billingInterval", "features", "createdAt", "updatedAt")
VALUES
  ('pricing_free_usd_monthly', 'free', 'USD', 0.00, 'monthly', '["10 analyses per month","Meta and TikTok campaign verdicts","Email and in-app notifications"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pricing_pro_usd_monthly', 'pro', 'USD', 29.99, 'monthly', '["Everything in Free","Unlimited analyses","Full AI recommendations","History tracking","Priority support"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pricing_business_usd_monthly', 'business', 'USD', 79.99, 'monthly', '["Everything in Pro","Budget allocation","Scenario simulator","Agency workspace","Priority 24-hour support"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pricing_custom_usd_monthly', 'custom', 'USD', 0.00, 'monthly', '["Custom onboarding","Dedicated support","Enterprise billing","Security review"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
