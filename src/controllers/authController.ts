import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { loginUser, registerUser } from "../services/authService";

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  res.status(201).json(result);
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  res.status(200).json(result);
});
