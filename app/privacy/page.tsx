import type { Metadata } from "next";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export const metadata: Metadata = {
  title: "Privacy Policy | Operon",
  description: "Operon Privacy Policy — how we collect, use, and protect your data.",
};

const LAST_UPDATED = "May 1, 2026";

const sections = [
  {
    num: "1",
    title: "Information We Collect",
    body: `We collect information you provide directly (name, email address, store URL at registration), information from third-party integrations you authorize (Shopify order data, Meta Ads and TikTok Ads campaign metrics), and usage data (analysis inputs, metric snapshots, feature interaction logs). We do not collect payment card numbers directly — billing is handled by our payment processor.`,
  },
  {
    num: "2",
    title: "How We Use Your Information",
    body: `We use your information to: (a) deliver and improve the Service, including running AI analysis on your advertising data; (b) generate scale/kill/watch recommendations and LTV-adjusted break-even calculations; (c) send transactional emails (account alerts, weekly digests) where enabled; (d) detect and prevent abuse or fraud; and (e) comply with legal obligations. We do not sell your personal data to third parties.`,
  },
  {
    num: "3",
    title: "Third-Party Integrations",
    body: `When you connect Shopify, Meta Ads, or TikTok Ads via OAuth, we receive and store access tokens encrypted with AES-256-GCM. We use these tokens to fetch advertising metrics and, for Shopify, historical order data to compute customer lifetime value. You may revoke these connections at any time from the Integrations tab. Revoking a connection stops future syncs but does not automatically delete already-stored snapshots.`,
  },
  {
    num: "4",
    title: "Data Storage and Security",
    body: `Your data is stored on servers located in the United States. OAuth access tokens are encrypted at rest (AES-256-GCM) before storage. Passwords are hashed with bcrypt. Data in transit is protected by TLS 1.2+. We conduct regular security reviews, but no system is completely immune to breaches; promptly notify us if you suspect unauthorized access to your account.`,
  },
  {
    num: "5",
    title: "Data Retention",
    body: `We retain your account data for as long as your account is active. Metric snapshots and analysis history are retained for up to 24 months, after which they may be purged or anonymized. Upon account deletion, your personal data is deleted within 30 days; backups may retain data for an additional 90 days.`,
  },
  {
    num: "6",
    title: "Your Rights",
    body: `Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data, and to object to or restrict certain processing. To exercise these rights, email us at privacy@operon.app. We will respond within 30 days. Users in the European Economic Area have additional rights under GDPR; users in California have rights under the CCPA.`,
  },
  {
    num: "7",
    title: "Cookies and Tracking",
    body: `We use essential session cookies to keep you logged in. We may use analytics cookies (e.g., Plausible) to understand aggregate usage patterns. We do not use cross-site advertising trackers. You can disable non-essential cookies in your browser settings without affecting core functionality.`,
  },
  {
    num: "8",
    title: "Children's Privacy",
    body: `The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such data, please contact us and we will delete it promptly.`,
  },
  {
    num: "9",
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy periodically. Material changes will be communicated via email or an in-app notice at least 14 days before taking effect. The "Last updated" date at the top of this page reflects the most recent revision. Your continued use of the Service constitutes acceptance of the updated policy.`,
  },
  {
    num: "10",
    title: "Contact",
    body: `For privacy-related questions or to submit a data request, contact us at privacy@operon.app. For general legal questions, use legal@operon.app. We aim to respond within 5 business days.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-36">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Legal</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
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
