CREATE TABLE "community_benchmarks" (
  "id" TEXT NOT NULL,
  "niche" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "analysisCount" INTEGER NOT NULL,
  "medianCtr" DOUBLE PRECISION NOT NULL,
  "medianCpc" DOUBLE PRECISION NOT NULL,
  "medianCpm" DOUBLE PRECISION NOT NULL,
  "medianAddToCartRate" DOUBLE PRECISION NOT NULL,
  "medianPurchaseRate" DOUBLE PRECISION NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "community_benchmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_benchmarks_niche_country_key" ON "community_benchmarks"("niche", "country");
CREATE INDEX "community_benchmarks_country_niche_idx" ON "community_benchmarks"("country", "niche");
CREATE INDEX "community_benchmarks_computedAt_idx" ON "community_benchmarks"("computedAt");
