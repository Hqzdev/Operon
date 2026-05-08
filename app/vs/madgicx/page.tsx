import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Operon vs Madgicx — Ad Decision Engine vs Ad Automation",
  description:
    "Madgicx automates Meta ad bidding and audiences. Operon gives you a Scale, Fix, or Kill verdict on every campaign — starting free, no API required, Meta and TikTok.",
  alternates: {
    canonical: `${BASE_URL}/vs/madgicx`,
  },
  openGraph: {
    title: "Operon vs Madgicx",
    description:
      "Automation vs decisions. Compare Operon and Madgicx on pricing, features, TikTok support, and which tool is right for your ad strategy.",
    url: `${BASE_URL}/vs/madgicx`,
    siteName: "Operon",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function OperonVsMadgicxPage() {
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
            <span>Madgicx</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl leading-tight">
            Operon vs Madgicx
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
            <strong>TL;DR:</strong> Madgicx is a Meta ad automation platform — it manages bidding, audiences, and scaling rules automatically, and requires Meta API access. Operon is an ad decision engine for Meta and TikTok — it tells you whether to scale, fix, or kill each campaign and exactly what to change. No API access required, starts free.
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
                  <th className="text-left py-3 font-medium text-slate-500 text-base">Madgicx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ["Category", "Ad decision engine", "Meta ad automation platform"],
                  ["Primary output", "Scale / Fix / Kill verdict + next steps", "Automated bid adjustments + audience optimization"],
                  ["Starting price", "Free ($0/month)", "$49+/month (scales with ad spend)"],
                  ["Meta Ads", "✓", "✓"],
                  ["TikTok Ads", "✓", "✗ (Meta only)"],
                  ["API access required", "No", "Yes (Meta Business API)"],
                  ["Business verification required", "No", "Yes"],
                  ["Time to first insight", "Under 2 minutes", "Hours to days (setup + configuration)"],
                  ["Root cause diagnosis", "✓ (creative / offer / product)", "✗"],
                  ["Chrome extension", "✓ (auto-fills from Ads Manager)", "✗"],
                  ["Beginner-friendly", "✓", "No (requires Meta strategy expertise)"],
                  ["Best for", "Solo sellers, small-mid DTC running Meta + TikTok", "Experienced Meta buyers managing high-volume campaigns"],
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
              operon: "Operon is an ad decision engine. You input your campaign data — CTR, CPC, purchases, revenue, product cost — and get a verdict: Scale (ROAS is strong, increase budget now), Fix (one specific thing is broken — here is what to change), Kill (unprofitable, pause and reallocate), or Test Again (not enough data yet). The verdict includes a root cause diagnosis (creative, offer, or product issue) and 3 concrete next steps.",
              competitor: "Madgicx is a Meta ad optimization platform. It uses AI to automatically adjust bids, create and manage audiences, and scale winning campaigns. It runs in the background, applying optimization rules to your Meta account without requiring manual intervention. The output is automated actions taken on your behalf.",
            },
            {
              title: "Pricing",
              operon: "Operon is free to start — 10 campaign analyses per month, no credit card required. Basic plan is $9/month (unlimited analyses, full decision history). Pro plan is $19/month (everything in Basic plus Budget Allocation tool, Scenario Simulator, weekly digest, and Autopilot monitoring). Pricing does not scale with ad spend.",
              competitor: "Madgicx pricing starts at $49/month and increases based on your monthly ad spend. At higher spend levels, costs increase automatically. Exact pricing depends on account size and feature tier. There is no free tier.",
            },
            {
              title: "Meta API access and setup",
              operon: "Operon requires no API access. The Chrome extension reads campaign data directly from open Meta or TikTok Ads Manager tabs in your browser. You can also enter numbers manually. No business verification, no developer credentials, no setup delay.",
              competitor: "Madgicx requires connecting via the Meta Business API, which requires business verification and granting Madgicx permissions to manage your ad account. New accounts or those without completed business verification may hit delays or be unable to access full features.",
            },
            {
              title: "TikTok support",
              operon: "Operon works equally for Meta and TikTok campaigns. The Chrome extension supports both Ads Manager interfaces, and the decision engine applies the same verdict logic to both platforms. If you run both Meta and TikTok campaigns, you get consistent analysis in one place.",
              competitor: "Madgicx is built for Meta. There is no meaningful TikTok Ads integration. If TikTok is part of your ad mix, you need a separate tool for those campaigns.",
            },
            {
              title: "Decisions vs automation",
              operon: "Operon gives you the analysis and the recommendation. You decide whether to act on it. This keeps you in control and means you understand why each decision is being made — not just that something was changed automatically. The Autopilot feature (Pro plan) monitors for verdict changes every 24 hours and notifies you, but does not touch your campaigns.",
              competitor: "Madgicx acts on your behalf — adjusting bids, managing audiences, and scaling or pausing campaigns based on its AI model. This is valuable if you have a high volume of campaigns to manage and trust the automation. It is less useful when you are trying to understand why something is or is not working.",
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
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Madgicx</div>
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
                  "You want to understand what is wrong with campaigns, not automate around it",
                  "You run ads on TikTok as well as Meta",
                  "You do not have Meta Business API access or business verification",
                  "You are newer to paid ads and want plain-language guidance",
                  "You prefer making informed decisions over hands-off automation",
                  "You want to start for free without committing to a monthly plan",
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
              <h2 className="text-xl font-semibold mb-5">Use Madgicx if…</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                {[
                  "You run only Meta campaigns and want hands-off AI optimization",
                  "You have Meta Business API access and manage large campaign volumes",
                  "You want automated bid management and audience creation",
                  "You have an experienced media buyer overseeing the automation",
                  "You spend significant budget on Meta and want algorithmic scaling",
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
            10 free analyses per month. No credit card. Works with Meta and TikTok. Get your first Scale, Fix, or Kill verdict in under two minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Start free
            </Link>
            <Link
              href="/alternatives/madgicx"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-8 py-4 text-sm font-medium text-slate-700 hover:border-slate-400 transition-colors"
            >
              Read the Madgicx alternative guide
            </Link>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
