"use client";

import { useMemo, useState } from "react";
import { BarChart3, Check, ChevronDown } from "lucide-react";

import {
  BENCHMARK_NICHES,
  getBenchmarks,
  nicheLabel,
  normalizeNiche,
  type BenchmarkNiche,
  type BenchmarkTone,
} from "@/lib/benchmark-engine";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { cn } from "@/lib/utils";

type CompareMetrics = {
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
};

const TONE_CLASS: Record<BenchmarkTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
  yellow: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
};

const METRIC_LABEL: Record<string, string> = {
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  cpa: "CPA",
  roas: "ROAS",
};

function formatValue(metric: string, value: number) {
  if (metric === "ctr") return `${value.toFixed(1)}%`;
  if (metric === "roas") return `${value.toFixed(2)}x`;
  return `$${value.toFixed(2)}`;
}

export function BenchmarkComparePanel({
  niche,
  platform,
  metrics,
}: {
  niche?: string | null;
  platform?: string | null;
  metrics: CompareMetrics;
}) {
  const apiBaseUrl = getApiBaseUrl();
  const [selectedNiche, setSelectedNiche] = useState<BenchmarkNiche>(normalizeNiche(niche));
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () => getBenchmarks({ niche: selectedNiche, platform, ...metrics }),
    [metrics, platform, selectedNiche],
  );

  async function saveNiche(nextNiche: BenchmarkNiche) {
    setSelectedNiche(nextNiche);
    const token = localStorage.getItem("operon_token");
    if (!token) return;

    setSaving(true);
    try {
      await fetch(`${apiBaseUrl}/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ niche: nextNiche }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">How do I compare?</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Benchmarks are labeled as estimated or community avg.</p>
          </div>
        </div>

        <label className="relative inline-flex items-center gap-2 text-[12px] text-muted-foreground">
          Niche
          <select
            value={selectedNiche}
            onChange={(event) => saveNiche(event.target.value as BenchmarkNiche)}
            className="h-8 appearance-none rounded-md border border-border bg-background px-3 pr-8 text-[13px] font-medium text-foreground outline-none"
            disabled={saving}
          >
            {BENCHMARK_NICHES.map((item) => (
              <option key={item} value={item}>{nicheLabel(item)}</option>
            ))}
          </select>
          {saving ? <Check className="absolute right-2 size-3 text-emerald-500" /> : <ChevronDown className="pointer-events-none absolute right-2 size-3" />}
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((row) => (
          <div key={row.metric} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-muted-foreground">{METRIC_LABEL[row.metric]}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS[row.tone])}>
                {row.deltaPct > 0 ? "+" : ""}{row.deltaPct}%
              </span>
            </div>
            <div className="mt-2 text-[18px] font-semibold tabular-nums text-foreground">
              {formatValue(row.metric, row.value)}
            </div>
            <p className="mt-1 min-h-9 text-[11px] leading-4 text-muted-foreground">
              {row.copy}
            </p>
            <span className="mt-2 inline-flex h-6 items-center rounded px-1.5 text-[10px] text-muted-foreground">
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
