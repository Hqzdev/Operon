"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreRepository = void 0;
const prisma_1 = require("../models/prisma");
class StoreRepository {
    static async findByUserId(userId) {
        return prisma_1.prisma.store.findMany({
            where: { userId },
            orderBy: { createdAt: "asc" },
        });
    }
    static async findByIdAndUser(storeId, userId) {
        return prisma_1.prisma.store.findFirst({ where: { id: storeId, userId } });
    }
    static async upsert(userId, url, create, update) {
        return prisma_1.prisma.store.upsert({
            where: { userId_url: { userId, url } },
            create: { userId, url, ...create },
            update,
        });
    }
    static async delete(id) {
        return prisma_1.prisma.store.delete({ where: { id } });
    }
}
exports.StoreRepository = StoreRepository;
