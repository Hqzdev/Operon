import { prisma } from "@/src/models/prisma";
import { ApiError, constantTimeEquals, getAuthUserId } from "@/lib/api-auth";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function adminEmails() {
  return (process.env.ADMIN_ACCESS_EMAIL || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

function adminPassword() {
  return process.env.ADMIN_ACCESS_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

export async function requireAdmin(request: Request) {
  const userId = getAuthUserId(request);
  const configuredEmails = adminEmails();
  const configuredPassword = adminPassword();
  const providedPassword = request.headers.get("x-admin-password") || "";

  if (configuredEmails.length === 0 || !configuredPassword) {
    throw new ApiError("Admin access env is not configured", 500);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new ApiError("User not found", 404);
  if (!constantTimeEquals(providedPassword, configuredPassword)) {
    throw new ApiError("Admin password is incorrect", 401);
  }
  if (!configuredEmails.includes(normalizeEmail(user.email))) {
    throw new ApiError("This account is not allowed to access admin", 403);
  }

  return user;
}
