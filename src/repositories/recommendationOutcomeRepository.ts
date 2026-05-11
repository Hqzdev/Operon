import { randomUUID } from "node:crypto";
import { prisma } from "../models/prisma";
import type { IntegrationProvider } from "@prisma/client";

type OutcomeInsertInput = {
  userId: string;
  analysisId: string;
  connectionId: string | null;
  provider: IntegrationProvider | null;
  externalAccountId: string | null;
  externalEntityId: string | null;
  entityName: string | null;
  inputSnapshot: string;
  verdict: string;
  confidence: number;
  breakEvenRoas: number;
  breakEvenCpa: number | null;
  horizon: number;
  scheduledFor: Date;
  issuedAt: Date;
};

type OutcomeRow = {
  id: string;
  userId: string;
  analysisId: string;
  connectionId: string | null;
  provider: IntegrationProvider | null;
  externalAccountId: string | null;
  externalEntityId: string | null;
  entityName: string | null;
  inputSnapshot: unknown;
  verdict: string;
  confidence: number | null;
  breakEvenRoas: number;
  breakEvenCpa: number | null;
  evaluationHorizonDays: number;
  scheduledFor: Date;
  issuedAt: Date;
};

type AggregateRow = {
  evaluated_count: bigint;
  correct_count: bigint;
  pending_count: bigint;
  money_saved: number | null;
  money_earned: number | null;
};

type RecentOutcomeRow = {
  id: string;
  verdict: string;
  confidence: number | null;
  horizonDays: number;
  wasRight: boolean | null;
  status: string;
  moneySaved: number;
  moneyEarned: number;
  issuedAt: Date;
  evaluatedAt: Date | null;
  entityName: string | null;
};

export class RecommendationOutcomeRepository {
  static async insertIfNotExists(input: OutcomeInsertInput) {
    await prisma.$executeRaw`
      INSERT INTO "RecommendationOutcome" (
        "id", "userId", "analysisId", "connectionId", "provider",
        "externalAccountId", "externalEntityId", "entityName",
        "inputSnapshot", "verdict", "confidence",
        "breakEvenRoas", "breakEvenCpa", "evaluationHorizonDays",
        "scheduledFor", "issuedAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
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

  static async findDue(limit: number): Promise<OutcomeRow[]> {
    return prisma.$queryRaw<OutcomeRow[]>`
      SELECT *
      FROM "RecommendationOutcome"
      WHERE "status" = 'pending'::"RecommendationOutcomeStatus"
        AND "scheduledFor" <= ${new Date()}
      ORDER BY "scheduledFor" ASC
      LIMIT ${limit}
    `;
  }

  static async markEvaluated(id: string, actualMetrics: object, wasRight: boolean, moneySaved: number, moneyEarned: number) {
    await prisma.$executeRaw`
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

  static async markUnavailable(id: string) {
    await prisma.$executeRaw`
      UPDATE "RecommendationOutcome"
      SET
        "status" = 'unavailable'::"RecommendationOutcomeStatus",
        "evaluatedAt" = ${new Date()},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${id}
    `;
  }

  static async getAggregate(userId: string, since: Date): Promise<AggregateRow> {
    const rows = await prisma.$queryRaw<AggregateRow[]>`
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

  static async getRecent(userId: string, limit: number): Promise<RecentOutcomeRow[]> {
    return prisma.$queryRaw<RecentOutcomeRow[]>`
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
