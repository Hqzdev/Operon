import type { Request, Response } from "express";
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
} from "../services/userService";
import { asyncHandler } from "../utils/asyncHandler";

export const profileController = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getUserProfile(req.auth!.userId);
  res.status(200).json(profile);
});

export const updateProfileController = asyncHandler(async (req: Request, res: Response) => {
  const { name, storeName } = req.body as { name?: string; storeName?: string };
  const profile = await updateUserProfile(req.auth!.userId, { name, storeName });
  res.status(200).json(profile);
});

export const changePasswordController = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  await changeUserPassword(req.auth!.userId, { currentPassword, newPassword });
  res.status(200).json({ ok: true });
});

export const deleteAccountController = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body as { password: string };
  await deleteUserAccount(req.auth!.userId, { password });
  res.status(200).json({ ok: true });
});
