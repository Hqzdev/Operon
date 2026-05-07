CREATE TYPE "FatigueSeverity" AS ENUM ('warning', 'critical');

CREATE TYPE "FatigueAlertStatus" AS ENUM ('active', 'dismissed', 'snoozed');

CREATE TABLE "FatigueAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "creativeName" TEXT NOT NULL,
    "severity" "FatigueSeverity" NOT NULL,
    "status" "FatigueAlertStatus" NOT NULL DEFAULT 'active',
    "triggeredMetrics" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL DEFAULT 'Pause or refresh creative',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snoozeUntil" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FatigueAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FatigueAlert_userId_status_detectedAt_idx" ON "FatigueAlert"("userId", "status", "detectedAt");
CREATE INDEX "FatigueAlert_userId_externalEntityId_detectedAt_idx" ON "FatigueAlert"("userId", "externalEntityId", "detectedAt");
CREATE INDEX "FatigueAlert_provider_externalAccountId_externalEntityId_idx" ON "FatigueAlert"("provider", "externalAccountId", "externalEntityId");

ALTER TABLE "FatigueAlert" ADD CONSTRAINT "FatigueAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
