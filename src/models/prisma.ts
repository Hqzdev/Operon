import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../utils/env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

function getPrismaClient(): PrismaClient {
  if (!global.__prisma__) {
    global.__prisma__ = createPrismaClient();
  }

  return global.__prisma__;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, property: keyof PrismaClient) {
    const client = getPrismaClient();
    const value = client[property];

    return typeof value === "function" ? value.bind(client) : value;
  },
});
