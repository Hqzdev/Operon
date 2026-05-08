import { NextResponse } from "next/server";
import { SubscriptionStatus, UserPlan } from "@prisma/client";
import { getAuthUserId, errorResponse, ApiError } from "@/lib/api-auth";
import { prisma } from "@/src/models/prisma";

export const dynamic = "force-dynamic";

function adminEmail() {
  return process.env.ADMIN_ACCESS_EMAIL || process.env.ADMIN_EMAIL || "";
}

function adminPassword() {
  return process.env.ADMIN_ACCESS_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

async function requireAdmin(request: Request) {
  const userId = getAuthUserId(request);
  const configuredEmail = adminEmail().trim().toLowerCase();
  const configuredPassword = adminPassword();
  const providedPassword = request.headers.get("x-admin-password") || "";

  if (!configuredEmail || !configuredPassword) {
    throw new ApiError("Admin access env is not configured", 500);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new ApiError("User not found", 404);
  if (user.email.toLowerCase() !== configuredEmail) {
    throw new ApiError("This account is not allowed to access admin", 403);
  }
  if (providedPassword !== configuredPassword) {
    throw new ApiError("Admin password is incorrect", 401);
  }

  return user;
}

function subscriptionEndDate(days: number) {
  const safeDays = Math.max(1, Math.min(3650, Math.round(days)));
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        usageCount: true,
        usageResetAt: true,
        createdAt: true,
        _count: {
          select: {
            analyses: true,
            integrations: true,
          },
        },
      },
    });

    return NextResponse.json({
      adminEmail: admin.email,
      users,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json() as {
      userId?: string;
      action?: "grant" | "remove" | "restrict";
      plan?: UserPlan;
      days?: number;
    };

    if (!body.userId) throw new ApiError("userId is required", 400);
    if (!body.action) throw new ApiError("action is required", 400);

    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, email: true },
    });
    if (!target) throw new ApiError("Target user not found", 404);

    if (body.action === "restrict" && target.id === admin.id) {
      throw new ApiError("You cannot restrict your own admin account", 400);
    }

    if (body.action === "grant") {
      const plan = body.plan && body.plan !== UserPlan.STARTER ? body.plan : UserPlan.SCALE;
      const updated = await prisma.user.update({
        where: { id: target.id },
        data: {
          plan,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionEndDate: subscriptionEndDate(body.days || 30),
        },
        select: {
          id: true,
          email: true,
          plan: true,
          subscriptionStatus: true,
          subscriptionEndDate: true,
        },
      });
      return NextResponse.json({ ok: true, user: updated });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        plan: UserPlan.STARTER,
        subscriptionStatus: body.action === "restrict" ? SubscriptionStatus.EXPIRED : SubscriptionStatus.NONE,
        subscriptionEndDate: null,
      },
      select: {
        id: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
