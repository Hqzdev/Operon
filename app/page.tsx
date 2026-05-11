import type { Metadata } from "next";
import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { PricingSection } from "@/components/landing/pricing-section";
import {
  ChannelsSection,
  ComparisonSection,
  FaqSection,
  FinalCtaSection,
  PipelineSection,
} from "@/components/landing/reddit-product-sections";
import { FooterSection } from "@/components/landing/footer-section";
import { jsonLdScript } from "@/lib/json-ld";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://operons.vercel.app";

export const metadata: Metadata = {
  title: "Operon — Reddit Customers on Autopilot",
  description:
    "Find high-intent Reddit posts, score every lead, and draft replies or DMs from one workspace. Built for founders and teams who want customers from Reddit.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "Operon — Reddit Customers on Autopilot",
    description:
      "Find high-intent Reddit posts, score every lead, and draft replies or DMs from one workspace.",
    url: BASE_URL,
    siteName: "Operon",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operon — Reddit Customers on Autopilot",
    description: "Find customers asking for what you sell on Reddit.",
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
        "Reddit lead generation workspace that finds high-intent posts, scores relevance, drafts replies and DMs, and tracks outreach.",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "14.99",
          priceCurrency: "USD",
          description: "New Reddit leads every hour, autopilot mode, 500 AI-written replies, and 2 tracked products.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "29.99",
          priceCurrency: "USD",
          description: "Track 5 products, 1,000 AI-written replies per month, REST API access, and priority support.",
        },
        {
          "@type": "Offer",
          name: "Agency",
          price: "79.99",
          priceCurrency: "USD",
          description: "Unlimited products, replies, scans, team members, and priority 24-hour support.",
        },
      ],
      featureList: [
        "Reddit post discovery across relevant subreddits",
        "Lead relevance scoring with plain-language reasons",
        "AI-written replies and DMs drafted from thread context",
        "Pipeline tracking for new and contacted leads",
        "Autopilot scanning and notifications",
        "REST API access for teams",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Founders, freelancers, agencies, and teams using Reddit for customer acquisition",
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
            text: "Operon is a Reddit customer acquisition workspace. It finds relevant Reddit posts, scores each lead, explains why it is relevant, and drafts replies or DMs from the thread context.",
          },
        },
        {
          "@type": "Question",
          name: "How does Operon decide which Reddit posts are relevant?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Operon evaluates keyword fit, problem language, subreddit context, recency, and engagement. Every lead includes a relevance score and an explanation.",
          },
        },
        {
          "@type": "Question",
          name: "Can Operon draft replies and DMs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Operon drafts personal replies and DMs using the original Reddit post, your product description, and your selected reply style.",
          },
        },
        {
          "@type": "Question",
          name: "How much does Operon cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Operon has three plans: Starter at $14.99/month, Pro at $29.99/month, and Agency at $79.99/month. Plans include a free trial and can be canceled anytime.",
          },
        },
        {
          "@type": "Question",
          name: "Is Operon suitable for beginners?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Operon is built for users who want a clear list of relevant Reddit leads without manually searching subreddits all day.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need Reddit API access to use Operon?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Users can start from the hosted Operon workflow. Advanced API access is available on higher-tier plans.",
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
      <PipelineSection />
      <ChannelsSection />
      <PricingSection />
      <FaqSection />
      <ComparisonSection />
      <FinalCtaSection />
      <FooterSection />
    </main>
  );
}
