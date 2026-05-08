import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Revealbot Alternative for Meta and TikTok Sellers | Operon",
  description:
    "Revealbot automates Meta ad rules starting at $99/month. Operon gives you a clear Scale, Fix, or Kill verdict on every campaign — starting free, no API required.",
  alternates: {
    canonical: `${BASE_URL}/alternatives/revealbot`,
  },
  openGraph: {
    title: "Revealbot Alternative | Operon",
    description:
      "Revealbot automates ad rules for Meta. Operon tells you what to do with each campaign and why. If you want clarity over automation, Operon is built for that.",
    url: `${BASE_URL}/alternatives/revealbot`,
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
      name: "Is there a simpler alternative to Revealbot for Facebook ads?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Operon is a simpler and cheaper alternative to Revealbot for sellers who want clear campaign decisions rather than automated rule management. Operon starts free, requires no API access or business verification, and works with both Meta and TikTok ads. You enter your campaign numbers and get a Scale, Fix, or Kill verdict in seconds — no rule setup required.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Revealbot and Operon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Revealbot is a Meta ad automation tool — you set rules (if CPA exceeds $X, pause the ad set) and it executes them automatically. Operon is an ad decision engine — it analyzes each campaign's numbers and tells you whether to scale, fix, or kill it, plus exactly what the issue is (creative, offer, or product). Revealbot automates your existing strategy. Operon helps you understand whether the strategy is working.",
      },
    },
    {
      "@type": "Question",
      name: "Does Operon work without Meta API access?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Operon's Chrome extension reads campaign data directly from the open Meta Ads Manager page — no API key, no business verification required. You can also enter numbers manually. There is no integration barrier to getting your first verdict.",
      },
    },
  ],
};

const comparison = [
  { feature: "Starting price", operon: "Free ($0/month)", competitor: "$99/month (scales with ad spend)" },
  { feature: "Primary use case", operon: "Campaign decisions (Scale / Fix / Kill)", competitor: "Automated ad rules and bid management" },
  { feature: "Output", operon: "Verdict + root cause + 3 action steps", competitor: "Automated rule execution + reports" },
  { feature: "Meta Ads", operon: "✓", competitor: "✓" },
  { feature: "TikTok Ads", operon: "✓", competitor: "Limited" },
  { feature: "API access required", operon: "No", competitor: "Yes (Meta Business API)" },
  { feature: "Business verification", operon: "Not required", competitor: "Required" },
  { feature: "Chrome extension", operon: "✓ (auto-fills from Ads Manager)", competitor: "✗" },
  { feature: "Root cause diagnosis", operon: "✓ (creative / offer / product)", competitor: "✗" },
  { feature: "Setup complexity", operon: "None — enter numbers or use extension", competitor: "High — requires rule configuration" },
  { feature: "Beginner-friendly", operon: "✓", competitor: "No (requires Meta expertise to set up rules)" },
];

