import type { NextFunction, Request, Response } from "express";
import { UserPlan } from "@prisma/client";

export function requirePlan(_minimumPlan: UserPlan) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}
