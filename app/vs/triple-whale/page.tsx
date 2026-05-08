import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Operon vs Triple Whale — Which Is Right for Your Ad Strategy?",
  description:
    "Operon gives you Scale/Fix/Kill verdicts on Meta and TikTok campaigns starting free. Triple Whale gives you attribution analytics starting at $129/month. Here is what each does well.",
  alternates: {
    canonical: `${BASE_URL}/vs/triple-whale`,
  },
  openGraph: {
    title: "Operon vs Triple Whale",
    description:
      "Ad decision engine vs attribution analytics. Compare pricing, features, and which tool is right for your ad strategy.",
    url: `${BASE_URL}/vs/triple-whale`,
    siteName: "Operon",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function OperonVsTripleWhalePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Navigation />

      {/* Header */}
      <section className="border-b border-slate-200 pt-28">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-950 transition-colors">Operon</Link>
            <span>/</span>
            <span>vs</span>
            <span>/</span>
            <span>Triple Whale</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl leading-tight">
            Operon vs Triple Whale
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
            <strong>TL;DR:</strong> Triple Whale is an attribution analytics platform for large DTC brands — it tracks where sales came from. Operon is an ad decision engine for dropshippers and smaller DTC sellers — it tells you whether to scale, fix, or kill each campaign. Different tools for different problems.
          </p>
        </div>
      </section>

      {/* At a glance */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">At a glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 pr-6 w-1/3 text-slate-500 font-medium"></th>
                  <th className="text-left py-3 pr-6 font-semibold text-slate-950 text-base">Operon</th>
                  <th className="text-left py-3 font-medium text-slate-500 text-base">Triple Whale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ["Category", "Ad decision engine", "Attribution analytics"],
                  ["Primary output", "Scale / Fix / Kill verdict + next steps", "Attribution dashboard + reports"],
                  ["Starting price", "Free ($0/month)", "$129/month"],
                  ["Time to first insight", "Under 2 minutes", "Days (pixel + calibration)"],
                  ["Setup required", "None (manual or Chrome extension)", "Shopify pixel + store integration"],
                  ["Meta Ads", "✓", "✓"],
                  ["TikTok Ads", "✓", "Partial"],
                  ["No API required", "✓", "✗"],
                  ["Root cause diagnosis", "✓ (creative / offer / product)", "✗"],
                  ["Autopilot monitoring", "✓ (24h background scan)", "✗"],
                  ["Best for", "Solo sellers, early-mid DTC ($50–$10k/mo)", "Large DTC brands ($50k+/mo)"],
                ].map(([feature, operon, competitor]) => (
                  <tr key={feature}>
                    <td className="py-3 pr-6 text-slate-500">{feature}</td>
                    <td className="py-3 pr-6 font-medium text-slate-950">{operon}</td>
                    <td className="py-3 text-slate-500">{competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed comparison */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14 space-y-12">
          <h2 className="text-2xl font-semibold">Detailed comparison</h2>

          {[
            {
              title: "What each tool does",
              operon: "Operon is an ad decision engine. You put in your campaign numbers — CTR, CPC, purchases, revenue, product margin — and get a verdict: Scale (increase budget now), Fix (one specific thing is broken), Kill (cut it), or Test Again (not enough data). Every verdict includes a confidence score and 3 concrete next steps. Operon identifies whether the issue is creative, offer, or product-level — so you know where to focus.",
              competitor: "Triple Whale is an attribution platform. It tracks how customers find your store across Meta, TikTok, Google, and email using first-party data from a Shopify pixel. The goal is to understand which channels and campaigns contributed to conversions — and how to allocate budget across them. Triple Whale tells you where sales came from; you still decide what to do about it.",
            },
            {
              title: "Pricing",
              operon: "Operon has three plans. Starter is free forever — 10 campaign analyses per month, no credit card required. Basic is $9/month (unlimited analyses, full decision history). Pro is $19/month (everything in Basic plus Budget Allocation, Scenario Simulator, weekly digest email, and Autopilot). Total cost for a solo seller: $0–$19/month.",
              competitor: "Triple Whale starts at $129/month for the Starter plan, which covers basic attribution and Shopify integration. Growth is $299/month. Pro is $599/month. For a seller spending $2,000/month on ads, the Starter plan alone is 6.5% of total ad spend — before the cost of any ads.",
            },
            {
              title: "Setup and time to value",
              operon: "No setup required. Install the Chrome extension (optional) and it auto-fills campaign data from open Meta or TikTok Ads Manager tabs. Or enter numbers manually. From opening Operon to your first verdict: under 2 minutes.",
              competitor: "Triple Whale requires installing a Shopify pixel, connecting your ad accounts, and waiting for attribution data to accumulate and calibrate. Most sellers need several days of data collection before the reports become meaningful. If your pixel is not firing correctly, reports will be inaccurate.",
            },
            {
              title: "Meta and TikTok support",
              operon: "Operon works equally well for Meta (Facebook/Instagram) and TikTok campaigns. The decision logic is the same — enter your numbers, get a verdict. The Chrome extension supports both Ads Manager interfaces.",
              competitor: "Triple Whale is built primarily around Meta. TikTok integration exists but attribution accuracy is lower on TikTok due to limited pixel access. If TikTok is a meaningful part of your ad mix, Triple Whale's data will be less complete.",
            },
            {
              title: "What happens after you get a result",
              operon: "Operon gives you a verdict and 3 specific next steps. If the verdict is Fix, it tells you whether the issue is the creative, the offer, or the product — and what to change. You leave knowing exactly what to do next.",
              competitor: "Triple Whale gives you a dashboard. You see which campaigns contributed to revenue, at what attribution rate, across which channels. Interpreting that and deciding what to do next requires ad strategy knowledge — the tool surfaces the data, not the decision.",
            },
          ].map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-5">{section.title}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-lg border-2 border-slate-950 p-5">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Operon</div>
                  <p className="text-sm text-slate-700 leading-6">{section.operon}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Triple Whale</div>
                  <p className="text-sm text-slate-600 leading-6">{section.competitor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who each is for */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-semibold mb-5">Use Operon if…</h2>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  "You spend $50–$10,000/month on Meta or TikTok ads",
                  "You want a clear verdict on each campaign, not a dashboard to interpret",
                  "You run a solo store or small team without a dedicated analyst",
                  "You are newer to paid ads and need plain-language direction",
                  "You do not want to wait days for attribution data to calibrate",
                  "You run campaigns on both Meta and TikTok and want consistent analysis",
                  "You want to get started immediately — free, no setup",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Start free
                </Link>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-5">Use Triple Whale if…</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                {[
                  "You spend $50,000+/month across Meta, Google, TikTok, and email",
                  "Accurate cross-channel attribution is a core business need",
                  "You have a Shopify store and the time to set up pixel tracking",
                  "You have an in-house analyst or agency who will interpret the data",
                  "You need to report channel ROI to investors or stakeholders",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-slate-400 flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold mb-4">Try Operon free</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            10 free analyses per month. No credit card. No setup. Get your first Scale, Fix, or Kill verdict in under two minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Start free
            </Link>
            <Link
              href="/alternatives/triple-whale"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-8 py-4 text-sm font-medium text-slate-700 hover:border-slate-400 transition-colors"
            >
              Read the full Triple Whale alternative guide
            </Link>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
