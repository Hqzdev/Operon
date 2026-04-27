import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const metrics = [
  {
    group: "Product economics",
    items: [
      {
        name: "Product price",
        field: "product_price",
        what: "The price a customer pays for one unit.",
        why: "Used to compute revenue, ROAS, and break-even. Enter the actual selling price, not the list price.",
        example: "$34.99 — the checkout price the buyer sees.",
      },
      {
        name: "Cost",
        field: "cost",
        what: "What you pay to produce or source one unit (COGS).",
        why: "Used to compute your margin, break-even CPA, and whether the setup is profitable.",
        example: "$8.50 for a product bought from a supplier and shipped directly.",
      },
    ],
  },
  {
    group: "Ad performance",
    items: [
      {
        name: "Impressions",
        field: "impressions",
        what: "How many times your ad was shown.",
        why: "The top of your funnel. Gives context to CTR and CPM. Needs to be at least 3,000–5,000 for statistically meaningful decisions.",
        example: "18,400 — the ad was seen 18,400 times.",
      },
      {
        name: "CTR — Click-through rate (%)",
        field: "ctr",
        what: "Percentage of people who clicked the ad after seeing it. CTR = clicks / impressions × 100.",
        why: "Measures creative quality. Below 1% with enough impressions signals a weak hook or irrelevant audience. Above 2% is solid for most niches.",
        example: "1.8% — about 1 in 56 people who saw the ad clicked it.",
      },
      {
        name: "CPC — Cost per click ($)",
        field: "cpc",
        what: "What you pay on average for each click.",
        why: "Determines how far your budget stretches. High CPC narrows the margin for error at every downstream step.",
        example: "$0.95 — each visitor from this ad cost you under a dollar.",
      },
      {
        name: "CPM — Cost per 1,000 impressions ($)",
        field: "cpm",
        what: "What you pay for every 1,000 times your ad is shown.",
        why: "Reflects audience competition and targeting quality. A CPM above $70–80 with a weak CTR often signals over-targeting or a saturated audience.",
        example: "$72 — you pay $72 to reach 1,000 people in your target audience.",
      },
      {
        name: "Clicks",
        field: "clicks",
        what: "Total number of people who clicked the ad.",
        why: "The raw traffic count. Meaningful analysis typically requires 60–100+ clicks before drawing conclusions.",
        example: "331 clicks from 18,400 impressions.",
      },
    ],
  },
  {
    group: "Funnel & conversions",
    items: [
      {
        name: "Add to cart",
        field: "add_to_cart",
        what: "How many visitors added the product to their cart.",
        why: "Measures product-page and offer quality. If clicks are high but ATCs are low, the problem is the product page or price, not the ad.",
        example: "22 add-to-carts from 331 clicks — about 6.6% ATC rate.",
      },
      {
        name: "Purchases",
        field: "purchases",
        what: "How many orders were completed.",
        why: "The core conversion metric. Drives CPA, ROAS, and the profit calculation. Even 1–2 purchases with the right economics can signal a viable setup.",
        example: "4 purchases — the campaign generated 4 completed orders.",
      },
      {
        name: "Revenue",
        field: "revenue",
        what: "Total money collected from purchases (not profit — just gross sales).",
        why: "Used to compute ROAS. Revenue = purchases × average order value. Enter what customers actually paid.",
        example: "$139.96 — 4 purchases × $34.99 each.",
      },
    ],
  },
  {
    group: "Campaign stage",
    items: [
      {
        name: "Stage",
        field: "stage",
        what: "Where this campaign is in its lifecycle: testing, scaling, or retesting.",
        why: "The same numbers mean different things at different stages. Low purchases during testing are normal; the same during scaling is a red flag.",
        example: "'testing' — you're running the initial creative and audience validation phase.",
      },
    ],
  },
  {
    group: "Derived metrics (calculated automatically)",
    items: [
      {
        name: "Spend",
        field: "—",
        what: "Total ad budget consumed. Spend = clicks × CPC.",
        why: "The denominator for ROAS. Knowing spend vs. revenue tells you instantly whether the setup is above or below break-even.",
        example: "331 clicks × $0.95 = ~$314 spent.",
      },
      {
        name: "ROAS — Return on Ad Spend",
        field: "—",
        what: "Revenue divided by spend. ROAS = revenue / spend.",
        why: "The primary efficiency ratio. A ROAS of 1.0 means you made back exactly what you spent on ads — still unprofitable once product cost is included.",
        example: "ROAS 0.45 — for every $1 spent, only $0.45 came back.",
      },
      {
        name: "Break-even ROAS",
        field: "—",
        what: "The minimum ROAS needed to cover your product cost. Break-even ROAS = price / (price − cost).",
        why: "Any ROAS below this number means the campaign loses money even if ads are 'free'. This is your floor, not your target.",
        example: "Price $34.99, cost $8.50 → break-even ROAS = 34.99 / 26.49 = 1.32x.",
      },
      {
        name: "Break-even CPA",
        field: "—",
        what: "The maximum you can afford to pay for one customer. Break-even CPA = price − cost.",
        why: "If your actual CPA is above this number, you lose money on every sale regardless of volume.",
        example: "$34.99 − $8.50 = $26.49 max cost per acquisition.",
      },
      {
        name: "Current CPA — Cost per acquisition",
        field: "—",
        what: "What you actually paid per completed purchase. CPA = spend / purchases.",
        why: "Compare against break-even CPA. If current CPA > break-even CPA, the setup is losing money on every order.",
        example: "$314 spend / 4 purchases = $78.50 CPA vs $26.49 break-even → not profitable.",
      },
      {
        name: "Profit",
        field: "—",
        what: "Net result after subtracting product cost and ad spend. Profit = revenue − (cost × purchases) − spend.",
        why: "The final number that matters. Positive means you made money; negative means you subsidized sales with ad budget.",
        example: "$139.96 revenue − $34 product cost − $314 spend = −$208 net.",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
        <div className="mb-10">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2 gap-2 rounded-full text-muted-foreground">
              <ArrowLeft className="size-3.5" />
              Back to workbench
            </Button>
          </Link>
          <h1 className="font-display text-4xl tracking-tight">Metrics guide</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-xl">
            Plain-language explanations for every field in the analysis form.
            Understanding what each number means helps you enter better data and interpret results correctly.
          </p>
        </div>

        <div className="space-y-12">
          {metrics.map((group) => (
            <section key={group.group}>
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-5 pb-2 border-b border-foreground/10">
                {group.group}
              </h2>
              <div className="space-y-6">
                {group.items.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-foreground/10 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium text-base">{item.name}</h3>
                      {item.field !== "—" && (
                        <code className="text-xs bg-muted px-2 py-0.5 rounded-lg font-mono text-muted-foreground shrink-0">
                          {item.field}
                        </code>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{item.what}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Why it matters</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.why}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-4 py-3">
                      <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1">Example</p>
                      <p className="text-sm text-muted-foreground">{item.example}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-foreground/10 bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Ready to analyze your campaign?
          </p>
          <Link href="/dashboard">
            <Button className="rounded-full">Go to Analysis Workbench</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
