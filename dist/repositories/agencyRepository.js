"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgencyRepository = void 0;
const prisma_1 = require("../models/prisma");
class AgencyRepository {
    static async findWorkspaceByUser(userId) {
        const rows = await prisma_1.prisma.$queryRaw `
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
    static async findWorkspaceById(workspaceId) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT "id", "ownerId", "name", "logoUrl"
      FROM "AgencyWorkspace"
      WHERE "id" = ${workspaceId}
    `;
        return rows[0] ?? null;
    }
    static async findAllWorkspaces() {
        return prisma_1.prisma.$queryRaw `
      SELECT "id", "ownerId", "name", "logoUrl"
      FROM "AgencyWorkspace"
    `;
    }
    static async createWorkspace(id, ownerId, name, now) {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO "AgencyWorkspace" ("id", "ownerId", "name", "createdAt", "updatedAt")
      VALUES (${id}, ${ownerId}, ${name}, ${now}, ${now})
    `;
    }
    static async updateWorkspace(workspaceId, name, logoUrl) {
        await prisma_1.prisma.$executeRaw `
      UPDATE "AgencyWorkspace"
      SET
        "name" = COALESCE(${name}, "name"),
        "logoUrl" = ${logoUrl},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${workspaceId}
    `;
    }
    static async createMember(id, workspaceId, userId, role, now) {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO "AgencyMember" ("id", "workspaceId", "userId", "role", "acceptedAt", "createdAt", "updatedAt")
      VALUES (${id}, ${workspaceId}, ${userId}, ${role}::"AgencyRole", ${now}, ${now}, ${now})
    `;
    }
    static async getMemberRole(userId, workspaceId) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT "role"::text AS "role"
      FROM "AgencyMember"
      WHERE "workspaceId" = ${workspaceId}
        AND "userId" = ${userId}
        AND "acceptedAt" IS NOT NULL
      LIMIT 1
    `;
        return rows[0]?.role ?? null;
    }
    static async createClientInvite(id, workspaceId, clientId, email, token, expiresAt, now) {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO "AgencyMember" ("id", "workspaceId", "clientId", "role", "invitedEmail", "inviteToken", "inviteExpiresAt", "createdAt", "updatedAt")
      VALUES (${id}, ${workspaceId}, ${clientId}, 'view_only'::"AgencyRole", ${email}, ${token}, ${expiresAt}, ${now}, ${now})
    `;
    }
    static async findPendingInvite(token) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT "id", "workspaceId", "invitedEmail", "clientId"
      FROM "AgencyMember"
      WHERE "inviteToken" = ${token}
        AND "acceptedAt" IS NULL
        AND "inviteExpiresAt" > ${new Date()}
      LIMIT 1
    `;
        return rows[0] ?? null;
    }
    static async acceptInvite(memberId, userId) {
        await prisma_1.prisma.$executeRaw `
      UPDATE "AgencyMember"
      SET "userId" = ${userId}, "acceptedAt" = ${new Date()}, "inviteToken" = NULL, "updatedAt" = ${new Date()}
      WHERE "id" = ${memberId}
    `;
    }
    static async createClient(id, workspaceId, name, contactEmail, storeUrl, now) {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO "AgencyClient" ("id", "workspaceId", "name", "contactEmail", "storeUrl", "createdAt", "updatedAt")
      VALUES (${id}, ${workspaceId}, ${name}, ${contactEmail}, ${storeUrl}, ${now}, ${now})
    `;
    }
    static async findClientById(clientId, workspaceId) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT * FROM "AgencyClient" WHERE "id" = ${clientId} AND "workspaceId" = ${workspaceId} LIMIT 1
    `;
        return rows[0] ?? null;
    }
    static async findClientsByWorkspace(workspaceId, clientId) {
        return prisma_1.prisma.$queryRaw `
      SELECT "id", "name", "contactEmail", "storeUrl", "userId", "createdAt"
      FROM "AgencyClient"
      WHERE "workspaceId" = ${workspaceId}
        AND (${clientId ?? null}::text IS NULL OR "id" = ${clientId ?? null})
      ORDER BY "createdAt" DESC
    `;
    }
    static async setClientUserId(clientId, userId) {
        await prisma_1.prisma.$executeRaw `
      UPDATE "AgencyClient" SET "userId" = ${userId}, "updatedAt" = ${new Date()} WHERE "id" = ${clientId}
    `;
    }
    static async getViewOnlyClientId(workspaceId, userId) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT "clientId" FROM "AgencyMember" WHERE "workspaceId" = ${workspaceId} AND "userId" = ${userId} LIMIT 1
    `;
        return rows[0]?.clientId ?? null;
    }
    static async findReportsByWorkspace(workspaceId, limit) {
        return prisma_1.prisma.$queryRaw `
      SELECT "id", "clientId", "weekStart", "generatedAt", "filename"
      FROM "AgencyClientReport"
      WHERE "workspaceId" = ${workspaceId}
      ORDER BY "generatedAt" DESC
      LIMIT ${limit}
    `;
    }
    static async findReportExists(clientId, weekStart) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT "id" FROM "AgencyClientReport" WHERE "clientId" = ${clientId} AND "weekStart" = ${weekStart} LIMIT 1
    `;
        return rows.length > 0;
    }
    static async createReport(id, workspaceId, clientId, weekStart, summary, pdfBase64, filename) {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO "AgencyClientReport" ("id", "workspaceId", "clientId", "weekStart", "summary", "pdfBase64", "filename")
      VALUES (${id}, ${workspaceId}, ${clientId}, ${weekStart}, ${JSON.stringify(summary)}::jsonb, ${pdfBase64}, ${filename})
    `;
    }
    static async findReportPdf(reportId, workspaceId) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT "pdfBase64", "filename" FROM "AgencyClientReport"
      WHERE "id" = ${reportId} AND "workspaceId" = ${workspaceId}
      LIMIT 1
    `;
        return rows[0] ?? null;
    }
}
exports.AgencyRepository = AgencyRepository;
