import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";
import { env } from "../utils/env";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function parseOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "invalid";
  }
}

function allowedOrigins() {
  const origins = new Set<string>();

  origins.add(parseOrigin(env.NEXT_PUBLIC_APP_URL));
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

export function originGuard(req: Request, _res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get("origin") ?? (req.get("referer") ? parseOrigin(req.get("referer")!) : null);
  if (origin && !allowedOrigins().has(origin)) {
    return next(new AppError("Invalid request origin", 403));
  }

  next();
}
