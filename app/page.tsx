import type { Metadata } from "next";
import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { InfrastructureSection } from "@/components/landing/infrastructure-section";
import { MetricsSection } from "@/components/landing/metrics-section";
import { IntegrationsSection } from "@/components/landing/integrations-section";
import { SecuritySection } from "@/components/landing/security-section";
import { DevelopersSection } from "@/components/landing/developers-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FooterSection } from "@/components/landing/footer-section";
import { jsonLdScript } from "@/lib/json-ld";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Operon — Ad Decision Engine for Meta & TikTok Sellers",
  description:
    "Enter your campaign numbers. Get a clear Scale, Fix, or Kill verdict with exact next steps. Built for dropshippers and DTC brands running ads on Meta and TikTok.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "Operon — Know exactly what to do with your ads",
    description:
      "Enter your campaign numbers. Get a clear Scale, Fix, or Kill verdict in seconds — with the exact steps to act on it.",
    url: BASE_URL,
    siteName: "Operon",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operon — Ad Decision Engine for Meta & TikTok",
    description: "Scale, Fix, or Kill — a clear verdict on every campaign, in seconds.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#app`,
      name: "Operon",
      url: BASE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "AI-powered ad decision engine for dropshippers and DTC sellers on Meta and TikTok. Enter campaign metrics, get a Scale, Fix, or Kill verdict with exact next steps in seconds.",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "0",
          priceCurrency: "USD",
          description: "10 free campaign analyses per month. No credit card required.",
        },
        {
          "@type": "Offer",
          name: "Basic",
          price: "9",
          priceCurrency: "USD",
          description: "Unlimited analyses and full decision history.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "19",
          priceCurrency: "USD",
          description:
            "Unlimited analyses, Budget Allocation tool, Scenario Simulator, weekly digest, and Autopilot.",
        },
      ],
      featureList: [
        "Scale / Fix / Kill verdict for every ad campaign",
        "Root cause diagnosis (creative, offer, or product)",
        "3 actionable next steps per verdict",
        "Decision history to track changes over time",
        "Meta Ads and TikTok Ads Manager integration",
        "Chrome extension for auto-filling metrics from Ads Manager",
        "Autopilot — 24-hour background monitoring without the official API",
        "Budget allocation tool across ad sets",
        "Scenario simulator for ROAS and revenue projections",
      ],
      audience: {
        "@type": "Audience",
        audienceType:
          "Dropshippers, DTC brand owners, and media buyers running Meta and TikTok ads",
      },
    },
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#org`,
      name: "Operon",
      url: BASE_URL,
      contactPoint: {
        "@type": "ContactPoint",
        email: "founder@operon.app",
        contactType: "customer support",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Operon?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Operon is an AI-powered ad decision engine for dropshippers and DTC sellers. You enter your campaign metrics — CTR, CPC, ROAS, purchases, revenue — and get a clear Scale, Fix, or Kill verdict with 3 specific next steps, in under 30 seconds.",
          },
        },
        {
          "@type": "Question",
          name: "How does Operon decide whether to scale or kill an ad campaign?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Operon calculates ROAS, break-even ROAS, net profit margin, and spend efficiency from your inputs. It evaluates confidence signals — data volume, CTR strength, conversion rate, and margin health — then returns one of four verdicts: SCALE (strong ROAS, increase budget now), FIX (good signal but one thing is broken — here's what to change), KILL (unprofitable, pause and cut spend), or TEST AGAIN (not enough data yet — here's what to test next).",
          },
        },
        {
          "@type": "Question",
          name: "Does Operon connect to Meta Ads or TikTok Ads Manager?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Operon works with Meta Ads (Facebook and Instagram) and TikTok Ads Manager. You can connect via the Chrome extension, which reads campaign data directly from the Ads Manager page without needing an official API key. Manual input is also available — you can get your first verdict today without connecting anything.",
          },
        },
        {
          "@type": "Question",
          name: "How much does Operon cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Operon has three plans: Starter (free, 10 analyses per month, no credit card required), Basic ($9/month, unlimited analyses and full decision history), and Pro ($19/month, all Basic features plus Budget Allocation, Scenario Simulator, weekly digest, and Autopilot). Cancel anytime.",
          },
        },
        {
          "@type": "Question",
          name: "Is Operon suitable for beginners?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Operon is built specifically for beginner to intermediate dropshippers who run ads on Meta or TikTok but don't have deep analytics expertise. You don't need to understand how to interpret ROAS tables or CPM benchmarks — Operon reads the numbers and tells you exactly what to do next.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need experience with analytics to use Operon?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Operon is designed so that store owners can make better ad decisions without being analytics experts. You enter your numbers and get a plain-language verdict with specific actions to take.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <InfrastructureSection />
      <MetricsSection />
      <IntegrationsSection />
      <SecuritySection />
      <DevelopersSection />
      <TestimonialsSection />
      <CtaSection />
      <FooterSection />
    </main>
  );
}
