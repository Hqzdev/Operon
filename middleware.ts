import { NextResponse, type NextRequest } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_RATE_LIMIT = 120;
const AUTH_RATE_LIMIT = 10;
const bucket = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function rateLimitFor(pathname: string) {
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register")) {
    return AUTH_RATE_LIMIT;
  }

  return DEFAULT_RATE_LIMIT;
}

function checkRateLimit(request: NextRequest) {
  const now = Date.now();
  const limit = rateLimitFor(request.nextUrl.pathname);
  const key = `${clientIp(request)}:${request.nextUrl.pathname}`;
  const current = bucket.get(key);

  if (!current || current.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) {
    return null;
  }

  return Math.ceil((current.resetAt - now) / 1000);
}

function allowedOrigins(request: NextRequest) {
  const origins = new Set<string>();
  origins.add(request.nextUrl.origin);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Ignore malformed optional env values; deployment health should not depend on middleware parsing.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return "invalid";
  }
}

export function middleware(request: NextRequest) {
  const retryAfter = checkRateLimit(request);
  if (retryAfter !== null) {
    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rateLimitFor(request.nextUrl.pathname)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  if (!MUTATING_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  const origin = requestOrigin(request);
  if (origin && !allowedOrigins(request).has(origin)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
