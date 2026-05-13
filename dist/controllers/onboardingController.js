"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeStoreController = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const storeAnalysisService_1 = require("../services/storeAnalysisService");
const prisma_1 = require("../models/prisma");
function normalizeNiche(value) {
    const normalized = (value ?? "").toLowerCase();
    if (normalized.includes("beauty") || normalized.includes("cosmetic") || normalized.includes("skin"))
        return "beauty";
    if (normalized.includes("fashion") || normalized.includes("apparel") || normalized.includes("clothing"))
        return "fashion";
    if (normalized.includes("electronic") || normalized.includes("gadget") || normalized.includes("tech"))
        return "electronics";
    if (normalized.includes("fitness") || normalized.includes("sport") || normalized.includes("wellness"))
        return "fitness";
    if (normalized.includes("home") || normalized.includes("furniture") || normalized.includes("decor"))
        return "home_goods";
    return "fashion";
}
exports.analyzeStoreController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeUrl } = req.body;
    const userId = req.auth.userId;
    const result = await (0, storeAnalysisService_1.analyzeStore)(storeUrl);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            storeUrl,
            niche: normalizeNiche(result.niche),
            onboardingCompleted: true,
        },
    });
    res.status(200).json({ analysis: result });
});
