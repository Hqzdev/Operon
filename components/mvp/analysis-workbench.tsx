"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Bell,
  Cable,
  ChevronDown,
  Code2,
  CreditCard,
  Crown,
  Database,
  Link2,
  LoaderCircle,
  LogOut,
  Minus,
  Moon,
  Plus,
  Store,
  Sun,
  Target,
  TrendingUp,
  UserCircle,
  Zap,
} from "lucide-react";
import {
  type AnalysisHistoryItem,
  type AnalysisInput,
  type AnalysisOutput,
} from "@/lib/analysis-schema";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const initialForm: AnalysisInput = {
  product_name: "",
  product_description: "",
  product_price: 0,
  cost: 0,
  ctr: 0,
  cpc: 0,
  cpm: 0,
  impressions: 0,
  clicks: 0,
  add_to_cart: 0,
  purchases: 0,
  revenue: 0,
  return_rate: 0,
  net_revenue: 0,
  total_spend: 0,
  days_active: 0,
  stage: "testing",
};

const fields: Array<{ key: keyof AnalysisInput; label: string; step?: string }> = [
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
  { key: "return_rate", label: "Return rate %", step: "0.01" },
  { key: "net_revenue", label: "Net revenue", step: "0.01" },
  { key: "total_spend", label: "Total spend", step: "0.01" },
  { key: "days_active", label: "Days active", step: "1" },
];

function badgeVariant(decision: string) {
  if (decision === "SCALE") return "default";
  if (decision === "KILL" || decision === "STOP") return "destructive";
  return "secondary";
}

function recommendationLabel(decision?: string) {
  if (decision === "SCALE") return "SCALE";
  if (decision === "KILL") return "STOP";
  if (decision === "FIX" || decision === "TEST AGAIN") return "WATCH";
  return decision ?? "WATCH";
}

function displayedRecommendation(result: AnalysisOutput) {
  return confidencePercent(result) < 50 ? "WATCH" : recommendationLabel(result.decision.finalDecision);
}

function recBadgeVariant(rec: string) {
  if (rec === "SCALE") return "default";
  if (rec === "CUT") return "destructive";
  return "secondary";
}

function confidencePercent(result?: AnalysisOutput | null) {
  if (!result) return 0;
  if (typeof result.decision?.confidenceScore === "number") return result.decision.confidenceScore;
  return result.decision?.confidence === "high" ? 85 : result.decision?.confidence === "medium" ? 65 : 35;
}

function ConfidenceBadge({ result }: { result: AnalysisOutput }) {
  const score = confidencePercent(result);
  const signals = result.decision.confidenceSignals ?? [];
  const cls =
    score >= 75 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" :
    score >= 50 ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300" :
                  "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex cursor-help items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${cls}`}>
          Confidence: {score}%
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-left">
        <div className="text-[12px] font-semibold">Signal breakdown</div>
        <ul className="mt-2 space-y-1 text-[11px] leading-relaxed">
          {signals.length ? signals.map((signal) => (
            <li key={`${signal.label}-${signal.score}`}>
              <span className="font-medium">{signal.label}</span>: {signal.detail}
            </li>
          )) : (
            <li>Confidence was estimated from the available campaign metrics.</li>
          )}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  plan: string;
  planDisplay?: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  usageCount: number;
  usageResetAt: string;
  quietModeEnabled?: boolean;
  quietMinConfidence?: "low" | "medium" | "high" | "";
  quietMinSpendImpact?: number;
};

function quietDefaultsForPlan(plan?: string) {
  if (plan === "SCALE") return { confidence: "high" as const, spendImpact: 1000 };
  if (plan === "PRO") return { confidence: "medium" as const, spendImpact: 500 };
  return { confidence: "medium" as const, spendImpact: 0 };
}

function quietConfidenceValue(user?: UserProfile | null) {
  return user?.quietMinConfidence || quietDefaultsForPlan(user?.plan).confidence;
}

function quietSpendValue(user?: UserProfile | null) {
  return typeof user?.quietMinSpendImpact === "number" && user.quietMinSpendImpact >= 0
    ? user.quietMinSpendImpact
    : quietDefaultsForPlan(user?.plan).spendImpact;
}

type AdSetInput = {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
  product_price: number;
  cost: number;
};

type BudgetAllocationResult = {
  totalBudget: number;
  adSets: Array<{
    name: string;
    spend: number;
    roas: number;
    cpa: number | null;
    breakEvenRoas: number;
    conversionRate: number;
    efficiencyScore: number;
    recommendation: "SCALE" | "HOLD" | "CUT";
    recommendedBudget: number;
    allocatedPct: number;
  }>;
  summary: string;
};

type ScenarioMetrics = {
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  spend: number;
  roas: number;
  profit: number;
  cpa: number | null;
  conversionRate: number;
};

type ScenarioResult = {
  baseline: ScenarioMetrics;
  projected: ScenarioMetrics;
  delta: { revenue_pct: number; profit_pct: number | null; roas_pct: number; purchases_pct: number };
  insight: string;
};

type IntegrationConnection = {
  id: string;
  provider: "META" | "TIKTOK" | "SHOPIFY";
  externalAccountId: string;
  accountName: string | null;
  status: "CONNECTED" | "ACTION_REQUIRED" | "DISCONNECTED" | "ERROR";
  scopes: string[];
  lastSyncedAt: string | null;
  nextSyncAt: string;
  lastError: string | null;
  maxDailyBudgetChangePercent?: number;
  metadata?: { source?: string; writeCapable?: boolean } | null;
  createdAt: string;
};

type IntegrationSnapshot = {
  id: string;
  provider: "META" | "TIKTOK" | "SHOPIFY";
  externalAccountId: string;
  externalEntityId: string;
  entityName: string | null;
  date: string;
  analysisInput: AnalysisInput;
  metrics: Record<string, unknown>;
};

type BudgetSimulationScenario = {
  kind: string;
  label: string;
  expected: {
    cpa: number | null;
    revenue: number;
    roas: number;
    spend: number;
  };
  delta: {
    cpaPct: number | null;
    revenuePct: number | null;
    roasPct: number | null;
  };
  riskLevel: "Low" | "Medium" | "High" | string;
};

type BudgetSimulationResult = {
  campaign: {
    provider: string;
    externalAccountId: string;
    externalEntityId: string;
    entityName: string;
  };
  period: {
    historyDays: number;
    baselineDays: number;
    horizonDays: number;
  };
  baseline: {
    days: number;
    spend: number;
    revenue: number;
    purchases: number;
    cpa: number | null;
    roas: number;
  };
  scenarios: BudgetSimulationScenario[];
  confidence: number;
  signalBreakdown: Array<{ label: string; detail: string; score: number }>;
  basedOn: string[];
};

type ExecutionTarget = {
  connectionId: string;
  provider: "META" | "TIKTOK";
  externalAccountId: string;
  externalEntityId: string;
  entityName: string | null;
};

type AdActionType = "pause" | "increase_budget_20" | "decrease_budget_20";

type AdActionLog = {
  id: string;
  actionType: AdActionType | "undo_budget_change";
  status: "succeeded" | "failed" | "undone";
  externalEntityId: string;
  entityName: string | null;
  errorMessage?: string | null;
  undoUntil?: string | null;
  createdAt: string;
};

const emptyAdSet = (): AdSetInput => ({
  name: "", spend: 0, impressions: 0, clicks: 0,
  add_to_cart: 0, purchases: 0, revenue: 0, product_price: 0, cost: 0,
});

const dashboardTabs = new Set(["analysis", "integrations", "budget", "scenario", "settings"]);
type SettingsSection = "account" | "billing" | "integrations" | "api" | "notifications" | "data";

const settingsNav: Array<{ key: SettingsSection; label: string; icon: typeof UserCircle }> = [
  { key: "account", label: "Account", icon: UserCircle },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "integrations", label: "Integrations", icon: Link2 },
  { key: "api", label: "API", icon: Code2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "data", label: "Data", icon: Database },
];

function numberInputValue(value: number) {
  return value === 0 ? "" : String(value);
}

