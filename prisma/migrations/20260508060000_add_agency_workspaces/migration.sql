CREATE TYPE "AgencyRole" AS ENUM ('owner', 'member', 'view_only');

CREATE TABLE "AgencyWorkspace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgencyClient" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "storeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgencyMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "role" "AgencyRole" NOT NULL,
    "invitedEmail" TEXT,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgencyClientReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB NOT NULL,
    "pdfBase64" TEXT NOT NULL,
    "filename" TEXT NOT NULL,

    CONSTRAINT "AgencyClientReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgencyMember_inviteToken_key" ON "AgencyMember"("inviteToken");
CREATE UNIQUE INDEX "AgencyMember_workspaceId_userId_key" ON "AgencyMember"("workspaceId", "userId");
CREATE UNIQUE INDEX "AgencyClientReport_clientId_weekStart_key" ON "AgencyClientReport"("clientId", "weekStart");
CREATE INDEX "AgencyWorkspace_ownerId_idx" ON "AgencyWorkspace"("ownerId");
CREATE INDEX "AgencyMember_workspaceId_role_idx" ON "AgencyMember"("workspaceId", "role");
CREATE INDEX "AgencyMember_userId_idx" ON "AgencyMember"("userId");
CREATE INDEX "AgencyMember_clientId_idx" ON "AgencyMember"("clientId");
CREATE INDEX "AgencyClient_workspaceId_createdAt_idx" ON "AgencyClient"("workspaceId", "createdAt");
CREATE INDEX "AgencyClient_userId_idx" ON "AgencyClient"("userId");
CREATE INDEX "AgencyClientReport_workspaceId_generatedAt_idx" ON "AgencyClientReport"("workspaceId", "generatedAt");

ALTER TABLE "AgencyWorkspace" ADD CONSTRAINT "AgencyWorkspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyClient" ADD CONSTRAINT "AgencyClient_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AgencyWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyClient" ADD CONSTRAINT "AgencyClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AgencyWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgencyClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyClientReport" ADD CONSTRAINT "AgencyClientReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AgencyWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyClientReport" ADD CONSTRAINT "AgencyClientReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgencyClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
