import { SubscriptionStatus, UserPlan } from "@prisma/client";
import crypto from "node:crypto";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

export type FeatureKey =
  | "lead_mining_reddit"
  | "lead_mining_other"
  | "budget_allocation"
  | "scenario_simulator"
  | "analytics_basic"
  | "analytics_advanced"
  | "custom_reports"
  | "api_access"
  | "team_collaboration"
  | "priority_support";

export type PublicPlanId = "free" | "pro" | "business" | "custom";

type TierRule = { planId: PublicPlanId; limit: number | null };
type FeatureRule = {
  key: FeatureKey;
  name: string;
  description: string;
  tiers: TierRule[];
  upgradePlan: PublicPlanId;
  upgradeLabel: string;
  upgradePrice: string;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const FEATURE_MATRIX: Record<FeatureKey, FeatureRule> = {
  lead_mining_reddit: {
    key: "lead_mining_reddit",
    name: "Lead mining (Reddit)",
    description: "Find high-intent Reddit posts and acquisition leads.",
    tiers: [
      { planId: "free", limit: 5 },
      { planId: "pro", limit: null },
      { planId: "business", limit: null },
      { planId: "custom", limit: null },
    ],
    upgradePlan: "pro",
    upgradeLabel: "Pro",
    upgradePrice: "$29.99/mo",
  },
  lead_mining_other: {
    key: "lead_mining_other",
    name: "Lead mining (other sources)",
    description: "Find leads outside Reddit.",
    tiers: [{ planId: "pro", limit: null }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "pro",
    upgradeLabel: "Pro",
    upgradePrice: "$29.99/mo",
  },
  budget_allocation: {
    key: "budget_allocation",
    name: "Budget Allocation",
    description: "Compare ad sets and distribute budget by efficiency.",
    tiers: [{ planId: "pro", limit: null }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "pro",
    upgradeLabel: "Pro",
    upgradePrice: "$29.99/mo",
  },
  scenario_simulator: {
    key: "scenario_simulator",
    name: "Scenario Simulator",
    description: "Preview budget, CTR, CPC, and conversion changes before acting.",
    tiers: [{ planId: "pro", limit: 10 }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "pro",
    upgradeLabel: "Pro",
    upgradePrice: "$29.99/mo",
  },
  analytics_basic: {
    key: "analytics_basic",
    name: "Analytics (basic)",
    description: "Basic analytics and campaign health views.",
    tiers: [{ planId: "free", limit: null }, { planId: "pro", limit: null }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "free",
    upgradeLabel: "Free",
    upgradePrice: "$0/mo",
  },
  analytics_advanced: {
    key: "analytics_advanced",
    name: "Analytics (advanced)",
    description: "Advanced attribution, LTV, and deeper analytics.",
    tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "business",
    upgradeLabel: "Business",
    upgradePrice: "$79.99/mo",
  },
  custom_reports: {
    key: "custom_reports",
    name: "Custom reports",
    description: "Generate custom client and workspace reports.",
    tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "business",
    upgradeLabel: "Business",
    upgradePrice: "$79.99/mo",
  },
  api_access: {
    key: "api_access",
    name: "API access",
    description: "Use Operon programmatically through API endpoints.",
    tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "business",
    upgradeLabel: "Business",
    upgradePrice: "$79.99/mo",
  },
  team_collaboration: {
    key: "team_collaboration",
    name: "Team collaboration",
    description: "Invite teammates and collaborate in workspaces.",
    tiers: [{ planId: "pro", limit: 3 }, { planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "pro",
    upgradeLabel: "Pro",
    upgradePrice: "$29.99/mo",
  },
  priority_support: {
    key: "priority_support",
    name: "Priority support",
    description: "Priority support and faster response times.",
    tiers: [{ planId: "business", limit: null }, { planId: "custom", limit: null }],
    upgradePlan: "business",
    upgradeLabel: "Business",
    upgradePrice: "$79.99/mo",
  },
};

export function planIdFromUserPlan(plan: UserPlan): PublicPlanId {
  if (plan === UserPlan.PRO) return "pro";
  if (plan === UserPlan.SCALE) return "business";
  return "free";
}

function userPlanFromString(plan: string | null | undefined): UserPlan {
  if (plan === "PRO") return UserPlan.PRO;
  if (plan === "SCALE") return UserPlan.SCALE;
  return UserPlan.STARTER;
}

function tierFor(feature: FeatureKey, planId: PublicPlanId) {
  return FEATURE_MATRIX[feature]?.tiers.find((tier) => tier.planId === planId) ?? null;
}

async function currentSubscriptionStatus(userId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ status: string }>>(
    `SELECT "status"::text AS status FROM "subscriptions" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    userId,
  );
  return rows[0]?.status ?? null;
}

async function logFeatureAccess(input: {
  userId: string;
  featureKey: FeatureKey;
  planId: PublicPlanId;
  status: "allowed" | "blocked" | "limited";
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "feature_access_logs" ("id", "userId", "featureKey", "planId", "status", "reason", "metadata")
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    crypto.randomUUID(),
    input.userId,
    input.featureKey,
    input.planId,
    input.status,
    input.reason ?? null,
    JSON.stringify(input.metadata ?? {}),
  );
}

export async function logUpgradeMoment(input: {
  userId: string;
  featureKey: FeatureKey;
  targetPlanId?: PublicPlanId;
  source?: string;
}) {
  const access = await getFeatureAccess(input.userId, input.featureKey, { log: false });
  await prisma.$executeRawUnsafe(
    `INSERT INTO "upgrade_moment_logs" ("id", "userId", "featureKey", "fromPlanId", "targetPlanId", "source")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    crypto.randomUUID(),
    input.userId,
    input.featureKey,
    access.planId,
    input.targetPlanId ?? access.upgradePlan,
    input.source ?? null,
  );
}

async function usageInWindow(userId: string, featureKey: FeatureKey) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `SELECT COUNT(*)::int AS count
     FROM "feature_access_logs"
     WHERE "userId" = $1 AND "featureKey" = $2 AND "status" IN ('allowed', 'limited') AND "createdAt" >= $3`,
    userId,
    featureKey,
    since,
  );
  return Number(rows[0]?.count ?? 0);
}

export async function getFeatureAccess(
  userId: string,
  featureKey: FeatureKey,
  options: { log?: boolean; metadata?: Record<string, unknown> } = {},
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const subscriptionStatus = await currentSubscriptionStatus(userId);
  const effectivePlan = user.subscriptionStatus === SubscriptionStatus.EXPIRED || subscriptionStatus === "expired"
    ? UserPlan.STARTER
    : userPlanFromString(user.plan);
  const planId = planIdFromUserPlan(effectivePlan);
  const rule = FEATURE_MATRIX[featureKey];
  const tier = tierFor(featureKey, planId);

  let allowed = Boolean(tier);
  let reason: string | undefined;
  let remaining: number | null = null;

  if (subscriptionStatus === "pending") {
    allowed = false;
    reason = "Your subscription is pending. Full access coming soon!";
  } else if (!tier) {
    allowed = false;
    reason = `Available in ${rule.upgradeLabel} (${rule.upgradePrice})`;
  } else if (tier.limit !== null) {
    const used = await usageInWindow(userId, featureKey);
    remaining = Math.max(0, tier.limit - used);
    if (used >= tier.limit) {
      allowed = false;
      reason = `Monthly limit reached. Available in ${rule.upgradeLabel} (${rule.upgradePrice})`;
    }
  }

  const status = allowed ? (remaining !== null ? "limited" : "allowed") : "blocked";
  if (options.log !== false) {
    await logFeatureAccess({ userId, featureKey, planId, status, reason, metadata: options.metadata });
  }

  return {
    allowed,
    feature: rule,
    featureKey,
    planId,
    subscriptionStatus: subscriptionStatus ?? user.subscriptionStatus.toLowerCase(),
    limit: tier?.limit ?? null,
    remaining,
    reason,
    upgradePlan: rule.upgradePlan,
    upgradeLabel: rule.upgradeLabel,
    upgradePrice: rule.upgradePrice,
  };
}

export async function requireFeatureAccess(
  userId: string,
  featureKey: FeatureKey,
  metadata?: Record<string, unknown>,
) {
  const access = await getFeatureAccess(userId, featureKey, { metadata });
  if (!access.allowed) {
    throw new AppError(access.reason ?? "Feature is locked for your subscription", 402, {
      featureKey,
      upgradePlan: access.upgradePlan,
      upgradeLabel: access.upgradeLabel,
      upgradePrice: access.upgradePrice,
      subscriptionStatus: access.subscriptionStatus,
    });
  }
  return access;
}
