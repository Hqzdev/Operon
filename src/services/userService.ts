import { AppError } from "../utils/appError";
import { comparePassword, hashPassword } from "../utils/password";
import { getMonthlyAnalysisLimit, getPlanMeta } from "./planService";
import { UserRepository } from "../repositories/userRepository";

export async function getUserProfile(userId: string) {
  const user = await UserRepository.findProfileById(userId);
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
  return UserRepository.updateProfile(userId, {
    name: input.name,
    storeName: input.storeName,
    niche: input.niche,
    quietModeEnabled: input.quietModeEnabled,
    quietMinConfidence,
    quietMinSpendImpact: input.quietMinSpendImpact,
  });
}

export async function changeUserPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
) {
  const user = await UserRepository.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const valid = await comparePassword(input.currentPassword, user.password);
  if (!valid) throw new AppError("Current password is incorrect", 400);

  if (input.newPassword.length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  await UserRepository.updatePassword(userId, await hashPassword(input.newPassword));
}

export async function deleteUserAccount(userId: string, input: { password: string }) {
  const user = await UserRepository.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const valid = await comparePassword(input.password, user.password);
  if (!valid) throw new AppError("Password is incorrect", 400);

  await UserRepository.delete(userId);
}
