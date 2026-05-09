"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  Package,
  ShoppingBag,
  Target,
  Upload,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type AnalysisInput, type AnalysisOutput } from "@/lib/analysis-schema";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BenchmarkComparePanel } from "@/components/dashboard/BenchmarkComparePanel";
import { CreativeFatigueAlerts } from "@/components/dashboard/CreativeFatigueAlerts";
import { RedditLeadsWidget } from "@/app/components/RedditLeadsWidget";

type UserProfile = {
  name: string | null;
  email: string;
  storeName?: string | null;
  storeUrl?: string | null;
  niche?: string | null;
  activeStore?: { name: string; url: string } | null;
  usageCount: number;
  usageLimit?: number;
  analysisLimit?: number;
  planDisplay?: string;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  inputData: AnalysisInput;
  result: AnalysisOutput;
};

type Snapshot = {
  id: string;
  provider?: string;
  date: string;
  entityName: string | null;
  externalEntityId: string;
  analysisInput: AnalysisInput;
};

type MetricsResponse = {
  snapshots: Snapshot[];
  latestInput: AnalysisInput | null;
};

type RecommendationTrackRecord = {
  accuracyPct: number | null;
  evaluatedCount: number;
  pendingCount: number;
  moneySaved: number;
  moneyEarned: number;
  calibrationAdjustment: number;
  recent: Array<{
    id: string;
    verdict: string;
    confidence: number | null;
    horizonDays: number;
    wasRight: boolean | null;
    status: string;
    moneySaved: number;
    moneyEarned: number;
    issuedAt: string;
    evaluatedAt: string | null;
    entityName: string | null;
  }>;
};

type MetaCsvImportResponse = {
  imported: number;
  analyses: Array<{
    analysis: {
      id: string;
      createdAt: string;
      inputData: AnalysisInput;
      result: AnalysisOutput;
    };
  }>;
};

type AgencyOverview = {
  workspace: { id: string; name: string; logoUrl: string | null };
  role: "owner" | "member" | "view_only";
  clientCount: number;
  killsThisWeek: number;
  clients: Array<{ id: string; name: string; contactEmail: string | null; storeUrl: string | null }>;
  killItems: Array<{ id: string; clientName: string; reason: string; createdAt: string }>;
  reports: Array<{ id: string; clientId: string; filename: string; generatedAt: string }>;
};

const COLUMN_HINTS: Record<string, string> = {
  product:   "The name of the product or ad campaign you were running",
  revenue:   "Total money earned from sales of this product in the selected period",
  purchases: "Number of completed orders for this product",
  roas:      "Return on ad spend — how much you earn for every dollar put into ads. For example, 3x means you spent $100 and got $300 back",
  status:    "AI recommendation: whether you should keep spending money on this product's ads right now",
};

