import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Triple Whale Alternative for Dropshippers | Operon",
  description:
    "Triple Whale starts at $129/month and tells you where your sales came from. Operon starts free and tells you what to do about it — Scale, Fix, or Kill every campaign in seconds.",
  alternates: {
    canonical: `${BASE_URL}/alternatives/triple-whale`,
  },
  openGraph: {
    title: "Triple Whale Alternative for Dropshippers | Operon",
    description:
      "Triple Whale is attribution analytics. Operon is an ad decision engine. If you want to know what to do with your campaigns — not just where sales came from — Operon is the better fit.",
    url: `${BASE_URL}/alternatives/triple-whale`,
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
      name: "Is there a cheaper alternative to Triple Whale?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Operon starts free (10 campaign analyses per month, no credit card) and costs $9–$19/month on paid plans. Triple Whale starts at $129/month. Both work with Meta and TikTok ads, but Operon is built for decisions — Scale, Fix, or Kill — while Triple Whale focuses on multi-touch attribution analytics.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Triple Whale and Operon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Triple Whale is an attribution platform — it tracks where your sales come from across Meta, TikTok, Google, and email. Operon is an ad decision engine — you enter your campaign numbers and get a clear verdict: Scale (increase budget), Fix (something specific is broken), Kill (pause and cut), or Test Again (not enough data yet). Triple Whale tells you what happened. Operon tells you what to do.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need a Shopify store to use Operon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Operon works without Shopify. You can enter your campaign numbers manually or use the Chrome extension to pull data directly from Meta Ads Manager or TikTok Ads Manager. No API keys or store integrations required to get your first verdict.",
      },
    },
  ],
};

const comparison = [
  { feature: "Starting price", operon: "Free ($0/month)", competitor: "$129/month" },
  { feature: "Primary use case", operon: "Ad decisions (Scale / Fix / Kill)", competitor: "Attribution analytics" },
  { feature: "Output", operon: "Clear verdict + 3 action steps", competitor: "Analytics dashboard" },
  { feature: "Meta Ads", operon: "✓", competitor: "✓" },
  { feature: "TikTok Ads", operon: "✓", competitor: "Partial" },
  { feature: "Shopify required", operon: "No", competitor: "Yes (for full features)" },
  { feature: "API / pixel setup", operon: "Not required", competitor: "Required" },
  { feature: "Chrome extension", operon: "✓ (auto-fills from Ads Manager)", competitor: "✗" },
  { feature: "Time to first result", operon: "Under 2 minutes", competitor: "Hours (setup + calibration)" },
  { feature: "Built for beginners", operon: "✓", competitor: "No (enterprise-oriented)" },
];

