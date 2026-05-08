CREATE TYPE "AdActionType" AS ENUM ('pause', 'increase_budget_20', 'decrease_budget_20', 'undo_budget_change');

CREATE TYPE "AdActionStatus" AS ENUM ('succeeded', 'failed', 'undone');

ALTER TABLE "IntegrationConnection" ADD COLUMN "maxDailyBudgetChangePercent" INTEGER NOT NULL DEFAULT 20;

CREATE TABLE "AdActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "entityName" TEXT,
    "verdictId" TEXT,
    "actionType" "AdActionType" NOT NULL,
    "status" "AdActionStatus" NOT NULL,
    "beforeState" JSONB NOT NULL,
    "afterState" JSONB,
    "errorMessage" TEXT,
    "undoUntil" TIMESTAMP(3),
    "undoneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdActionLog_userId_createdAt_idx" ON "AdActionLog"("userId", "createdAt");
CREATE INDEX "AdActionLog_connectionId_externalEntityId_createdAt_idx" ON "AdActionLog"("connectionId", "externalEntityId", "createdAt");
CREATE INDEX "AdActionLog_verdictId_idx" ON "AdActionLog"("verdictId");

ALTER TABLE "AdActionLog" ADD CONSTRAINT "AdActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdActionLog" ADD CONSTRAINT "AdActionLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdActionLog" ADD CONSTRAINT "AdActionLog_verdictId_fkey" FOREIGN KEY ("verdictId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
