import { prisma } from "../models/prisma";
import type { UserPlan, SubscriptionStatus } from "@prisma/client";
import type { CreateUserDTO, UpdateUserDTO } from "../types";

const profileSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  storeName: true,
  storeUrl: true,
  niche: true,
  quietModeEnabled: true,
  quietMinConfidence: true,
  quietMinSpendImpact: true,
  quietNoUrgentDigestAt: true,
  activeStoreId: true,
  onboardingCompleted: true,
  plan: true,
  subscriptionStatus: true,
  subscriptionEndDate: true,
  usageCount: true,
  usageResetAt: true,
  createdAt: true,
  stores: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      name: true,
      url: true,
      platform: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  activeStore: {
    select: {
      id: true,
      name: true,
      url: true,
      platform: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export type UserProfileRow = NonNullable<Awaited<ReturnType<typeof UserRepository.findProfileById>>>;

type ProfileUpdateData = {
  name?: string;
  storeName?: string;
  storeUrl?: string;
  niche?: string;
  quietModeEnabled?: boolean;
  quietMinConfidence?: string;
  quietMinSpendImpact?: number;
  activeStoreId?: string | null;
  onboardingCompleted?: boolean;
};

type SubscriptionUpdateData = {
  plan: UserPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: Date;
};

export class UserRepository {
  static async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async findProfileById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: profileSelect });
  }

  static async create(data: CreateUserDTO) {
    return prisma.user.create({ data });
  }

  static async upsertByEmail(
    email: string,
    create: { email: string; password: string; name?: string; avatarUrl?: string },
    update: { name?: string; avatarUrl?: string },
  ) {
    return prisma.user.upsert({ where: { email }, create, update });
  }

  static async update(id: string, data: UpdateUserDTO) {
    return prisma.user.update({ where: { id }, data });
  }

  static async updateProfile(id: string, data: ProfileUpdateData) {
    return prisma.user.update({ where: { id }, data, select: profileSelect });
  }

  static async updatePassword(id: string, password: string) {
    return prisma.user.update({ where: { id }, data: { password } });
  }

  static async updateSubscription(id: string, data: SubscriptionUpdateData) {
    return prisma.user.update({ where: { id }, data });
  }

  static async updateActiveStore(
    id: string,
    data: { activeStoreId: string; storeName: string; storeUrl: string; niche?: string; onboardingCompleted?: boolean },
  ) {
    return prisma.user.update({ where: { id }, data });
  }

  static async updateUsage(id: string, usageCount: number, usageResetAt?: Date) {
    return prisma.user.update({
      where: { id },
      data: { usageCount, ...(usageResetAt ? { usageResetAt } : {}) },
    });
  }

  static async findDigestFields(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        storeUrl: true,
        storeName: true,
        quietModeEnabled: true,
        quietMinConfidence: true,
        quietMinSpendImpact: true,
        quietNoUrgentDigestAt: true,
        plan: true,
      },
    });
  }

  static async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}
