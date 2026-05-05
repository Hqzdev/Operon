import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";

// https://yookassa.ru/developers/using-api/webhooks#security
const YOOKASSA_IP_RANGES = [
  "185.71.76.",
  "185.71.77.",
  "77.75.153.",
  "77.75.154.",
  "77.75.156.",
  "2a02:5180:",
];

function isYooKassaIp(ip: string): boolean {
  return YOOKASSA_IP_RANGES.some((prefix) => ip.startsWith(prefix));
}

export function yookassaIpGuard(req: Request, _res: Response, next: NextFunction) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = (raw?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");

  if (process.env.NODE_ENV !== "production" || isYooKassaIp(ip)) {
    return next();
  }

  next(new AppError("Forbidden: unexpected webhook source", 403));
}
