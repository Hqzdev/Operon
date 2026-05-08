CREATE TABLE "SimulationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "entityName" TEXT,
    "scenarios" JSONB NOT NULL,
    "baseline" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "signalBreakdown" JSONB NOT NULL,
    "actualOutcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SimulationLog_userId_externalEntityId_createdAt_idx" ON "SimulationLog"("userId", "externalEntityId", "createdAt");
CREATE INDEX "SimulationLog_provider_externalAccountId_externalEntityId_idx" ON "SimulationLog"("provider", "externalAccountId", "externalEntityId");

ALTER TABLE "SimulationLog" ADD CONSTRAINT "SimulationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
