"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestRepository = void 0;
const prisma_1 = require("../models/prisma");
class DigestRepository {
    static async create(userId, summary) {
        return prisma_1.prisma.digestLog.create({ data: { userId, summary } });
    }
    static async findUsersForDigest() {
        return prisma_1.prisma.user.findMany({
            where: { onboardingCompleted: true },
            select: { id: true },
        });
    }
}
exports.DigestRepository = DigestRepository;
