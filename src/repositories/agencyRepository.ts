import { prisma } from "../models/prisma";

type WorkspaceRow = {
  id: string;
  ownerId: string;
  name: string;
  logoUrl: string | null;
};

type ClientRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  storeUrl: string | null;
  userId: string | null;
  createdAt: Date;
};

type ReportRow = {
  id: string;
  clientId: string;
  weekStart: Date;
  generatedAt: Date;
  filename: string;
};

export class AgencyRepository {
  static async findWorkspaceByUser(userId: string): Promise<WorkspaceRow | null> {
    const rows = await prisma.$queryRaw<WorkspaceRow[]>`
      SELECT w."id", w."ownerId", w."name", w."logoUrl"
      FROM "AgencyWorkspace" w
      JOIN "AgencyMember" m ON m."workspaceId" = w."id"
      WHERE m."userId" = ${userId}
        AND m."acceptedAt" IS NOT NULL
      ORDER BY w."createdAt" ASC
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  static async findWorkspaceById(workspaceId: string): Promise<WorkspaceRow | null> {
    const rows = await prisma.$queryRaw<WorkspaceRow[]>`
      SELECT "id", "ownerId", "name", "logoUrl"
      FROM "AgencyWorkspace"
      WHERE "id" = ${workspaceId}
    `;
    return rows[0] ?? null;
  }

  static async findAllWorkspaces(): Promise<WorkspaceRow[]> {
    return prisma.$queryRaw<WorkspaceRow[]>`
      SELECT "id", "ownerId", "name", "logoUrl"
      FROM "AgencyWorkspace"
    `;
  }

  static async createWorkspace(id: string, ownerId: string, name: string, now: Date) {
    await prisma.$executeRaw`
      INSERT INTO "AgencyWorkspace" ("id", "ownerId", "name", "createdAt", "updatedAt")
      VALUES (${id}, ${ownerId}, ${name}, ${now}, ${now})
    `;
  }

  static async updateWorkspace(workspaceId: string, name: string | null, logoUrl: string | null) {
    await prisma.$executeRaw`
      UPDATE "AgencyWorkspace"
      SET
        "name" = COALESCE(${name}, "name"),
        "logoUrl" = ${logoUrl},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${workspaceId}
    `;
  }

  static async createMember(id: string, workspaceId: string, userId: string, role: string, now: Date) {
    await prisma.$executeRaw`
      INSERT INTO "AgencyMember" ("id", "workspaceId", "userId", "role", "acceptedAt", "createdAt", "updatedAt")
      VALUES (${id}, ${workspaceId}, ${userId}, ${role}::"AgencyRole", ${now}, ${now}, ${now})
    `;
  }

  static async getMemberRole(userId: string, workspaceId: string): Promise<string | null> {
    const rows = await prisma.$queryRaw<Array<{ role: string }>>`
      SELECT "role"::text AS "role"
      FROM "AgencyMember"
      WHERE "workspaceId" = ${workspaceId}
        AND "userId" = ${userId}
        AND "acceptedAt" IS NOT NULL
      LIMIT 1
    `;
    return rows[0]?.role ?? null;
  }

  static async createClientInvite(
    id: string,
    workspaceId: string,
    clientId: string,
    email: string,
    token: string,
    expiresAt: Date,
    now: Date,
  ) {
    await prisma.$executeRaw`
      INSERT INTO "AgencyMember" ("id", "workspaceId", "clientId", "role", "invitedEmail", "inviteToken", "inviteExpiresAt", "createdAt", "updatedAt")
      VALUES (${id}, ${workspaceId}, ${clientId}, 'view_only'::"AgencyRole", ${email}, ${token}, ${expiresAt}, ${now}, ${now})
    `;
  }

  static async findPendingInvite(token: string) {
    const rows = await prisma.$queryRaw<Array<{ id: string; workspaceId: string; invitedEmail: string | null; clientId: string | null }>>`
      SELECT "id", "workspaceId", "invitedEmail", "clientId"
      FROM "AgencyMember"
      WHERE "inviteToken" = ${token}
        AND "acceptedAt" IS NULL
        AND "inviteExpiresAt" > ${new Date()}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  static async acceptInvite(memberId: string, userId: string) {
    await prisma.$executeRaw`
      UPDATE "AgencyMember"
      SET "userId" = ${userId}, "acceptedAt" = ${new Date()}, "inviteToken" = NULL, "updatedAt" = ${new Date()}
      WHERE "id" = ${memberId}
    `;
  }

  static async createClient(id: string, workspaceId: string, name: string, contactEmail: string | null, storeUrl: string | null, now: Date) {
    await prisma.$executeRaw`
      INSERT INTO "AgencyClient" ("id", "workspaceId", "name", "contactEmail", "storeUrl", "createdAt", "updatedAt")
      VALUES (${id}, ${workspaceId}, ${name}, ${contactEmail}, ${storeUrl}, ${now}, ${now})
    `;
  }

  static async findClientById(clientId: string, workspaceId: string): Promise<ClientRow | null> {
    const rows = await prisma.$queryRaw<ClientRow[]>`
      SELECT * FROM "AgencyClient" WHERE "id" = ${clientId} AND "workspaceId" = ${workspaceId} LIMIT 1
    `;
    return rows[0] ?? null;
  }

  static async findClientsByWorkspace(workspaceId: string, clientId?: string | null): Promise<ClientRow[]> {
    return prisma.$queryRaw<ClientRow[]>`
      SELECT "id", "name", "contactEmail", "storeUrl", "userId", "createdAt"
      FROM "AgencyClient"
      WHERE "workspaceId" = ${workspaceId}
        AND (${clientId ?? null}::text IS NULL OR "id" = ${clientId ?? null})
      ORDER BY "createdAt" DESC
    `;
  }

  static async setClientUserId(clientId: string, userId: string) {
    await prisma.$executeRaw`
      UPDATE "AgencyClient" SET "userId" = ${userId}, "updatedAt" = ${new Date()} WHERE "id" = ${clientId}
    `;
  }

  static async getViewOnlyClientId(workspaceId: string, userId: string): Promise<string | null> {
    const rows = await prisma.$queryRaw<Array<{ clientId: string }>>`
      SELECT "clientId" FROM "AgencyMember" WHERE "workspaceId" = ${workspaceId} AND "userId" = ${userId} LIMIT 1
    `;
    return rows[0]?.clientId ?? null;
  }

  static async findReportsByWorkspace(workspaceId: string, limit: number): Promise<ReportRow[]> {
    return prisma.$queryRaw<ReportRow[]>`
      SELECT "id", "clientId", "weekStart", "generatedAt", "filename"
      FROM "AgencyClientReport"
      WHERE "workspaceId" = ${workspaceId}
      ORDER BY "generatedAt" DESC
      LIMIT ${limit}
    `;
  }

  static async findReportExists(clientId: string, weekStart: Date): Promise<boolean> {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "AgencyClientReport" WHERE "clientId" = ${clientId} AND "weekStart" = ${weekStart} LIMIT 1
    `;
    return rows.length > 0;
  }

  static async createReport(id: string, workspaceId: string, clientId: string, weekStart: Date, summary: object, pdfBase64: string, filename: string) {
    await prisma.$executeRaw`
      INSERT INTO "AgencyClientReport" ("id", "workspaceId", "clientId", "weekStart", "summary", "pdfBase64", "filename")
      VALUES (${id}, ${workspaceId}, ${clientId}, ${weekStart}, ${JSON.stringify(summary)}::jsonb, ${pdfBase64}, ${filename})
    `;
  }

  static async findReportPdf(reportId: string, workspaceId: string): Promise<{ pdfBase64: string; filename: string } | null> {
    const rows = await prisma.$queryRaw<Array<{ pdfBase64: string; filename: string }>>`
      SELECT "pdfBase64", "filename" FROM "AgencyClientReport"
      WHERE "id" = ${reportId} AND "workspaceId" = ${workspaceId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }
}
