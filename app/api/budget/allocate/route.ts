import { NextResponse } from "next/server";
import { allocateBudget, budgetInputSchema } from "@/src/services/budgetService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    getAuthUserId(request);
    const body = await request.json();
    const input = budgetInputSchema.parse(body);
    const result = allocateBudget(input);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
