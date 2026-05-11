import { prisma } from "../models/prisma";

export class SeoRepository {
  static async upsert(userId: string, storeUrl: string, result: object) {
    await prisma.$executeRaw`
      INSERT INTO "SeoAnalysis" ("id", "userId", "storeUrl", "result", "analyzedAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${storeUrl}, ${JSON.stringify(result)}::jsonb, NOW())
      ON CONFLICT ("userId") DO UPDATE
      SET "storeUrl" = EXCLUDED."storeUrl",
          "result" = EXCLUDED."result",
          "analyzedAt" = EXCLUDED."analyzedAt"
    `;
  }

  static async findByUserId<T>(userId: string): Promise<T | null> {
    const rows = await prisma.$queryRaw<Array<{ result: T; analyzed_at: string }>>`
      SELECT result, "analyzedAt" as analyzed_at
      FROM "SeoAnalysis"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    if (!rows.length) return null;
    return rows[0].result;
  }
}
