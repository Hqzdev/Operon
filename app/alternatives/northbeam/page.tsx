import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { jsonLdScript } from "@/lib/json-ld";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Northbeam Alternative for Small and Mid-Size Sellers | Operon",
  description:
    "Northbeam costs $1,000+/month and is built for enterprise DTC brands. Operon starts free and gives dropshippers and small sellers a clear Scale, Fix, or Kill verdict on every campaign.",
  alternates: {
    canonical: `${BASE_URL}/alternatives/northbeam`,
  },
  openGraph: {
    title: "Northbeam Alternative for Small and Mid-Size Sellers | Operon",
    description:
      "Northbeam is enterprise attribution. Operon is an ad decision engine starting free. If you are not spending $100k/month on ads, Operon is built for your scale.",
    url: `${BASE_URL}/alternatives/northbeam`,
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
      name: "Is there a cheaper alternative to Northbeam for small sellers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Northbeam is priced for enterprise DTC brands spending $100,000+/month and typically costs $1,000–$3,000+/month. Operon starts free (10 campaign analyses per month, no credit card) and costs $9–$19/month on paid plans. Operon is built for sellers spending $50–$10,000/month on Meta and TikTok ads who need clear campaign decisions, not enterprise attribution infrastructure.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Northbeam and Operon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Northbeam is an enterprise attribution platform — it tracks how revenue is attributed across all marketing channels using algorithmic modeling. Operon is an ad decision engine — you enter your campaign numbers and get a clear verdict: Scale (increase budget), Fix (specific issue identified), Kill (cut the campaign), or Test Again (not enough data). Northbeam tells large brands where their revenue came from across all channels. Operon tells individual sellers what to do with each campaign right now.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need enterprise-level attribution as a dropshipper?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Probably not. Enterprise attribution tools like Northbeam solve a specific problem: accurately attributing revenue across many channels (Meta, Google, email, affiliates, TV) at high spend. At $1,000–$10,000/month in ad spend, your decision problem is simpler — is this campaign profitable? Should I scale it or cut it? What is broken? Operon answers those questions without requiring attribution infrastructure.",
      },
    },
  ],
};

const comparison = [
  { feature: "Starting price", operon: "Free ($0/month)", competitor: "$1,000+/month (custom pricing)" },
  { feature: "Target customer", operon: "Solo sellers, small DTC ($50–$10k/mo spend)", competitor: "Enterprise DTC brands ($100k+/mo spend)" },
  { feature: "Primary use case", operon: "Campaign decisions (Scale / Fix / Kill)", competitor: "Cross-channel attribution modeling" },
  { feature: "Output", operon: "Verdict + root cause + 3 action steps", competitor: "Attribution reports and dashboards" },
  { feature: "Meta Ads", operon: "✓", competitor: "✓" },
  { feature: "TikTok Ads", operon: "✓", competitor: "✓" },
  { feature: "Setup required", operon: "None (manual or Chrome extension)", competitor: "Extensive (pixel, API, calibration)" },
  { feature: "Time to first insight", operon: "Under 2 minutes", competitor: "Weeks (onboarding + data calibration)" },
  { feature: "No API required", operon: "✓", competitor: "✗" },
  { feature: "Built for beginners", operon: "✓", competitor: "No (requires analytics expertise)" },
  { feature: "Root cause diagnosis", operon: "✓ (creative / offer / product)", competitor: "✗" },
];

