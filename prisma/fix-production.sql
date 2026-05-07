-- Run this in your production database console (Railway / Supabase / Neon / etc.)
-- Safe to run multiple times — all statements use IF NOT EXISTS guards.

BEGIN;

-- Migration: 20260504090000_add_read_only_integrations
DO $$ BEGIN
  CREATE TYPE "IntegrationProvider" AS ENUM ('META', 'TIKTOK', 'SHOPIFY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ACTION_REQUIRED', 'DISCONNECTED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "provider"          "IntegrationProvider" NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "accountName"       TEXT,
  "accessToken"       TEXT NOT NULL,
  "refreshToken"      TEXT,
  "tokenExpiresAt"    TIMESTAMP(3),
  "scopes"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"            "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
  "metadata"          JSONB,
  "lastSyncedAt"      TIMESTAMP(3),
  "nextSyncAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncLockUntil"     TIMESTAMP(3),
  "lastError"         TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IntegrationMetricSnapshot" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "connectionId"      TEXT NOT NULL,
  "provider"          "IntegrationProvider" NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "externalEntityId"  TEXT NOT NULL,
  "entityName"        TEXT,
  "date"              TIMESTAMP(3) NOT NULL,
  "metrics"           JSONB NOT NULL,
  "analysisInput"     JSONB NOT NULL,
  "source"            JSONB,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_userId_provider_externalAccountId_key"
  ON "IntegrationConnection"("userId", "provider", "externalAccountId");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_userId_provider_idx"
  ON "IntegrationConnection"("userId", "provider");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_nextSyncAt_status_idx"
  ON "IntegrationConnection"("nextSyncAt", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationMetricSnapshot_unique_idx"
  ON "IntegrationMetricSnapshot"("userId", "provider", "externalAccountId", "externalEntityId", "date");
CREATE INDEX IF NOT EXISTS "IntegrationMetricSnapshot_userId_date_idx"
  ON "IntegrationMetricSnapshot"("userId", "date");
CREATE INDEX IF NOT EXISTS "IntegrationMetricSnapshot_connectionId_date_idx"
  ON "IntegrationMetricSnapshot"("connectionId", "date");

ALTER TABLE "IntegrationConnection"
  DROP CONSTRAINT IF EXISTS "IntegrationConnection_userId_fkey";
ALTER TABLE "IntegrationConnection"
  ADD CONSTRAINT "IntegrationConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationMetricSnapshot"
  DROP CONSTRAINT IF EXISTS "IntegrationMetricSnapshot_userId_fkey";
ALTER TABLE "IntegrationMetricSnapshot"
  ADD CONSTRAINT "IntegrationMetricSnapshot_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationMetricSnapshot"
  DROP CONSTRAINT IF EXISTS "IntegrationMetricSnapshot_connectionId_fkey";
ALTER TABLE "IntegrationMetricSnapshot"
  ADD CONSTRAINT "IntegrationMetricSnapshot_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: 20260505000000_add_seo_analysis
CREATE TABLE IF NOT EXISTS "SeoAnalysis" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "storeUrl"   TEXT NOT NULL,
  "result"     JSONB NOT NULL,
  "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeoAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SeoAnalysis_userId_key" ON "SeoAnalysis"("userId");
ALTER TABLE "SeoAnalysis"
  DROP CONSTRAINT IF EXISTS "SeoAnalysis_userId_fkey";
ALTER TABLE "SeoAnalysis"
  ADD CONSTRAINT "SeoAnalysis_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: 20260505074500_add_onboarding_fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storeUrl"            TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Migration: 20260506000000_add_stores
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activeStoreId" TEXT;

CREATE TABLE IF NOT EXISTS "Store" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "platform"    TEXT,
  "description" TEXT,
  "analysis"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Store_userId_url_key" ON "Store"("userId", "url");
CREATE INDEX IF NOT EXISTS "Store_userId_createdAt_idx" ON "Store"("userId", "createdAt");

ALTER TABLE "Store"
  DROP CONSTRAINT IF EXISTS "Store_userId_fkey";
ALTER TABLE "Store"
  ADD CONSTRAINT "Store_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_activeStoreId_fkey";
ALTER TABLE "User"
  ADD CONSTRAINT "User_activeStoreId_fkey"
  FOREIGN KEY ("activeStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed stores from existing storeUrl data
INSERT INTO "Store" ("id", "userId", "name", "url", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id",
       COALESCE(NULLIF("storeName", ''), "storeUrl"), "storeUrl", NOW(), NOW()
FROM "User"
WHERE "storeUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Store" WHERE "Store"."userId" = "User"."id" AND "Store"."url" = "User"."storeUrl"
  );

UPDATE "User" SET "activeStoreId" = s."id"
FROM (SELECT DISTINCT ON ("userId") "id", "userId" FROM "Store" ORDER BY "userId", "createdAt" ASC) s
WHERE "User"."id" = s."userId" AND "User"."activeStoreId" IS NULL;

-- Migration: 20260507000000_add_notifications
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('digest', 'alert', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "type"      "NotificationType" NOT NULL DEFAULT 'info',
  "read"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx"      ON "Notification"("userId", "read");

CREATE TABLE IF NOT EXISTS "DigestLog" (
  "id"      TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "sentAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summary" JSONB NOT NULL,
  CONSTRAINT "DigestLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DigestLog_userId_sentAt_idx" ON "DigestLog"("userId", "sentAt");

ALTER TABLE "Notification"
  DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DigestLog"
  DROP CONSTRAINT IF EXISTS "DigestLog_userId_fkey";
ALTER TABLE "DigestLog"
  ADD CONSTRAINT "DigestLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
