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
  Users,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

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

export default function OnboardingPage() {
  const router = useRouter();
  const [storeUrl, setStoreUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StoreAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("operon_user");
    if (!raw) return;
    try {
      const user = JSON.parse(raw) as { onboardingCompleted?: boolean };
      if (user.onboardingCompleted) {
        router.replace("/dashboard");
      }
    } catch {
      // ignore parse errors
    }
  }, [router]);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsAnalyzing(true);
    setAnalysis(null);

    const token = localStorage.getItem("operon_token");
    const apiBaseUrl = getApiBaseUrl();

    try {
      const url = storeUrl.startsWith("http") ? storeUrl : `https://${storeUrl}`;
      const response = await fetch(`${apiBaseUrl}/onboarding/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeUrl: url }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "Analysis failed. Please check the URL and try again.");
        return;
      }

      setAnalysis(data.analysis as StoreAnalysis);

      const raw = localStorage.getItem("operon_user");
      if (raw) {
        try {
          const user = JSON.parse(raw);
          localStorage.setItem(
            "operon_user",
            JSON.stringify({
              ...user,
              onboardingCompleted: true,
              storeName: (data.analysis as StoreAnalysis).storeName,
              storeUrl: url,
            }),
          );
        } catch {
          // ignore
        }
      }
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,20,20,0.06),transparent_30%)]" />

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16 lg:px-10">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-tight">
            Operon
          </Link>
          <span className="font-mono text-xs text-muted-foreground">Setup · Step 1 of 1</span>
        </div>

        <div className="mt-16 flex flex-1 flex-col">
          {!analysis ? (
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 font-mono text-xs text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  AI-powered store analysis
                </div>
                <h1 className="font-display text-5xl leading-none tracking-tight lg:text-6xl">
                  Welcome to Operon
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Paste your store URL and our AI will analyze your niche, audience, and the
                  metrics that matter most to your business.
                </p>
              </div>

              <form onSubmit={handleAnalyze} className="space-y-4">
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
                  <Button
                    type="submit"
                    className="h-12 rounded-xl px-6 text-base"
                    disabled={isAnalyzing || !storeUrl.trim()}
                  >
                    {isAnalyzing ? (
                      <>
                        <Spinner className="size-4" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze my store
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>

                {isAnalyzing && (
                  <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card/60 px-5 py-4">
                    <Spinner className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Analyzing your store...</p>
                      <p className="text-xs text-muted-foreground">
                        Fetching page data and running AI analysis. This takes 10–20 seconds.
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                    {error}
                  </p>
                )}
              </form>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Store, label: "Platform detection", desc: "Shopify, WooCommerce, and more" },
                  { icon: Users, label: "Audience insights", desc: "Who actually buys from you" },
                  { icon: BarChart3, label: "Key metrics", desc: "What to track for your niche" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-foreground/10 bg-card/60 p-5 backdrop-blur-sm"
                  >
                    <Icon className="mb-3 size-5 text-muted-foreground" />
                    <div className="text-sm font-medium">{label}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-foreground/10 bg-card">
                  <CheckCircle2 className="size-5 text-green-500" />
                </div>
                <div>
                  <h1 className="font-display text-4xl leading-none tracking-tight lg:text-5xl">
                    Analysis complete
                  </h1>
                  <p className="mt-2 text-muted-foreground">
                    Here&apos;s what Operon found about{" "}
                    <span className="font-medium text-foreground">{analysis.storeName}</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-foreground/10 bg-card/80">
                  <CardHeader className="pb-2 pt-5">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <Store className="size-3.5" />
                      Store overview
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-5">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">Platform</div>
                      <div className="mt-0.5 font-medium">{analysis.platform}</div>
                    </div>
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">Niche</div>
                      <div className="mt-0.5 font-medium">{analysis.niche}</div>
                    </div>
                    {analysis.storeDescription && (
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">Description</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">{analysis.storeDescription}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-foreground/10 bg-card/80">
                  <CardHeader className="pb-2 pt-5">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <Users className="size-3.5" />
                      Audience &amp; pricing
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-5">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">Target audience</div>
                      <div className="mt-0.5 font-medium">{analysis.targetAudience}</div>
                    </div>
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">Price range</div>
                      <div className="mt-0.5 font-medium">{analysis.estimatedPriceRange}</div>
                    </div>
                  </CardContent>
                </Card>

                {analysis.topCategories.length > 0 && (
                  <Card className="border-foreground/10 bg-card/80">
                    <CardHeader className="pb-2 pt-5">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <Tag className="size-3.5" />
                        Top categories
                      </div>
                    </CardHeader>
                    <CardContent className="pb-5">
                      <div className="flex flex-wrap gap-2">
                        {analysis.topCategories.map((cat) => (
                          <Badge key={cat} variant="secondary">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-foreground/10 bg-card/80">
                  <CardHeader className="pb-2 pt-5">
                    <CardTitle className="flex items-center gap-2 text-xs font-mono font-normal text-muted-foreground">
                      <BarChart3 className="size-3.5" />
                      Suggested metrics to track
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="flex flex-wrap gap-2">
                      {analysis.suggestedMetrics.map((metric) => (
                        <Badge key={metric} variant="outline">
                          {metric}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl px-8"
                >
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-xl"
                  onClick={() => {
                    setAnalysis(null);
                    setStoreUrl("");
                  }}
                >
                  Analyze a different store
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
