"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { AnalysisOutput } from "@/lib/analysis-schema";

interface StoreAnalysis {
  niche: string;
  targetAudience: string;
  estimatedPriceRange: string;
  topCategories: string[];
  suggestedMetrics: string[];
  platform: string;
  storeName: string;
  storeDescription: string;
}

type Step = 1 | 2 | 3;

const VERDICT_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SCALE: {
    label: "Scale up",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900",
  },
  KILL: {
    label: "Stop",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-900",
  },
  FIX: {
    label: "Watch",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900",
  },
  "TEST AGAIN": {
    label: "Watch",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [storeUrl, setStoreUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [storeAnalysis, setStoreAnalysis] = useState<StoreAnalysis | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  // Step 2
  const [campaignForm, setCampaignForm] = useState({
    product_name: "",
    product_price: "",
    cost: "",
    ctr: "",
    cpc: "",
    cpm: "",
    impressions: "",
    clicks: "",
    add_to_cart: "",
    purchases: "",
    revenue: "",
  });
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [verdict, setVerdict] = useState<AnalysisOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("operon_user");
    if (!raw) return;
    try {
      const user = JSON.parse(raw) as { onboardingCompleted?: boolean };
      if (user.onboardingCompleted) router.replace("/dashboard");
    } catch {
      // ignore
    }
  }, [router]);

  async function handleStoreAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setStoreError(null);
    setIsAnalyzing(true);
    const token = localStorage.getItem("operon_token");
    const apiBaseUrl = getApiBaseUrl();
    try {
      const url = storeUrl.startsWith("http") ? storeUrl : `https://${storeUrl}`;
      const res = await fetch(`${apiBaseUrl}/onboarding/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) { setStoreError(data.message ?? "Analysis failed. Check the URL and try again."); return; }
      const analysis = data.analysis as StoreAnalysis;
      setStoreAnalysis(analysis);
      const raw = localStorage.getItem("operon_user");
      if (raw) {
        try {
          const user = JSON.parse(raw);
          localStorage.setItem("operon_user", JSON.stringify({ ...user, storeName: analysis.storeName, storeUrl: url, niche: analysis.niche }));
        } catch { /* ignore */ }
      }
      setStep(2);
    } catch {
      setStoreError("Unable to reach the server. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleCampaignChange(field: string, value: string) {
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCampaignAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setAnalysisError(null);
    setIsRunningAnalysis(true);
    const token = localStorage.getItem("operon_token");
    const apiBaseUrl = getApiBaseUrl();
    const payload = {
      product_name: campaignForm.product_name || "My product",
      product_description: storeAnalysis?.storeDescription || "E-commerce product",
      product_price: parseFloat(campaignForm.product_price) || 0,
      cost: parseFloat(campaignForm.cost) || 0,
      ctr: parseFloat(campaignForm.ctr) || 0,
      cpc: parseFloat(campaignForm.cpc) || 0,
      cpm: parseFloat(campaignForm.cpm) || 0,
      impressions: parseInt(campaignForm.impressions) || 0,
      clicks: parseInt(campaignForm.clicks) || 0,
      add_to_cart: parseInt(campaignForm.add_to_cart) || 0,
      purchases: parseInt(campaignForm.purchases) || 0,
      revenue: parseFloat(campaignForm.revenue) || 0,
      stage: "testing" as const,
    };
    try {
      const res = await fetch(`${apiBaseUrl}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setAnalysisError(data.message ?? "Analysis failed. Please try again."); return; }
      setVerdict(data as AnalysisOutput);
      const raw = localStorage.getItem("operon_user");
      if (raw) {
        try {
          const user = JSON.parse(raw);
          localStorage.setItem("operon_user", JSON.stringify({ ...user, onboardingCompleted: true }));
        } catch { /* ignore */ }
      }
      setStep(3);
    } catch {
      setAnalysisError("Unable to reach the server. Please try again.");
    } finally {
      setIsRunningAnalysis(false);
    }
  }

  function skipToAnalysis() {
    const raw = localStorage.getItem("operon_user");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        localStorage.setItem("operon_user", JSON.stringify({ ...user, onboardingCompleted: true }));
      } catch { /* ignore */ }
    }
    router.push("/dashboard");
  }

  const verdictMeta = verdict ? (VERDICT_META[verdict.decision.finalDecision] ?? VERDICT_META["FIX"]) : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,20,20,0.06),transparent_30%)]" />

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16 lg:px-10">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-tight">Operon</Link>
          <span className="font-mono text-xs text-muted-foreground">Step {step} of 3</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-12 h-1 w-full rounded-full bg-foreground/10">
          <div
            className="h-1 rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* ── STEP 1: Store URL ── */}
        {step === 1 && (
          <div className="flex flex-1 flex-col space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 font-mono text-xs text-muted-foreground">
                <Sparkles className="size-3.5" />
                AI-powered store analysis
              </div>
              <h1 className="font-display text-5xl leading-none tracking-tight lg:text-6xl">Welcome to Operon</h1>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Paste your store URL — Operon will detect your niche, audience, and key metrics in seconds.
              </p>
            </div>

            <form onSubmit={handleStoreAnalyze} className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="https://yourstore.com"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    className="h-12 rounded-xl pl-10 text-base"
                    required
                    disabled={isAnalyzing}
                  />
                </div>
                <Button type="submit" className="h-12 rounded-xl px-6 text-base" disabled={isAnalyzing || !storeUrl.trim()}>
                  {isAnalyzing ? <><Spinner className="size-4" />Analyzing...</> : <>Analyze store<ArrowRight className="size-4" /></>}
                </Button>
              </div>

              {isAnalyzing && (
                <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card/60 px-5 py-4">
                  <Spinner className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Analyzing your store...</p>
                    <p className="text-xs text-muted-foreground">Fetching page data and running AI analysis. Takes 10–20 seconds.</p>
                  </div>
                </div>
              )}

              {storeError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                  {storeError}
                </p>
              )}
            </form>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Store, label: "Platform detection", desc: "Shopify, WooCommerce, and more" },
                { icon: Users, label: "Audience insights", desc: "Who actually buys from you" },
                { icon: BarChart3, label: "Key metrics", desc: "What to track for your niche" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-2xl border border-foreground/10 bg-card/60 p-5 backdrop-blur-sm">
                  <Icon className="mb-3 size-5 text-muted-foreground" />
                  <div className="text-sm font-medium">{label}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: First campaign ── */}
        {step === 2 && storeAnalysis && (
          <div className="flex flex-1 flex-col space-y-8">
            {/* Store pill */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-card">
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{storeAnalysis.storeName}</p>
                <p className="font-mono text-xs text-muted-foreground">{storeAnalysis.platform} · {storeAnalysis.niche}</p>
              </div>
              {storeAnalysis.topCategories.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="secondary" className="hidden sm:inline-flex">{cat}</Badge>
              ))}
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 font-mono text-xs text-muted-foreground">
                <Zap className="size-3.5" />
                Run your first campaign analysis
              </div>
              <h1 className="font-display text-4xl leading-none tracking-tight lg:text-5xl">Get your first verdict</h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                Enter numbers from any ad campaign — Operon instantly tells you whether to Scale, Stop, or Watch.
              </p>
            </div>

            <form onSubmit={handleCampaignAnalyze} className="space-y-6">
              {/* Product section */}
              <div className="rounded-2xl border border-foreground/10 bg-card/60 p-5 space-y-4">
                <p className="font-mono text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="product_name" className="text-xs font-medium">Product name</Label>
                    <Input id="product_name" placeholder="e.g. Wireless earbuds" value={campaignForm.product_name} onChange={(e) => handleCampaignChange("product_name", e.target.value)} className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="product_price" className="text-xs font-medium">Selling price ($)</Label>
                    <Input id="product_price" type="number" step="0.01" min="0" placeholder="49.99" value={campaignForm.product_price} onChange={(e) => handleCampaignChange("product_price", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cost" className="text-xs font-medium">Product cost ($)</Label>
                    <Input id="cost" type="number" step="0.01" min="0" placeholder="12.00" value={campaignForm.cost} onChange={(e) => handleCampaignChange("cost", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="revenue" className="text-xs font-medium">Revenue ($)</Label>
                    <Input id="revenue" type="number" step="0.01" min="0" placeholder="320.00" value={campaignForm.revenue} onChange={(e) => handleCampaignChange("revenue", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                </div>
              </div>

              {/* Ad metrics section */}
              <div className="rounded-2xl border border-foreground/10 bg-card/60 p-5 space-y-4">
                <p className="font-mono text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad metrics</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="impressions" className="text-xs font-medium">Impressions</Label>
                    <Input id="impressions" type="number" step="1" min="0" placeholder="15000" value={campaignForm.impressions} onChange={(e) => handleCampaignChange("impressions", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clicks" className="text-xs font-medium">Clicks</Label>
                    <Input id="clicks" type="number" step="1" min="0" placeholder="420" value={campaignForm.clicks} onChange={(e) => handleCampaignChange("clicks", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ctr" className="text-xs font-medium">CTR (%)</Label>
                    <Input id="ctr" type="number" step="0.01" min="0" placeholder="2.80" value={campaignForm.ctr} onChange={(e) => handleCampaignChange("ctr", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cpc" className="text-xs font-medium">CPC ($)</Label>
                    <Input id="cpc" type="number" step="0.01" min="0" placeholder="0.95" value={campaignForm.cpc} onChange={(e) => handleCampaignChange("cpc", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cpm" className="text-xs font-medium">CPM ($)</Label>
                    <Input id="cpm" type="number" step="0.01" min="0" placeholder="12.50" value={campaignForm.cpm} onChange={(e) => handleCampaignChange("cpm", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add_to_cart" className="text-xs font-medium">Add to cart</Label>
                    <Input id="add_to_cart" type="number" step="1" min="0" placeholder="38" value={campaignForm.add_to_cart} onChange={(e) => handleCampaignChange("add_to_cart", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="purchases" className="text-xs font-medium">Purchases</Label>
                    <Input id="purchases" type="number" step="1" min="0" placeholder="8" value={campaignForm.purchases} onChange={(e) => handleCampaignChange("purchases", e.target.value)} className="h-10 rounded-xl" required />
                  </div>
                </div>
              </div>

              {analysisError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                  {analysisError}
                </p>
              )}

              <div className="flex items-center gap-4">
                <Button type="submit" size="lg" className="rounded-xl px-8" disabled={isRunningAnalysis}>
                  {isRunningAnalysis ? <><Spinner className="size-4" />Analyzing...</> : <>Get my verdict<Zap className="size-4" /></>}
                </Button>
                <button type="button" onClick={skipToAnalysis} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: Verdict ── */}
        {step === 3 && verdict && verdictMeta && (
          <div className="flex flex-1 flex-col space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-foreground/10 bg-card">
                <TrendingUp className="size-5 text-emerald-500" />
              </div>
              <div>
                <h1 className="font-display text-4xl leading-none tracking-tight lg:text-5xl">
                  Your first verdict is ready
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Here&apos;s what Operon found about{" "}
                  <span className="font-medium text-foreground">{campaignForm.product_name || "your campaign"}</span>
                </p>
              </div>
            </div>

            {/* Main verdict */}
            <div className={`rounded-2xl border p-6 ${verdictMeta.bg} ${verdictMeta.border}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">AI recommendation</p>
                  <p className={`mt-1 text-5xl font-bold tracking-tight ${verdictMeta.color}`}>{verdictMeta.label}</p>
                  {typeof verdict.decision.confidenceScore === "number" && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{verdict.decision.confidenceScore}% confidence</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-muted-foreground">ROAS</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{verdict.derived.roas.toFixed(2)}x</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">{verdict.decision.shortReason}</p>
            </div>

            {/* Key numbers */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Ad spend", value: `$${verdict.derived.spend.toFixed(2)}` },
                { label: "Break-even ROAS", value: `${verdict.derived.breakEvenRoas.toFixed(2)}x` },
                {
                  label: "Profit",
                  value: `${verdict.derived.profit >= 0 ? "+" : ""}$${verdict.derived.profit.toFixed(2)}`,
                  highlight: verdict.derived.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                },
              ].map(({ label, value, highlight }) => (
                <Card key={label} className="border-foreground/10 bg-card/80">
                  <CardContent className="pt-5 pb-4">
                    <p className="font-mono text-xs text-muted-foreground">{label}</p>
                    <p className={`mt-1 text-2xl font-semibold ${highlight ?? ""}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main finding */}
            {verdict.diagnosis && (
              <Card className="border-foreground/10 bg-card/80">
                <CardHeader className="pb-2 pt-5">
                  <p className="font-mono text-xs text-muted-foreground">Main finding</p>
                </CardHeader>
                <CardContent className="pb-5">
                  <p className="text-sm font-medium">{verdict.diagnosis.mainProblem}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{verdict.diagnosis.why}</p>
                  {verdict.diagnosis.proofMetric && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">Key signal: {verdict.diagnosis.proofMetric}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Connect ad account prompt */}
            <div className="rounded-2xl border border-foreground/10 bg-card/60 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Tag className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Connect your ad account for automatic updates</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Link Meta or TikTok Ads — Operon pulls fresh data and recomputes verdicts automatically. No manual entry needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button asChild size="lg" className="rounded-xl px-8">
                <Link href="/dashboard/integrations">
                  Connect ad account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="rounded-xl">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