const STATUS_META: Record<string, { label: string; hint: string; cls: string }> = {
  SCALE: { label: "Scale up",    hint: "Ads are working well — increase your budget while it lasts",          cls: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900" },
  KILL:  { label: "Stop",        hint: "Ads aren't paying off — better to pause and stop wasting money",      cls: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900" },
  FIX:   { label: "Watch",       hint: "Fix the weak signal before spending more",                            cls: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  "TEST AGAIN": { label: "Watch", hint: "Confidence is not high enough for a scale or stop call yet",          cls: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  WATCH: { label: "Keep an eye", hint: "Results are mixed — give it a little more time and see how it goes",  cls: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  WAIT:  { label: "Wait",        hint: "Not enough data yet to make a recommendation",                        cls: "text-muted-foreground bg-muted border-border" },
};

function InfoDot({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-1.5 inline-flex size-[15px] shrink-0 cursor-help select-none items-center justify-center rounded-full border border-border bg-muted text-[9px] font-bold text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent hover:text-foreground">
          ?
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[210px] text-center text-[12px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function RoasCell({ value }: { value: number }) {
  const cls =
    value >= 3 ? "text-emerald-700 dark:text-emerald-400" :
    value >= 1 ? "text-amber-700 dark:text-amber-400" :
                 "text-red-700 dark:text-red-400";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help tabular-nums font-semibold ${cls}`}>
          {value.toFixed(2)}x
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[200px] text-center text-[12px] leading-relaxed">
        {value >= 3
          ? "Great result — you're earning much more than you're spending on ads"
          : value >= 1
          ? "Ads are profitable, but there's room to improve"
          : "Ads aren't paying off — you're spending more than you're earning"}
      </TooltipContent>
    </Tooltip>
  );
}

function confidencePercent(result?: AnalysisOutput | null) {
  if (!result) return 0;
  if (typeof result.decision?.confidenceScore === "number") return result.decision.confidenceScore;
  return result.decision?.confidence === "high" ? 85 : result.decision?.confidence === "medium" ? 65 : 35;
}

function StatusCell({
  decision,
  confidence,
  signals,
}: {
  decision: string;
  confidence?: number;
  signals?: NonNullable<AnalysisOutput["decision"]["confidenceSignals"]>;
}) {
  const displayDecision = typeof confidence === "number" && confidence < 50 ? "TEST AGAIN" : decision;
  const meta = STATUS_META[displayDecision] ?? STATUS_META.WAIT;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex cursor-help items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
          {meta.label}
          {typeof confidence === "number" ? <span className="ml-1.5 font-semibold">{confidence}%</span> : null}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-left text-[12px] leading-relaxed">
        <div>{meta.hint}</div>
        {signals?.length ? (
          <ul className="mt-2 space-y-1 text-[11px]">
            {signals.slice(0, 4).map((signal) => (
              <li key={`${signal.label}-${signal.score}`}>
                <span className="font-medium">{signal.label}</span>: {signal.detail}
              </li>
            ))}
          </ul>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function fmt(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", options).format(value);
}

type PerformanceTooltipPayload = {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
};

function PerformanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: PerformanceTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const revenue = payload.find((item) => item.dataKey === "revenue");
  const purchases = payload.find((item) => item.dataKey === "purchases");

  return (
    <div className="rounded-xl border border-border bg-white/95 px-4 py-3 text-left shadow-lg shadow-black/10 backdrop-blur dark:bg-[#171717]/95">
      <div className="text-[16px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 space-y-1 text-[13px] font-semibold">
        <div className="text-[#256FD1]">
          ${fmt(Number(revenue?.value ?? 0), { maximumFractionDigits: 0 })} revenue
        </div>
        <div className="text-[#16B879]">
          {fmt(Number(purchases?.value ?? 0), { maximumFractionDigits: 0 })} orders
        </div>
      </div>
    </div>
  );
}


type Period = 7 | 30 | 90 | null;

const PERIODS: { label: string; value: Period }[] = [
  { label: "7 days",   value: 7 },
  { label: "30 days",  value: 30 },
  { label: "90 days",  value: 90 },
  { label: "All time", value: null },
];

export function DashboardHome() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [latestInput, setLatestInput] = useState<AnalysisInput | null>(null);
  const [trackRecord, setTrackRecord] = useState<RecommendationTrackRecord | null>(null);
  const [agency, setAgency] = useState<AgencyOverview | null>(null);
  const [metaCsv, setMetaCsv] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const token = localStorage.getItem("operon_token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [profileRes, historyRes, metricsRes, trackRecordRes, agencyRes] = await Promise.all([
          fetch(`${apiBaseUrl}/users/me`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/analysis`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/integrations/metrics`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/recommendation-outcomes`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/agency`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!isMounted) return;

        if (profileRes.status === 401) {
          router.push("/login");
          return;
        }
        if (profileRes.ok) {
          setUser(await profileRes.json() as UserProfile);
        }
        if (historyRes.ok) {
          setHistory(await historyRes.json() as HistoryItem[]);
        }
        if (metricsRes.ok) {
          const data = await metricsRes.json() as MetricsResponse;
          setSnapshots(data.snapshots);
          setLatestInput(data.latestInput);
        }
        if (trackRecordRes.ok) {
          setTrackRecord(await trackRecordRes.json() as RecommendationTrackRecord);
        }
        if (agencyRes.ok) {
          setAgency(await agencyRes.json() as AgencyOverview);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, router]);

  const activeStoreName = user?.activeStore?.name || user?.storeName || user?.storeUrl || null;
  const firstName = user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || null;

  const cutoffDate = useMemo(() => {
    if (!period) return null;
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d;
  }, [period]);

  const filteredHistory = useMemo(() => {
    if (!cutoffDate) return history;
    return history.filter((item) => new Date(item.createdAt) >= cutoffDate);
  }, [history, cutoffDate]);

  const filteredSnapshots = useMemo(() => {
    if (!cutoffDate) return snapshots;
    return snapshots.filter((s) => new Date(s.date) >= cutoffDate);
  }, [snapshots, cutoffDate]);

  const totals = useMemo(() => {
    const source =
      filteredSnapshots[0]?.analysisInput ??
      filteredHistory[0]?.inputData ??
      latestInput ??
      history[0]?.inputData;
    if (!source) return { revenue: 0, purchases: 0, clicks: 0, impressions: 0, spend: 0, roas: 0 };
    const spend = source.cpc * source.clicks;
    return {
      revenue: source.revenue,
      purchases: source.purchases,
      clicks: source.clicks,
      impressions: 0,
      spend: Number(spend.toFixed(2)),
      roas: spend > 0 ? Number((source.revenue / spend).toFixed(2)) : 0,
    };
  }, [filteredHistory, filteredSnapshots, latestInput, history]);

  const benchmarkMetrics = useMemo(() => {
    const source =
      filteredSnapshots[0]?.analysisInput ??
      latestInput ??
      filteredHistory[0]?.inputData ??
      history[0]?.inputData;
    const spend = source ? source.cpc * source.clicks : 0;
    return {
      ctr: source?.ctr ?? 0,
      cpc: source?.cpc ?? 0,
      cpm: source?.cpm ?? 0,
      cpa: source && source.purchases > 0 ? spend / source.purchases : 0,
      roas: spend > 0 ? (source?.revenue ?? 0) / spend : 0,
    };
  }, [filteredHistory, filteredSnapshots, latestInput, history]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, { date: string; revenue: number; purchases: number; clicks: number }>();
    const addPoint = (date: string, input: AnalysisInput) => {
      const key = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const current = byDate.get(key) ?? { date: key, revenue: 0, purchases: 0, clicks: 0 };
      current.revenue += input.revenue;
      current.purchases += input.purchases;
      current.clicks += input.clicks;
      byDate.set(key, current);
    };

    filteredSnapshots.forEach((s) => addPoint(s.date, s.analysisInput));
    filteredHistory.forEach((item) => addPoint(item.createdAt, item.inputData));

    const emptyDays = period ?? 7;
    if (byDate.size === 0) {
      return Array.from({ length: Math.min(emptyDays, 14) }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (Math.min(emptyDays, 14) - 1 - i));
        return {
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
          purchases: 0,
          clicks: 0,
        };
      });
    }

    return Array.from(byDate.values()).reverse();
  }, [filteredHistory, filteredSnapshots, period]);

  const productRows = useMemo(() => {
    const rows = filteredHistory.slice(0, 10).map((item) => ({
      name: item.inputData.product_name,
      revenue: item.inputData.revenue,
      purchases: item.inputData.purchases,
      roas: item.inputData.cpc * item.inputData.clicks > 0
        ? item.inputData.revenue / (item.inputData.cpc * item.inputData.clicks)
        : 0,
      decision: item.result.decision?.finalDecision ?? "WAIT",
      confidence: confidencePercent(item.result),
      signals: item.result.decision?.confidenceSignals,
    }));

    if (rows.length > 0) return rows;

    return [{
      name: activeStoreName,
      revenue: totals.revenue,
      purchases: totals.purchases,
      roas: totals.roas,
      decision: totals.revenue > 0 ? "WATCH" : "WAIT",
      confidence: undefined,
      signals: undefined,
    }];
  }, [activeStoreName, filteredHistory, totals]);

  const usageLimit = user?.usageLimit ?? user?.analysisLimit ?? 0;
  const usagePct = usageLimit > 0 ? Math.min(100, Math.round((user?.usageCount ?? 0) / usageLimit * 100)) : 0;

  const isNewUser = !loading && history.length === 0 && snapshots.length === 0;

  async function handleMetaCsvImport() {
    const token = localStorage.getItem("operon_token");
    if (!token) {
      router.push("/login");
      return;
    }

    setCsvImporting(true);
    setCsvImportError(null);
    setCsvImportMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/analysis/import-meta-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csv: metaCsv, limit: 5 }),
      });
      const data = await response.json() as MetaCsvImportResponse & { message?: string };
      if (!response.ok) throw new Error(data.message ?? "CSV import failed");

      const importedHistory = data.analyses.map(({ analysis }) => ({
        id: analysis.id,
        createdAt: analysis.createdAt,
        inputData: analysis.inputData,
        result: analysis.result,
      }));
      setHistory((current) => [...importedHistory, ...current]);
      setCsvImportMessage(`${data.imported} Meta rows analyzed. Your dashboard is ready.`);
      setMetaCsv("");
    } catch (error) {
      setCsvImportError(error instanceof Error ? error.message : "CSV import failed");
    } finally {
      setCsvImporting(false);
    }
  }

  async function handleCsvFile(file: File | null) {
    if (!file) return;
    setMetaCsv(await file.text());
    setCsvImportError(null);
    setCsvImportMessage(null);
  }

  async function downloadAgencyReport(reportId: string, filename: string) {
    const token = localStorage.getItem("operon_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const response = await fetch(`${apiBaseUrl}/agency/reports/${reportId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:px-10">
        <section>
          <div>
            <h1 className="text-[20px] font-semibold leading-tight tracking-normal sm:text-[24px]">
              {greeting()}{loading ? (
                <span className="ml-1 inline-block h-5 w-24 animate-pulse rounded bg-muted align-middle" />
              ) : firstName ? (
                `, ${firstName}`
              ) : null}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {loading ? (
                <span className="inline-block h-3.5 w-36 animate-pulse rounded bg-muted" />
              ) : activeStoreName ? (
                `Your store: ${activeStoreName}`
              ) : (
                "No store connected yet"
              )}
            </p>
          </div>

          {isNewUser ? (
            /* ── Onboarding checklist for new users ── */
            <div className="mt-5 rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="size-4 text-muted-foreground" />
                <span className="text-[14px] font-semibold">Get started — 2 steps to your first verdict</span>
              </div>
              <div className="space-y-2">
                {/* Step 1 — already done */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-[13px]">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <span className="flex-1 text-muted-foreground line-through">Connect your store</span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">Done</span>
                </div>
                {/* Step 2 — run first analysis */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-[13px]">
                  <div className="flex items-center gap-3">
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">Run your first campaign analysis</span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 shrink-0 rounded-md px-3 text-[12px] font-semibold"
                    onClick={() => router.push("/dashboard?tab=analysis")}
                  >
                    Start
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
                {/* Step 3 — connect ad account */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-[13px]">
                  <div className="flex items-center gap-3">
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">Connect Meta or TikTok Ads for automatic updates</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 rounded-md px-3 text-[12px] font-semibold"
                    onClick={() => router.push("/dashboard?tab=integrations")}
                  >
                    Connect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Status banners for returning users ── */
            <div className="mt-5 grid gap-2">
              <div className="flex h-10 items-center justify-between rounded-lg border border-border bg-card px-4 text-[13px]">
                <span className="flex min-w-0 items-center gap-3 text-muted-foreground">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="truncate">Connect your ad accounts to keep everything updated automatically.</span>
                </span>
                <Button variant="ghost" size="sm" className="h-7 rounded-md px-3 text-[13px] font-semibold" onClick={() => router.push("/dashboard?tab=integrations")}>
                  Continue
                </Button>
              </div>
              <div className="flex h-10 items-center gap-3 rounded-lg border border-border bg-card px-4 text-[13px] text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-[#10B981]" />
                <span className="truncate">All caught up. New recommendations will appear as soon as fresh data arrives.</span>
              </div>
            </div>
          )}
        </section>

        {isNewUser ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <h2 className="text-[14px] font-semibold text-foreground">Paste your Meta Ads export</h2>
                </div>
                <p className="mt-2 max-w-[360px] text-[13px] leading-5 text-muted-foreground">
                  Upload or paste a Meta CSV and Operon will map common columns, analyze the top rows, and populate this dashboard.
                </p>
                <div className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12px] text-muted-foreground">
                  Results usually appear in under 30 seconds.
                </div>
              </div>
              <div className="space-y-3">
                <Textarea
                  value={metaCsv}
                  onChange={(event) => setMetaCsv(event.target.value)}
                  placeholder="Paste CSV rows here: Campaign name, Amount spent, Impressions, Link clicks, Purchases, Purchase conversion value..."
                  className="min-h-[140px] resize-y rounded-lg text-[12px] font-mono"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-md text-[13px]"
                    onClick={() => document.getElementById("meta-csv-upload")?.click()}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload CSV
                  </Button>
                  <input
                    id="meta-csv-upload"
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={(event) => void handleCsvFile(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    className="h-9 rounded-md px-4 text-[13px] font-semibold"
                    disabled={csvImporting || metaCsv.trim().length < 10}
                    onClick={() => void handleMetaCsvImport()}
                  >
                    {csvImporting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                    Analyze top rows
                  </Button>
                  {csvImportError ? <span className="text-[12px] text-red-600">{csvImportError}</span> : null}
                  {csvImportMessage ? <span className="text-[12px] text-emerald-600">{csvImportMessage}</span> : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className="flex gap-1 text-[13px] font-medium text-muted-foreground">
          {PERIODS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setPeriod(value)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                period === value
                  ? "bg-foreground text-background"
                  : "hover:bg-accent hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <CreativeFatigueAlerts />

        <BenchmarkComparePanel
          niche={user?.niche}
          platform={filteredSnapshots[0]?.provider ?? snapshots[0]?.provider ?? "META"}
          metrics={benchmarkMetrics}
        />

        <RedditLeadsWidget
          defaultShopName={activeStoreName}
          defaultProductDescription={user?.niche}
        />

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold text-foreground">Operon track record</h2>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Verdict accuracy is recomputed nightly from connected ad account outcomes.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Last 60 days
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <div className="text-[12px] text-muted-foreground">Accuracy</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">
                {trackRecord?.accuracyPct === null || !trackRecord ? "—" : `${trackRecord.accuracyPct}%`}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {trackRecord?.evaluatedCount ?? 0} evaluated
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">Money saved</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">${fmt(trackRecord?.moneySaved ?? 0)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Right KILL/FIX calls</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">Money earned</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">${fmt(trackRecord?.moneyEarned ?? 0)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Right SCALE calls</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">Pending checks</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">{trackRecord?.pendingCount ?? 0}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Confidence calibration {trackRecord && trackRecord.calibrationAdjustment > 0 ? "+" : ""}{trackRecord?.calibrationAdjustment ?? 0}
              </div>
            </div>
          </div>
          {trackRecord?.recent?.length ? (
            <div className="mt-4 grid gap-2 border-t border-border pt-3">
              {trackRecord.recent.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {item.entityName ?? "Unknown ad set"} · {item.verdict} · {item.horizonDays}d
                  </span>
                  <span className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 font-medium",
                    item.status === "pending"
                      ? "border-border bg-muted text-muted-foreground"
                      : item.wasRight
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
                  )}>
                    {item.status === "pending" ? "Pending" : item.wasRight ? "Right" : "Wrong"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold text-foreground">Agency portfolio</h2>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Manage clients, view portfolio-wide KILL calls, and download white-label weekly PDFs.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {agency?.role ?? "owner"}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-[12px] text-muted-foreground">Clients</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">{agency?.clientCount ?? 0}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Supports 10+ client accounts</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">KILLs this week</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">{agency?.killsThisWeek ?? 0}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Across the portfolio</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">Weekly PDFs</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">{agency?.reports.length ?? 0}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Generated automatically</div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 border-t border-border pt-3 lg:grid-cols-2">
            <div className="space-y-2">
              {(agency?.killItems ?? []).slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
                  <div className="font-medium text-foreground">{item.clientName}</div>
                  <div className="mt-1 line-clamp-2 text-muted-foreground">{item.reason}</div>
                </div>
              ))}
              {!agency?.killItems?.length ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                  No portfolio KILL calls this week.
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              {(agency?.reports ?? []).slice(0, 3).map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => void downloadAgencyReport(report.id, report.filename)}
                  className="block w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-[12px] transition-colors hover:bg-accent"
                >
                  <div className="font-medium text-foreground">{report.filename}</div>
                  <div className="mt-1 text-muted-foreground">White-label client report</div>
                </button>
              ))}
              {!agency?.reports?.length ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                  First weekly PDFs will appear after Monday's automatic report run.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Revenue", value: `$${fmt(totals.revenue)}`, note: "Latest data", icon: CircleDollarSign },
            { label: "Orders", value: fmt(totals.purchases), note: `${fmt(totals.clicks)} ad clicks`, icon: ShoppingBag },
          ].map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Icon className="size-4" />
                {label}
              </div>
              <div className="mt-3 text-[32px] font-semibold leading-none tracking-tight text-foreground">{value}</div>
              <div className="mt-2 text-[12px] text-[#10B981]">
                <ArrowUpRight className="inline size-3.5" />
                {note}
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="rounded-[18px] border border-border bg-card px-5 py-5 shadow-sm sm:px-7 sm:py-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="size-5 text-muted-foreground" />
                <h2 className="text-[19px] font-semibold tracking-normal text-foreground">Performance over time</h2>
              </div>
            </div>
            <div className="h-[300px] sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="operonRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2A73D5" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2A73D5" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="var(--color-border)" opacity={0.85} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 13 }}
                    dy={8}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 13 }}
                    width={44}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: "var(--color-muted-foreground)", strokeWidth: 1, opacity: 0.45 }}
                    content={<PerformanceTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#256FD1"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="url(#operonRevenue)"
                    dot={false}
                    activeDot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    stroke="#16B879"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={false}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-1 flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold text-foreground">Product performance</h2>
          </div>
          <p className="mb-4 text-[12px] text-muted-foreground">
            A summary of each product. Hover the <span className="inline-flex size-[14px] items-center justify-center rounded-full border border-border bg-muted text-[9px] font-bold">?</span> next to any column or status to see a plain-language explanation.
          </p>
          <div className="max-h-[360px] max-w-full overflow-auto overscroll-contain rounded-lg">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="sticky top-0 z-10 bg-card text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <span className="inline-flex items-center">Product <InfoDot text={COLUMN_HINTS.product} /></span>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <span className="inline-flex items-center">Revenue <InfoDot text={COLUMN_HINTS.revenue} /></span>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <span className="inline-flex items-center">Orders <InfoDot text={COLUMN_HINTS.purchases} /></span>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <span className="inline-flex items-center">Return <InfoDot text={COLUMN_HINTS.roas} /></span>
                  </th>
                  <th className="whitespace-nowrap pb-3 font-medium">
                    <span className="inline-flex items-center">Action <InfoDot text={COLUMN_HINTS.status} /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr key={`${row.name}-${row.decision}`} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
                    <td className="max-w-[280px] truncate py-3.5 pr-6 font-medium text-foreground">{row.name || "Unnamed"}</td>
                    <td className="whitespace-nowrap py-3.5 pr-6 tabular-nums text-foreground/80">${fmt(row.revenue)}</td>
                    <td className="whitespace-nowrap py-3.5 pr-6 tabular-nums text-foreground/80">{fmt(row.purchases)}</td>
                    <td className="whitespace-nowrap py-3.5 pr-6"><RoasCell value={row.roas} /></td>
                    <td className="whitespace-nowrap py-3.5"><StatusCell decision={row.decision} confidence={row.confidence} signals={row.signals} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3">
            {Object.entries(STATUS_META).map(([key, { label, hint, cls }]) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <span className={`inline-flex cursor-help items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
                    {label}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-center text-[12px] leading-relaxed">{hint}</TooltipContent>
              </Tooltip>
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground self-center">← hover for details</span>
          </div>
        </section>
      </div>
    </main>
  );
}
