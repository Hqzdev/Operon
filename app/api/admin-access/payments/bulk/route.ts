import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-access";
import { errorResponse } from "@/lib/api-auth";
import { prisma } from "@/src/models/prisma";
import { activateSubscription } from "@/src/services/paymentService";
import { sendPaymentApprovedEmail } from "@/src/services/paymentEmailService";

export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  paymentIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = bulkSchema.parse(await request.json());
    const payments = await prisma.payment.findMany({
      where: { id: { in: body.paymentIds } },
      include: { user: { select: { email: true } } },
    });

    const approved = [];
    for (const payment of payments) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED", approvedAt: new Date(), approvedBy: admin.id, rejectedAt: null, rejectedBy: null, rejectionReason: null },
        });
        await tx.paymentAuditLog.create({
          data: { paymentId: payment.id, action: "bulk_approved", adminId: admin.id, adminEmail: admin.email },
        });
      });
      await activateSubscription(payment);
      await sendPaymentApprovedEmail({ to: payment.user.email, plan: payment.plan === "SCALE" ? "Business" : "Pro" });
      approved.push(payment.id);
    }

    return NextResponse.json({ ok: true, approved });
  } catch (error) {
    return errorResponse(error);
  }
}
