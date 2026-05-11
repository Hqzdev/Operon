import { NextResponse } from "next/server";
import { PaymentStatus, UserPlan } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-access";
import { errorResponse } from "@/lib/api-auth";
import { prisma } from "@/src/models/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().optional(),
  status: z.enum(["all", "pending", "approved", "rejected"]).default("pending"),
  currency: z.string().optional(),
  plan: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["createdAt", "amount", "status", "plan"]).default("createdAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

function statusWhere(status: string) {
  if (status === "approved") return PaymentStatus.SUCCEEDED;
  if (status === "rejected") return PaymentStatus.CANCELED;
  if (status === "pending") return PaymentStatus.PENDING;
  return undefined;
}

function displayStatus(status: PaymentStatus) {
  if (status === PaymentStatus.SUCCEEDED) return "Approved";
  if (status === PaymentStatus.CANCELED) return "Rejected";
  return "Pending";
}

function fraudFlags(payment: {
  amount: number;
  currency: string;
  cardLast4: string | null;
  userId: string;
  createdAt: Date;
}, sameCardCount: number, rapidCount: number) {
  const flags: string[] = [];
  if (payment.cardLast4 && sameCardCount >= 2) flags.push("Same card used multiple times");
  if (rapidCount >= 3) flags.push("Rapid attempts");
  if ((payment.currency === "USD" && payment.amount >= 10000) || (payment.currency === "RUB" && payment.amount >= 1000000)) {
    flags.push("High amount");
  }
  return flags;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const q = parsed.q?.trim();

    const where = {
      ...(statusWhere(parsed.status) ? { status: statusWhere(parsed.status) } : {}),
      ...(parsed.currency ? { currency: parsed.currency.toUpperCase() } : {}),
      ...(parsed.plan && Object.values(UserPlan).includes(parsed.plan as UserPlan) ? { plan: parsed.plan as UserPlan } : {}),
      ...(parsed.from || parsed.to ? {
        createdAt: {
          ...(parsed.from ? { gte: new Date(parsed.from) } : {}),
          ...(parsed.to ? { lte: new Date(parsed.to) } : {}),
        },
      } : {}),
      ...(q ? {
        OR: [
          { id: { contains: q, mode: "insensitive" as const } },
          { providerPaymentId: { contains: q, mode: "insensitive" as const } },
          { customerName: { contains: q, mode: "insensitive" as const } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      } : {}),
    };

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { [parsed.sort]: parsed.dir },
      take: 200,
      select: {
        id: true,
        userId: true,
        plan: true,
        amount: true,
        currency: true,
        status: true,
        provider: true,
        providerPaymentId: true,
        customerName: true,
        cardLast4: true,
        country: true,
        approvedAt: true,
        approvedBy: true,
        rejectedAt: true,
        rejectedBy: true,
        rejectionReason: true,
        privateNotes: true,
        fraudFlags: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true, name: true } },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, action: true, adminEmail: true, reason: true, notes: true, createdAt: true },
        },
      },
    });

    const cardCounts = new Map<string, number>();
    const userWindows = new Map<string, number>();
    for (const payment of payments) {
      if (payment.cardLast4) cardCounts.set(payment.cardLast4, (cardCounts.get(payment.cardLast4) ?? 0) + 1);
      const windowKey = `${payment.userId}:${Math.floor(payment.createdAt.getTime() / (10 * 60 * 1000))}`;
      userWindows.set(windowKey, (userWindows.get(windowKey) ?? 0) + 1);
    }

    return NextResponse.json({
      payments: payments.map((payment) => {
        const windowKey = `${payment.userId}:${Math.floor(payment.createdAt.getTime() / (10 * 60 * 1000))}`;
        const computedFlags = fraudFlags(payment, payment.cardLast4 ? cardCounts.get(payment.cardLast4) ?? 0 : 0, userWindows.get(windowKey) ?? 0);
        return {
          ...payment,
          displayStatus: displayStatus(payment.status),
          customerName: payment.customerName ?? payment.user.name,
          email: payment.user.email,
          cardDisplay: payment.cardLast4 ? `•••• ${payment.cardLast4}` : "Not available",
          fraudFlags: Array.from(new Set([...(payment.fraudFlags ?? []), ...computedFlags])),
          user: undefined,
        };
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
