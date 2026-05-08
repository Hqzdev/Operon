import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Madgicx Alternative for Meta and TikTok Sellers | Operon",
  description:
    "Madgicx automates Meta ad bidding and targeting. Operon tells you whether to scale, fix, or kill each campaign — starting free. No API verification required.",
  alternates: {
    canonical: `${BASE_URL}/alternatives/madgicx`,
  },
  openGraph: {
    title: "Madgicx Alternative | Operon",
    description:
      "Madgicx is built for automating Meta ad optimization. Operon is built for making clear campaign decisions. If you want to know what to do, not what to automate — Operon is the better fit.",
    url: `${BASE_URL}/alternatives/madgicx`,
    siteName: "Operon",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is there a simpler alternative to Madgicx for Facebook ads?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Operon is a simpler and cheaper alternative to Madgicx for sellers who want clear campaign decisions rather than automated bid management. Operon starts free, supports both Meta and TikTok, and requires no API access or business verification. You enter your campaign numbers and get a Scale, Fix, or Kill verdict in seconds.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Madgicx and Operon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Madgicx is a Meta ad automation tool — it manages bidding, audiences, and scaling rules automatically. Operon is an ad decision engine — it tells you whether to scale, fix, or kill each campaign, and exactly what to do next. Madgicx is for sellers who want automation; Operon is for sellers who want clarity and control.",
      },
    },
    {
      "@type": "Question",
      name: "Does Operon work for Facebook ads without a business account?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Operon's Chrome extension reads campaign data directly from the open Meta Ads Manager tab — no API access, no business verification, no developer setup required. You can also enter numbers manually. There is no integration barrier.",
      },
    },
  ],
};

const comparison = [
  { feature: "Starting price", operon: "Free ($0/month)", competitor: "$49+/month (scales with ad spend)" },
  { feature: "Primary use case", operon: "Campaign decisions (Scale / Fix / Kill)", competitor: "Meta ad automation and bid management" },
  { feature: "Output", operon: "Verdict + root cause + 3 action steps", competitor: "Automated rules, bidding adjustments" },
  { feature: "Meta Ads", operon: "✓", competitor: "✓" },
  { feature: "TikTok Ads", operon: "✓", competitor: "✗ (Meta only)" },
  { feature: "API access required", operon: "No", competitor: "Yes (Meta Business API)" },
  { feature: "Business verification", operon: "Not required", competitor: "Required for full access" },
  { feature: "Chrome extension", operon: "✓ (auto-fills from Ads Manager)", competitor: "✗" },
  { feature: "Root cause diagnosis", operon: "✓ (creative / offer / product)", competitor: "✗" },
  { feature: "Beginner-friendly", operon: "✓", competitor: "No (requires Meta expertise)" },
  { feature: "Time to first result", operon: "Under 2 minutes", competitor: "Hours (setup + learning period)" },
];

