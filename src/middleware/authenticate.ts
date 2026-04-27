import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";
import { verifyToken } from "../utils/jwt";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Authentication token is required", 401));
  }

  const token = header.replace("Bearer ", "");

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    next(new AppError("Invalid or expired authentication token", 401));
  }
}
