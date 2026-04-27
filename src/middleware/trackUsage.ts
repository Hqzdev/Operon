import type { NextFunction, Request, Response } from "express";
import { UserPlan } from "@prisma/client";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

const MONTHLY_LIMITS: Record<UserPlan, number | null> = {
  STARTER: 10,
  PRO: null,
  SCALE: null,
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function trackUsage(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { plan: true, usageCount: true, usageResetAt: true },
    });
    if (!user) return next(new AppError("User not found", 404));

    const limit = MONTHLY_LIMITS[user.plan];
    const now = new Date();
    let currentCount = user.usageCount;

    if (now.getTime() >= user.usageResetAt.getTime() + THIRTY_DAYS_MS) {
      await prisma.user.update({
        where: { id: req.auth!.userId },
        data: { usageCount: 0, usageResetAt: now },
      });
      currentCount = 0;
    }

    if (limit !== null && currentCount >= limit) {
      return next(
        new AppError(
          `Monthly analysis limit reached (${limit}/month on ${user.plan} plan). Upgrade to continue.`,
          429,
          { limit, used: currentCount, plan: user.plan },
        ),
      );
    }

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { usageCount: { increment: 1 } },
    });

    next();
  } catch (err) {
    next(err);
  }
}
