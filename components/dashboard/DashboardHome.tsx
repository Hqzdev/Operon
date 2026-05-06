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

  const activeStoreName = user?.activeStore?.name || user?.storeName || user?.storeUrl || "your store";
  const firstName = user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
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
    <main className="h-full overflow-y-auto bg-white text-[#171717]">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-10 px-8 py-14 lg:px-12">
        <section>
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-[44px] font-bold leading-tight tracking-tight sm:text-[52px]">
                {greeting()}, {firstName}
              </h1>
              <p className="mt-5 text-[24px] leading-8 text-[#626262]">
                {loading ? "Loading your workspace..." : `Current store: ${activeStoreName}`}
              </p>
            </div>
          </div>

          <div className="mt-9 grid gap-4">
            <div className="flex min-h-16 items-center justify-between rounded-lg bg-[#f4f4f4] px-8 text-[21px]">
              <span className="flex min-w-0 items-center gap-5 text-[#626262]">
                <AlertCircle className="size-6 shrink-0" />
                <span className="truncate">Connect Meta, TikTok, or Shopify to keep charts updated automatically.</span>
              </span>
              <Button variant="ghost" size="sm" className="h-10 rounded-md px-4 text-[19px] font-semibold text-[#171717]" onClick={() => router.push("/dashboard?tab=integrations")}>
                Set up
              </Button>
            </div>
            <div className="flex min-h-16 items-center gap-5 rounded-lg bg-[#f4f4f4] px-8 text-[21px] text-[#626262]">
              <CheckCircle2 className="size-6 shrink-0 text-[#2d8b58]" />
              <span className="truncate">All caught up. Your latest decisions are ready when new metrics arrive.</span>
            </div>
          </div>
        </section>

        <div className="flex gap-8 text-[21px] font-medium text-[#626262]">
          <span className="rounded-lg bg-[#171717] px-5 py-3 text-white">7 days</span>
          <span className="px-2 py-3">30 days</span>
          <span className="px-2 py-3">90 days</span>
          <span className="px-2 py-3">All time</span>
        </div>

        <section className="grid max-w-[980px] gap-6 md:grid-cols-2">
          {[
            { label: "Revenue", value: `$${fmt(totals.revenue)}`, note: "Latest dataset", icon: CircleDollarSign },
            { label: "Purchases", value: fmt(totals.purchases), note: `${fmt(totals.clicks)} clicks`, icon: ShoppingBag },
          ].map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="min-h-[170px] rounded-xl border border-[#dfdfdf] bg-white p-8">
              <div className="flex items-center gap-4 text-[22px] text-[#626262]">
                <Icon className="size-7" />
                {label}
              </div>
              <div className="mt-8 text-[42px] font-bold tracking-tight">{value}</div>
              <div className="mt-4 text-[20px] text-[#2d8b58]">{note}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6">
          <div className="rounded-xl border border-[#dfdfdf] bg-white p-8">
            <div className="mb-8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <LineChart className="size-7 text-[#626262]" />
                <h2 className="text-[28px] font-semibold">Revenue over time</h2>
              </div>
            </div>
            <div className="h-[390px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="operonRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.65} />
                  <XAxis dataKey="date" stroke="#626262" tickLine={false} axisLine={false} tick={{ fontSize: 18 }} />
                  <YAxis stroke="#626262" tickLine={false} axisLine={false} tick={{ fontSize: 18 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#60a5fa"
                    strokeWidth={3}
                    fill="url(#operonRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>

        <section className="rounded-xl border border-[#dfdfdf] bg-white p-8">
          <div className="mb-8 flex items-center gap-3">
            <Package className="size-6 text-[#626262]" />
            <h2 className="text-[28px] font-semibold">Product performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[21px]">
              <thead className="text-left text-[#626262]">
                <tr className="border-b border-[#dfdfdf]">
                  <th className="pb-5 font-normal">Product</th>
                  <th className="pb-5 font-normal">Revenue</th>
                  <th className="pb-5 font-normal">Purchases</th>
                  <th className="pb-5 font-normal">ROAS</th>
                  <th className="pb-5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr key={`${row.name}-${row.decision}`} className="border-b border-[#eeeeee] last:border-0">
                    <td className="py-6 font-medium">{row.name || "Unnamed product"}</td>
                    <td className="py-6 tabular-nums">${fmt(row.revenue)}</td>
                    <td className="py-6 tabular-nums">{fmt(row.purchases)}</td>
                    <td className="py-6 tabular-nums">{row.roas.toFixed(2)}x</td>
                    <td className="py-6">
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
