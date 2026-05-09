import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";
import { comparePassword, hashPassword } from "../utils/password";
import { getMonthlyAnalysisLimit, getPlanMeta } from "./planService";

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
    orderBy: { createdAt: "asc" },
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

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
  if (!user) throw new AppError("User not found", 404);
  const planMeta = getPlanMeta(user.plan);
  const usageLimit = getMonthlyAnalysisLimit(user.plan);

  return {
    ...user,
    planDisplay: planMeta.displayName,
    legacyPlan: planMeta.legacyName,
    usageLimit,
    analysisCount: user.usageCount,
    analysisLimit: usageLimit,
  };
}

export async function updateUserProfile(userId: string, input: {
  name?: string;
  storeName?: string;
  niche?: string;
  quietModeEnabled?: boolean;
  quietMinConfidence?: string;
  quietMinSpendImpact?: number;
}) {
  const quietMinConfidence = input.quietMinConfidence && ["low", "medium", "high"].includes(input.quietMinConfidence)
    ? input.quietMinConfidence
    : undefined;
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      storeName: input.storeName,
      niche: input.niche,
      quietModeEnabled: input.quietModeEnabled,
      quietMinConfidence,
      quietMinSpendImpact: input.quietMinSpendImpact,
    },
    select: profileSelect,
  });
  return user;
}

export async function changeUserPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const valid = await comparePassword(input.currentPassword, user.password);
  if (!valid) throw new AppError("Current password is incorrect", 400);

  if (input.newPassword.length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(input.newPassword) },
  });
}

export async function deleteUserAccount(userId: string, input: { password: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const valid = await comparePassword(input.password, user.password);
  if (!valid) throw new AppError("Password is incorrect", 400);

  // Cascade deletes analyses and payments via Prisma schema onDelete: Cascade
  await prisma.user.delete({ where: { id: userId } });
}