export default function NorthbeamAlternativePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
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
            <span>Northbeam</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl leading-tight">
            Looking for a Northbeam alternative?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Northbeam is enterprise attribution software built for brands spending $100,000+ per month across multiple ad channels. If you are an individual seller or small DTC brand running Meta and TikTok campaigns, Northbeam is not built for your scale — and you likely do not need it. Operon is.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Start free — no credit card
            </Link>
            <Link
              href="#comparison"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 transition-colors"
            >
              See comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* Why people look for alternatives */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">Why sellers look for Northbeam alternatives</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "The pricing is enterprise-only",
                body: "Northbeam does not publish pricing publicly. Custom contracts typically start at $1,000–$3,000 per month. For a seller spending $2,000/month on ads, that is more than the entire ad budget just for the analytics tool.",
              },
              {
                title: "Built for very high ad spend",
                body: "Northbeam's attribution modeling makes most sense when you have significant spend across many channels — Meta, Google, TikTok, email, affiliates, TV. The problem it solves is not the problem most dropshippers have.",
              },
              {
                title: "Onboarding takes weeks",
                body: "Getting useful data from Northbeam requires installing tracking across every channel, waiting for the model to calibrate, and working with an onboarding team. That is weeks before you see anything actionable.",
              },
              {
                title: "Attribution ≠ decisions",
                body: "Even with perfect attribution, you still have to decide: should I scale this campaign? What is wrong with it? Northbeam tells you where revenue came from. It does not tell you what to do about each campaign.",
              },
              {
                title: "Requires analytics expertise",
                body: "Northbeam's dashboards are built for analysts and CMOs. Interpreting media mix models and attribution curves requires data background. Most individual sellers do not have that — and should not need it.",
              },
              {
                title: "Overkill at early stage",
                body: "Attribution modeling matters most when you have many channels running at significant scale. At $1k–$10k/month on one or two platforms, simpler campaign analysis gives you everything you need faster.",
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
      <section id="comparison" className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">Operon vs Northbeam — at a glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-6 font-medium text-slate-500 w-1/3">Feature</th>
                  <th className="text-left py-3 pr-6 font-semibold text-slate-950">Operon</th>
                  <th className="text-left py-3 font-medium text-slate-500">Northbeam</th>
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

      {/* Right tool for right scale */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-8">The right tool for your current scale</h2>
          <div className="space-y-6">
            {[
              {
                range: "$50–$10,000/month in ad spend",
                verdict: "Operon is built for this stage",
                body: "At this level, your core question is: which campaigns are working and which should I cut? You do not need media mix modeling — you need a fast, clear answer. Operon gives you a Scale, Fix, or Kill verdict in under two minutes, with the exact next steps to act on.",
                highlight: true,
              },
              {
                range: "$10,000–$100,000/month in ad spend",
                verdict: "Operon works well; attribution tools become more relevant",
                body: "At higher spend, understanding which channel is driving incremental revenue starts to matter more. Operon remains useful for per-campaign decisions. You might add a lightweight attribution tool alongside it, but enterprise platforms like Northbeam are still priced above this range.",
                highlight: false,
              },
              {
                range: "$100,000+/month across many channels",
                verdict: "Northbeam and similar enterprise tools make sense",
                body: "At this scale with meaningful spend across Meta, Google, email, and affiliates, precise attribution modeling directly impacts budget allocation decisions worth tens of thousands per month. Enterprise tools pay for themselves at this level.",
                highlight: false,
              },
            ].map((item) => (
              <div
                key={item.range}
                className={`rounded-lg p-6 ${item.highlight ? "border-2 border-slate-950" : "border border-slate-200"}`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{item.range}</div>
                <div className={`font-semibold mb-2 ${item.highlight ? "text-slate-950" : "text-slate-700"}`}>{item.verdict}</div>
                <p className="text-sm text-slate-600 leading-6">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who each is for */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-semibold mb-5">Operon is the right fit if you…</h2>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  "Spend $50–$10,000/month on Meta or TikTok ads",
                  "Need a clear verdict on what to do with each campaign",
                  "Run a solo store or small team without a dedicated analyst",
                  "Want to get started immediately — no integration, no setup",
                  "Run campaigns on both Meta and TikTok",
                  "Do not want to commit $1,000+/month to an analytics tool",
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
              <h2 className="text-xl font-semibold mb-5">Northbeam may be a better fit if you…</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                {[
                  "Spend $100,000+/month across Meta, Google, email, and affiliates",
                  "Need algorithmic multi-touch attribution modeling",
                  "Have a data team or agency to manage and interpret the platform",
                  "Attribution accuracy directly drives budget decisions at significant scale",
                  "Have budget for enterprise software contracts",
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
                q: "Do I need attribution modeling as a small seller?",
                a: "Not at early-to-mid stage. Attribution modeling answers the question: 'which channel contributed to this sale?' That question matters most when you have $50k+/month spread across Meta, Google, email, and other channels. At lower spend on one or two platforms, the simpler question — 'is this specific campaign working?' — is what drives decisions, and Operon answers that directly.",
              },
              {
                q: "How does Operon decide whether to scale or kill a campaign without attribution data?",
                a: "Operon uses the campaign's own numbers — CTR, CPC, conversion rate, ROAS, product margin — to calculate whether the campaign is profitable and whether the signal is strong enough to act on. It does not need cross-channel attribution because it evaluates each campaign on its own economics. For most sellers at $50–$10k/month spend, that is the right analysis.",
              },
              {
                q: "Can I use Operon without any integrations?",
                a: "Yes. Operon works with manual input — you enter the numbers directly. There is also a Chrome extension that auto-fills from open Meta or TikTok Ads Manager tabs. No API keys, no pixel setup, no business verification required.",
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
          <h2 className="text-3xl font-semibold mb-4">Built for your scale — starting free</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            10 free analyses per month. No credit card. No pixel. No enterprise contract. Get a Scale, Fix, or Kill verdict on your campaigns in under two minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Start free — no credit card required
          </Link>
          <p className="mt-4 text-xs text-slate-400">Starter plan is free forever · Paid plans from $9/month</p>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
