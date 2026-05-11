import { prisma } from "../models/prisma";
import type { Prisma } from "@prisma/client";

type StoreUpsertData = {
  name: string;
  platform?: string;
  description?: string;
  analysis?: Prisma.InputJsonValue;
};

export class StoreRepository {
  static async findByUserId(userId: string) {
    return prisma.store.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  static async findByIdAndUser(storeId: string, userId: string) {
    return prisma.store.findFirst({ where: { id: storeId, userId } });
  }

  static async upsert(userId: string, url: string, create: StoreUpsertData, update: StoreUpsertData) {
    return prisma.store.upsert({
      where: { userId_url: { userId, url } },
      create: { userId, url, ...create },
      update,
    });
  }

  static async delete(id: string) {
    return prisma.store.delete({ where: { id } });
  }
}
