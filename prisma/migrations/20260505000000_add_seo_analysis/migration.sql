-- CreateTable
CREATE TABLE "SeoAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoAnalysis_userId_key" ON "SeoAnalysis"("userId");

-- AddForeignKey
ALTER TABLE "SeoAnalysis" ADD CONSTRAINT "SeoAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