export default function RevealbotAlternativePage() {
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
            <span>Revealbot</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl leading-tight">
            Looking for a Revealbot alternative?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Revealbot automates Meta ad management through rules — if a campaign hits a threshold, it pauses, scales, or adjusts automatically. If you want to understand <em>why</em> a campaign is performing the way it is and know exactly what to change, Operon is built for that.
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
          <h2 className="text-2xl font-semibold mb-8">Why sellers look for Revealbot alternatives</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Rules require expertise to set up",
                body: "Revealbot's value comes from the rules you configure. Writing effective automation rules requires knowing exactly what thresholds to set for CPA, ROAS, and frequency — which requires Meta expertise most beginners do not have.",
              },
              {
                title: "Automation without understanding",
                body: "Revealbot can pause a campaign when CPA exceeds a limit, but it does not tell you why CPA is high. You still need to diagnose the problem — is it the creative, the audience, the offer, or something else?",
              },
              {
                title: "Meta-focused with limited TikTok support",
                body: "Revealbot is built primarily for Meta. TikTok support is limited, and the rule automation capabilities are significantly weaker there. If TikTok is part of your ad mix, you are back to manual analysis.",
              },
              {
                title: "Pricing scales with ad spend",
                body: "Revealbot charges based on your monthly ad spend. As your campaigns grow, costs automatically increase — which means the tool gets more expensive at exactly the moment scaling feels risky.",
              },
              {
                title: "Requires Meta Business API access",
                body: "Full Revealbot functionality requires connecting via the Meta Business API, which requires business verification. New sellers and those who have not completed Meta's business verification process cannot access the full feature set.",
              },
              {
                title: "Rules fire without context",
                body: "A rule that pauses a campaign after day one of low performance might kill a campaign that needed more data. Operon evaluates signal confidence — it tells you when there is not enough data yet and what to test instead.",
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
          <h2 className="text-2xl font-semibold mb-8">Operon vs Revealbot — at a glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-6 font-medium text-slate-500 w-1/3">Feature</th>
                  <th className="text-left py-3 pr-6 font-semibold text-slate-950">Operon</th>
                  <th className="text-left py-3 font-medium text-slate-500">Revealbot</th>
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

      {/* Control vs automation */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold mb-4">Informed decisions vs blind automation</h2>
          <p className="text-slate-600 mb-10 max-w-2xl leading-7">
            Automation is useful when you know exactly what to automate. Before that point, you need clarity — what is actually working, what is broken, and why.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg bg-slate-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Revealbot approach</div>
              <p className="text-sm text-slate-600 leading-6 mb-4">
                You set a rule: if ROAS drops below 1.5 for 3 days, pause the campaign. Revealbot fires the rule automatically. The campaign is paused. But you still do not know whether the issue was the creative, the audience, the product, or a seasonal dip — and whether pausing was the right call.
              </p>
              <p className="text-sm text-slate-500 leading-6">
                Rules require you to already know the right thresholds. That knowledge takes experience.
              </p>
            </div>
            <div className="rounded-lg border-2 border-slate-950 p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Operon approach</div>
              <p className="text-sm text-slate-600 leading-6 mb-4">
                You enter the campaign's numbers. Operon tells you: ROAS is below break-even, but you only have 12 purchases — not enough data to be confident. The verdict is Test Again, not Kill. Here are 3 things to test with the creative before pausing.
              </p>
              <p className="text-sm text-slate-600 leading-6">
                Every verdict includes the reason. You make the call with full context — not a rule that fires blind.
              </p>
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
                  "Want to understand what is wrong with campaigns, not just pause them",
                  "Run ads on TikTok as well as Meta",
                  "Do not have Meta Business API access or business verification",
                  "Are newer to paid ads and want guided decisions rather than manual rule setup",
                  "Prefer making informed calls over automated execution",
                  "Want to start immediately — free, no integration required",
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
              <h2 className="text-xl font-semibold mb-5">Revealbot may be a better fit if you…</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                {[
                  "Run only Meta campaigns and want hands-off rule automation",
                  "Already know exactly which thresholds to use for your vertical",
                  "Have Meta Business API access and manage large campaign volumes",
                  "Want to reduce time spent manually checking campaign status",
                  "Spend $20k+/month on Meta and manage many ad sets simultaneously",
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
                q: "Does Operon automatically manage my campaigns?",
                a: "No — and that is by design. Operon gives you a verdict and tells you what to do. You make the call. The Autopilot feature (Pro plan) monitors open Ads Manager tabs every 24 hours and notifies you when a campaign's verdict changes — but it does not pause or adjust campaigns automatically. You stay in control.",
              },
              {
                q: "Can I use Operon without Meta Business API access?",
                a: "Yes. Operon's Chrome extension reads data directly from your open Meta Ads Manager tab — no API key, no business verification, no developer setup. If you can view your campaigns in a browser, you can use Operon.",
              },
              {
                q: "What if I want both automation and decisions?",
                a: "Some sellers use both tools. Operon handles the decision layer — understanding why campaigns perform and whether to scale or cut. Revealbot handles execution automation once the strategy is clear. They solve different problems and do not overlap in practice.",
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
          <h2 className="text-3xl font-semibold mb-4">Know what to do — without setting up rules</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            10 free analyses per month. No credit card. No API setup. Get a Scale, Fix, Kill, or Test Again verdict in under two minutes.
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
