import type { NextFunction, Request, Response } from "express";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function trackUsage(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { usageResetAt: true },
    });
    if (!user) return next(new AppError("User not found", 404));

    const now = new Date();

    if (now.getTime() >= user.usageResetAt.getTime() + THIRTY_DAYS_MS) {
      await prisma.user.update({
        where: { id: req.auth!.userId },
        data: { usageCount: 0, usageResetAt: now },
      });
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
