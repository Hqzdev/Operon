CREATE TYPE "RecommendationOutcomeStatus" AS ENUM ('pending', 'evaluated', 'unavailable');

CREATE TABLE "RecommendationOutcome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" "IntegrationProvider",
    "externalAccountId" TEXT,
    "externalEntityId" TEXT,
    "entityName" TEXT,
    "inputSnapshot" JSONB NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" INTEGER,
    "breakEvenRoas" DOUBLE PRECISION NOT NULL,
    "breakEvenCpa" DOUBLE PRECISION,
    "evaluationHorizonDays" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "RecommendationOutcomeStatus" NOT NULL DEFAULT 'pending',
    "actualMetrics" JSONB,
    "wasRight" BOOLEAN,
    "moneySaved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moneyEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evaluatedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationOutcome_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecommendationOutcome_analysisId_evaluationHorizonDays_key" ON "RecommendationOutcome"("analysisId", "evaluationHorizonDays");
CREATE INDEX "RecommendationOutcome_userId_issuedAt_idx" ON "RecommendationOutcome"("userId", "issuedAt");
CREATE INDEX "RecommendationOutcome_userId_status_scheduledFor_idx" ON "RecommendationOutcome"("userId", "status", "scheduledFor");
CREATE INDEX "RecommendationOutcome_connectionId_externalEntityId_scheduledFor_idx" ON "RecommendationOutcome"("connectionId", "externalEntityId", "scheduledFor");

ALTER TABLE "RecommendationOutcome" ADD CONSTRAINT "RecommendationOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecommendationOutcome" ADD CONSTRAINT "RecommendationOutcome_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecommendationOutcome" ADD CONSTRAINT "RecommendationOutcome_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
