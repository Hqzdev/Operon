"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationRepository = void 0;
const prisma_1 = require("../models/prisma");
class SimulationRepository {
    static async create(data) {
        return prisma_1.prisma.simulationLog.create({ data });
    }
}
exports.SimulationRepository = SimulationRepository;
