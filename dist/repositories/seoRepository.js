"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoRepository = void 0;
const prisma_1 = require("../models/prisma");
class SeoRepository {
    static async upsert(userId, storeUrl, result) {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO "SeoAnalysis" ("id", "userId", "storeUrl", "result", "analyzedAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${storeUrl}, ${JSON.stringify(result)}::jsonb, NOW())
      ON CONFLICT ("userId") DO UPDATE
      SET "storeUrl" = EXCLUDED."storeUrl",
          "result" = EXCLUDED."result",
          "analyzedAt" = EXCLUDED."analyzedAt"
    `;
    }
    static async findByUserId(userId) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT result, "analyzedAt" as analyzed_at
      FROM "SeoAnalysis"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
        if (!rows.length)
            return null;
        return rows[0].result;
    }
}
exports.SeoRepository = SeoRepository;
