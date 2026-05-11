import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-access";
import { ApiError, errorResponse } from "@/lib/api-auth";
import { prisma } from "@/src/models/prisma";
import { activateSubscription } from "@/src/services/paymentService";
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail } from "@/src/services/paymentEmailService";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "notes"]),
  reason: z.string().max(1000).optional(),
  notes: z.string().max(3000).optional(),
});

function planLabel(plan: string) {
  if (plan === "SCALE") return "Business";
  if (plan === "PRO") return "Pro";
  return "Starter";
}

export async function PATCH(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { paymentId } = await context.params;
    const body = actionSchema.parse(await request.json());

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!payment) throw new ApiError("Payment not found", 404);

    if (body.action === "approve") {
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            approvedAt: new Date(),
            approvedBy: admin.id,
            rejectedAt: null,
            rejectedBy: null,
            rejectionReason: null,
            privateNotes: body.notes ?? payment.privateNotes,
          },
        });
        await tx.paymentAuditLog.create({
          data: {
            paymentId: payment.id,
            action: "approved",
            adminId: admin.id,
            adminEmail: admin.email,
            notes: body.notes,
          },
        });
        return row;
      });
      await activateSubscription(payment);
      await sendPaymentApprovedEmail({ to: payment.user.email, plan: planLabel(payment.plan) });
      return NextResponse.json({ ok: true, payment: updated });
    }

    if (body.action === "reject") {
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CANCELED,
            rejectedAt: new Date(),
            rejectedBy: admin.id,
            rejectionReason: body.reason ?? null,
            privateNotes: body.notes ?? payment.privateNotes,
          },
        });
        await tx.paymentAuditLog.create({
          data: {
            paymentId: payment.id,
            action: "rejected",
            adminId: admin.id,
            adminEmail: admin.email,
            reason: body.reason,
            notes: body.notes,
          },
        });
        return row;
      });
      await sendPaymentRejectedEmail({ to: payment.user.email, reason: body.reason });
      return NextResponse.json({ ok: true, payment: updated });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: payment.id },
        data: { privateNotes: body.notes ?? "" },
      });
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: "notes_updated",
          adminId: admin.id,
          adminEmail: admin.email,
          notes: body.notes,
        },
      });
      return row;
    });
    return NextResponse.json({ ok: true, payment: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
