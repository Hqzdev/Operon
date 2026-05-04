CREATE TYPE "IntegrationProvider" AS ENUM ('META', 'TIKTOK', 'SHOPIFY');

CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ACTION_REQUIRED', 'DISCONNECTED', 'ERROR');

CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "accountName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncLockUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationMetricSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "entityName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "analysisInput" JSONB NOT NULL,
    "source" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConnection_userId_provider_externalAccountId_key" ON "IntegrationConnection"("userId", "provider", "externalAccountId");
CREATE INDEX "IntegrationConnection_userId_provider_idx" ON "IntegrationConnection"("userId", "provider");
CREATE INDEX "IntegrationConnection_nextSyncAt_status_idx" ON "IntegrationConnection"("nextSyncAt", "status");
CREATE UNIQUE INDEX "IntegrationMetricSnapshot_userId_provider_externalAccountId_externalEntityId_date_key" ON "IntegrationMetricSnapshot"("userId", "provider", "externalAccountId", "externalEntityId", "date");
CREATE INDEX "IntegrationMetricSnapshot_userId_date_idx" ON "IntegrationMetricSnapshot"("userId", "date");
CREATE INDEX "IntegrationMetricSnapshot_connectionId_date_idx" ON "IntegrationMetricSnapshot"("connectionId", "date");

ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationMetricSnapshot" ADD CONSTRAINT "IntegrationMetricSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationMetricSnapshot" ADD CONSTRAINT "IntegrationMetricSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
