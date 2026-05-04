import { NextResponse } from "next/server";
import { runScenario, scenarioInputSchema } from "@/src/services/scenarioService";
import { getAuthUserId, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    getAuthUserId(request);
    const body = await request.json();
    const input = scenarioInputSchema.parse(body);
    const result = runScenario(input);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
