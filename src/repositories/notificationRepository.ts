import { prisma } from "../models/prisma";
import type { NotificationType } from "@prisma/client";

export class NotificationRepository {
  static async create(data: { userId: string; title: string; body: string; type: NotificationType | string }) {
    return prisma.notification.create({ data: data as Parameters<typeof prisma.notification.create>[0]["data"] });
  }

  static async findByUserId(userId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  static async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
