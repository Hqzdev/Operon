import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api-auth";
import { ingestExtensionMetrics, parseProvider } from "@/src/services/integrationService";

export const dynamic = "force-dynamic";

const metricSchema = z.object({
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