function parseNumberInput(value: string, integer = false) {
  if (value.trim() === "") return 0;
  const parsed = integer ? Number.parseInt(value, 10) : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatMetricDelta(value: number | null) {
  if (value === null) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}%`;
}

function riskClass(level: string) {
  if (level === "High") return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  if (level === "Medium") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
}

function normalizeAnalysisOutput(raw: unknown): AnalysisOutput {
  const input = (raw ?? {}) as Partial<AnalysisOutput>;
  const decision = (input.decision ?? {}) as Partial<AnalysisOutput["decision"]>;
  const diagnosis = (input.diagnosis ?? {}) as Partial<AnalysisOutput["diagnosis"]>;
  const validation = (input.validation ?? {}) as Partial<AnalysisOutput["validation"]>;
  const profitability = (input.profitability ?? {}) as Partial<AnalysisOutput["profitability"]>;
  const funnelLeak = (input.funnelLeak ?? {}) as Partial<AnalysisOutput["funnelLeak"]>;
  const continueDecision = (input.continueDecision ?? {}) as Partial<AnalysisOutput["continueDecision"]>;
  const derived = (input.derived ?? {}) as Partial<AnalysisOutput["derived"]>;

  return {
    decision: {
      finalDecision: decision.finalDecision ?? "TEST AGAIN",
      shortReason: decision.shortReason ?? "Not enough stable signal yet. Keep testing until more data comes in.",
      confidence: decision.confidence ?? "low",
      confidenceScore: decision.confidenceScore,
      confidenceSignals: Array.isArray(decision.confidenceSignals) ? decision.confidenceSignals : [],
    },
    diagnosis: {
      mainProblem: diagnosis.mainProblem ?? "Creative problem",
      why: diagnosis.why ?? "Operon needs more complete campaign metrics to identify the strongest bottleneck.",
      proofMetric: diagnosis.proofMetric ?? "Insufficient signal",
    },
    actionPlan: Array.isArray(input.actionPlan) ? input.actionPlan : [],
    validation: {
      verdict: validation.verdict ?? "unclear",
      reason: validation.reason ?? "The current data is not strong enough to validate or reject the product.",
      shouldContinueTesting: validation.shouldContinueTesting ?? true,
    },
    profitability: {
      breakEvenCpa: profitability.breakEvenCpa ?? 0,
      breakEvenRoas: profitability.breakEvenRoas ?? 0,
      maxCpcAtCurrentConversion: profitability.maxCpcAtCurrentConversion ?? 0,
      currentCpa: profitability.currentCpa ?? null,
      isProfitable: profitability.isProfitable ?? false,
      why: profitability.why ?? "Profitability could not be fully calculated from this response.",
    },
    funnelLeak: {
      weakestStage: funnelLeak.weakestStage ?? "impressions → clicks",
      explanation: funnelLeak.explanation ?? "No clear funnel leak detected yet.",
      severity: funnelLeak.severity ?? "low",
    },
    creativeAngles: Array.isArray(input.creativeAngles) ? input.creativeAngles : [],
    continueDecision: {
      decision: continueDecision.decision ?? "TEST MORE",
      reason: continueDecision.reason ?? "Collect more data before changing the campaign.",
      minimumAdditionalTestNeeded: continueDecision.minimumAdditionalTestNeeded ?? "Run until the dataset has enough clicks and purchase signal.",
    },
    ltvAdjustment: input.ltvAdjustment,
    derived: {
      spend: derived.spend ?? 0,
      grossRevenue: derived.grossRevenue ?? 0,
      effectiveRevenue: derived.effectiveRevenue ?? derived.grossRevenue ?? 0,
      grossRoas: derived.grossRoas ?? derived.roas ?? 0,
      returnRate: derived.returnRate ?? 0,
      roas: derived.roas ?? 0,
      conversionRate: derived.conversionRate ?? 0,
      addToCartRate: derived.addToCartRate ?? 0,
      breakEvenRoas: derived.breakEvenRoas ?? 0,
      breakEvenCpa: derived.breakEvenCpa ?? 0,
      currentCpa: derived.currentCpa ?? null,
      maxCpcAtCurrentConversion: derived.maxCpcAtCurrentConversion ?? 0,
      profit: derived.profit ?? 0,
      netProfitMargin: derived.netProfitMargin ?? 0,
    },
    provider: input.provider ?? "rules",
    saved: input.saved ?? false,
    savedId: input.savedId,
  };
}

export function AnalysisWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";

  // Analysis state
  const [form, setForm] = useState<AnalysisInput>(initialForm);
  const [result, setResult] = useState<AnalysisOutput | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget | null>(null);
  const [confirmAction, setConfirmAction] = useState<AdActionType | null>(null);
  const [adActionLoading, setAdActionLoading] = useState(false);
  const [adActionMsg, setAdActionMsg] = useState<{ type: "ok" | "err"; text: string; actionId?: string } | null>(null);
  const [paymentContactPlan, setPaymentContactPlan] = useState<"PRO" | "SCALE" | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("analysis");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("account");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [actionEmailsEnabled, setActionEmailsEnabled] = useState(true);
  const [quietSaving, setQuietSaving] = useState(false);

  // Settings state
  const [user, setUser] = useState<UserProfile | null>(null);

  // Budget Allocation state
  const [budgetTotal, setBudgetTotal] = useState(0);
  const [adSets, setAdSets] = useState<AdSetInput[]>([emptyAdSet()]);
  const [budgetResult, setBudgetResult] = useState<BudgetAllocationResult | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Scenario Simulator state
  const [scenarioBase, setScenarioBase] = useState({
    product_price: 0, cost: 0, impressions: 0, clicks: 0,
    add_to_cart: 0, purchases: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0,
    return_rate: 0, net_revenue: 0, total_spend: 0, days_active: 0,
  });
  const [scenarioCtrDelta, setScenarioCtrDelta] = useState(0);
  const [scenarioConvDelta, setScenarioConvDelta] = useState(0);
  const [scenarioCpcDelta, setScenarioCpcDelta] = useState(0);
  const [scenarioAovDelta, setScenarioAovDelta] = useState(0);
  const [scenarioNewBudget, setScenarioNewBudget] = useState<string>("");
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [snapshots, setSnapshots] = useState<IntegrationSnapshot[]>([]);
  const [shopifyShop, setShopifyShop] = useState("");
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsMsg, setIntegrationsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [extensionKey, setExtensionKey] = useState<{ provider: IntegrationConnection["provider"]; key: string } | null>(null);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<BudgetSimulationResult | null>(null);

  const apiBaseUrl = getApiBaseUrl();

  function getToken() {
    return localStorage.getItem("operon_token");
  }

  function logout() {
    localStorage.removeItem("operon_token");
    localStorage.removeItem("operon_user");
    router.push("/login");
  }

  async function updateQuietSettings(next: Partial<Pick<UserProfile, "quietModeEnabled" | "quietMinConfidence" | "quietMinSpendImpact">>) {
    const token = getToken();
    if (!token) return;
    const optimistic = user ? { ...user, ...next } : user;
    if (optimistic) setUser(optimistic);
    setQuietSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      });
      if (res.ok) setUser(await res.json() as UserProfile);
    } finally {
      setQuietSaving(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      const token = getToken();
      if (!token) { router.push("/login"); return; }

      try {
        const paymentId = new URLSearchParams(window.location.search).get("paymentId");
        if (paymentId) {
          try {
            await fetch(`${apiBaseUrl}/payments/${paymentId}/sync`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {
            // Profile loading below still lets webhook-based activation show up.
          }
          window.history.replaceState(null, "", window.location.pathname);
        }

        const [profileRes, historyRes, integrationsRes, metricsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/analysis`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/integrations`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/integrations/metrics`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!isMounted) return;

        if (profileRes.ok) {
          const profile = await profileRes.json() as UserProfile;
          setUser(profile);
        } else if (profileRes.status === 401) {
          logout();
          return;
        }

        if (historyRes.ok) {
          const data = await historyRes.json() as Array<{ id: string; createdAt: string; inputData: AnalysisInput; result: AnalysisOutput }>;
          const mapped = data.map((item) => ({ id: item.id, createdAt: item.createdAt, input: item.inputData, output: normalizeAnalysisOutput(item.result) }));
          if (mapped.length > 0) {
            setHistory(mapped);
            setResult(mapped[0].output);
          }
        }

        if (integrationsRes.ok) {
          const data = await integrationsRes.json() as IntegrationConnection[];
          if (data.length > 0) setIntegrations(data);
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json() as { snapshots: IntegrationSnapshot[]; latestInput: AnalysisInput | null };
          if (data.snapshots.length > 0) setSnapshots(data.snapshots);
          if (data.latestInput) setForm(data.latestInput);
        }
      } catch {
        // Keep the workspace empty if loading fails.
      }
    }

    loadInitial();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const nextTab = tabParam === "scenarios" ? "scenario" : (tabParam ?? "analysis");
    setActiveTab(dashboardTabs.has(nextTab) ? nextTab : "analysis");
  }, [searchParams]);

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) { router.push("/login"); return; }

      const response = await fetch(`${apiBaseUrl}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          setLimitReached(true);
        } else {
          setError(data.message ?? data.error ?? "Analysis failed");
        }
        return;
      }

      const output = normalizeAnalysisOutput(data.result);
      setResult(output);

      // Auto-fill scenario base from last analysis input
      setScenarioBase({
        product_price: form.product_price, cost: form.cost,
        impressions: form.impressions, clicks: form.clicks,
        add_to_cart: form.add_to_cart, purchases: form.purchases,
        revenue: form.revenue, ctr: form.ctr, cpc: form.cpc, cpm: form.cpm,
        return_rate: form.return_rate ?? 0, net_revenue: form.net_revenue ?? 0,
        total_spend: form.total_spend ?? 0, days_active: form.days_active ?? 0,
      });

      // Refresh profile to get updated usageCount
      const profileRes = await fetch(`${apiBaseUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (profileRes.ok) {
        const profile = await profileRes.json() as UserProfile;
        setUser(profile);
      }

      // Refresh history
      const historyResponse = await fetch(`${apiBaseUrl}/analysis`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json() as Array<{ id: string; createdAt: string; inputData: AnalysisInput; result: AnalysisOutput }>;
        setHistory(historyData.map((item) => ({ id: item.id, createdAt: item.createdAt, input: item.inputData, output: normalizeAnalysisOutput(item.result) })));
      }
    } catch {
      setError("Unable to reach the analysis endpoint.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitBudget() {
    setBudgetError(null);
    setBudgetLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push("/login"); return; }
      const res = await fetch(`${apiBaseUrl}/budget/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ totalBudget: budgetTotal, adSets }),
      });
      const data = await res.json();
      if (!res.ok) { setBudgetError(data.message ?? "Failed"); return; }
      setBudgetResult(data as BudgetAllocationResult);
    } catch {
      setBudgetError("Network error");
    } finally {
      setBudgetLoading(false);
    }
  }

  async function submitScenario() {
    setScenarioError(null);
    setScenarioLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push("/login"); return; }
      const changes: Record<string, number> = {};
      if (scenarioCtrDelta !== 0) changes.ctr_delta_pct = scenarioCtrDelta;
      if (scenarioConvDelta !== 0) changes.conversion_delta_pct = scenarioConvDelta;
      if (scenarioCpcDelta !== 0) changes.cpc_delta_pct = scenarioCpcDelta;
      if (scenarioAovDelta !== 0) changes.aov_delta_pct = scenarioAovDelta;
      if (scenarioNewBudget) changes.new_budget = Number(scenarioNewBudget);
      const res = await fetch(`${apiBaseUrl}/scenario/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base: scenarioBase, changes }),
      });
      const data = await res.json();
      if (!res.ok) { setScenarioError(data.message ?? "Failed"); return; }
      setScenarioResult(data as ScenarioResult);
    } catch {
      setScenarioError("Network error");
    } finally {
      setScenarioLoading(false);
    }
  }

  function upgradePlan(plan: "PRO" | "SCALE") {
    setPaymentContactPlan(plan);
  }

  async function refreshIntegrations() {
    const token = getToken();
    if (!token) return;
    const [integrationsRes, metricsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/integrations`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBaseUrl}/integrations/metrics`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (integrationsRes.ok) {
      setIntegrations(await integrationsRes.json() as IntegrationConnection[]);
    }
    if (metricsRes.ok) {
      const data = await metricsRes.json() as { snapshots: IntegrationSnapshot[]; latestInput: AnalysisInput | null };
      setSnapshots(data.snapshots);
    }
  }

  async function connectProvider(provider: IntegrationConnection["provider"]) {
    const token = getToken();
    if (!token) return;
    setIntegrationsLoading(true);
    setIntegrationsMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, shop: provider === "SHOPIFY" ? shopifyShop : undefined }),
      });
      const data = await res.json() as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        setIntegrationsMsg({ type: "err", text: data.message ?? "Connection failed" });
        return;
      }
      window.location.href = data.url;
    } catch {
      setIntegrationsMsg({ type: "err", text: "Network error" });
    } finally {
      setIntegrationsLoading(false);
    }
  }

  async function connectExtension(provider: IntegrationConnection["provider"]) {
    const token = getToken();
    if (!token) return;
    setIntegrationsLoading(true);
    setIntegrationsMsg(null);
    setExtensionKey(null);
    try {
      const res = await fetch(`${apiBaseUrl}/integrations/extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          provider,
          accountName: provider === "SHOPIFY" && shopifyShop ? shopifyShop : `${provider} extension`,
        }),
      });
      const data = await res.json() as { extensionKey?: string; provider?: IntegrationConnection["provider"]; message?: string };
      if (!res.ok || !data.extensionKey || !data.provider) {
        setIntegrationsMsg({ type: "err", text: data.message ?? "Extension connection failed" });
        return;
      }
      setExtensionKey({ provider: data.provider, key: data.extensionKey });
      await refreshIntegrations();
      setIntegrationsMsg({ type: "ok", text: "Extension key generated. Paste it into the Operon browser extension." });
    } catch {
      setIntegrationsMsg({ type: "err", text: "Network error" });
    } finally {
      setIntegrationsLoading(false);
    }
  }

  async function syncIntegrations() {
    const token = getToken();
    if (!token) return;
    setIntegrationsLoading(true);
    setIntegrationsMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/integrations`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        setIntegrationsMsg({ type: "err", text: data.message ?? "Sync failed" });
        return;
      }
      await refreshIntegrations();
      setIntegrationsMsg({ type: "ok", text: "Metrics synced" });
    } catch {
      setIntegrationsMsg({ type: "err", text: "Network error" });
    } finally {
      setIntegrationsLoading(false);
    }
  }

  async function simulateCampaign(snapshot: IntegrationSnapshot) {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    setSimulationOpen(true);
    setSimulationLoading(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      const res = await fetch(`${apiBaseUrl}/campaign-simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          externalEntityId: snapshot.externalEntityId,
          externalAccountId: snapshot.externalAccountId,
          provider: snapshot.provider === "SHOPIFY" ? undefined : snapshot.provider,
        }),
      });
      const data = await res.json() as BudgetSimulationResult | { message?: string };
      if (!res.ok) {
        setSimulationError("message" in data && data.message ? data.message : "Simulation failed");
        return;
      }
      setSimulationResult(data as BudgetSimulationResult);
    } catch {
      setSimulationError("Network error");
    } finally {
      setSimulationLoading(false);
    }
  }

  function targetFromSnapshot(snapshot: IntegrationSnapshot): ExecutionTarget | null {
    if (snapshot.provider === "SHOPIFY") return null;
    const connection = integrations.find((item) =>
      item.provider === snapshot.provider && item.externalAccountId === snapshot.externalAccountId,
    );
    if (!connection) return null;
    const writeScope = snapshot.provider === "META" ? "ads_management" : "ad.write";
    if (!connection.scopes.includes(writeScope)) return null;
    return {
      connectionId: connection.id,
      provider: snapshot.provider,
      externalAccountId: snapshot.externalAccountId,
      externalEntityId: snapshot.externalEntityId,
      entityName: snapshot.entityName,
    };
  }

  function actionLabel(action: AdActionType | null) {
    if (action === "pause") return "PAUSE";
    if (action === "increase_budget_20") return "INCREASE BUDGET +20%";
    if (action === "decrease_budget_20") return "DECREASE BUDGET -20%";
    return "EXECUTE";
  }

  async function executeConfirmedAction() {
    if (!confirmAction || !executionTarget) return;
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    setAdActionLoading(true);
    setAdActionMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/ad-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...executionTarget,
          actionType: confirmAction,
          verdictId: result?.savedId,
          confirmed: true,
        }),
      });
      const data = await res.json() as { action?: AdActionLog; message?: string };
      if (!res.ok || !data.action) {
        setAdActionMsg({ type: "err", text: data.message ?? "Action failed" });
        return;
      }
      const canUndo = data.action.undoUntil && new Date(data.action.undoUntil) > new Date();
      setAdActionMsg({
        type: "ok",
        text: `${actionLabel(confirmAction)} executed${canUndo ? ". Undo available for 1 hour." : "."}`,
        actionId: canUndo ? data.action.id : undefined,
      });
      setConfirmAction(null);
    } catch {
      setAdActionMsg({ type: "err", text: "Network error" });
    } finally {
      setAdActionLoading(false);
    }
  }

  async function undoLastAction(actionId: string) {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    setAdActionLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/ad-actions/${actionId}/undo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        setAdActionMsg({ type: "err", text: data.message ?? "Undo failed" });
        return;
      }
      setAdActionMsg({ type: "ok", text: "Budget change undone." });
    } catch {
      setAdActionMsg({ type: "err", text: "Network error" });
    } finally {
      setAdActionLoading(false);
    }
  }

  async function updateGuardrail(connectionId: string, value: number) {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    const res = await fetch(`${apiBaseUrl}/ad-actions/guardrails`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        connectionId,
        maxDailyBudgetChangePercent: value,
      }),
    });
    if (res.ok) {
      setIntegrations((current) => current.map((connection) =>
        connection.id === connectionId
          ? { ...connection, maxDailyBudgetChangePercent: value }
          : connection,
      ));
    }
  }

  function exportWorkspaceData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      history,
      integrations,
      snapshots,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "operon-workspace-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function disconnectIntegration(connectionId: string) {
    const token = getToken();
    if (!token) return;
    await fetch(`${apiBaseUrl}/integrations/${connectionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await refreshIntegrations();
  }

  function updateAdSet(index: number, field: keyof AdSetInput, value: string) {
    setAdSets((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      return { ...s, [field]: field === "name" ? value : parseNumberInput(value) };
    }));
  }

  const hasProFeatures = user?.plan !== "STARTER" && user !== null;
  const isStarterPlan = user?.plan === "STARTER" || user === null;
  const profileDisplayName = user?.name || user?.email?.split("@")[0] || "User";
  const profileInitial = profileDisplayName.trim().charAt(0).toUpperCase() || "U";
  const profilePlan = user?.plan === "STARTER" ? "FREE PLAN" : `${user?.planDisplay ?? user?.plan ?? "FREE"} PLAN`;

  return (
    <main className="relative h-full overflow-y-auto bg-background text-foreground">
      <div className="flex min-h-full flex-col px-6 py-5 sm:px-8 lg:px-8">
        <div className="mb-8 shrink-0">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-6 bg-foreground/30" />
            <span className="font-mono text-xs text-muted-foreground">Analysis Workbench</span>
          </div>
          <h1 className="font-display text-[28px] leading-tight tracking-tight sm:text-[36px]">
            Operon Analysis Workbench
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Decision engine, diagnosis, action plan, and product validation
          </p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          {/* ── Integrations tab ── */}
          <TabsContent value="integrations">
            <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <Card className="border-border bg-card py-0 shadow-none">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="text-[15px] font-semibold tracking-normal">Connections</CardTitle>
                  <CardDescription>
                    Use the Operon browser extension as the main data connector. OAuth write access is optional for one-click actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-[13px] font-semibold">Extension-first setup</div>
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                      Generate a key, paste it into the extension, then open Meta Ads, TikTok Ads, or Shopify. The extension sends snapshots into Operon without platform API approval.
                    </p>
                    {extensionKey ? (
                      <div className="mt-3 rounded-lg border border-border bg-background p-3">
                        <div className="text-[11px] font-medium text-muted-foreground">{extensionKey.provider} extension key</div>
                        <div className="mt-1 break-all font-mono text-[12px]">{extensionKey.key}</div>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3">
                    <Button
                      variant="outline"
                      className="h-11 justify-start rounded-xl"
                      disabled={integrationsLoading}
                      onClick={() => connectExtension("META")}
                    >
                      <Cable className="size-4" />
                      Connect Meta via extension
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 justify-start rounded-xl"
                      disabled={integrationsLoading}
                      onClick={() => connectExtension("TIKTOK")}
                    >
                      <Cable className="size-4" />
                      Connect TikTok via extension
                    </Button>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        placeholder="your-store.myshopify.com"
                        value={shopifyShop}
                        onChange={(event) => setShopifyShop(event.target.value)}
                        className="h-11 rounded-xl"
                      />
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl"
                        disabled={integrationsLoading || !shopifyShop}
                        onClick={() => connectExtension("SHOPIFY")}
                      >
                        <Store className="size-4" />
                        Connect Shopify extension
                      </Button>
                    </div>
                  </div>

                  <details className="mt-4 rounded-xl border border-border px-4 py-3">
                    <summary className="cursor-pointer text-[12px] font-medium">Optional OAuth for write actions</summary>
                    <div className="mt-3 grid gap-2">
                      <Button variant="ghost" className="h-9 justify-start rounded-lg text-xs" onClick={() => connectProvider("META")} disabled={integrationsLoading}>
                        Connect Meta OAuth for PAUSE / budget changes
                      </Button>
                      <Button variant="ghost" className="h-9 justify-start rounded-lg text-xs" onClick={() => connectProvider("TIKTOK")} disabled={integrationsLoading}>
                        Connect TikTok OAuth for PAUSE / budget changes
                      </Button>
                    </div>
                  </details>

                  <Separator className="my-6" />

                  <div className="flex flex-wrap gap-3">
                    <Button className="rounded-full" onClick={syncIntegrations} disabled={integrationsLoading}>
                      {integrationsLoading ? <LoaderCircle className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
                      Sync now
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={refreshIntegrations}>
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={integrationsLoading || snapshots.length === 0}
                      onClick={() => setActiveTab("analysis")}
                    >
                      Continue to analysis
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>

                  {integrationsMsg ? (
                    <p className={`mt-4 text-sm ${integrationsMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                      {integrationsMsg.text}
                    </p>
                  ) : null}

                  <div className="mt-6 space-y-3">
                    {integrations.length ? integrations.map((connection) => (
                      <div key={connection.id} className="rounded-2xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{connection.accountName ?? connection.externalAccountId}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                              {connection.provider} · {connection.metadata?.source === "extension" ? "EXTENSION" : "OAUTH"} · {connection.status}
                            </div>
                            {connection.lastSyncedAt ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Last sync {new Date(connection.lastSyncedAt).toLocaleString()}
                              </div>
                            ) : null}
                            {connection.lastError ? (
                              <div className="mt-2 text-xs text-red-600">{connection.lastError}</div>
                            ) : null}
                            {connection.provider !== "SHOPIFY" ? (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>Max daily budget change</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={connection.maxDailyBudgetChangePercent ?? 20}
                                  onChange={(event) => {
                                    const value = Math.max(1, Math.min(100, Number(event.target.value) || 20));
                                    setIntegrations((current) => current.map((item) =>
                                      item.id === connection.id
                                        ? { ...item, maxDailyBudgetChangePercent: value }
                                        : item,
                                    ));
                                  }}
                                  onBlur={(event) => updateGuardrail(connection.id, Math.max(1, Math.min(100, Number(event.target.value) || 20)))}
                                  className="h-8 w-20 rounded-lg text-xs"
                                />
                                <span>%</span>
                              </div>
                            ) : null}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-red-600 hover:text-red-600"
                            onClick={() => disconnectIntegration(connection.id)}
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                        No connected accounts yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card py-0 shadow-none">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="text-[15px] font-semibold tracking-normal">Synced metrics</CardTitle>
                  <CardDescription>
                    Pick a daily snapshot to auto-populate the analysis form.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="space-y-3">
                    {snapshots.length ? snapshots.map((snapshot) => (
                      <div key={snapshot.id} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{snapshot.entityName ?? snapshot.externalEntityId}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {snapshot.provider} · {new Date(snapshot.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {snapshot.provider !== "SHOPIFY" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => simulateCampaign(snapshot)}
                              >
                                <TrendingUp className="size-4" />
                                Simulate budget
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              className="rounded-full"
                              onClick={() => {
                                setExecutionTarget(targetFromSnapshot(snapshot));
                                setForm(snapshot.analysisInput);
                                setActiveTab("analysis");
                              }}
                            >
                              Continue with this data
                              <ArrowRight className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                          <div>
                            <div className="text-xs text-muted-foreground">Impressions</div>
                            <div className="tabular-nums">{snapshot.analysisInput.impressions}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Clicks</div>
                            <div className="tabular-nums">{snapshot.analysisInput.clicks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">CTR</div>
                            <div className="tabular-nums">{snapshot.analysisInput.ctr}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Purchases</div>
                            <div className="tabular-nums">{snapshot.analysisInput.purchases}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Revenue</div>
                            <div className="tabular-nums">${snapshot.analysisInput.revenue}</div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-border text-center">
                        <div className="max-w-sm">
                          <div className="text-[20px] font-semibold">No synced metrics</div>
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            Connect the browser extension and open your ad account or store to send snapshots into Operon.
                          </p>
                          <div className="mt-5 flex justify-center">
                            <Button
                              className="rounded-full"
                              onClick={integrations.length ? syncIntegrations : () => connectExtension("META")}
                              disabled={integrationsLoading}
                            >
                              {integrationsLoading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                              {integrations.length ? "Refresh snapshots" : "Continue: connect extension"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* ── Analysis tab ── */}
          <TabsContent value="analysis">
            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-border bg-card py-0 shadow-none">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="text-[15px] font-semibold tracking-normal">Input</CardTitle>
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
                          setForm((current) => ({ ...current, product_name: event.target.value }))
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
                          setForm((current) => ({ ...current, product_description: event.target.value }))
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
                          value={numberInputValue(form[field.key] as number)}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.key]:
                                field.step === "1"
                                  ? parseNumberInput(event.target.value, true)
                                  : parseNumberInput(event.target.value),
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

                  {/* Usage bar for Starter plan */}
                  {isStarterPlan && user && (
                    <div className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-3">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground">
                          {user.usageCount} / 10 analyses used this month
                        </span>
                        <button
                          type="button"
                          onClick={() => upgradePlan("SCALE")}
                          className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                        >
                          Upgrade for unlimited
                        </button>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className={`h-1.5 rounded-full transition-all ${user.usageCount >= 8 ? "bg-amber-500" : "bg-foreground"}`}
                          style={{ width: `${Math.min(100, (user.usageCount / 10) * 100)}%` }}
                        />
                      </div>
                      {user.usageCount >= 8 && (
                        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                          {10 - user.usageCount} {10 - user.usageCount === 1 ? "analysis" : "analyses"} left — upgrade to keep going after that.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button onClick={submit} disabled={isSubmitting} className="rounded-full">
                      {isSubmitting ? (
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
                      onClick={() => { setForm(initialForm); setError(null); setLimitReached(false); }}
                    >
                      Clear form
                    </Button>
                  </div>

                  {limitReached && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                      <div className="flex items-start gap-3">
                        <Crown className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-200">
                            You&apos;ve used all 10 free analyses this month
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
                            Upgrade to Pro for unlimited analyses, Budget Allocation, and Scenario Simulator — $19/mo.
                          </p>
                          <Button
                            size="sm"
                            className="mt-3 h-8 rounded-full text-xs"
                            onClick={() => upgradePlan("SCALE")}
                          >
                            <TrendingUp className="size-3.5" />
                            Upgrade to Pro · $19/mo
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {error ? (
                    <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                      {error}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border bg-card py-0 shadow-none">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="text-[15px] font-semibold tracking-normal">Output</CardTitle>
                  <CardDescription>
                    Strict operator output. Short, decisive, actionable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {result ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={badgeVariant(displayedRecommendation(result)) as "default" | "secondary" | "destructive"}>
                          {displayedRecommendation(result)}
                        </Badge>
                        <ConfidenceBadge result={result} />
                        <span className="text-sm text-muted-foreground">
                          Provider: {result.provider}
                        </span>
                        {result.saved ? (
                          <span className="text-sm text-muted-foreground">Saved</span>
                        ) : null}
                      </div>

                      {executionTarget ? (
                        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <div>
                              <div className="text-xs font-semibold">One-click execution</div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Target: {executionTarget.entityName ?? executionTarget.externalEntityId} · {executionTarget.provider}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() => setConfirmAction("pause")}
                              >
                                PAUSE
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() => setConfirmAction("increase_budget_20")}
                              >
                                +20%
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() => setConfirmAction("decrease_budget_20")}
                              >
                                -20%
                              </Button>
                            </div>
                          </div>
                          {adActionMsg ? (
                            <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${adActionMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                              <span>{adActionMsg.text}</span>
                              {adActionMsg.actionId ? (
                                <button
                                  className="font-medium underline"
                                  disabled={adActionLoading}
                                  onClick={() => undoLastAction(adActionMsg.actionId!)}
                                >
                                  Undo budget change
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                          Extension data is read-only. Connect optional Meta/TikTok OAuth write access to execute PAUSE or budget changes from Operon.
                        </div>
                      )}

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Why</div>
                        <p className="mt-2 text-base leading-relaxed">{result.decision.shortReason}</p>
                      </div>

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Main problem</div>
                        <p className="mt-2 text-lg font-medium">{result.diagnosis.mainProblem}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{result.diagnosis.why}</p>
                        <p className="mt-2 text-sm">Evidence: <span className="text-muted-foreground">{result.diagnosis.proofMetric}</span></p>
                      </div>

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Actions</div>
                        <ol className="mt-3 space-y-3">
                          {(Array.isArray(result.actionPlan) ? result.actionPlan : []).map((action, index) => (
                            <li key={action} className="flex gap-3">
                              <span className="font-mono text-sm text-muted-foreground">{index + 1}.</span>
                              <span className="text-sm leading-relaxed">{action}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Product validation</div>
                          <div className="mt-2 text-lg font-medium">{result.validation.verdict}</div>
                          <p className="mt-2 text-sm text-muted-foreground">{result.validation.reason}</p>
                        </div>
                        <div className="rounded-2xl border border-border p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Continue testing</div>
                          <div className="mt-2 text-lg font-medium">{result.validation.shouldContinueTesting ? "Yes" : "No"}</div>
                          <div className="mt-3 text-sm text-muted-foreground">Active break-even ROAS: {result.derived.breakEvenRoas}</div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Profitability check</div>
                          <div className="mt-2 text-lg font-medium">{result.profitability.isProfitable ? "Profitable" : "Not profitable yet"}</div>
                          <p className="mt-2 text-sm text-muted-foreground">{result.profitability.why}</p>
                          <div className="mt-3 text-sm text-muted-foreground">Break-even CPA: ${result.profitability.breakEvenCpa}</div>
                        </div>
                        <div className="rounded-2xl border border-border p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Continue or stop</div>
                          <div className="mt-2 text-lg font-medium">{result.continueDecision.decision}</div>
                          <p className="mt-2 text-sm text-muted-foreground">{result.continueDecision.reason}</p>
                          <div className="mt-3 text-sm text-muted-foreground">Next minimum test: {result.continueDecision.minimumAdditionalTestNeeded}</div>
                        </div>
                      </div>

                      {result.ltvAdjustment?.hasEnoughHistory ? (
                        <div className="rounded-2xl border border-border p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-3">LTV adjustment · Shopify data</div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground">First-order ROAS</div>
                              <div className="mt-1 font-mono">{result.ltvAdjustment.firstOrderBreakEvenRoas}x</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">LTV-adjusted ROAS</div>
                              <div className="mt-1 font-mono text-green-600">{result.ltvAdjustment.ltvBreakEvenRoas}x</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">First-order CPA</div>
                              <div className="mt-1 font-mono">${result.ltvAdjustment.firstOrderBreakEvenCpa}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">LTV-adjusted CPA</div>
                              <div className="mt-1 font-mono text-green-600">${result.ltvAdjustment.ltvBreakEvenCpa}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Customer LTV</div>
                              <div className="mt-1 font-mono">${result.ltvAdjustment.ltv}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Expected repeats</div>
                              <div className="mt-1 font-mono">{(result.ltvAdjustment.expectedRepeats ?? 1).toFixed(2)}x</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">90-day repeat rate</div>
                              <div className="mt-1 font-mono">{((result.ltvAdjustment.repeatPurchaseRate90 ?? result.ltvAdjustment.repeatPurchaseRate) * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">180-day repeat rate</div>
                              <div className="mt-1 font-mono">{((result.ltvAdjustment.repeatPurchaseRate180 ?? result.ltvAdjustment.repeatPurchaseRate) * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-muted-foreground">
                            Based on {result.ltvAdjustment.ordersAnalyzed} matched product orders from {result.ltvAdjustment.customersAnalyzed} customers ({result.ltvAdjustment.windowDays ?? 180}-day Shopify window).
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-border p-4">
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Funnel leak</div>
                        <div className="mt-2 text-lg font-medium">{result.funnelLeak.weakestStage}</div>
                        <p className="mt-2 text-sm text-muted-foreground">{result.funnelLeak.explanation}</p>
                        <div className="mt-3 text-sm text-muted-foreground">Severity: {result.funnelLeak.severity}</div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-mono uppercase tracking-wide text-muted-foreground">
                          <span>Decision confidence</span>
                          <span>{confidencePercent(result)}%</span>
                        </div>
                        <Progress value={confidencePercent(result)} />
                        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                          {(result.decision.confidenceSignals ?? []).slice(0, 4).map((signal) => (
                            <li key={`${signal.label}-${signal.score}`} className="flex gap-2">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                              <span>{signal.label}: {signal.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Creative angles</div>
                        <div className="mt-3 grid gap-4">
                          {result.creativeAngles.map((angle, index) => (
                            <div key={`${angle.hookIdea}-${index}`} className="rounded-2xl border border-border p-4">
                              <div className="text-sm font-medium">Angle {index + 1}</div>
                              <div className="mt-3 text-sm"><span className="font-medium">Hook:</span> {angle.hookIdea}</div>
                              <div className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Concept:</span> {angle.concept}</div>
                              <div className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Emotion:</span> {angle.targetEmotion}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                        <Button className="rounded-full" onClick={() => setActiveTab("budget")}>
                          Continue to budget check
                          <ArrowRight className="size-4" />
                        </Button>
                        <Button variant="outline" className="rounded-full" onClick={() => setActiveTab("scenario")}>
                          Continue to scenario check
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-dashed border-border text-center">
                      <div className="max-w-sm">
                        <div className="text-[20px] font-semibold">Run the first analysis</div>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          The dashboard will return a decision, diagnosis, profitability check,
                          funnel leak, creative ideas, and the next actions from one input.
                        </p>
                        <div className="mt-5 flex justify-center">
                          <Button className="rounded-full" onClick={submit} disabled={isSubmitting}>
                            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                            Continue: run data check
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-border bg-card py-0 shadow-none">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="text-[15px] font-semibold tracking-normal">Derived metrics</CardTitle>
                  <CardDescription>Calculated from the submitted dataset.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {result ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["Spend", `$${result.derived.spend}`],
                        ["Gross revenue", `$${result.derived.grossRevenue ?? result.derived.effectiveRevenue ?? 0}`],
                        ["Net revenue", `$${result.derived.effectiveRevenue ?? result.derived.grossRevenue ?? 0}`],
                        ["Return rate", `${result.derived.returnRate ?? 0}%`],
                        ["Gross ROAS", String(result.derived.grossRoas ?? result.derived.roas)],
                        ["Net ROAS", String(result.derived.roas)],
                        ["Conversion rate", `${result.derived.conversionRate}%`],
                        ["Add-to-cart rate", `${result.derived.addToCartRate}%`],
                        ["Break-even ROAS", String(result.derived.breakEvenRoas)],
                        ["Break-even CPA", `$${result.derived.breakEvenCpa}`],
                        ["Current CPA", result.derived.currentCpa !== null ? `$${result.derived.currentCpa}` : "—"],
                        ["Max CPC", result.derived.maxCpcAtCurrentConversion !== null ? `$${result.derived.maxCpcAtCurrentConversion}` : "—"],
                        ["Profit", `$${result.derived.profit}`],
                        ["Net profit margin", `${result.derived.netProfitMargin}%`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-border p-4">
                          <div className="text-sm text-muted-foreground">{label}</div>
                          <div className="mt-1.5 text-[26px] font-semibold leading-none">{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Derived metrics will appear after the first analysis.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card py-0 shadow-none">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="text-[15px] font-semibold tracking-normal">Recent analyses</CardTitle>
                  <CardDescription>Your past analyses — tap any to review the decision.</CardDescription>
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
                                {displayedRecommendation(item.output)} · {confidencePercent(item.output)}% confidence · {item.output.diagnosis?.mainProblem}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={badgeVariant(displayedRecommendation(item.output)) as "default" | "secondary" | "destructive"}>
                                {displayedRecommendation(item.output)}
                              </Badge>
                              <ConfidenceBadge result={item.output} />
                            </div>
                          </div>
                          {index < history.length - 1 ? <Separator className="mt-4" /> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No analyses yet — run the form above to get your first recommendation.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* ── Budget Allocation tab ── */}
          <TabsContent value="budget">
            {!hasProFeatures ? (
              <div className="flex min-h-[480px] items-center justify-center">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
                  <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-muted">
                    <TrendingUp className="size-5 text-muted-foreground" />
                  </div>
                  <div className="text-[20px] font-semibold tracking-tight">Budget Allocation</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Compare your ad sets side by side. Operon scores each by efficiency and tells you exactly how to redistribute your budget to maximize ROAS.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {[
                      "Compare up to 10 ad sets at once",
                      "Efficiency score per ad set (SCALE / HOLD / CUT)",
                      "Recommended budget split in dollars",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                        <span className="mt-0.5 size-3.5 shrink-0 text-foreground">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full rounded-xl" onClick={() => upgradePlan("SCALE")}>
                    Unlock Budget Allocation · $19/mo
                  </Button>
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Pro plan · Unlimited analyses + all features · Cancel anytime
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card className="border-border bg-card py-0 shadow-none">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="text-[15px] font-semibold tracking-normal">Budget Allocation</CardTitle>
                    <CardDescription>
                      Compare ad sets and distribute your budget by efficiency.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Total budget ($)</Label>
                      <Input
                        type="number"
                        step="10"
                        value={numberInputValue(budgetTotal)}
                        onChange={(e) => setBudgetTotal(parseNumberInput(e.target.value))}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-4">
                      {adSets.map((set, idx) => (
                        <div key={idx} className="rounded-2xl border border-border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Ad Set {idx + 1}</span>
                            {adSets.length > 2 && (
                              <button
                                onClick={() => setAdSets((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-muted-foreground hover:text-red-600 transition"
                              >
                                <Minus className="size-4" />
                              </button>
                            )}
                          </div>
                          <Input
                            placeholder="Ad set name"
                            value={set.name}
                            onChange={(e) => updateAdSet(idx, "name", e.target.value)}
                            className="h-9 rounded-xl"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {(["spend", "impressions", "clicks", "add_to_cart", "purchases", "revenue", "product_price", "cost"] as Array<keyof AdSetInput>).map((field) => (
                              field !== "name" && (
                                <div key={field} className="space-y-1">
                                  <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={numberInputValue(set[field] as number)}
                                    onChange={(e) => updateAdSet(idx, field, e.target.value)}
                                    className="h-8 rounded-xl text-sm"
                                  />
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      ))}

                      {adSets.length < 10 && (
                        <button
                          onClick={() => setAdSets((prev) => [...prev, emptyAdSet()])}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition"
                        >
                          <Plus className="size-4" />
                          Add ad set
                        </button>
                      )}
                    </div>

                    <Button
                      className="w-full rounded-full"
                      onClick={submitBudget}
                      disabled={budgetLoading}
                    >
                      {budgetLoading ? <LoaderCircle className="size-4 animate-spin" /> : "Allocate budget"}
                    </Button>
                    {budgetError && <p className="text-sm text-red-600">{budgetError}</p>}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card py-0 shadow-none">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="text-[15px] font-semibold tracking-normal">Allocation result</CardTitle>
                    <CardDescription>Recommended budget distribution by efficiency score.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6">
                    {budgetResult ? (
                      <div className="space-y-5">
                        <p className="text-sm text-muted-foreground leading-relaxed">{budgetResult.summary}</p>
                        <div className="space-y-4">
                          {budgetResult.adSets.map((set) => (
                            <div key={set.name} className="rounded-2xl border border-border p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{set.name || "Unnamed"}</span>
                                <Badge variant={recBadgeVariant(set.recommendation) as "default" | "secondary" | "destructive"}>
                                  {set.recommendation}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <span className="text-muted-foreground">ROAS</span><span className="font-mono">{set.roas}x</span>
                                <span className="text-muted-foreground">CPA</span><span className="font-mono">{set.cpa !== null ? `$${set.cpa}` : "—"}</span>
                                <span className="text-muted-foreground">Break-even ROAS</span><span className="font-mono">{set.breakEvenRoas}x</span>
                                <span className="text-muted-foreground">Efficiency</span><span className="font-mono">{set.efficiencyScore}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Recommended budget</span>
                                  <span className="font-medium">${set.recommendedBudget} ({set.allocatedPct}%)</span>
                                </div>
                                <Progress value={set.allocatedPct} className="h-1.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-border text-center">
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Fill in your ad sets and click "Allocate budget" to see recommendations.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Scenario Simulator tab ── */}
          <TabsContent value="scenario">
            {!hasProFeatures ? (
              <div className="flex min-h-[480px] items-center justify-center">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
                  <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-muted">
                    <Zap className="size-5 text-muted-foreground" />
                  </div>
                  <div className="text-[20px] font-semibold tracking-tight">Scenario Simulator</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Before you change a budget or tweak a campaign, see the projected outcome. Adjust CTR, CPC, conversion rate, or budget — Operon shows you the revenue and profit delta instantly.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {[
                      "Preview revenue and ROAS before committing",
                      "Model CPC, CTR, conversion rate, and budget changes",
                      "Risk level and confidence score on every scenario",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                        <span className="mt-0.5 size-3.5 shrink-0 text-foreground">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full rounded-xl" onClick={() => upgradePlan("SCALE")}>
                    Unlock Scenario Simulator · $19/mo
                  </Button>
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Pro plan · Unlimited analyses + all features · Cancel anytime
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card className="border-border bg-card py-0 shadow-none">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="text-[15px] font-semibold tracking-normal">Scenario Setup</CardTitle>
                    <CardDescription>
                      Set your baseline metrics and define hypothetical changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6 space-y-6">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Baseline metrics</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["product_price", "cost", "impressions", "clicks", "add_to_cart", "purchases", "revenue", "ctr", "cpc", "cpm"] as Array<keyof typeof scenarioBase>).map((field) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={numberInputValue(scenarioBase[field])}
                              onChange={(e) => setScenarioBase((prev) => ({ ...prev, [field]: parseNumberInput(e.target.value) }))}
                              className="h-9 rounded-xl text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Hypothetical changes</p>
                      <div className="space-y-3">
                        {[
                          { label: "CTR change (%)", value: scenarioCtrDelta, setter: setScenarioCtrDelta },
                          { label: "Conversion rate change (%)", value: scenarioConvDelta, setter: setScenarioConvDelta },
                          { label: "CPC change (%)", value: scenarioCpcDelta, setter: setScenarioCpcDelta },
                          { label: "AOV change (%)", value: scenarioAovDelta, setter: setScenarioAovDelta },
                        ].map(({ label, value, setter }) => (
                          <div key={label} className="flex items-center gap-3">
                            <Label className="w-52 text-sm shrink-0">{label}</Label>
                            <Input
                              type="number"
                              step="1"
                              value={numberInputValue(value)}
                              onChange={(e) => setter(parseNumberInput(e.target.value))}
                              className="h-9 rounded-xl text-sm"
                            />
                          </div>
                        ))}
                        <div className="flex items-center gap-3">
                          <Label className="w-52 text-sm shrink-0">New budget ($) — optional</Label>
                          <Input
                            type="number"
                            step="10"
                            value={scenarioNewBudget}
                            onChange={(e) => setScenarioNewBudget(e.target.value)}
                            placeholder="Same as current"
                            className="h-9 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full rounded-full"
                      onClick={submitScenario}
                      disabled={scenarioLoading}
                    >
                      {scenarioLoading ? <LoaderCircle className="size-4 animate-spin" /> : "Run scenario"}
                    </Button>
                    {scenarioError && <p className="text-sm text-red-600">{scenarioError}</p>}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card py-0 shadow-none">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="text-[15px] font-semibold tracking-normal">Projection</CardTitle>
                    <CardDescription>Baseline vs. projected outcome side by side.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6">
                    {scenarioResult ? (
                      <div className="space-y-6">
                        <p className="text-sm leading-relaxed text-muted-foreground">{scenarioResult.insight}</p>

                        <div className="grid grid-cols-3 gap-2 text-xs font-mono uppercase tracking-wide text-muted-foreground pb-1 border-b border-foreground/10">
                          <span>Metric</span><span className="text-center">Baseline</span><span className="text-center">Projected</span>
                        </div>

                        {(
                          [
                            ["Impressions", scenarioResult.baseline.impressions, scenarioResult.projected.impressions, ""],
                            ["Clicks", scenarioResult.baseline.clicks, scenarioResult.projected.clicks, ""],
                            ["Purchases", scenarioResult.baseline.purchases, scenarioResult.projected.purchases, ""],
                            ["Revenue", scenarioResult.baseline.revenue, scenarioResult.projected.revenue, "$"],
                            ["Spend", scenarioResult.baseline.spend, scenarioResult.projected.spend, "$"],
                            ["ROAS", scenarioResult.baseline.roas, scenarioResult.projected.roas, "x"],
                            ["Profit", scenarioResult.baseline.profit, scenarioResult.projected.profit, "$"],
                            ["CPA", scenarioResult.baseline.cpa, scenarioResult.projected.cpa, "$"],
                          ] as Array<[string, number | null, number | null, string]>
                        ).map(([label, base, proj, prefix]) => {
                          const improved = proj !== null && base !== null && proj > base;
                          const worsened = proj !== null && base !== null && proj < base;
                          return (
                            <div key={label} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-foreground/5">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="text-center font-mono">
                                {base !== null ? `${prefix}${base}` : "—"}
                              </span>
                              <span className={`text-center font-mono font-medium ${improved ? "text-green-600" : worsened ? "text-red-600" : ""}`}>
                                {proj !== null ? `${prefix}${proj}` : "—"}
                              </span>
                            </div>
                          );
                        })}

                        <div className="rounded-2xl border border-border p-4 grid grid-cols-2 gap-3">
                          {[
                            ["Revenue Δ", scenarioResult.delta.revenue_pct, "%"],
                            ["Purchases Δ", scenarioResult.delta.purchases_pct, "%"],
                            ["ROAS Δ", scenarioResult.delta.roas_pct, "%"],
                            ["Profit Δ", scenarioResult.delta.profit_pct, "%"],
                          ].map(([label, val, suffix]) => (
                            <div key={label as string}>
                              <div className="text-xs text-muted-foreground">{label}</div>
                              <div className={`text-xl font-display font-medium mt-1 ${Number(val) > 0 ? "text-green-600" : Number(val) < 0 ? "text-red-600" : ""}`}>
                                {val !== null ? `${Number(val) > 0 ? "+" : ""}${val}${suffix}` : "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-border text-center">
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Set your baseline, define the changes, and click "Run scenario" to see projections.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          <TabsContent value="settings">
            <section className="min-h-full bg-background">
              <div className="border-b border-border px-4 py-5 sm:px-6">
                <div className="mx-auto max-w-5xl">
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <h1 className="text-[22px] font-semibold tracking-normal">Settings</h1>
                    <p className="pb-0.5 text-[14px] text-muted-foreground">
                      Account, billing, integrations, and notifications.
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap justify-center gap-5 text-[13px] text-muted-foreground">
                    {settingsNav.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setSettingsSection(item.key)}
                        className={`flex items-center gap-1.5 pb-2 ${settingsSection === item.key ? "border-b-2 border-foreground font-medium text-foreground" : ""}`}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
                {settingsSection === "account" ? (
                  <>
                    <Card className="overflow-hidden rounded-xl border-border bg-card py-0 shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-6">
                          <h2 className="text-[19px] font-semibold tracking-normal">Profile</h2>
                          <div className="mt-5 flex items-center gap-4">
                            <Avatar className="size-12 bg-emerald-800">
                              <AvatarImage src={user?.avatarUrl ?? undefined} alt={profileDisplayName} />
                              <AvatarFallback className="bg-emerald-800 text-lg font-medium text-white">
                                {profileInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-[15px] font-medium">{profileDisplayName}</div>
                              <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{user?.email ?? "—"}</div>
                              <span className="mt-2 inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                {profilePlan}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="border-t bg-muted/40 px-6 py-3.5">
                          <button
                            onClick={logout}
                            className="flex items-center gap-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <LogOut className="size-3.5" />
                            Sign out
                          </button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
                      <CardContent className="px-6 py-6">
                        <h2 className="text-[19px] font-semibold tracking-normal">Preferences</h2>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="text-[14px] font-medium">Timezone</div>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">
                              Affects email digest delivery and scheduling.
                            </p>
                          </div>
                          <button className="flex h-10 min-w-[220px] items-center justify-between rounded-lg border border-border px-3 text-left text-[13px]">
                            Yekaterinburg (GMT+5)
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <Separator className="my-5" />
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="text-[14px] font-medium">Theme</div>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">
                              Choose your preferred appearance.
                            </p>
                          </div>
                          <div className="flex rounded-lg bg-muted p-0.5">
                            <button
                              onClick={() => setTheme("light")}
                              className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium ${!isDarkTheme ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                            >
                              <Sun className="size-3.5" />
                              Light
                            </button>
                            <button
                              onClick={() => setTheme("dark")}
                              className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium ${isDarkTheme ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                            >
                              <Moon className="size-3.5" />
                              Dark
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}

                {settingsSection === "billing" ? (
                  <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
                    <CardContent className="px-6 py-6 space-y-6">
                      <h2 className="text-[19px] font-semibold tracking-normal">Billing</h2>

                      {/* Current plan */}
                      <div className="rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[13px] text-muted-foreground">Current plan</div>
                            <div className="mt-1 text-[18px] font-semibold">
                              {user?.plan === "STARTER" ? "Starter (Free)" : user?.plan === "PRO" ? "Basic · $9/mo" : user?.plan === "SCALE" ? "Pro · $19/mo" : "Free"}
                            </div>
                            {user?.plan === "STARTER" && (
                              <div className="mt-2">
                                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                                  <span>{user.usageCount} / 10 analyses used</span>
                                  <span>Resets monthly</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                                  <div
                                    className={`h-1.5 rounded-full ${user.usageCount >= 8 ? "bg-amber-500" : "bg-foreground"}`}
                                    style={{ width: `${Math.min(100, (user.usageCount / 10) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          {user?.plan !== "STARTER" && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Upgrade options — only for Starter */}
                      {user?.plan === "STARTER" && (
                        <div className="space-y-3">
                          <p className="text-[13px] font-medium">Upgrade your plan</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              {
                                name: "Basic",
                                price: "$9/mo",
                                features: ["Unlimited analyses", "Full AI recommendations", "History tracking"],
                                plan: "PRO" as const,
                                primary: false,
                              },
                              {
                                name: "Pro",
                                price: "$19/mo",
                                features: ["Everything in Basic", "Budget Allocation", "Scenario Simulator"],
                                plan: "SCALE" as const,
                                primary: true,
                              },
                            ].map((tier) => (
                              <div key={tier.name} className={`rounded-xl border p-4 ${tier.primary ? "border-foreground" : "border-border"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[14px] font-semibold">{tier.name}</span>
                                  <span className="text-[13px] font-semibold">{tier.price}</span>
                                </div>
                                <ul className="mt-3 space-y-1.5">
                                  {tier.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                      <span className="text-foreground">✓</span>{f}
                                    </li>
                                  ))}
                                </ul>
                                <Button
                                  size="sm"
                                  variant={tier.primary ? "default" : "outline"}
                                  className="mt-4 w-full rounded-lg"
                                  onClick={() => upgradePlan(tier.plan)}
                                >
                                  Upgrade to {tier.name}
                                </Button>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground text-center">
                            Manual activation · Write us to start
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {settingsSection === "integrations" ? (
                  <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
                    <CardContent className="px-6 py-6">
                      <h2 className="text-[19px] font-semibold tracking-normal">Integrations</h2>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => connectProvider("META")}>Meta</Button>
                        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => connectProvider("TIKTOK")}>TikTok</Button>
                        <Button size="sm" className="h-8 rounded-full text-xs" onClick={syncIntegrations} disabled={integrationsLoading}>
                          Sync
                        </Button>
                      </div>
                      <div className="mt-4 space-y-2">
                        {integrations.length ? integrations.map((connection) => (
                          <div key={connection.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                            <span>{connection.provider} · {connection.accountName ?? connection.externalAccountId}</span>
                            <Badge variant="secondary">{connection.status}</Badge>
                          </div>
                        )) : (
                          <p className="text-xs text-muted-foreground">No connected accounts yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {settingsSection === "api" ? (
                  <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
                    <CardContent className="px-6 py-6">
                      <h2 className="text-[19px] font-semibold tracking-normal">API</h2>
                      <div className="mt-5 space-y-3 text-xs">
                        <div className="rounded-lg border border-border p-3">
                          <div className="text-muted-foreground">Base URL</div>
                          <div className="mt-1 font-mono">{apiBaseUrl}</div>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <div className="text-muted-foreground">Action endpoint</div>
                          <div className="mt-1 font-mono">POST /ad-actions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {settingsSection === "notifications" ? (
                  <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
                    <CardContent className="px-6 py-6">
                      <h2 className="text-[19px] font-semibold tracking-normal">Notifications</h2>
                      <div className="mt-5 space-y-3">
                        <div className="rounded-xl border border-border p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[14px] font-semibold">Quiet mode</div>
                              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                                Only surface verdicts that clear your confidence and spend-impact thresholds. Most quiet days should stay quiet.
                              </p>
                            </div>
                            <Switch
                              checked={user?.quietModeEnabled ?? true}
                              onCheckedChange={(checked) => updateQuietSettings({ quietModeEnabled: checked })}
                              disabled={quietSaving}
                            />
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs">Minimum confidence</Label>
                              <select
                                value={quietConfidenceValue(user)}
                                onChange={(event) => updateQuietSettings({ quietMinConfidence: event.target.value as "low" | "medium" | "high" })}
                                className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm outline-none"
                                disabled={quietSaving}
                              >
                                <option value="low">Low and above</option>
                                <option value="medium">Medium and above</option>
                                <option value="high">High only</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Minimum spend impact (₽/day)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="100"
                                value={quietSpendValue(user)}
                                onChange={(event) => updateQuietSettings({ quietMinSpendImpact: Number(event.target.value) || 0 })}
                                className="h-10 rounded-xl"
                                disabled={quietSaving}
                              />
                            </div>
                          </div>
                          <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                            Example: high-confidence verdicts on ad sets spending more than ₽1,000/day.
                          </div>
                        </div>
                        {[
                          ["Weekly digest", digestEnabled, setDigestEnabled],
                          ["Action confirmations", actionEmailsEnabled, setActionEmailsEnabled],
                        ].map(([label, enabled, setter]) => (
                          <div key={label as string} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                            <span>{label as string}</span>
                            <button
                              onClick={() => (setter as (value: boolean) => void)(!(enabled as boolean))}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                            >
                              {enabled ? "On" : "Off"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {settingsSection === "data" ? (
                  <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
                    <CardContent className="px-6 py-6">
                      <h2 className="text-[19px] font-semibold tracking-normal">Data</h2>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                        <div>
                          <div className="text-[14px] font-medium">Workspace export</div>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">Download profile, history, integrations, and snapshots.</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={exportWorkspaceData}>
                          Export JSON
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </section>
          </TabsContent>
          </Tabs>
          <Dialog open={simulationOpen} onOpenChange={setSimulationOpen}>
            <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Budget change prediction</DialogTitle>
                <DialogDescription>
                  Expected next 7 days before you change a campaign budget.
                </DialogDescription>
              </DialogHeader>

              {simulationLoading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : simulationError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {simulationError}
                </div>
              ) : simulationResult ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{simulationResult.campaign.entityName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {simulationResult.campaign.provider} · {simulationResult.period.historyDays} daily snapshots · estimated model
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        Confidence: {simulationResult.confidence}%
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Baseline spend</div>
                        <div className="font-medium tabular-nums">{formatMoney(simulationResult.baseline.spend)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Baseline CPA</div>
                        <div className="font-medium tabular-nums">{formatMoney(simulationResult.baseline.cpa)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Baseline revenue</div>
                        <div className="font-medium tabular-nums">{formatMoney(simulationResult.baseline.revenue)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Baseline ROAS</div>
                        <div className="font-medium tabular-nums">{simulationResult.baseline.roas.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {simulationResult.scenarios.map((scenario) => (
                      <div key={scenario.kind} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold">If you choose: {scenario.label}</div>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${riskClass(scenario.riskLevel)}`}>
                            Risk: {scenario.riskLevel}
                          </span>
                        </div>
                        <div className="mt-3 text-xs font-medium text-muted-foreground">
                          Expected outcome, next {simulationResult.period.horizonDays} days
                        </div>
                        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                          <div className="rounded-xl bg-muted/40 p-3">
                            <div className="text-xs text-muted-foreground">CPA</div>
                            <div className="mt-1 font-medium tabular-nums">
                              {formatMetricDelta(scenario.delta.cpaPct)} ({formatMoney(simulationResult.baseline.cpa)} {"->"} {formatMoney(scenario.expected.cpa)})
                            </div>
                          </div>
                          <div className="rounded-xl bg-muted/40 p-3">
                            <div className="text-xs text-muted-foreground">Revenue</div>
                            <div className="mt-1 font-medium tabular-nums">
                              {formatMetricDelta(scenario.delta.revenuePct)} ({formatMoney(simulationResult.baseline.revenue)} {"->"} {formatMoney(scenario.expected.revenue)})
                            </div>
                          </div>
                          <div className="rounded-xl bg-muted/40 p-3">
                            <div className="text-xs text-muted-foreground">ROAS</div>
                            <div className="mt-1 font-medium tabular-nums">
                              {formatMetricDelta(scenario.delta.roasPct)} ({simulationResult.baseline.roas.toFixed(2)} {"->"} {scenario.expected.roas.toFixed(2)})
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                      <span>Confidence signal breakdown</span>
                      <span>{simulationResult.confidence}%</span>
                    </div>
                    <Progress value={simulationResult.confidence} className="mt-3" />
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {simulationResult.signalBreakdown.slice(0, 4).map((signal) => (
                        <li key={`${signal.label}-${signal.score}`}>
                          <span className="font-medium text-foreground">{signal.label}</span>: {signal.detail}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Based on: {simulationResult.basedOn.join(", ")}
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
          <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Confirm ad action</DialogTitle>
                <DialogDescription className="text-xs leading-5">
                  This will execute {actionLabel(confirmAction)} on {executionTarget?.entityName ?? executionTarget?.externalEntityId ?? "the selected ad set"}.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                Pause actions change delivery immediately. Budget changes can be undone from Operon for 1 hour and are limited by the account guardrail.
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setConfirmAction(null)} disabled={adActionLoading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant={confirmAction === "pause" ? "destructive" : "default"}
                  className="h-8 rounded-full text-xs"
                  onClick={executeConfirmedAction}
                  disabled={adActionLoading}
                >
                  {adActionLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                  Confirm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={Boolean(paymentContactPlan)} onOpenChange={(open) => !open && setPaymentContactPlan(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">
                  Upgrade to {paymentContactPlan === "PRO" ? "Basic" : "Pro"}
                </DialogTitle>
                <DialogDescription className="text-xs leading-5">
                  Payments are activated manually while we test international billing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                <p className="leading-6 text-muted-foreground">
                  To activate this plan, send us your account email and selected plan in Reddit or by email.
                </p>
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</div>
                  <div className="mt-1 font-medium">wkeyqwert@gmail.com</div>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Message</div>
                  <div className="mt-1 text-[13px] leading-5">
                    Please activate {paymentContactPlan === "PRO" ? "Basic $9/mo" : "Pro $19/mo"} for {user?.email ?? "my account"}.
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  onClick={() => setPaymentContactPlan(null)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={() => {
                    const planLabel = paymentContactPlan === "PRO" ? "Basic $9/mo" : "Pro $19/mo";
                    window.location.href = `mailto:wkeyqwert@gmail.com?subject=Operon ${encodeURIComponent(planLabel)} activation&body=${encodeURIComponent(`Please activate ${planLabel} for ${user?.email ?? "my account"}.`)}`;
                  }}
                >
                  <CreditCard className="size-3.5" />
                  Write by email
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>
    </main>
  );
}
