"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadRepository = void 0;
const prisma_1 = require("../models/prisma");
class LeadRepository {
    static async upsert(data) {
        const { redditPostId, ...updateData } = data;
        return prisma_1.prisma.redditLead.upsert({
            where: { redditPostId },
            create: data,
            update: updateData,
        });
    }
    static async findById(id) {
        return prisma_1.prisma.redditLead.findUnique({ where: { id } });
    }
    static async findByPostId(redditPostId) {
        return prisma_1.prisma.redditLead.findUnique({ where: { redditPostId } });
    }
    static async findRecent(limit = 100) {
        return prisma_1.prisma.redditLead.findMany({
            orderBy: [{ postedAt: "desc" }, { score: "desc" }],
            take: limit,
        });
    }
    static async findTrending(since, limit = 10) {
        return prisma_1.prisma.redditLead.findMany({
            where: { postedAt: { gte: since } },
            orderBy: [{ score: "desc" }, { commentCount: "desc" }, { postedAt: "desc" }],
            take: limit,
        });
    }
    static async findMany(opts = {}) {
        return prisma_1.prisma.redditLead.findMany({
            where: {
                ...(opts.subreddit ? { subreddit: opts.subreddit } : {}),
                ...(opts.intentLevel ? { intentLevel: opts.intentLevel } : {}),
            },
            orderBy: { score: "desc" },
            take: opts.limit ?? 50,
            ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
        });
    }
    static async delete(id) {
        return prisma_1.prisma.redditLead.delete({ where: { id } });
    }
}
exports.LeadRepository = LeadRepository;
