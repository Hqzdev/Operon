import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api-auth";
import { ingestExtensionMetrics, parseProvider } from "@/src/services/integrationService";

export const dynamic = "force-dynamic";

const metricSchema = z.object({
  account_type: z.enum(["dropship", "dtc", "subscription", "leadgen", "b2b"]).optional(),
  externalEntityId: z.string().optional(),
  entityName: z.string().optional(),
  date: z.string().optional(),
  spend: z.coerce.number().optional(),
  impressions: z.coerce.number().optional(),
  clicks: z.coerce.number().optional(),
  add_to_cart: z.coerce.number().optional(),
  purchases: z.coerce.number().optional(),
  revenue: z.coerce.number().optional(),
  return_rate: z.coerce.number().optional(),
  net_revenue: z.coerce.number().optional(),
  frequency: z.coerce.number().optional(),
  product_price: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  platform_breakdown: z.object({
    ios: z.coerce.number().min(0).optional(),
    android: z.coerce.number().min(0).optional(),
    desktop: z.coerce.number().min(0).optional(),
    unknown: z.coerce.number().min(0).optional(),
  }).optional(),
  ios_audience_pct: z.coerce.number().min(0).max(100).optional(),
  pixel_purchases: z.coerce.number().min(0).optional(),
  shopify_purchases: z.coerce.number().min(0).optional(),
  niche: z.string().min(2).max(80).optional(),
  country: z.string().min(2).max(80).optional(),
  mrr: z.coerce.number().min(0).optional(),
  monthly_churn_rate: z.coerce.number().min(0).max(100).optional(),
  subscription_starts: z.coerce.number().int().min(0).optional(),
  qualified_leads: z.coerce.number().int().min(0).optional(),
  form_starts: z.coerce.number().int().min(0).optional(),
  lead_value: z.coerce.number().min(0).optional(),
  source: z.unknown().optional(),
});

const syncSchema = z.object({
  provider: z.enum(["META", "TIKTOK", "SHOPIFY"]),
  extensionKey: z.string().min(12),
  externalAccountId: z.string().optional(),
  accountName: z.string().optional(),
  metrics: z.array(metricSchema).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const body = syncSchema.parse(await request.json());
    const result = await ingestExtensionMetrics({
      ...body,
      provider: parseProvider(body.provider),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
