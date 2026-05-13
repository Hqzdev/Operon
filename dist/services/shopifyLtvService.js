"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeReturnRateFromConnection = computeReturnRateFromConnection;
exports.computeLtvFromConnection = computeLtvFromConnection;
exports.getLtvBreakeven = getLtvBreakeven;
const env_1 = require("../utils/env");
async function fetchAllOrders(storeUrl, accessToken) {
    const apiVersion = env_1.env.SHOPIFY_API_VERSION;
    const orders = [];
    // Fetch up to 3 pages of 250 orders each (750 total) for LTV analysis.
    // Shopify REST pagination uses link headers; we keep it simple and stop
    // after the first page that returns fewer than 250 results.
    let pageUrl = `https://${storeUrl}/admin/api/${apiVersion}/orders.json` +
        `?status=any&financial_status=paid&limit=250&fields=id,email,customer,total_price`;
    let pages = 0;
    while (pageUrl && pages < 3) {
        const response = await fetch(pageUrl, {
            headers: { "X-Shopify-Access-Token": accessToken },
        });
        if (!response.ok) {
            const text = await response.text();
            let msg;
            try {
                msg = JSON.parse(text).errors ?? `Shopify ${response.status}`;
            }
            catch {
                msg = `Shopify ${response.status}`;
            }
            throw new Error(msg);
        }
        const data = (await response.json());
        const page = data.orders ?? [];
        orders.push(...page);
        // Follow Shopify cursor pagination if present
        const linkHeader = response.headers.get("link") ?? "";
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        pageUrl = nextMatch ? nextMatch[1] : null;
        // Stop early if this page was not full
        if (page.length < 250)
            break;
        pages += 1;
    }
    return orders;
}
function computeMetrics(orders) {
    if (orders.length === 0) {
        return {
            ltv: 0,
            aov: 0,
            repeatPurchaseRate: 0,
            ordersAnalyzed: 0,
            customersAnalyzed: 0,
        };
    }
    // Group orders by customer. We use customer.id when available, falling back
    // to email. Anonymous orders without either are bucketed under "anon".
    const customerOrders = new Map();
    let totalRevenue = 0;
    for (const order of orders) {
        const key = order.customer?.id
            ? `id:${order.customer.id}`
            : order.email
                ? `email:${order.email}`
                : "anon";
        const price = parseFloat(order.total_price ?? "0");
        totalRevenue += Number.isFinite(price) ? price : 0;
        const existing = customerOrders.get(key) ?? [];
        existing.push(price);
        customerOrders.set(key, existing);
    }
    const totalOrders = orders.length;
    const totalCustomers = customerOrders.size;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    // Repeat purchase rate = share of customers who placed 2+ orders
    let repeatCustomers = 0;
    for (const orderPrices of customerOrders.values()) {
        if (orderPrices.length >= 2)
            repeatCustomers += 1;
    }
    const repeatPurchaseRate = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;
    // LTV = AOV × (1 + repeat_purchase_rate)
    // Simple first-order approximation: a customer who has a `repeatPurchaseRate`
    // chance of buying again is worth AOV on the first purchase, plus
    // repeatPurchaseRate × AOV on subsequent ones.
    const ltv = aov * (1 + repeatPurchaseRate);
    return {
        ltv: Math.round(ltv * 100) / 100,
        aov: Math.round(aov * 100) / 100,
        repeatPurchaseRate: Math.round(repeatPurchaseRate * 10000) / 10000,
        ordersAnalyzed: totalOrders,
        customersAnalyzed: totalCustomers,
    };
}
function mockResult(reason) {
    // Representative placeholder values so callers can render the UI
    const aov = 75;
    const repeatPurchaseRate = 0.3;
    const ltv = Math.round(aov * (1 + repeatPurchaseRate) * 100) / 100;
    const profitMargin = 0.4;
    const cacBreakeven = Math.round(ltv * profitMargin * 100) / 100;
    return {
        ltv,
        aov,
        repeatPurchaseRate,
        cacBreakeven,
        ordersAnalyzed: 0,
        customersAnalyzed: 0,
        isMockData: true,
        missingConfig: reason,
    };
}
async function fetchOrdersSince(storeUrl, accessToken, since) {
    const apiVersion = env_1.env.SHOPIFY_API_VERSION;
    const orders = [];
    let pageUrl = `https://${storeUrl}/admin/api/${apiVersion}/orders.json` +
        `?status=any&financial_status=paid&limit=250&created_at_min=${encodeURIComponent(since.toISOString())}` +
        `&fields=id,email,customer,total_price,created_at,line_items,refunds`;
    let pages = 0;
    while (pageUrl && pages < 3) {
        const response = await fetch(pageUrl, {
            headers: { "X-Shopify-Access-Token": accessToken },
        });
        if (!response.ok)
            return [];
        const data = (await response.json());
        const page = data.orders ?? [];
        orders.push(...page);
        const linkHeader = response.headers.get("link") ?? "";
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        pageUrl = nextMatch ? nextMatch[1] : null;
        if (page.length < 250)
            break;
        pages += 1;
    }
    return orders;
}
function normalizeProductName(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function customerKey(order) {
    return order.customer?.id
        ? `id:${order.customer.id}`
        : order.email
            ? `email:${order.email.toLowerCase()}`
            : `anon:${order.id}`;
}
function lineItemRevenue(item) {
    const price = Number.parseFloat(item.price ?? "0");
    const quantity = item.quantity ?? 1;
    return Number.isFinite(price) ? price * quantity : 0;
}
function extractProductOrders(orders, productName, windowDays) {
    const normalizedTarget = normalizeProductName(productName);
    if (normalizedTarget.length < 2)
        return [];
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const productOrders = [];
    for (const order of orders) {
        const createdAt = order.created_at ? new Date(order.created_at) : null;
        if (!createdAt || createdAt < since)
            continue;
        const matchingItems = (order.line_items ?? []).filter((item) => {
            const text = normalizeProductName(`${item.title ?? ""} ${item.name ?? ""}`);
            return text.length >= 2 && (text.includes(normalizedTarget) || normalizedTarget.includes(text));
        });
        if (!matchingItems.length)
            continue;
        const revenue = matchingItems.reduce((sum, item) => sum + lineItemRevenue(item), 0);
        productOrders.push({
            customerKey: customerKey(order),
            revenue: revenue > 0 ? revenue : Number.parseFloat(order.total_price ?? "0") || 0,
            createdAt,
        });
    }
    return productOrders;
}
async function computeReturnRateFromConnection(storeUrl, accessToken, productName, windowDays = 90) {
    if (!productName?.trim())
        return null;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const orders = await fetchOrdersSince(storeUrl, accessToken, since);
    const normalizedTarget = normalizeProductName(productName);
    let soldQuantity = 0;
    let returnedQuantity = 0;
    let ordersAnalyzed = 0;
    for (const order of orders) {
        const matchingItems = (order.line_items ?? []).filter((item) => {
            const text = normalizeProductName(`${item.title ?? ""} ${item.name ?? ""}`);
            return text.length >= 2 && (text.includes(normalizedTarget) || normalizedTarget.includes(text));
        });
        if (!matchingItems.length)
            continue;
        ordersAnalyzed += 1;
        const matchingIds = new Set(matchingItems.map((item) => item.id).filter((id) => typeof id === "number"));
        soldQuantity += matchingItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
        for (const refund of order.refunds ?? []) {
            for (const refundItem of refund.refund_line_items ?? []) {
                const line = refundItem.line_item;
                const refundText = normalizeProductName(`${line?.title ?? ""} ${line?.name ?? ""}`);
                const matchesById = typeof refundItem.line_item_id === "number" && matchingIds.has(refundItem.line_item_id);
                const matchesByName = refundText.length >= 2 && (refundText.includes(normalizedTarget) || normalizedTarget.includes(refundText));
                if (matchesById || matchesByName) {
                    returnedQuantity += refundItem.quantity ?? 1;
                }
            }
        }
    }
    if (soldQuantity <= 0)
        return null;
    return {
        returnRate: Math.min(1, returnedQuantity / soldQuantity),
        soldQuantity,
        returnedQuantity,
        ordersAnalyzed,
        windowDays,
    };
}
function computeProductWindowMetrics(productOrders) {
    const customerOrders = new Map();
    let totalRevenue = 0;
    for (const order of productOrders) {
        totalRevenue += order.revenue;
        const existing = customerOrders.get(order.customerKey) ?? [];
        existing.push(order);
        customerOrders.set(order.customerKey, existing);
    }
    const ordersAnalyzed = productOrders.length;
    const customersAnalyzed = customerOrders.size;
    const aov = ordersAnalyzed > 0 ? totalRevenue / ordersAnalyzed : 0;
    const customerCounts = [...customerOrders.values()].map((orders) => orders.length);
    const repeatCustomers = customerCounts.filter((count) => count >= 2).length;
    const repeatPurchaseRate = customersAnalyzed > 0 ? repeatCustomers / customersAnalyzed : 0;
    const expectedRepeats = repeatCustomers > 0
        ? customerCounts.filter((count) => count >= 2).reduce((sum, count) => sum + (count - 1), 0) / repeatCustomers
        : 1;
    return {
        aov,
        ordersAnalyzed,
        customersAnalyzed,
        repeatPurchaseRate,
        expectedRepeats,
    };
}
async function computeLtvFromConnection(storeUrl, accessToken, productPrice, cost, productName) {
    const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const orders = await fetchOrdersSince(storeUrl, accessToken, since);
    if (orders.length === 0)
        return null;
    if (!productName?.trim())
        return null;
    const productOrders90 = extractProductOrders(orders, productName, 90);
    const productOrders180 = extractProductOrders(orders, productName, 180);
    if (!productOrders180.length)
        return null;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const hasEnoughHistory = productOrders180.some((order) => order.createdAt < thirtyDaysAgo);
    const metrics90 = computeProductWindowMetrics(productOrders90);
    const metrics180 = computeProductWindowMetrics(productOrders180);
    const repeatPurchaseRate = metrics180.repeatPurchaseRate;
    const expectedRepeats = metrics180.expectedRepeats;
    const aov = metrics180.aov || productPrice;
    const ltv = aov * (1 + expectedRepeats * repeatPurchaseRate);
    const margin = Math.max(productPrice - cost, 0.01);
    const firstOrderBreakEvenRoas = round2(productPrice / margin);
    const firstOrderBreakEvenCpa = round2(margin);
    // LTV break-even: you can acquire customers for up to (lifetime profit) per order
    // Lifetime margin = LTV × (1 - cost/productPrice) assuming same margin ratio on repeats
    const ltvBreakEvenCpa = round2(ltv * (margin / productPrice));
    const ltvBreakEvenRoas = ltvBreakEvenCpa > 0 ? round2(productPrice / ltvBreakEvenCpa) : firstOrderBreakEvenRoas;
    return {
        ltv: round2(ltv),
        aov: round2(aov),
        repeatPurchaseRate: round4(repeatPurchaseRate),
        repeatPurchaseRate90: round4(metrics90.repeatPurchaseRate),
        repeatPurchaseRate180: round4(metrics180.repeatPurchaseRate),
        expectedRepeats: round2(expectedRepeats),
        ltvBreakEvenRoas,
        ltvBreakEvenCpa,
        firstOrderBreakEvenRoas,
        firstOrderBreakEvenCpa,
        ordersAnalyzed: metrics180.ordersAnalyzed,
        customersAnalyzed: metrics180.customersAnalyzed,
        hasEnoughHistory,
        productMatched: true,
        windowDays: 180,
    };
}
function round2(v) {
    return Math.round(v * 100) / 100;
}
function round4(v) {
    return Math.round(v * 10000) / 10000;
}
/**
 * Pull repeat-purchase data from Shopify and compute LTV-aware break-even.
 *
 * @param profitMargin  Gross margin as a decimal (e.g. 0.4 for 40%). Defaults to 0.4.
 */
async function getLtvBreakeven(profitMargin = 0.4) {
    const storeUrl = env_1.env.SHOPIFY_STORE_URL;
    const accessToken = env_1.env.SHOPIFY_ACCESS_TOKEN;
    if (!storeUrl || !accessToken) {
        return mockResult("SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN are not configured");
    }
    const orders = await fetchAllOrders(storeUrl.replace(/^https?:\/\//, ""), accessToken);
    const metrics = computeMetrics(orders);
    // LTV-adjusted break-even CAC: the maximum you can spend to acquire a
    // customer and still break even over their lifetime.
    // CAC_breakeven = profit_margin × LTV
    const cacBreakeven = Math.round(metrics.ltv * profitMargin * 100) / 100;
    return {
        ...metrics,
        cacBreakeven,
        isMockData: false,
    };
}
