"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface SeoIssue {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

interface MarketingImprovement {
  title: string;
  description: string;
  whyItMatters: string;
}

interface MetaTagAnalysis {
  current: string;
  quality: "good" | "average" | "poor";
  suggestion: string;
}

interface SeoAnalysisResult {
  storeUrl: string;
  seoScore: number;
  issues: SeoIssue[];
  titleAnalysis: MetaTagAnalysis;
  descriptionAnalysis: MetaTagAnalysis;
  marketingImprovements: MarketingImprovement[];
  contentGaps: string[];
  competitorPositioning: string;
  socialMediaRecommendations: string[];
  analyzedAt: string;
}

const LOADING_STEPS = [
  "Fetching your store...",
  "Extracting SEO signals...",
  "Analyzing meta tags...",
  "Generating recommendations...",
  "Building marketing insights...",
];

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("operon_token");
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="700" fill={color}>
          {score}
        </text>
        <text x="70" y="92" textAnchor="middle" fontSize="11" fill="currentColor" className="text-muted-foreground" opacity="0.6">
          / 100
        </text>
      </svg>
      <span className="text-sm font-medium" style={{ color }}>
        {score >= 70 ? "Good" : score >= 40 ? "Needs Work" : "Poor"}
      </span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const variants: Record<string, { label: string; className: string }> = {
    critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    warning: { label: "Warning", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    info: { label: "Info", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  };
  const v = variants[severity];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${v.className}`}>
      {v.label}
    </span>
  );
}

function QualityBadge({ quality }: { quality: "good" | "average" | "poor" }) {
  const map = {
    good: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    average: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    poor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[quality]}`}>
      {quality}
    </span>
  );
}

function LoadingState({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-24">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-2xl">🔍</span>
      </div>
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-lg font-semibold">{LOADING_STEPS[step] ?? "Processing..."}</p>
        <div className="flex gap-1.5">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

function EmptyState({ onAnalyze, isAnalyzing }: { onAnalyze: () => void; isAnalyzing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">
        📊
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">No SEO analysis yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Run a full SEO & marketing analysis of your store. We&apos;ll extract key signals and generate
          actionable recommendations powered by AI.
        </p>
      </div>
      <Button onClick={onAnalyze} disabled={isAnalyzing} size="lg" className="min-w-40">
        {isAnalyzing ? "Analyzing..." : "Analyze Now"}
      </Button>
    </div>
  );
}

function ResultsView({ result, onReanalyze, isAnalyzing }: { result: SeoAnalysisResult; onReanalyze: () => void; isAnalyzing: boolean }) {
  const analyzedDate = new Date(result.analyzedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO & Marketing Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium">{result.storeUrl}</span>
            {" · "}
            Last analyzed {analyzedDate}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReanalyze} disabled={isAnalyzing}>
          {isAnalyzing ? "Analyzing..." : "Re-analyze"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score card */}
        <Card className="flex flex-col items-center justify-center py-8">
          <CardHeader className="items-center pb-2 text-center">
            <CardTitle className="text-base">SEO Score</CardTitle>
            <CardDescription className="text-xs">Overall health rating</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ScoreCircle score={result.seoScore} />
          </CardContent>
        </Card>

        {/* Issues list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SEO Issues</CardTitle>
            <CardDescription className="text-xs">Fix these to improve your score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <SeverityBadge severity={issue.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{issue.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{issue.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Meta tags panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meta Tags</CardTitle>
          <CardDescription className="text-xs">Current vs. AI-suggested rewrites</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title Tag</span>
                <QualityBadge quality={result.titleAnalysis.quality} />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <p className="font-mono text-xs leading-relaxed">{result.titleAnalysis.current || "(none)"}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/50 dark:bg-green-900/10 text-sm">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Suggested</p>
                <p className="font-mono text-xs leading-relaxed text-green-800 dark:text-green-300">{result.titleAnalysis.suggestion}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meta Description</span>
                <QualityBadge quality={result.descriptionAnalysis.quality} />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <p className="font-mono text-xs leading-relaxed">{result.descriptionAnalysis.current || "(none)"}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/50 dark:bg-green-900/10 text-sm">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Suggested</p>
                <p className="font-mono text-xs leading-relaxed text-green-800 dark:text-green-300">{result.descriptionAnalysis.suggestion}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick wins / Marketing improvements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Wins</CardTitle>
          <CardDescription className="text-xs">Top marketing improvements, prioritized by impact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.marketingImprovements.map((item, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
                      <span className="text-xs font-medium text-muted-foreground">Why it matters:</span>
                      <span className="text-xs">{item.whyItMatters}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Content gaps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Content Gaps</CardTitle>
            <CardDescription className="text-xs">Topics & keywords your store is missing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.contentGaps.map((gap, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {gap}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Social & competitor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Social & Competitive</CardTitle>
            <CardDescription className="text-xs">Positioning and social media recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Competitor Positioning</p>
              <p className="text-sm text-muted-foreground">{result.competitorPositioning}</p>
            </div>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social Media</p>
              <ul className="space-y-1.5">
                {result.socialMediaRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-muted-foreground">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SeoPage() {
  const router = useRouter();
  const [result, setResult] = useState<SeoAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      throw new Error("Not authenticated");
    }
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    authFetch("/api/seo/result")
      .then((r) => r.json())
      .then((data) => {
        setResult(data ?? null);
      })
      .catch(() => setError("Failed to load cached result"))
      .finally(() => setIsLoading(false));
  }, [router, authFetch]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    setLoadingStep(0);

    const stepTimer = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 4000);

    try {
      const res = await authFetch("/api/seo/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Analysis failed");
      } else {
        setResult(data as SeoAnalysisResult);
      }
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      clearInterval(stepTimer);
      setIsAnalyzing(false);
    }
  }, [authFetch]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-60" />
          <Skeleton className="h-60 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return <LoadingState step={loadingStep} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" onClick={() => setError(null)}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!result) {
    return <EmptyState onAnalyze={runAnalysis} isAnalyzing={isAnalyzing} />;
  }

  return <ResultsView result={result} onReanalyze={runAnalysis} isAnalyzing={isAnalyzing} />;
}
