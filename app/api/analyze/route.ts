import { NextResponse } from "next/server";
import {
  analysisInputSchema,
  type AnalysisOutput,
} from "@/lib/analysis-schema";
import { runRuleAnalysis } from "@/lib/decision-engine";
import { runGigachatAnalysis } from "@/lib/gigachat";
import { getRecentAnalyses, saveAnalysis } from "@/lib/storage";
import { errorResponse, getAuthUserId } from "@/lib/api-auth";
import { getCommunityBenchmarkForInput } from "@/src/services/communityBenchmarkService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    getAuthUserId(request);
    const history = await getRecentAnalyses();
    return NextResponse.json({ history });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    getAuthUserId(request);
    const raw = await request.json();
    const input = analysisInputSchema.parse(raw);
    const benchmark = await getCommunityBenchmarkForInput(input).catch(() => null);

    const rulesOutput = runRuleAnalysis(input, undefined, undefined, benchmark);
    let output: AnalysisOutput = {
      ...rulesOutput,
      saved: false,
    };

    try {
      if (benchmark) throw new Error("Community benchmark verdict uses rules engine");
      const aiOutput = await runGigachatAnalysis(input);
      output = {
        ...aiOutput,
        saved: false,
      };
    } catch {
      output = {
        ...rulesOutput,
        saved: false,
      };
    }

    const savedId = await saveAnalysis(input, output);
    if (savedId) {
      output = {
        ...output,
        saved: true,
        savedId,
      };
    }

    return NextResponse.json(output);
  } catch (error) {
    return errorResponse(error);
  }
}
