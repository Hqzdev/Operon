import { readFileSync } from "fs";
import { join } from "path";
import type { Request, Response } from "express";
import { prisma } from "../models/prisma";

const { version } = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf8"),
) as { version: string };

export async function healthController(_req: Request, res: Response): Promise<void> {
  let dbStatus: "connected" | "error" = "connected";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";

  res.status(status === "ok" ? 200 : 503).json({
    status,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    db: dbStatus,
    version,
  });
}
