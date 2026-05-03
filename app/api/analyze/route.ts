import { NextResponse } from "next/server";
import {
  analysisInputSchema,
  type AnalysisOutput,
} from "@/lib/analysis-schema";
import { runRuleAnalysis } from "@/lib/decision-engine";
import { runGigachatAnalysis } from "@/lib/gigachat";
import { getRecentAnalyses, saveAnalysis } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const history = await getRecentAnalyses();
  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const input = analysisInputSchema.parse(raw);

    const rulesOutput = runRuleAnalysis(input);
    let output: AnalysisOutput = {
      ...rulesOutput,
      saved: false,
    };

    try {
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
    const message =
      error instanceof Error ? error.message : "Failed to analyze payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
