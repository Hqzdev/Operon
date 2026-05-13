import type { UserPlan, SubscriptionStatus, AnalysisStage } from "@prisma/client";

// ─── User ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  storeName: string | null;
  storeUrl: string | null;
  niche: string | null;
  accountType: string;
  quietModeEnabled: boolean;
  quietMinConfidence: number;
  quietMinSpendImpact: number;
  quietNoUrgentDigestAt: Date | null;
  weeklyDigestEnabled: boolean;
  activeStoreId: string | null;
  onboardingCompleted: boolean;
  plan: UserPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: Date | null;
  usageCount: number;
  usageResetAt: Date | null;
  createdAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
  storeName?: string;
  avatarUrl?: string;
}

export interface UpdateUserDTO {
  name?: string;
  storeName?: string;
  storeUrl?: string;
  niche?: string;
  accountType?: string;
  avatarUrl?: string;
  quietModeEnabled?: boolean;
  quietMinConfidence?: number;
  quietMinSpendImpact?: number;
  weeklyDigestEnabled?: boolean;
  activeStoreId?: string | null;
  onboardingCompleted?: boolean;
}

export interface AuthResult {
  token: string;
  user: UserProfile;
}

// ─── Reddit / Lead ───────────────────────────────────────────────────────────

export type ReplyStyle = "Casual" | "Professional" | "Humorous";

export type LeadStatus = "Queued" | "Contacted" | "Interested" | "Frustrated with current solution";

export interface RedditPost {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  postUrl: string;
  author: string;
  postedAt: string;
  flairs: string[];
  status: LeadStatus;
  addedAt: string;
  dmGenerated: boolean;
  dmTemplate: string | null;
  relevanceScore: number;
}

export interface RedditPostWithScore extends RedditPost {
  relevanceScore: number;
}

export interface GenerateDmInput {
  post: RedditPost;
  shopName?: string;
  productDescription: string;
  style?: ReplyStyle;
}

export interface GenerateDmResult {
  message: string;
  fromFallback: boolean;
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface CreateAnalysisDTO {
  userId: string;
  stage: AnalysisStage;
  inputData: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface AnalysisSummary {
  id: string;
  userId: string;
  stage: AnalysisStage;
  createdAt: Date;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface StoreSummary {
  id: string;
  name: string;
  url: string;
  platform: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoreDTO {
  userId: string;
  name: string;
  url: string;
  platform?: string;
  description?: string;
}

// ─── Agency ──────────────────────────────────────────────────────────────────

export type AgencyRole = "owner" | "member" | "view_only";

export interface AgencyWorkspaceSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: Date;
}

export interface AgencyClientSummary {
  id: string;
  name: string;
  contactEmail: string | null;
  storeUrl: string | null;
  createdAt: Date;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}