export default function MadgicxAlternativePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navigation />

      {/* Hero */}
      <section className="border-b border-slate-200 pt-28">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-950 transition-colors">Operon</Link>
            <span>/</span>
            <span>Alternatives</span>
            <span>/</span>
            <span>Madgicx</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl leading-tight">
            Looking for a Madgicx alternative?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Madgicx is built for automating Meta ad optimization — bidding adjustments, audience management, scaling rules.
            If you want to understand <em>what is actually wrong</em> with a campaign and know exactly what to do next,
            Operon is built for that.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Start free — no credit card
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 transition-colors"
            >
              See how it works →
            </Link>
          </div>
        </div>
      </section>

      {/* Why people look for alternatives */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">Why sellers look for Madgicx alternatives</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Automation without clarity",
                body: "Madgicx adjusts bids and audiences automatically, but does not explain why campaigns are underperforming. You can end up spending more without knowing what the actual problem is.",
              },
              {
                title: "Meta only — no TikTok",
                body: "Madgicx is built exclusively for Meta (Facebook and Instagram). If you run any campaigns on TikTok, you need a separate tool or manual analysis.",
              },
              {
                title: "Requires business API access",
                body: "Full Madgicx features require connecting via the Meta Business API, which requires business verification. New accounts and smaller sellers often hit delays or rejections during this process.",
              },
              {
                title: "Steep learning curve",
                body: "Madgicx has a large feature set built around automation rules and audience management. Getting value from it requires Meta expertise and time investment — not ideal if you just want faster decisions.",
              },
              {
                title: "Price scales with ad spend",
                body: "Madgicx pricing is tied to your monthly ad spend, meaning costs increase automatically as you scale. The tools that are supposed to help you grow also get more expensive as you do.",
              },
              {
                title: "Still does not tell you what to do",
                body: "Even with Madgicx running, you still have to decide: is this campaign worth keeping? Is the creative the issue, or the offer? Madgicx automates tactics — Operon answers strategy.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 p-5">
                <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-6">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">Operon vs Madgicx — at a glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-6 font-medium text-slate-500 w-1/3">Feature</th>
                  <th className="text-left py-3 pr-6 font-semibold text-slate-950">Operon</th>
                  <th className="text-left py-3 font-medium text-slate-500">Madgicx</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50"}`}>
                    <td className="py-3 pr-6 text-slate-600">{row.feature}</td>
                    <td className="py-3 pr-6 font-medium text-slate-950">{row.operon}</td>
                    <td className="py-3 text-slate-500">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How Operon is different */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-4">Decisions, not automation</h2>
          <p className="text-slate-600 mb-10 max-w-2xl leading-7">
            Madgicx tries to optimize your campaigns automatically. Operon helps you decide what to do with them — and tells you why.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="rounded-lg bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Madgicx approach</div>
                <p className="text-sm text-slate-600 leading-6">
                  Madgicx detects that a campaign's cost per purchase is rising and automatically adjusts bids. It creates lookalike audiences and pauses underperforming ad sets based on rules. You get reports on what it changed.
                </p>
              </div>
              <div className="rounded-lg border-2 border-slate-950 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Operon approach</div>
                <p className="text-sm text-slate-600 leading-6">
                  You enter the campaign's numbers. Operon calculates ROAS, break-even margin, and signal quality — then gives you a verdict: the creative CTR is strong but the landing page conversion rate is low. The issue is the offer, not the ad. Here are the 3 things to fix.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">What you get with every Operon analysis</h3>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  "Scale / Fix / Kill / Test Again verdict",
                  "Confidence score based on data volume and signal strength",
                  "Root cause diagnosis — creative, offer, or product issue",
                  "3 specific next steps to act on immediately",
                  "Decision saved to your history so you can track what changed",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who each is for */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-semibold mb-5">Operon is a better fit if you…</h2>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  "Want to understand why campaigns fail, not just pause them automatically",
                  "Run ads on TikTok as well as Meta",
                  "Do not have Meta Business API access or business verification",
                  "Are newer to paid ads and need plain-language guidance",
                  "Prefer control over automation — you make the calls, Operon informs them",
                  "Want to get started immediately without complex setup",
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
                  Try Operon free
                </Link>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-5">Madgicx may be a better fit if you…</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                {[
                  "Run only Meta ads and want hands-off bid automation",
                  "Have Meta Business API access and want automated rules",
                  "Spend significant budget ($10k+/month on Meta) and want algorithmic scaling",
                  "Have an agency or analyst managing the tool on your behalf",
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

      {/* FAQ */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">Common questions</h2>
          <div className="space-y-8">
            {[
              {
                q: "Can I use Operon without Meta Business API access?",
                a: "Yes. Operon's Chrome extension reads campaign data directly from the open Meta Ads Manager page — no API key, no business account verification, no developer setup. If you can open Ads Manager in your browser, you can use Operon.",
              },
              {
                q: "Does Operon work for TikTok ads?",
                a: "Yes. Operon supports both Meta and TikTok campaigns. The Chrome extension works with TikTok Ads Manager, and the decision engine applies the same verdict logic to both platforms. Madgicx does not support TikTok.",
              },
              {
                q: "Will Operon automatically manage my campaigns?",
                a: "No — and that is intentional. Operon gives you a clear verdict and tells you what to change. You make the call. This means you stay in control and understand exactly why each decision is being made. The Autopilot feature (Pro plan) monitors open Ads Manager tabs every 24 hours and notifies you when a campaign's verdict changes — but it does not touch your campaigns automatically.",
              },
            ].map((item) => (
              <div key={item.q}>
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-sm text-slate-600 leading-6">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold mb-4">Get a verdict on your campaigns — free</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            10 free analyses per month. No credit card. No API setup. Scale, Fix, Kill, or Test Again — in under two minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Start free — no credit card required
          </Link>
          <p className="mt-4 text-xs text-slate-400">Starter plan is free forever · Cancel paid plans anytime</p>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
