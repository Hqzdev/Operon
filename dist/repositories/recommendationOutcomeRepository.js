"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationOutcomeRepository = void 0;
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../models/prisma");
class RecommendationOutcomeRepository {
    static async insertIfNotExists(input) {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO "RecommendationOutcome" (
        "id", "userId", "analysisId", "connectionId", "provider",
        "externalAccountId", "externalEntityId", "entityName",
        "inputSnapshot", "verdict", "confidence",
        "breakEvenRoas", "breakEvenCpa", "evaluationHorizonDays",
        "scheduledFor", "issuedAt", "updatedAt"
      )
      VALUES (
        ${(0, node_crypto_1.randomUUID)()},
        ${input.userId},
        ${input.analysisId},
        ${input.connectionId},
        ${input.provider}::"IntegrationProvider",
        ${input.externalAccountId},
        ${input.externalEntityId},
        ${input.entityName},
        ${input.inputSnapshot}::jsonb,
        ${input.verdict},
        ${input.confidence},
        ${input.breakEvenRoas},
        ${input.breakEvenCpa},
        ${input.horizon},
        ${input.scheduledFor},
        ${input.issuedAt},
        ${new Date()}
      )
      ON CONFLICT ("analysisId", "evaluationHorizonDays") DO NOTHING
    `;
    }
    static async findDue(limit) {
        return prisma_1.prisma.$queryRaw `
      SELECT *
      FROM "RecommendationOutcome"
      WHERE "status" = 'pending'::"RecommendationOutcomeStatus"
        AND "scheduledFor" <= ${new Date()}
      ORDER BY "scheduledFor" ASC
      LIMIT ${limit}
    `;
    }
    static async markEvaluated(id, actualMetrics, wasRight, moneySaved, moneyEarned) {
        await prisma_1.prisma.$executeRaw `
      UPDATE "RecommendationOutcome"
      SET
        "status" = 'evaluated'::"RecommendationOutcomeStatus",
        "actualMetrics" = ${JSON.stringify(actualMetrics)}::jsonb,
        "wasRight" = ${wasRight},
        "moneySaved" = ${moneySaved},
        "moneyEarned" = ${moneyEarned},
        "evaluatedAt" = ${new Date()},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${id}
    `;
    }
    static async markUnavailable(id) {
        await prisma_1.prisma.$executeRaw `
      UPDATE "RecommendationOutcome"
      SET
        "status" = 'unavailable'::"RecommendationOutcomeStatus",
        "evaluatedAt" = ${new Date()},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${id}
    `;
    }
    static async getAggregate(userId, since) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT
        COUNT(*) FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus") AS evaluated_count,
        COUNT(*) FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus" AND "wasRight" = true) AS correct_count,
        COUNT(*) FILTER (WHERE "status" = 'pending'::"RecommendationOutcomeStatus") AS pending_count,
        COALESCE(SUM("moneySaved") FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus"), 0) AS money_saved,
        COALESCE(SUM("moneyEarned") FILTER (WHERE "status" = 'evaluated'::"RecommendationOutcomeStatus"), 0) AS money_earned
      FROM "RecommendationOutcome"
      WHERE "userId" = ${userId}
        AND "issuedAt" >= ${since}
    `;
        return rows[0];
    }
    static async getRecent(userId, limit) {
        return prisma_1.prisma.$queryRaw `
      SELECT
        "id",
        "verdict",
        "confidence",
        "evaluationHorizonDays" AS "horizonDays",
        "wasRight",
        "status",
        "moneySaved",
        "moneyEarned",
        "issuedAt",
        "evaluatedAt",
        "entityName"
      FROM "RecommendationOutcome"
      WHERE "userId" = ${userId}
      ORDER BY "issuedAt" DESC, "evaluationHorizonDays" ASC
      LIMIT ${limit}
    `;
    }
}
exports.RecommendationOutcomeRepository = RecommendationOutcomeRepository;
