import type { NextFunction, Request, Response } from "express";
import { UserPlan } from "@prisma/client";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";
import { getPlanMeta, getPlanRank } from "../services/planService";

export function requirePlan(minimumPlan: UserPlan) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth!.userId },
        select: { plan: true },
      });
      if (!user) return next(new AppError("User not found", 404));

      if (getPlanRank(user.plan) < getPlanRank(minimumPlan)) {
        return next(
          new AppError(
            `This feature requires ${getPlanMeta(minimumPlan).displayName} plan or higher`,
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
