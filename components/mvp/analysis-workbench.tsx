"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LoaderCircle,
  Target,
} from "lucide-react";
import {
  type AnalysisHistoryItem,
  type AnalysisInput,
  type AnalysisOutput,
} from "@/lib/analysis-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const initialForm: AnalysisInput = {
  product_name: "Posture Corrector",
  product_description:
    "A posture support product for people with back pain who sit for long hours and want a simple daily relief solution.",
  product_price: 29.99,
  cost: 10,
  ctr: 2.5,
  cpc: 1.2,
  cpm: 85,
  impressions: 5000,
  clicks: 125,
  add_to_cart: 5,
  purchases: 1,
  revenue: 29.99,
  stage: "testing",
};

const fields: Array<{
  key: keyof AnalysisInput;
  label: string;
  step?: string;
}> = [
  { key: "product_price", label: "Product price", step: "0.01" },
  { key: "cost", label: "Cost", step: "0.01" },
  { key: "ctr", label: "CTR %", step: "0.01" },
  { key: "cpc", label: "CPC", step: "0.01" },
  { key: "cpm", label: "CPM", step: "0.01" },
  { key: "impressions", label: "Impressions", step: "1" },
  { key: "clicks", label: "Clicks", step: "1" },
  { key: "add_to_cart", label: "Add to cart", step: "1" },
  { key: "purchases", label: "Purchases", step: "1" },
  { key: "revenue", label: "Revenue", step: "0.01" },
];

function badgeVariant(decision: string) {
  if (decision === "SCALE") return "default";
  if (decision === "KILL") return "destructive";
  return "secondary";
}

