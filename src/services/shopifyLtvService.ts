import { env } from "../utils/env";

export type LtvBreakevenResult = {
  ltv: number;
  aov: number;
  repeatPurchaseRate: number;
  cacBreakeven: number;
  ordersAnalyzed: number;
  customersAnalyzed: number;
  isMockData: boolean;
  missingConfig?: string;
};

type ShopifyOrder = {
  id: number;
  email?: string;
  customer?: { id: number };
  total_price: string;
  financial_status?: string;
};

type ShopifyOrdersPage = {
  orders?: ShopifyOrder[];
};

async function fetchAllOrders(storeUrl: string, accessToken: string): Promise<ShopifyOrder[]> {
  const apiVersion = env.SHOPIFY_API_VERSION;
  const orders: ShopifyOrder[] = [];

  // Fetch up to 3 pages of 250 orders each (750 total) for LTV analysis.
  // Shopify REST pagination uses link headers; we keep it simple and stop
  // after the first page that returns fewer than 250 results.
  let pageUrl: string | null =
    `https://${storeUrl}/admin/api/${apiVersion}/orders.json` +
    `?status=any&financial_status=paid&limit=250&fields=id,email,customer,total_price`;

  let pages = 0;
  while (pageUrl && pages < 3) {
    const response: Response = await fetch(pageUrl, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    if (!response.ok) {
      const text = await response.text();
      let msg: string;
      try {
        msg = (JSON.parse(text) as { errors?: string }).errors ?? `Shopify ${response.status}`;
      } catch {
        msg = `Shopify ${response.status}`;
      }
      throw new Error(msg);
    }

    const data = (await response.json()) as ShopifyOrdersPage;
    const page = data.orders ?? [];
    orders.push(...page);

    // Follow Shopify cursor pagination if present
    const linkHeader: string = response.headers.get("link") ?? "";
    const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch ? nextMatch[1] : null;

    // Stop early if this page was not full
    if (page.length < 250) break;
    pages += 1;
  }

  return orders;
}

function computeMetrics(orders: ShopifyOrder[]): Omit<LtvBreakevenResult, "cacBreakeven" | "isMockData"> {
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
  const customerOrders = new Map<string, number[]>();
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
    if (orderPrices.length >= 2) repeatCustomers += 1;
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

function mockResult(reason: string): LtvBreakevenResult {
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

export type LtvComputeResult = {
  ltv: number;
  aov: number;
  repeatPurchaseRate: number;
  ltvBreakEvenRoas: number;
  ltvBreakEvenCpa: number;
  firstOrderBreakEvenRoas: number;
  firstOrderBreakEvenCpa: number;
  ordersAnalyzed: number;
  customersAnalyzed: number;
  hasEnoughHistory: boolean;
};

type ShopifyOrderWithDate = ShopifyOrder & { created_at?: string };

export async function computeLtvFromConnection(
  storeUrl: string,
  accessToken: string,
  productPrice: number,
  cost: number,
): Promise<LtvComputeResult | null> {
  const apiVersion = env.SHOPIFY_API_VERSION;
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const url =
    `https://${storeUrl}/admin/api/${apiVersion}/orders.json` +
    `?status=any&financial_status=paid&limit=250&created_at_min=${encodeURIComponent(since)}&fields=id,email,customer,total_price,created_at`;

  const response = await fetch(url, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { orders?: ShopifyOrderWithDate[] };
  const orders = data.orders ?? [];
  if (orders.length === 0) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const hasEnoughHistory = orders.some(
    (o) => o.created_at && new Date(o.created_at) < thirtyDaysAgo,
  );

  const customerOrders = new Map<string, number[]>();
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

  let repeatCustomers = 0;
  for (const orderPrices of customerOrders.values()) {
    if (orderPrices.length >= 2) repeatCustomers += 1;
  }
  const repeatPurchaseRate = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;
  const ltv = aov * (1 + repeatPurchaseRate);

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
    repeatPurchaseRate: round2(repeatPurchaseRate * 100) / 100,
    ltvBreakEvenRoas,
    ltvBreakEvenCpa,
    firstOrderBreakEvenRoas,
    firstOrderBreakEvenCpa,
    ordersAnalyzed: totalOrders,
    customersAnalyzed: totalCustomers,
    hasEnoughHistory,
  };
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * Pull repeat-purchase data from Shopify and compute LTV-aware break-even.
 *
 * @param profitMargin  Gross margin as a decimal (e.g. 0.4 for 40%). Defaults to 0.4.
 */
export async function getLtvBreakeven(profitMargin = 0.4): Promise<LtvBreakevenResult> {
  const storeUrl = env.SHOPIFY_STORE_URL;
  const accessToken = env.SHOPIFY_ACCESS_TOKEN;

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
