"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronsUpDown,
  CircleDollarSign,
  Package,
  Pause,
  RefreshCw,
  ShoppingBag,
  Target,
  TrendingUp,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

type OutcomePricingStatus = {
  enrolled: boolean;
  status: string;
  savedSpend: string;
  threshold: string;
  remainingToThreshold: string;
  progressPct: number;
  feeRate: number;
  cap: string;
  projectedInvoice: string;
  formula: string;
  noDisputeRule: string;
  economics: {
    invoiceAmount: string;
    contributionMargin: string;
    contributionMarginPct: number;
    positiveContribution: boolean;
  };
  latestInvoice: null | {
    id: string;
    status: string;
    amount: string;
    confirmationUrl: string | null;
    savedSpend: string;
    createdAt: string;
  };
};

const COLUMN_HINTS: Record<string, string> = {
  product:   "The name of the product or ad campaign you were running",
  revenue:   "Total money earned from sales of this product in the selected period",
  purchases: "Number of completed orders for this product",
  roas:      "Return on ad spend — how much you earn for every dollar put into ads. For example, 3x means you spent $100 and got $300 back",
  cpa:       "Cost per acquisition — ad spend divided by completed purchases",
  trend:     "ROAS movement over the last 7 days compared with the previous 7 days",
  status:    "AI recommendation: whether you should keep spending money on this product's ads right now",
};

