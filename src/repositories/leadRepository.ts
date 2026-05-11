import { prisma } from "../models/prisma";
import type { RedditIntentLevel } from "@prisma/client";

export interface CreateLeadDTO {
  redditPostId: string;
  username: string;
  subreddit: string;
  postUrl: string;
  title: string;
  body: string;
  problemSummary?: string;
  intentLevel?: RedditIntentLevel;
  outreachAngle?: string;
  painSignals?: string[];
  score?: number;
  upvotes?: number;
  commentCount?: number;
  postedAt?: Date;
}

type LeadUpdateData = Omit<CreateLeadDTO, "redditPostId">;

export class LeadRepository {
  static async upsert(data: CreateLeadDTO) {
    const { redditPostId, ...updateData } = data;
    return prisma.redditLead.upsert({
      where: { redditPostId },
      create: data,
      update: updateData as LeadUpdateData,
    });
  }

  static async findById(id: string) {
    return prisma.redditLead.findUnique({ where: { id } });
  }

  static async findByPostId(redditPostId: string) {
    return prisma.redditLead.findUnique({ where: { redditPostId } });
  }

  static async findRecent(limit = 100) {
    return prisma.redditLead.findMany({
      orderBy: [{ postedAt: "desc" }, { score: "desc" }],
      take: limit,
    });
  }

  static async findTrending(since: Date, limit = 10) {
    return prisma.redditLead.findMany({
      where: { postedAt: { gte: since } },
      orderBy: [{ score: "desc" }, { commentCount: "desc" }, { postedAt: "desc" }],
      take: limit,
    });
  }

  static async findMany(opts: {
    subreddit?: string;
    intentLevel?: RedditIntentLevel;
    limit?: number;
    cursor?: string;
  } = {}) {
    return prisma.redditLead.findMany({
      where: {
        ...(opts.subreddit ? { subreddit: opts.subreddit } : {}),
        ...(opts.intentLevel ? { intentLevel: opts.intentLevel } : {}),
      },
      orderBy: { score: "desc" },
      take: opts.limit ?? 50,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
  }

  static async delete(id: string) {
    return prisma.redditLead.delete({ where: { id } });
  }
}
