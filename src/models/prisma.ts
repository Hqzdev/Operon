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

export const prisma: PrismaClient = global.__prisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
