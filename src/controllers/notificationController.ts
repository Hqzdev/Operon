import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../models/prisma";
import { generateAndSendDigest } from "../services/digestService";

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;

  const notifications = await prisma.notification.findMany({
    where: { userId: userId as string },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  res.json({ notifications });
});

export const markOneRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const id = req.params.id as string;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: userId as string },
  });
  if (!notification) {
    res.status(404).json({ message: "Notification not found" });
    return;
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  res.json({ notification: updated });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;

  await prisma.notification.updateMany({
    where: { userId: userId as string, read: false },
    data: { read: true },
  });

  res.json({ message: "All notifications marked as read" });
});

export const triggerDigest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;

  const summary = await generateAndSendDigest(userId);
  res.json({ message: "Digest generated", summary });
});
