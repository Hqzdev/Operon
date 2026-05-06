ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "activeStoreId" TEXT;

CREATE TABLE IF NOT EXISTS "Store" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "platform" TEXT,
  "description" TEXT,
  "analysis" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Store_userId_url_key" ON "Store"("userId", "url");
CREATE INDEX IF NOT EXISTS "Store_userId_createdAt_idx" ON "Store"("userId", "createdAt");

ALTER TABLE "Store"
ADD CONSTRAINT "Store_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_activeStoreId_fkey"
FOREIGN KEY ("activeStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Store" ("id", "userId", "name", "url", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", COALESCE(NULLIF("storeName", ''), "storeUrl"), "storeUrl", NOW(), NOW()
FROM "User"
WHERE "storeUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Store"
    WHERE "Store"."userId" = "User"."id"
      AND "Store"."url" = "User"."storeUrl"
  );

UPDATE "User"
SET "activeStoreId" = seeded."id"
FROM (
  SELECT DISTINCT ON ("userId") "id", "userId"
  FROM "Store"
  ORDER BY "userId", "createdAt" ASC
) seeded
WHERE "User"."id" = seeded."userId"
  AND "User"."activeStoreId" IS NULL;
