-- Add admin payment review metadata without storing sensitive card data.
ALTER TABLE "Payment"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "cardLast4" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedBy" TEXT,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "privateNotes" TEXT,
  ADD COLUMN "fraudFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "PaymentAuditLog" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");
CREATE INDEX "PaymentAuditLog_paymentId_createdAt_idx" ON "PaymentAuditLog"("paymentId", "createdAt");
CREATE INDEX "PaymentAuditLog_adminId_createdAt_idx" ON "PaymentAuditLog"("adminId", "createdAt");

ALTER TABLE "PaymentAuditLog"
  ADD CONSTRAINT "PaymentAuditLog_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
