import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { getAgencyReportPdf } from "@/src/services/agencyService";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const userId = getAuthUserId(request);
    const { reportId } = await params;
    const report = await getAgencyReportPdf(userId, reportId);
    return new Response(report.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
