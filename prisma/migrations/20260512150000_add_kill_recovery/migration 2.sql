-- CreateEnum
CREATE TYPE "KillRecoveryStatus" AS ENUM ('pending', 'reviewing', 'matched', 'closed');

-- CreateTable
CREATE TABLE "KillRecoveryListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "productName" TEXT NOT NULL,
    "productPrice" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "killReason" TEXT NOT NULL,
    "mainProblem" TEXT NOT NULL,
    "adAnglesTested" TEXT[],
    "totalSpendWasted" DOUBLE PRECISION,
    "inventoryQty" INTEGER,
    "supplierUrl" TEXT,
    "status" "KillRecoveryStatus" NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "matchedAt" TIMESTAMP(3),
    "revenueUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KillRecoveryListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KillRecoveryListing_userId_createdAt_idx" ON "KillRecoveryListing"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KillRecoveryListing_status_createdAt_idx" ON "KillRecoveryListing"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "KillRecoveryListing" ADD CONSTRAINT "KillRecoveryListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KillRecoveryListing" ADD CONSTRAINT "KillRecoveryListing_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
