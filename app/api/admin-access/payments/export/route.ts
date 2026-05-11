import { requireAdmin } from "@/lib/admin-access";
import { errorResponse } from "@/lib/api-auth";
import { prisma } from "@/src/models/prisma";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: { user: { select: { email: true, name: true } } },
    });
    const rows = [
      ["created_at", "payment_id", "customer_name", "email", "card_last4", "plan", "currency", "amount", "country", "status", "approved_at", "approved_by", "rejected_at", "rejected_by", "rejection_reason", "private_notes"],
      ...payments.map((payment) => [
        payment.createdAt.toISOString(),
        payment.id,
        payment.customerName ?? payment.user.name ?? "",
        payment.user.email,
        payment.cardLast4 ? `•••• ${payment.cardLast4}` : "",
        payment.plan,
        payment.currency,
        (payment.amount / 100).toFixed(2),
        payment.country ?? "",
        payment.status,
        payment.approvedAt?.toISOString() ?? "",
        payment.approvedBy ?? "",
        payment.rejectedAt?.toISOString() ?? "",
        payment.rejectedBy ?? "",
        payment.rejectionReason ?? "",
        payment.privateNotes ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="operon-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
