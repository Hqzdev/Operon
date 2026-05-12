import { prisma } from "../models/prisma";
import type { PaymentStatus, UserPlan, Prisma } from "@prisma/client";

const paymentListSelect = {
  id: true,
  plan: true,
  amount: true,
  currency: true,
  status: true,
  provider: true,
  providerPaymentId: true,
  confirmationUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PaymentRepository {
  static async create(data: { userId: string; plan: UserPlan; amount: number; currency: string; status: PaymentStatus }) {
    return prisma.payment.create({ data });
  }

  static async update(id: string, data: {
    providerPaymentId?: string;
    confirmationUrl?: string;
    status?: PaymentStatus;
    cardLast4?: string;
    country?: string;
    customerName?: string;
    webhookPayload?: Prisma.InputJsonValue;
  }) {
    return prisma.payment.update({ where: { id }, data });
  }

  static async findByIdAndUser(id: string, userId: string) {
    return prisma.payment.findFirst({ where: { id, userId } });
  }

  static async findByProviderId(providerPaymentId: string) {
    return prisma.payment.findFirst({ where: { providerPaymentId } });
  }

  static async findByUserId(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: paymentListSelect,
    });
  }
}