const STATUS_META: Record<string, { label: string; hint: string; cls: string }> = {
  SCALE: { label: "SCALE",       hint: "ROAS is above 3x. Increase budget while performance holds.",           cls: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900" },
  KILL:  { label: "KILL",        hint: "ROAS is below 1.2x. Pause spend or rebuild the offer.",                cls: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900" },
  TEST:  { label: "TEST",        hint: "ROAS is between 1.2x and 3x. Keep testing before scaling.",            cls: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  FIX:   { label: "TEST",        hint: "Fix the weak signal before spending more",                            cls: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  "TEST AGAIN": { label: "TEST", hint: "Confidence is not high enough for a scale or stop call yet",           cls: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  WATCH: { label: "Keep an eye", hint: "Results are mixed — give it a little more time and see how it goes",  cls: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  WAIT:  { label: "Wait",        hint: "Not enough data yet to make a recommendation",                        cls: "text-muted-foreground bg-muted border-border" },
};

type PortfolioStatus = "SCALE" | "KILL" | "TEST";
type PortfolioAction = "pause" | "increase" | "creative";
type PortfolioSortKey = "name" | "status" | "roas" | "cpa" | "trend" | "revenue" | "purchases";

type PortfolioRow = {
  id: string;
  name: string;
  status: PortfolioStatus;
  revenue: number;
  purchases: number;
  spend: number;
  roas: number;
  cpa: number | null;
  trendDelta: number;
  trendDirection: "up" | "down" | "flat";
  confidence?: number;
  signals?: NonNullable<AnalysisOutput["decision"]["confidenceSignals"]>;
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

function spendFromInput(input: AnalysisInput) {
  return input.total_spend && input.total_spend > 0 ? input.total_spend : input.cpc * input.clicks;
}

function classifyPortfolioStatus(roas: number): PortfolioStatus {
  if (roas > 3) return "SCALE";
  if (roas < 1.2) return "KILL";
  return "TEST";
}

function roasFromTotals(revenue: number, spend: number) {
  return spend > 0 ? revenue / spend : 0;
}

function TrendCell({ row }: { row: PortfolioRow }) {
  const cls =
    row.trendDirection === "up" ? "text-emerald-700 dark:text-emerald-400" :
    row.trendDirection === "down" ? "text-red-700 dark:text-red-400" :
    "text-muted-foreground";
  const symbol = row.trendDirection === "up" ? "↑" : row.trendDirection === "down" ? "↓" : "→";
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums font-medium ${cls}`}>
      <span>{symbol}</span>
      {row.trendDelta > 0 ? "+" : ""}{row.trendDelta.toFixed(2)}x
    </span>
  );
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
  const displayDecision = typeof confidence === "number" && confidence < 50 && decision !== "KILL" ? "TEST" : decision;
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
  const [outcomePricing, setOutcomePricing] = useState<OutcomePricingStatus | null>(null);
  const [outcomeEnrollLoading, setOutcomeEnrollLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<PortfolioStatus | "ALL">("ALL");
  const [portfolioSort, setPortfolioSort] = useState<{ key: PortfolioSortKey; direction: "asc" | "desc" }>({ key: "roas", direction: "desc" });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [portfolioActionMessage, setPortfolioActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const token = localStorage.getItem("operon_token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [profileRes, historyRes, metricsRes, trackRecordRes, outcomePricingRes] = await Promise.all([
          fetch(`${apiBaseUrl}/users/me`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/analysis`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/integrations/metrics`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/recommendation-outcomes`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/outcome-pricing`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
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
        if (outcomePricingRes.ok) {
          setOutcomePricing(await outcomePricingRes.json() as OutcomePricingStatus);
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

  async function joinOutcomeTier() {
    const token = localStorage.getItem("operon_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setOutcomeEnrollLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/outcome-pricing`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setOutcomePricing(await response.json() as OutcomePricingStatus);
      }
    } finally {
      setOutcomeEnrollLoading(false);
    }
  }

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
    const inputs = [
      ...filteredSnapshots.map((snapshot) => snapshot.analysisInput),
      ...filteredHistory.map((item) => item.inputData),
    ];
    const sourceInputs = inputs.length ? inputs : [latestInput ?? history[0]?.inputData].filter(Boolean) as AnalysisInput[];
    const summary = sourceInputs.reduce((acc, input) => {
      const spend = spendFromInput(input);
      acc.revenue += input.revenue;
      acc.purchases += input.purchases;
      acc.clicks += input.clicks;
      acc.impressions += input.impressions;
      acc.spend += spend;
      return acc;
    }, { revenue: 0, purchases: 0, clicks: 0, impressions: 0, spend: 0, roas: 0 });
    return {
      ...summary,
      spend: Number(summary.spend.toFixed(2)),
      roas: summary.spend > 0 ? Number((summary.revenue / summary.spend).toFixed(2)) : 0,
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

  const portfolioRows = useMemo<PortfolioRow[]>(() => {
    type Bucket = {
      name: string;
      revenue: number;
      purchases: number;
      spend: number;
      current7Revenue: number;
      current7Spend: number;
      previous7Revenue: number;
      previous7Spend: number;
      latestAt: number;
      confidence?: number;
      signals?: NonNullable<AnalysisOutput["decision"]["confidenceSignals"]>;
    };
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const buckets = new Map<string, Bucket>();

    const addInput = (dateValue: string, input: AnalysisInput, result?: AnalysisOutput) => {
      const name = input.product_name?.trim() || activeStoreName || "Unnamed product";
      const key = name.toLowerCase();
      const spend = spendFromInput(input);
      const date = new Date(dateValue).getTime();
      const bucket = buckets.get(key) ?? {
        name,
        revenue: 0,
        purchases: 0,
        spend: 0,
        current7Revenue: 0,
        current7Spend: 0,
        previous7Revenue: 0,
        previous7Spend: 0,
        latestAt: 0,
      };
      bucket.revenue += input.revenue;
      bucket.purchases += input.purchases;
      bucket.spend += spend;
      if (now - date <= sevenDays) {
        bucket.current7Revenue += input.revenue;
        bucket.current7Spend += spend;
      } else if (now - date <= sevenDays * 2) {
        bucket.previous7Revenue += input.revenue;
        bucket.previous7Spend += spend;
      }
      if (date >= bucket.latestAt) {
        bucket.latestAt = date;
        bucket.confidence = result ? confidencePercent(result) : bucket.confidence;
        bucket.signals = result?.decision?.confidenceSignals ?? bucket.signals;
      }
      buckets.set(key, bucket);
    };

    filteredSnapshots.forEach((snapshot) => addInput(snapshot.date, snapshot.analysisInput));
    filteredHistory.forEach((item) => addInput(item.createdAt, item.inputData, item.result));

    if (!buckets.size && latestInput) addInput(new Date().toISOString(), latestInput);

    return Array.from(buckets.values()).map((bucket) => {
      const roas = roasFromTotals(bucket.revenue, bucket.spend);
      const cpa = bucket.purchases > 0 ? bucket.spend / bucket.purchases : null;
      const current7Roas = roasFromTotals(bucket.current7Revenue, bucket.current7Spend);
      const previous7Roas = roasFromTotals(bucket.previous7Revenue, bucket.previous7Spend);
      const trendDelta = current7Roas - previous7Roas;
      return {
        id: bucket.name.toLowerCase(),
        name: bucket.name,
        status: classifyPortfolioStatus(roas),
        revenue: bucket.revenue,
        purchases: bucket.purchases,
        spend: bucket.spend,
        roas,
        cpa,
        trendDelta,
        trendDirection: Math.abs(trendDelta) < 0.05 ? "flat" : trendDelta > 0 ? "up" : "down",
        confidence: bucket.confidence,
        signals: bucket.signals,
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [activeStoreName, filteredHistory, filteredSnapshots, latestInput]);

  const portfolioSummary = useMemo(() => {
    const summary = portfolioRows.reduce((acc, row) => {
      acc.revenue += row.revenue;
      acc.purchases += row.purchases;
      acc.spend += row.spend;
      acc.scale += row.status === "SCALE" ? 1 : 0;
      acc.kill += row.status === "KILL" ? 1 : 0;
      acc.test += row.status === "TEST" ? 1 : 0;
      return acc;
    }, { revenue: 0, purchases: 0, spend: 0, scale: 0, kill: 0, test: 0 });
    return {
      ...summary,
      roas: roasFromTotals(summary.revenue, summary.spend),
      cpa: summary.purchases > 0 ? summary.spend / summary.purchases : null,
    };
  }, [portfolioRows]);

  const visiblePortfolioRows = useMemo(() => {
    const rows = portfolioStatusFilter === "ALL"
      ? portfolioRows
      : portfolioRows.filter((row) => row.status === portfolioStatusFilter);
    const direction = portfolioSort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const readValue = (row: PortfolioRow) => {
        if (portfolioSort.key === "name" || portfolioSort.key === "status") return row[portfolioSort.key];
        if (portfolioSort.key === "cpa") return row.cpa ?? Number.POSITIVE_INFINITY;
        if (portfolioSort.key === "trend") return row.trendDelta;
        return row[portfolioSort.key];
      };
      const av = readValue(a);
      const bv = readValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * direction;
      return (Number(av) - Number(bv)) * direction;
    });
  }, [portfolioRows, portfolioSort, portfolioStatusFilter]);

  const selectedProducts = useMemo(
    () => portfolioRows.filter((row) => selectedProductIds.includes(row.id)),
    [portfolioRows, selectedProductIds],
  );

  function togglePortfolioSort(key: PortfolioSortKey) {
    setPortfolioSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function runPortfolioAction(action: PortfolioAction, rows = selectedProducts) {
    const count = rows.length;
    const label = action === "pause" ? "pause" : action === "increase" ? "budget increase" : "creative rotation";
    setPortfolioActionMessage(count ? `${count} ${label} ${count === 1 ? "action" : "actions"} staged for review.` : "Select at least one product first.");
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

        </section>

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
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold text-foreground">Outcome tier</h2>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Free until Operon tracks your first 50 000 ₽ saved from proven KILL calls.
              </p>
            </div>
            {outcomePricing?.latestInvoice?.confirmationUrl ? (
              <a
                href={outcomePricing.latestInvoice.confirmationUrl}
                className="rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background"
              >
                Pay {outcomePricing.latestInvoice.amount}
              </a>
            ) : outcomePricing?.enrolled ? (
              <div className="rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {outcomePricing.status}
              </div>
            ) : null}
          </div>

          {outcomePricing?.enrolled ? (
            <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-muted-foreground">Saved so far</div>
                    <div className="mt-1 text-[30px] font-semibold leading-none">{outcomePricing.savedSpend}</div>
                  </div>
                  <div className="text-right text-[12px] text-muted-foreground">
                    <div>{outcomePricing.remainingToThreshold} to threshold</div>
                    <div>{Math.round(outcomePricing.feeRate * 100)}% fee, capped at {outcomePricing.cap}</div>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${outcomePricing.progressPct}%` }}
                  />
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  {outcomePricing.noDisputeRule}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[12px] text-muted-foreground">Economics check</div>
                <div className="mt-2 text-[20px] font-semibold leading-none">{outcomePricing.economics.contributionMargin}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {outcomePricing.economics.contributionMarginPct}% contribution margin at expected mix
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">
                  Projected first invoice: {outcomePricing.projectedInvoice}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3">
              <div>
                <div className="text-sm font-medium">Start free until value is proven</div>
                <p className="mt-1 text-[12px] text-muted-foreground">The counter only moves on connected KILL calls paused through Operon.</p>
              </div>
              <button
                type="button"
                onClick={joinOutcomeTier}
                disabled={outcomeEnrollLoading}
                className="rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background disabled:opacity-60"
              >
                {outcomeEnrollLoading ? "Joining..." : "Join outcome tier"}
              </button>
            </div>
          )}
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
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Package className="size-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold text-foreground">Portfolio performance</h2>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Multi-product view with status, CPA, 7-day ROAS trend, and quick actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "SCALE", "TEST", "KILL"] as Array<PortfolioStatus | "ALL">).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPortfolioStatusFilter(status)}
                  className={cn(
                    "h-8 rounded-md border px-3 text-[12px] font-medium transition-colors",
                    portfolioStatusFilter === status
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-5">
            {[
              ["Products", fmt(portfolioRows.length)],
              ["ROAS", `${portfolioSummary.roas.toFixed(2)}x`],
              ["CPA", portfolioSummary.cpa !== null ? `$${fmt(portfolioSummary.cpa, { maximumFractionDigits: 2 })}` : "—"],
              ["SCALE", fmt(portfolioSummary.scale)],
              ["KILL", fmt(portfolioSummary.kill)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="mt-1 text-[16px] font-semibold tabular-nums">{value}</div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runPortfolioAction("pause")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium hover:bg-accent"
            >
              <Pause className="size-3.5" />
              Pause selected
            </button>
            <button
              type="button"
              onClick={() => runPortfolioAction("increase")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium hover:bg-accent"
            >
              <TrendingUp className="size-3.5" />
              Increase selected
            </button>
            <button
              type="button"
              onClick={() => runPortfolioAction("creative")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium hover:bg-accent"
            >
              <RefreshCw className="size-3.5" />
              Rotate selected
            </button>
            {portfolioActionMessage ? (
              <span className="text-[12px] text-muted-foreground">{portfolioActionMessage}</span>
            ) : null}
          </div>

          <div className="max-h-[360px] max-w-full overflow-auto overscroll-contain rounded-lg">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead className="sticky top-0 z-10 bg-card text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="w-10 pb-3 pr-3">
                    <input
                      type="checkbox"
                      checked={visiblePortfolioRows.length > 0 && visiblePortfolioRows.every((row) => selectedProductIds.includes(row.id))}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedProductIds(Array.from(new Set([...selectedProductIds, ...visiblePortfolioRows.map((row) => row.id)])));
                        } else {
                          setSelectedProductIds(selectedProductIds.filter((id) => !visiblePortfolioRows.some((row) => row.id === id)));
                        }
                      }}
                      aria-label="Select visible products"
                    />
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <button type="button" onClick={() => togglePortfolioSort("name")} className="inline-flex items-center">
                      Product <ChevronsUpDown className="ml-1 size-3" /> <InfoDot text={COLUMN_HINTS.product} />
                    </button>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <button type="button" onClick={() => togglePortfolioSort("status")} className="inline-flex items-center">
                      Status <ChevronsUpDown className="ml-1 size-3" /> <InfoDot text={COLUMN_HINTS.status} />
                    </button>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <button type="button" onClick={() => togglePortfolioSort("roas")} className="inline-flex items-center">
                      ROAS <ChevronsUpDown className="ml-1 size-3" /> <InfoDot text={COLUMN_HINTS.roas} />
                    </button>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <button type="button" onClick={() => togglePortfolioSort("cpa")} className="inline-flex items-center">
                      CPA <ChevronsUpDown className="ml-1 size-3" /> <InfoDot text={COLUMN_HINTS.cpa} />
                    </button>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <button type="button" onClick={() => togglePortfolioSort("trend")} className="inline-flex items-center">
                      7-day trend <ChevronsUpDown className="ml-1 size-3" /> <InfoDot text={COLUMN_HINTS.trend} />
                    </button>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <button type="button" onClick={() => togglePortfolioSort("revenue")} className="inline-flex items-center">
                      Revenue <ChevronsUpDown className="ml-1 size-3" /> <InfoDot text={COLUMN_HINTS.revenue} />
                    </button>
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">
                    <button type="button" onClick={() => togglePortfolioSort("purchases")} className="inline-flex items-center">
                      Orders <ChevronsUpDown className="ml-1 size-3" /> <InfoDot text={COLUMN_HINTS.purchases} />
                    </button>
                  </th>
                  <th className="whitespace-nowrap pb-3 font-medium">
                    Quick actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiblePortfolioRows.map((row) => (
                  <tr key={row.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
                    <td className="py-3.5 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(row.id)}
                        onChange={(event) => {
                          setSelectedProductIds((current) => event.target.checked
                            ? [...current, row.id]
                            : current.filter((id) => id !== row.id));
                        }}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td className="max-w-[260px] truncate py-3.5 pr-6 font-medium text-foreground">{row.name || "Unnamed"}</td>
                    <td className="whitespace-nowrap py-3.5 pr-6">
                      <StatusCell decision={row.status} confidence={row.confidence} signals={row.signals} />
                    </td>
                    <td className="whitespace-nowrap py-3.5 pr-6"><RoasCell value={row.roas} /></td>
                    <td className="whitespace-nowrap py-3.5 pr-6 tabular-nums text-foreground/80">
                      {row.cpa !== null ? `$${fmt(row.cpa, { maximumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="whitespace-nowrap py-3.5 pr-6"><TrendCell row={row} /></td>
                    <td className="whitespace-nowrap py-3.5 pr-6 tabular-nums text-foreground/80">${fmt(row.revenue)}</td>
                    <td className="whitespace-nowrap py-3.5 pr-6 tabular-nums text-foreground/80">{fmt(row.purchases)}</td>
                    <td className="whitespace-nowrap py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => runPortfolioAction("pause", [row])}
                          className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-accent"
                          aria-label={`Pause ${row.name}`}
                        >
                          <Pause className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => runPortfolioAction("increase", [row])}
                          className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-accent"
                          aria-label={`Increase budget for ${row.name}`}
                        >
                          <TrendingUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => runPortfolioAction("creative", [row])}
                          className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-accent"
                          aria-label={`Rotate creative for ${row.name}`}
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visiblePortfolioRows.length ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      No products match this filter.
                    </td>
                  </tr>
                ) : null}
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
