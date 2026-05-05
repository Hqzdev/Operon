import { NextResponse } from "next/server";
import { prisma } from "@/src/models/prisma";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  let dbStatus: "connected" | "error" = "connected";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      db: dbStatus,
      version: pkg.version,
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
