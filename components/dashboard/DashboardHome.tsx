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
    <main className="h-full overflow-y-auto bg-[#F7F8FA] text-[#111827]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-8 py-8 lg:px-10">
        <section>
          <div>
            <h1 className="text-[24px] font-semibold leading-tight tracking-normal">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-[13px] text-[#9CA3AF]">
              {loading ? "Loading your workspace..." : `Current store: ${activeStoreName}`}
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <div className="flex h-10 items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px]">
              <span className="flex min-w-0 items-center gap-3 text-[#6B7280]">
                <AlertCircle className="size-4 shrink-0" />
                <span className="truncate">Connect Meta, TikTok, or Shopify to keep charts updated automatically.</span>
              </span>
              <Button variant="ghost" size="sm" className="h-7 rounded-md px-3 text-[13px] font-semibold text-[#374151]" onClick={() => router.push("/dashboard?tab=integrations")}>
                Set up
              </Button>
            </div>
            <div className="flex h-10 items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] text-[#6B7280]">
              <CheckCircle2 className="size-4 shrink-0 text-[#10B981]" />
              <span className="truncate">All caught up. Your latest decisions are ready when new metrics arrive.</span>
            </div>
          </div>
        </section>

        <div className="flex gap-1 text-[13px] font-medium text-[#6B7280]">
          <span className="rounded-md bg-[#111827] px-3 py-1.5 text-white">7 days</span>
          <span className="px-3 py-1.5 hover:text-[#111827] cursor-pointer">30 days</span>
          <span className="px-3 py-1.5 hover:text-[#111827] cursor-pointer">90 days</span>
          <span className="px-3 py-1.5 hover:text-[#111827] cursor-pointer">All time</span>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Revenue", value: `$${fmt(totals.revenue)}`, note: "Latest dataset", icon: CircleDollarSign },
            { label: "Purchases", value: fmt(totals.purchases), note: `${fmt(totals.clicks)} clicks`, icon: ShoppingBag },
          ].map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex items-center gap-2 text-[13px] text-[#9CA3AF]">
                <Icon className="size-4" />
                {label}
              </div>
              <div className="mt-3 text-[32px] font-semibold leading-none tracking-tight text-[#111827]">{value}</div>
              <div className="mt-2 text-[12px] text-[#10B981]">
                <ArrowUpRight className="inline size-3.5" />
                {note}
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LineChart className="size-4 text-[#9CA3AF]" />
                <h2 className="text-[14px] font-semibold text-[#111827]">Revenue over time</h2>
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="operonRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" opacity={1} />
                  <XAxis dataKey="date" stroke="#9CA3AF" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9CA3AF" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 12,
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

        <section className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Package className="size-4 text-[#9CA3AF]" />
            <h2 className="text-[14px] font-semibold text-[#111827]">Product performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead className="text-left text-[#9CA3AF]">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Revenue</th>
                  <th className="pb-3 font-medium">Purchases</th>
                  <th className="pb-3 font-medium">ROAS</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr key={`${row.name}-${row.decision}`} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="py-3 font-medium text-[#111827]">{row.name || "Unnamed product"}</td>
                    <td className="py-3 tabular-nums text-[#374151]">${fmt(row.revenue)}</td>
                    <td className="py-3 tabular-nums text-[#374151]">{fmt(row.purchases)}</td>
                    <td className="py-3 tabular-nums text-[#374151]">{row.roas.toFixed(2)}x</td>
                    <td className="py-3">
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
