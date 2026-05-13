"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const prisma_1 = require("../models/prisma");
const profileSelect = {
    id: true,
    email: true,
    name: true,
    avatarUrl: true,
    storeName: true,
    storeUrl: true,
    niche: true,
    accountType: true,
    quietModeEnabled: true,
    quietMinConfidence: true,
    quietMinSpendImpact: true,
    quietNoUrgentDigestAt: true,
    weeklyDigestEnabled: true,
    activeStoreId: true,
    onboardingCompleted: true,
    plan: true,
    subscriptionStatus: true,
    subscriptionEndDate: true,
    usageCount: true,
    usageResetAt: true,
    createdAt: true,
    stores: {
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            name: true,
            url: true,
            platform: true,
            description: true,
            createdAt: true,
            updatedAt: true,
        },
    },
    activeStore: {
        select: {
            id: true,
            name: true,
            url: true,
            platform: true,
            description: true,
            createdAt: true,
            updatedAt: true,
        },
    },
};
class UserRepository {
    static async findById(id) {
        return prisma_1.prisma.user.findUnique({ where: { id } });
    }
    static async findByEmail(email) {
        return prisma_1.prisma.user.findUnique({ where: { email } });
    }
    static async findProfileById(id) {
        return prisma_1.prisma.user.findUnique({ where: { id }, select: profileSelect });
    }
    static async create(data) {
        return prisma_1.prisma.user.create({ data });
    }
    static async upsertByEmail(email, create, update) {
        return prisma_1.prisma.user.upsert({ where: { email }, create, update });
    }
    static async update(id, data) {
        return prisma_1.prisma.user.update({ where: { id }, data });
    }
    static async updateProfile(id, data) {
        return prisma_1.prisma.user.update({ where: { id }, data, select: profileSelect });
    }
    static async updatePassword(id, password) {
        return prisma_1.prisma.user.update({ where: { id }, data: { password } });
    }
    static async updateSubscription(id, data) {
        return prisma_1.prisma.user.update({ where: { id }, data });
    }
    static async updateActiveStore(id, data) {
        return prisma_1.prisma.user.update({ where: { id }, data });
    }
    static async updateUsage(id, usageCount, usageResetAt) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: { usageCount, ...(usageResetAt ? { usageResetAt } : {}) },
        });
    }
    static async findDigestFields(id) {
        return prisma_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                storeUrl: true,
                storeName: true,
                quietModeEnabled: true,
                quietMinConfidence: true,
                quietMinSpendImpact: true,
                quietNoUrgentDigestAt: true,
                weeklyDigestEnabled: true,
                plan: true,
            },
        });
    }
    static async delete(id) {
        return prisma_1.prisma.user.delete({ where: { id } });
    }
}
exports.UserRepository = UserRepository;
