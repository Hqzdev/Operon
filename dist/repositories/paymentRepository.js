"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRepository = void 0;
const prisma_1 = require("../models/prisma");
const paymentListSelect = {
    id: true,
    plan: true,
    amount: true,
    currency: true,
    status: true,
    provider: true,
    providerPaymentId: true,
    confirmationUrl: true,
    createdAt: true,
    updatedAt: true,
};
class PaymentRepository {
    static async create(data) {
        return prisma_1.prisma.payment.create({ data });
    }
    static async update(id, data) {
        return prisma_1.prisma.payment.update({ where: { id }, data });
    }
    static async findByIdAndUser(id, userId) {
        return prisma_1.prisma.payment.findFirst({ where: { id, userId } });
    }
    static async findByProviderId(providerPaymentId) {
        return prisma_1.prisma.payment.findFirst({ where: { providerPaymentId } });
    }
    static async findByUserId(userId) {
        return prisma_1.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: paymentListSelect,
        });
    }
}
exports.PaymentRepository = PaymentRepository;
