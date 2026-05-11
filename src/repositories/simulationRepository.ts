import { prisma } from "../models/prisma";
import type { IntegrationProvider, Prisma } from "@prisma/client";

export class SimulationRepository {
  static async create(data: {
    userId: string;
    provider: IntegrationProvider;
    externalAccountId: string;
    externalEntityId: string;
    entityName?: string | null;
    scenarios: Prisma.InputJsonValue;
    baseline: Prisma.InputJsonValue;
    confidence: number;
    signalBreakdown: Prisma.InputJsonValue;
  }) {
    return prisma.simulationLog.create({ data });
  }
}
