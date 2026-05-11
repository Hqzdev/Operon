/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs", "jsonwebtoken", "nodemailer"],
  async headers() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const connectOrigins = new Set(["'self'"]);

    for (const value of [apiBaseUrl, appUrl]) {
      if (!value) continue;
      try {
        connectOrigins.add(new URL(value).origin);
      } catch {
        // Optional env values are ignored when malformed.
      }
    }

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      `connect-src ${Array.from(connectOrigins).join(" ")}`,
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
}

export default nextConfig
