import { UserPlan } from "@prisma/client";

type PlanMeta = {
  displayName: string;
  legacyName: string;
  monthlyAnalysisLimit: number | null;
  rank: number;
};

const PLAN_META: Record<UserPlan, PlanMeta> = {
  STARTER: {
    displayName: "Starter",
    legacyName: "starter",
    monthlyAnalysisLimit: 10,
    rank: 0,
  },
  PRO: {
    displayName: "Pro",
    legacyName: "basic",
    monthlyAnalysisLimit: null,
    rank: 1,
  },
  SCALE: {
    displayName: "Scale",
    legacyName: "pro",
    monthlyAnalysisLimit: null,
    rank: 2,
  },
};

export function getPlanMeta(plan: UserPlan) {
  return PLAN_META[plan];
}

export function getPlanRank(plan: UserPlan) {
  return PLAN_META[plan].rank;
}

export function getMonthlyAnalysisLimit(plan: UserPlan) {
  return PLAN_META[plan].monthlyAnalysisLimit;
}

export function normalizeUserPlan(value: string): UserPlan | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === UserPlan.STARTER) return UserPlan.STARTER;
  if (normalized === UserPlan.PRO) return UserPlan.PRO;
  if (normalized === UserPlan.SCALE) return UserPlan.SCALE;

  const lower = value.trim().toLowerCase();
  if (lower === "starter") return UserPlan.STARTER;
  if (lower === "basic") return UserPlan.PRO;
  if (lower === "pro") return UserPlan.SCALE;

  return null;
}
