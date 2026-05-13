"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisInputSchema = void 0;
const zod_1 = require("zod");
exports.analysisInputSchema = zod_1.z.object({
    account_type: zod_1.z.enum(["dropship", "dtc", "subscription", "leadgen", "b2b"]).default("dropship"),
    product_name: zod_1.z.string().min(2).max(120).default("Untitled product"),
    product_description: zod_1.z.string().min(10).max(2000).default("General e-commerce product"),
    product_price: zod_1.z.coerce.number().positive(),
    cost: zod_1.z.coerce.number().min(0),
    ctr: zod_1.z.coerce.number().min(0),
    cpc: zod_1.z.coerce.number().min(0),
    cpm: zod_1.z.coerce.number().min(0),
    impressions: zod_1.z.coerce.number().int().min(0),
    clicks: zod_1.z.coerce.number().int().min(0),
    add_to_cart: zod_1.z.coerce.number().int().min(0),
    purchases: zod_1.z.coerce.number().int().min(0),
    revenue: zod_1.z.coerce.number().min(0),
    return_rate: zod_1.z.coerce.number().min(0).max(100).default(0),
    net_revenue: zod_1.z.coerce.number().min(0).optional(),
    total_spend: zod_1.z.coerce.number().min(0).optional(),
    days_active: zod_1.z.coerce.number().int().min(0).optional(),
    platform_breakdown: zod_1.z.object({
        ios: zod_1.z.coerce.number().min(0).optional(),
        android: zod_1.z.coerce.number().min(0).optional(),
        desktop: zod_1.z.coerce.number().min(0).optional(),
        unknown: zod_1.z.coerce.number().min(0).optional(),
    }).optional(),
    ios_audience_pct: zod_1.z.coerce.number().min(0).max(100).optional(),
    ios_under_attribution_multiplier: zod_1.z.coerce.number().min(0).max(10).optional(),
    pixel_purchases: zod_1.z.coerce.number().min(0).optional(),
    shopify_purchases: zod_1.z.coerce.number().min(0).optional(),
    niche: zod_1.z.string().min(2).max(80).optional(),
    country: zod_1.z.string().min(2).max(80).optional(),
    mrr: zod_1.z.coerce.number().min(0).optional(),
    monthly_churn_rate: zod_1.z.coerce.number().min(0).max(100).optional(),
    subscription_starts: zod_1.z.coerce.number().int().min(0).optional(),
    qualified_leads: zod_1.z.coerce.number().int().min(0).optional(),
    form_starts: zod_1.z.coerce.number().int().min(0).optional(),
    lead_value: zod_1.z.coerce.number().min(0).optional(),
    stage: zod_1.z.enum(["testing", "scaling", "retesting"]),
}).superRefine((value, ctx) => {
    if (value.account_type === "subscription") {
        if (!value.mrr || value.mrr <= 0) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ["mrr"], message: "MRR is required for subscription analyses" });
        }
        if (!value.monthly_churn_rate || value.monthly_churn_rate <= 0) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ["monthly_churn_rate"], message: "Monthly churn rate is required for subscription analyses" });
        }
    }
    if (value.account_type === "leadgen" || value.account_type === "b2b") {
        if (value.qualified_leads === undefined) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ["qualified_leads"], message: "Qualified leads are required for lead-gen/B2B analyses" });
        }
    }
});
