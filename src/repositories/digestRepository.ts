import { prisma } from "../models/prisma";

export class DigestRepository {
  static async create(userId: string, summary: object) {
    return prisma.digestLog.create({ data: { userId, summary } });
  }

  static async findUsersForDigest() {
    return prisma.user.findMany({
      where: { onboardingCompleted: true, weeklyDigestEnabled: true },
      select: { id: true },
    });
  }
}
