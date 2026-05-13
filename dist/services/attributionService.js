"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveAttributionAdjustment = deriveAttributionAdjustment;
function round(value, precision = 2) {
    return Number(value.toFixed(precision));
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function platformIosShare(input) {
    if (typeof input.ios_audience_pct === "number") {
        return clamp(input.ios_audience_pct / 100, 0, 1);
    }
    const breakdown = input.platform_breakdown;
    if (!breakdown)
        return 0;
    const ios = Math.max(0, breakdown.ios ?? 0);
    const total = ios +
        Math.max(0, breakdown.android ?? 0) +
        Math.max(0, breakdown.desktop ?? 0) +
        Math.max(0, breakdown.unknown ?? 0);
    return total > 0 ? clamp(ios / total, 0, 1) : 0;
}
function configuredMultiplier(input, globalDefault) {
    const value = typeof input.ios_under_attribution_multiplier === "number" && input.ios_under_attribution_multiplier > 0
        ? input.ios_under_attribution_multiplier
        : globalDefault;
    return Math.max(1, value);
}
function deriveAttributionAdjustment(input, globalDefault = 1.25) {
    const iosShare = platformIosShare(input);
    if (input.purchases <= 0 || iosShare <= 0)
        return null;
    const pixelPurchases = typeof input.pixel_purchases === "number" && input.pixel_purchases > 0
        ? input.pixel_purchases
        : input.purchases;
    const shopifyPurchases = typeof input.shopify_purchases === "number" && input.shopify_purchases > 0
        ? input.shopify_purchases
        : undefined;
    const reconciliationMultiplier = shopifyPurchases && shopifyPurchases > pixelPurchases
        ? shopifyPurchases / pixelPurchases
        : undefined;
    const multiplier = Math.max(1, reconciliationMultiplier ?? configuredMultiplier(input, globalDefault));
    if (multiplier <= 1)
        return null;
    const purchaseUplift = 1 + iosShare * (multiplier - 1);
    const adjustedPurchases = input.purchases * purchaseUplift;
    const revenueUplift = input.revenue > 0 ? purchaseUplift : 1;
    return {
        pixelPurchases: round(input.purchases),
        adjustedPurchases: round(adjustedPurchases),
        purchaseUplift: round(purchaseUplift, 4),
        revenueUplift: round(revenueUplift, 4),
        iosAudiencePct: round(iosShare * 100),
        multiplier: round(multiplier, 4),
        source: reconciliationMultiplier
            ? "shopify_reconciliation"
            : typeof input.ios_under_attribution_multiplier === "number" && input.ios_under_attribution_multiplier > 0
                ? "user_override"
                : "global_default",
        shopifyPurchases,
        pixelShortfallPct: reconciliationMultiplier ? round((reconciliationMultiplier - 1) * 100) : undefined,
    };
}
