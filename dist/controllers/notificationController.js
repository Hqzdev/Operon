"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDigest = exports.markAllRead = exports.markOneRead = exports.getNotifications = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const prisma_1 = require("../models/prisma");
const digestService_1 = require("../services/digestService");
exports.getNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.auth.userId;
    const notifications = await prisma_1.prisma.notification.findMany({
        where: { userId: userId },
        orderBy: [{ read: "asc" }, { createdAt: "desc" }],
        take: 20,
    });
    res.json({ notifications });
});
exports.markOneRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.auth.userId;
    const id = req.params.id;
    const notification = await prisma_1.prisma.notification.findFirst({
        where: { id, userId: userId },
    });
    if (!notification) {
        res.status(404).json({ message: "Notification not found" });
        return;
    }
    const updated = await prisma_1.prisma.notification.update({
        where: { id },
        data: { read: true },
    });
    res.json({ notification: updated });
});
exports.markAllRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.auth.userId;
    await prisma_1.prisma.notification.updateMany({
        where: { userId: userId, read: false },
        data: { read: true },
    });
    res.json({ message: "All notifications marked as read" });
});
exports.triggerDigest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.auth.userId;
    const summary = await (0, digestService_1.generateAndSendDigest)(userId);
    res.json({ message: "Digest generated", summary });
});
