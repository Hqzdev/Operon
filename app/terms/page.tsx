import type { Metadata } from "next";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export const metadata: Metadata = {
  title: "Terms of Service | Operon",
  description: "Operon Terms of Service — the rules and conditions governing use of the Operon platform.",
};

const LAST_UPDATED = "May 1, 2026";

const sections = [
  {
    num: "1",
    title: "Acceptance of Terms",
    body: `By accessing or using Operon ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. These terms constitute a legally binding agreement between you and Operon ("we", "us", or "our").`,
  },
  {
    num: "2",
    title: "Description of Service",
    body: `Operon is an AI-powered advertising analytics and decision platform that connects to third-party data sources (Shopify, Meta Ads, TikTok Ads), analyzes product and campaign performance metrics, and provides actionable scale/kill/watch recommendations. We reserve the right to modify or discontinue any feature of the Service at any time.`,
  },
  {
    num: "3",
    title: "Account Registration",
    body: `You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us immediately of any unauthorized access. Accounts may not be shared or transferred.`,
  },
  {
    num: "4",
    title: "Acceptable Use",
    body: `You agree not to: (a) reverse-engineer, decompile, or disassemble any part of the Service; (b) use the Service to violate applicable laws or third-party rights; (c) introduce malicious code or attempt to gain unauthorized access; (d) resell or sublicense access to the Service; (e) use automated tools to scrape or extract data beyond normal API usage; or (f) use the Service to engage in any fraudulent activity.`,
  },
  {
    num: "5",
    title: "Third-Party Integrations",
    body: `The Service integrates with Shopify, Meta Ads, and TikTok Ads via OAuth. By connecting these accounts, you authorize us to access data as described in our Privacy Policy. Your use of third-party platforms remains subject to their own terms of service. We are not responsible for changes, outages, or data inaccuracies originating from those platforms.`,
  },
  {
    num: "6",
    title: "Data and Privacy",
    body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. We process analysis inputs, store snapshots of your advertising metrics, and retain OAuth tokens in encrypted form (AES-256-GCM) to enable automated sync.`,
  },
  {
    num: "7",
    title: "Intellectual Property",
    body: `All rights, title, and interest in the Service—including its software, design, algorithms, and content—belong to Operon. You retain ownership of your data. By using the Service, you grant us a limited, non-exclusive license to process your data solely to deliver the Service.`,
  },
  {
    num: "8",
    title: "Disclaimers",
    body: `The Service provides data-driven recommendations, not financial advice. All decisions based on Operon outputs are made at your own risk. THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.`,
  },
  {
    num: "9",
    title: "Limitation of Liability",
    body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPERON SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE TWELVE MONTHS PRECEDING THE CLAIM.`,
  },
  {
    num: "10",
    title: "Termination",
    body: `Either party may terminate this agreement at any time. Upon termination, your access to the Service ceases. We may retain anonymized, aggregated data for analytics purposes. Provisions that by their nature should survive termination (including Intellectual Property, Disclaimers, and Limitation of Liability) shall survive.`,
  },
  {
    num: "11",
    title: "Governing Law",
    body: `These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles. Any disputes shall be resolved exclusively in the state or federal courts located in Delaware, and you consent to personal jurisdiction therein.`,
  },
  {
    num: "12",
    title: "Changes to Terms",
    body: `We may update these Terms at any time. Material changes will be communicated via email or an in-app notice at least 14 days before they take effect. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.`,
  },
  {
    num: "13",
    title: "Contact",
    body: `Questions about these Terms? Contact us at legal@operon.app. We aim to respond within 5 business days.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-36">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Legal</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.num}>
              <h2 className="mb-2 text-base font-semibold">
                {s.num}. {s.title}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
