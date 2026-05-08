import { NextResponse } from "next/server";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import {
  campaignSimulationInputSchema,
  simulateCampaignBudget,
} from "@/src/services/campaignSimulationService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    const body = campaignSimulationInputSchema.parse(await request.json());
    const simulation = await simulateCampaignBudget(userId, body);

    return NextResponse.json(simulation);
  } catch (error) {
    return errorResponse(error);
  }
}