export default function TripleWhaleAlternativePage() {
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
            <span>Triple Whale</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl leading-tight">
            Looking for a Triple Whale alternative?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Triple Whale is built for attribution — tracking where your sales came from across channels.
            If you want to know <em>what to do</em> with a campaign (scale it, fix it, or kill it), that is a different problem.
            Operon is built for that decision.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Start free — no credit card
            </Link>
            <Link
              href="/vs/triple-whale"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 transition-colors"
            >
              See full comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* Why people look for alternatives */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">Why dropshippers look for Triple Whale alternatives</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "The price is hard to justify at low spend",
                body: "Triple Whale starts at $129/month. If you're spending $1,000–$5,000/month on ads, that's 2–13% of your entire ad budget just to see a dashboard.",
              },
              {
                title: "Attribution is not the same as decisions",
                body: "Knowing that 60% of conversions came from Meta is useful. Knowing whether to scale that campaign, fix the creative, or cut it is more useful. Triple Whale answers the first question.",
              },
              {
                title: "Setup takes time and requires integration",
                body: "Triple Whale requires a Shopify store, pixel installation, and attribution model calibration. Getting useful data takes days, not minutes.",
              },
              {
                title: "Still have to decide yourself",
                body: "After all the analytics, you still have to look at the charts and make the call. For sellers without a data background, that is the hard part — and Triple Whale does not do it for you.",
              },
              {
                title: "TikTok attribution is weaker",
                body: "Triple Whale is built around Meta. TikTok support exists but the attribution accuracy is lower, and the platform does not offer the same depth for TikTok Ads Manager.",
              },
              {
                title: "Too much for a solo seller",
                body: "Triple Whale is built for DTC brands with analytics teams or agencies. A solo dropshipper running two ad sets does not need enterprise attribution infrastructure.",
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
          <h2 className="text-2xl font-semibold mb-8">Operon vs Triple Whale — at a glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-6 font-medium text-slate-500 w-1/3">Feature</th>
                  <th className="text-left py-3 pr-6 font-semibold text-slate-950">Operon</th>
                  <th className="text-left py-3 font-medium text-slate-500">Triple Whale</th>
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

      {/* How Operon works */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-4">How Operon works</h2>
          <p className="text-slate-600 mb-10 max-w-2xl leading-7">
            No pixel. No integration. No waiting days for data to calibrate. You can get your first verdict in under two minutes.
          </p>
          <ol className="space-y-6">
            {[
              {
                step: "1",
                title: "Enter your campaign numbers",
                body: "Add your product price, cost, CTR, CPC, clicks, purchases, and revenue. Use the Chrome extension to auto-fill from Meta or TikTok Ads Manager — or type the numbers in manually.",
              },
              {
                step: "2",
                title: "Operon diagnoses the campaign",
                body: "The decision engine calculates ROAS, break-even ROAS, margin health, and signal quality. It identifies the root cause — is the issue creative, offer, or product?",
              },
              {
                step: "3",
                title: "You get a clear verdict",
                body: "Scale (increase budget now), Fix (here is exactly what is broken), Kill (cut it and reallocate), or Test Again (not enough data yet). Every verdict includes a confidence score and 3 specific next steps.",
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-5">
                <span className="flex-shrink-0 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-6">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who each is for */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-semibold mb-5">Operon is a better fit if you…</h2>
              <ul className="space-y-3">
                {[
                  "Spend $50–$10,000/month on Meta or TikTok ads",
                  "Want a verdict on what to do, not a dashboard to interpret",
                  "Run a solo store or small team without a dedicated analyst",
                  "Are newer to paid ads and find attribution models confusing",
                  "Do not want to wait for a pixel to gather data before making decisions",
                  "Run campaigns on both Meta and TikTok and want consistent analysis",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-slate-700">
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
              <h2 className="text-xl font-semibold mb-5">Triple Whale may be a better fit if you…</h2>
              <ul className="space-y-3">
                {[
                  "Spend $50,000+/month across multiple ad channels",
                  "Need accurate multi-touch attribution across Meta, Google, TikTok, and email",
                  "Have a Shopify store and an analytics team to interpret dashboards",
                  "Run a DTC brand where knowing channel contribution is a core business metric",
                  "Are comfortable with a longer setup and calibration period",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-slate-600">
                    <span className="text-slate-400 flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing comparison */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">Pricing comparison</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-lg border-2 border-slate-950 p-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Operon</div>
              <div className="space-y-4">
                <div>
                  <div className="font-semibold">Starter — Free</div>
                  <div className="text-sm text-slate-600 mt-1">10 campaign analyses per month. No credit card required. Scale/Fix/Kill verdict, root cause diagnosis, 3 action steps, Chrome extension.</div>
                </div>
                <div>
                  <div className="font-semibold">Basic — $9/month</div>
                  <div className="text-sm text-slate-600 mt-1">Unlimited analyses, full decision history, priority processing.</div>
                </div>
                <div>
                  <div className="font-semibold">Pro — $19/month</div>
                  <div className="text-sm text-slate-600 mt-1">Everything in Basic + Budget Allocation tool, Scenario Simulator, weekly digest, and Autopilot (24-hour background monitoring).</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Triple Whale</div>
              <div className="space-y-4">
                <div>
                  <div className="font-semibold">Starter — $129/month</div>
                  <div className="text-sm text-slate-600 mt-1">Attribution analytics, pixel tracking, Shopify integration. Requires store setup and calibration period.</div>
                </div>
                <div>
                  <div className="font-semibold">Growth — $299/month</div>
                  <div className="text-sm text-slate-600 mt-1">Advanced attribution, creative analytics, Moby AI assistant.</div>
                </div>
                <div>
                  <div className="font-semibold">Pro — $599/month</div>
                  <div className="text-sm text-slate-600 mt-1">Full feature suite, custom attribution windows, agency features.</div>
                </div>
              </div>
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
                q: "Does Operon replace attribution analytics entirely?",
                a: "No — Operon and Triple Whale solve different problems. Attribution tells you where revenue came from. Operon tells you what to do with each campaign. If you are a large brand that needs accurate cross-channel attribution, Triple Whale is genuinely useful. If you are an early-to-mid stage seller who needs faster, clearer campaign decisions, Operon is built for that.",
              },
              {
                q: "Can I use Operon without connecting Meta or TikTok via API?",
                a: "Yes. Operon's Chrome extension reads campaign data directly from open Ads Manager tabs — no API key, no business verification, no official integration required. You can also enter numbers manually. There is no setup barrier.",
              },
              {
                q: "What if I need both attribution and decision support?",
                a: "Many sellers use Operon alongside their existing analytics setup. Operon does not require exclusivity — you can use it for campaign decisions while keeping another tool for attribution reporting.",
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
          <h2 className="text-3xl font-semibold mb-4">Try Operon free today</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            10 free analyses per month. No credit card. No pixel setup. Get your first Scale, Fix, or Kill verdict in under two minutes.
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