export function AnalysisWorkbench() {
  const [form, setForm] = useState<AnalysisInput>(initialForm);
  const [result, setResult] = useState<AnalysisOutput | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/analyze", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { history: AnalysisHistoryItem[] };
        setHistory(data.history);
      } catch {
        setHistory([]);
      }
    });
  }, []);

  async function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Analysis failed");
          return;
        }

        const output = data as AnalysisOutput;
        setResult(output);
        const historyResponse = await fetch("/api/analyze", { cache: "no-store" });
        if (historyResponse.ok) {
          const historyData = (await historyResponse.json()) as {
            history: AnalysisHistoryItem[];
          };
          setHistory(historyData.history);
        }
      } catch {
        setError("Unable to reach the analysis endpoint.");
      }
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_25%),radial-gradient(circle_at_center_right,rgba(20,20,20,0.05),transparent_30%)]" />
      <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
        <header className="mb-8 flex flex-col gap-4 rounded-[28px] border border-foreground/10 bg-background/80 px-6 py-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Landing
              </Link>
            </Button>
            <div>
              <div className="font-display text-2xl tracking-tight">
                Operon Analysis Workbench
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Decision engine, diagnosis, action plan, and product validation
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-foreground/10 bg-card/70 py-0">
            <CardHeader className="border-b border-foreground/10 py-6">
              <CardTitle className="font-display text-3xl">Input</CardTitle>
              <CardDescription>
                Enter the raw metrics for one product or ad setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="product_name">Product name</Label>
                  <Input
                    id="product_name"
                    value={form.product_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        product_name: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="product_description">Product description</Label>
                  <textarea
                    id="product_description"
                    value={form.product_description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        product_description: event.target.value,
                      }))
                    }
                    className="border-input bg-background min-h-28 w-full rounded-xl border px-3 py-3 text-sm outline-none"
                  />
                </div>
                {fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type="number"
                      step={field.step ?? "0.01"}
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]:
                            field.step === "1"
                              ? Number.parseInt(event.target.value || "0", 10)
                              : Number.parseFloat(event.target.value || "0"),
                        }))
                      }
                      className="h-11 rounded-xl"
                    />
                  </div>
                ))}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="stage">Stage</Label>
                  <select
                    id="stage"
                    value={form.stage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        stage: event.target.value as AnalysisInput["stage"],
                      }))
                    }
                    className="border-input bg-background h-11 w-full rounded-xl border px-3 text-sm outline-none"
                  >
                    <option value="testing">testing</option>
                    <option value="scaling">scaling</option>
                    <option value="retesting">retesting</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={submit} disabled={isPending} className="rounded-full">
                  {isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Target className="size-4" />
                      Run analysis
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setForm(initialForm);
                    setError(null);
                  }}
                >
                  Reset example
                </Button>
              </div>

              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            </CardContent>
          </Card>

          <Card className="border-foreground/10 bg-card/70 py-0">
            <CardHeader className="border-b border-foreground/10 py-6">
              <CardTitle className="font-display text-3xl">Output</CardTitle>
              <CardDescription>
                Strict operator output. Short, decisive, actionable.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {result ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={badgeVariant(result.decision.finalDecision) as "default" | "secondary" | "destructive"}>
                      {result.decision.finalDecision}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Confidence: {result.decision.confidence}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Provider: {result.provider}
                    </span>
                    {result.saved ? (
                      <span className="text-sm text-muted-foreground">
                        Saved
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                      Why
                    </div>
                    <p className="mt-2 text-base leading-relaxed">
                      {result.decision.shortReason}
                    </p>
                  </div>

                  <div>
                    <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                      Main problem
                    </div>
                    <p className="mt-2 text-lg font-medium">
                      {result.diagnosis.mainProblem}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.diagnosis.why}
                    </p>
                    <p className="mt-2 text-sm">
                      Evidence: <span className="text-muted-foreground">{result.diagnosis.proofMetric}</span>
                    </p>
                  </div>

                  <div>
                    <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                      Actions
                    </div>
                    <ol className="mt-3 space-y-3">
                      {result.actionPlan.map((action, index) => (
                        <li key={action} className="flex gap-3">
                          <span className="font-mono text-sm text-muted-foreground">
                            {index + 1}.
                          </span>
                          <span className="text-sm leading-relaxed">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-foreground/10 p-4">
                      <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        Product validation
                      </div>
                      <div className="mt-2 text-lg font-medium">
                        {result.validation.verdict}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {result.validation.reason}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 p-4">
                      <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        Continue testing
                      </div>
                      <div className="mt-2 text-lg font-medium">
                        {result.validation.shouldContinueTesting ? "Yes" : "No"}
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground">
                        Break-even ROAS: {result.derived.breakEvenRoas}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-foreground/10 p-4">
                      <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        Profitability check
                      </div>
                      <div className="mt-2 text-lg font-medium">
                        {result.profitability.isProfitable ? "Profitable" : "Not profitable yet"}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {result.profitability.why}
                      </p>
                      <div className="mt-3 text-sm text-muted-foreground">
                        Break-even CPA: ${result.profitability.breakEvenCpa}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 p-4">
                      <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        Continue or stop
                      </div>
                      <div className="mt-2 text-lg font-medium">
                        {result.continueDecision.decision}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {result.continueDecision.reason}
                      </p>
                      <div className="mt-3 text-sm text-muted-foreground">
                        Next minimum test: {result.continueDecision.minimumAdditionalTestNeeded}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-foreground/10 p-4">
                    <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                      Funnel leak
                    </div>
                    <div className="mt-2 text-lg font-medium">
                      {result.funnelLeak.weakestStage}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {result.funnelLeak.explanation}
                    </p>
                    <div className="mt-3 text-sm text-muted-foreground">
                      Severity: {result.funnelLeak.severity}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      <span>Decision confidence</span>
                      <span>
                        {result.decision.confidence === "high"
                          ? "85"
                          : result.decision.confidence === "medium"
                            ? "65"
                            : "35"}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        result.decision.confidence === "high"
                          ? 85
                          : result.decision.confidence === "medium"
                            ? 65
                            : 35
                      }
                    />
                  </div>

                  <div>
                    <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                      Creative angles
                    </div>
                    <div className="mt-3 grid gap-4">
                      {result.creativeAngles.map((angle, index) => (
                        <div key={`${angle.hookIdea}-${index}`} className="rounded-2xl border border-foreground/10 p-4">
                          <div className="text-sm font-medium">Angle {index + 1}</div>
                          <div className="mt-3 text-sm">
                            <span className="font-medium">Hook:</span> {angle.hookIdea}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Concept:</span> {angle.concept}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Emotion:</span> {angle.targetEmotion}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-dashed border-foreground/10 text-center">
                  <div className="max-w-sm">
                    <div className="font-display text-3xl">Run the first analysis</div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      The dashboard will return a decision, diagnosis, profitability check,
                      funnel leak, creative ideas, and the next actions from one input.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-foreground/10 bg-card/70 py-0">
            <CardHeader className="border-b border-foreground/10 py-6">
              <CardTitle className="font-display text-3xl">Derived metrics</CardTitle>
              <CardDescription>
                Calculated from the submitted dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {result ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Spend", `$${result.derived.spend}`],
                    ["ROAS", String(result.derived.roas)],
                    ["Conversion rate", `${result.derived.conversionRate}%`],
                    ["Add-to-cart rate", `${result.derived.addToCartRate}%`],
                    ["Break-even ROAS", String(result.derived.breakEvenRoas)],
                    ["Profit", `$${result.derived.profit}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-foreground/10 p-4">
                      <div className="text-sm text-muted-foreground">{label}</div>
                      <div className="mt-2 font-display text-3xl">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Derived metrics will appear after the first analysis.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-foreground/10 bg-card/70 py-0">
            <CardHeader className="border-b border-foreground/10 py-6">
              <CardTitle className="font-display text-3xl">Recent analyses</CardTitle>
              <CardDescription>
                Loaded from PostgreSQL when DATABASE_URL is configured.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {history.length ? (
                <div className="space-y-4">
                  {history.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">
                            ${item.input.product_price} product at {item.createdAt.slice(0, 10)}
                          </div>
                  <div className="text-sm text-muted-foreground">
                            {item.output.decision.finalDecision} · {item.output.diagnosis.mainProblem} · {item.output.continueDecision.decision}
                          </div>
                        </div>
                        <Badge variant={badgeVariant(item.output.decision.finalDecision) as "default" | "secondary" | "destructive"}>
                          {item.output.decision.finalDecision}
                        </Badge>
                      </div>
                      {index < history.length - 1 ? <Separator className="mt-4" /> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No saved analyses yet. Configure PostgreSQL and run the form once.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
