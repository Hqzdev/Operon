import type { NextFunction, Request, Response } from "express";
import { UserPlan } from "@prisma/client";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

const PLAN_RANK: Record<UserPlan, number> = {
  STARTER: 0,
  PRO: 1,
  SCALE: 2,
};

const PLAN_LABEL: Record<UserPlan, string> = {
  STARTER: "Starter",
  PRO: "Basic",
  SCALE: "Pro",
};

export function requirePlan(minimumPlan: UserPlan) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth!.userId },
        select: { plan: true },
      });
      if (!user) return next(new AppError("User not found", 404));

      if (PLAN_RANK[user.plan] < PLAN_RANK[minimumPlan]) {
        return next(
          new AppError(
            `This feature requires ${PLAN_LABEL[minimumPlan]} plan or higher`,
            403,
            { requiredPlan: minimumPlan, currentPlan: user.plan },
          ),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
