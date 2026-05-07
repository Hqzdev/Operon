"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  LineChart,
  Package,
  ShoppingBag,
  Target,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type AnalysisInput, type AnalysisOutput } from "@/lib/analysis-schema";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type UserProfile = {
  name: string | null;
  email: string;
  storeName?: string | null;
  storeUrl?: string | null;
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
  date: string;
  entityName: string | null;
  externalEntityId: string;
  analysisInput: AnalysisInput;
};

type MetricsResponse = {
  snapshots: Snapshot[];
  latestInput: AnalysisInput | null;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function fmt(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", options).format(value);
}

function decisionVariant(decision?: string) {
  if (decision === "SCALE") return "default";
  if (decision === "KILL") return "destructive";
  return "secondary";
}

export function DashboardHome() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [latestInput, setLatestInput] = useState<AnalysisInput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const token = localStorage.getItem("operon_token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [profileRes, historyRes, metricsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/users/me`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/analysis`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/integrations/metrics`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
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
  const latestHistory = history[0];

  const totals = useMemo(() => {
    const source = latestInput ?? latestHistory?.inputData;
    return {
      revenue: source?.revenue ?? 0,
      purchases: source?.purchases ?? 0,
      clicks: source?.clicks ?? 0,
      impressions: source?.impressions ?? 0,
      spend: source ? Number((source.cpc * source.clicks).toFixed(2)) : 0,
      roas: source && source.cpc * source.clicks > 0
        ? Number((source.revenue / (source.cpc * source.clicks)).toFixed(2))
        : 0,
    };
  }, [latestHistory, latestInput]);

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

    snapshots.slice(0, 14).forEach((snapshot) => addPoint(snapshot.date, snapshot.analysisInput));
    history.slice(0, 14).forEach((item) => addPoint(item.createdAt, item.inputData));

    if (byDate.size === 0) {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
          purchases: 0,
          clicks: 0,
        };
      });
    }

    return Array.from(byDate.values()).reverse().slice(-7);
  }, [history, snapshots]);

  const productRows = useMemo(() => {
    const rows = history.slice(0, 5).map((item) => ({
      name: item.inputData.product_name,
      revenue: item.inputData.revenue,
      purchases: item.inputData.purchases,
      roas: item.inputData.cpc * item.inputData.clicks > 0
        ? item.inputData.revenue / (item.inputData.cpc * item.inputData.clicks)
        : 0,
      decision: item.result.decision?.finalDecision ?? "WAIT",
    }));

    if (rows.length > 0) return rows;

    return [{
      name: activeStoreName,
      revenue: totals.revenue,
      purchases: totals.purchases,
      roas: totals.roas,
      decision: totals.revenue > 0 ? "WATCH" : "WAIT",
    }];
  }, [activeStoreName, history, totals]);

  const usageLimit = user?.usageLimit ?? user?.analysisLimit ?? 0;
  const usagePct = usageLimit > 0 ? Math.min(100, Math.round((user?.usageCount ?? 0) / usageLimit * 100)) : 0;

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
                `Current store: ${activeStoreName}`
              ) : (
                "No store connected yet"
              )}
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <div className="flex h-10 items-center justify-between rounded-lg border border-border bg-card px-4 text-[13px]">
              <span className="flex min-w-0 items-center gap-3 text-muted-foreground">
                <AlertCircle className="size-4 shrink-0" />
                <span className="truncate">Connect Meta, TikTok, or Shopify to keep charts updated automatically.</span>
              </span>
              <Button variant="ghost" size="sm" className="h-7 rounded-md px-3 text-[13px] font-semibold" onClick={() => router.push("/dashboard?tab=integrations")}>
                Set up
              </Button>
            </div>
            <div className="flex h-10 items-center gap-3 rounded-lg border border-border bg-card px-4 text-[13px] text-muted-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-[#10B981]" />
              <span className="truncate">All caught up. Your latest decisions are ready when new metrics arrive.</span>
            </div>
          </div>
        </section>

        <div className="flex gap-1 text-[13px] font-medium text-muted-foreground">
          <span className="rounded-md bg-foreground px-3 py-1.5 text-background">7 days</span>
          <span className="px-3 py-1.5 hover:text-foreground cursor-pointer">30 days</span>
          <span className="px-3 py-1.5 hover:text-foreground cursor-pointer">90 days</span>
          <span className="px-3 py-1.5 hover:text-foreground cursor-pointer">All time</span>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Revenue", value: `$${fmt(totals.revenue)}`, note: "Latest dataset", icon: CircleDollarSign },
            { label: "Purchases", value: fmt(totals.purchases), note: `${fmt(totals.clicks)} clicks`, icon: ShoppingBag },
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
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LineChart className="size-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold text-foreground">Revenue over time</h2>
              </div>
            </div>
            <div className="h-[220px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="operonRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={1} />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-foreground)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#operonRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold text-foreground">Product performance</h2>
          </div>
          <div className="max-h-[360px] max-w-full overflow-auto overscroll-contain rounded-lg">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="sticky top-0 z-10 bg-card text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">Product</th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">Revenue</th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">Purchases</th>
                  <th className="whitespace-nowrap pb-3 pr-6 font-medium">ROAS</th>
                  <th className="whitespace-nowrap pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr key={`${row.name}-${row.decision}`} className="border-b border-border last:border-0">
                    <td className="max-w-[320px] truncate py-3 pr-6 font-medium text-foreground">{row.name || "Unnamed product"}</td>
                    <td className="whitespace-nowrap py-3 pr-6 tabular-nums text-foreground/80">${fmt(row.revenue)}</td>
                    <td className="whitespace-nowrap py-3 pr-6 tabular-nums text-foreground/80">{fmt(row.purchases)}</td>
                    <td className="whitespace-nowrap py-3 pr-6 tabular-nums text-foreground/80">{row.roas.toFixed(2)}x</td>
                    <td className="whitespace-nowrap py-3">
                      <Badge variant={decisionVariant(row.decision) as "default" | "secondary" | "destructive"}>
                        {row.decision}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
