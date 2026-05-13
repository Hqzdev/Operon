CREATE TABLE "outcome_pricing_enrollments" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "thresholdMinor" INTEGER NOT NULL DEFAULT 5000000,
  "feeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
  "capMinor" INTEGER NOT NULL DEFAULT 1500000,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstInvoiceTriggeredAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outcome_pricing_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outcome_invoices" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "savedSpendMinor" INTEGER NOT NULL,
  "billableSavedSpendMinor" INTEGER NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "feeRate" DOUBLE PRECISION NOT NULL,
  "capMinor" INTEGER NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'yookassa',
  "providerPaymentId" TEXT,
  "confirmationUrl" TEXT,
  "thresholdCrossedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "webhookPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outcome_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outcome_pricing_enrollments_userId_key" ON "outcome_pricing_enrollments"("userId");
CREATE INDEX "outcome_pricing_enrollments_status_createdAt_idx" ON "outcome_pricing_enrollments"("status", "createdAt");

CREATE UNIQUE INDEX "outcome_invoices_providerPaymentId_key" ON "outcome_invoices"("providerPaymentId");
CREATE INDEX "outcome_invoices_userId_createdAt_idx" ON "outcome_invoices"("userId", "createdAt");
CREATE INDEX "outcome_invoices_status_createdAt_idx" ON "outcome_invoices"("status", "createdAt");
CREATE INDEX "outcome_invoices_providerPaymentId_idx" ON "outcome_invoices"("providerPaymentId");

ALTER TABLE "outcome_pricing_enrollments"
  ADD CONSTRAINT "outcome_pricing_enrollments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outcome_invoices"
  ADD CONSTRAINT "outcome_invoices_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outcome_invoices"
  ADD CONSTRAINT "outcome_invoices_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "outcome_pricing_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
