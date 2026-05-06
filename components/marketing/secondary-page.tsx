import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MarketingPage } from "@/lib/marketing-pages";

export function SecondaryPage({ page }: { page: MarketingPage }) {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <Navigation />

      <section className="relative overflow-hidden pt-32 lg:pt-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(20,20,20,0.08),transparent_28%),radial-gradient(circle_at_left,rgba(20,20,20,0.05),transparent_25%)]" />
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="max-w-4xl py-20">
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
              <span className="h-px w-8 bg-foreground/30" />
              {page.eyebrow}
            </span>
            <h1 className="mt-8 font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.92] tracking-tight">
              {page.title}
            </h1>
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
              {page.intro}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-14 rounded-full px-8 text-base">
                <Link href={page.ctaHref}>
                  {page.ctaLabel}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-foreground/20 px-8 text-base"
              >
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="grid gap-px bg-foreground/10 md:grid-cols-2 xl:grid-cols-4">
            {page.highlights.map((item) => (
              <div key={item} className="bg-background p-8">
                <div className="font-display text-3xl tracking-tight">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="mb-16 max-w-3xl">
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
              <span className="h-px w-8 bg-foreground/30" />
              {page.label}
            </span>
            <h2 className="mt-6 font-display text-4xl tracking-tight lg:text-6xl">
              Built to keep your next move clear.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {page.sections.map((section) => (
              <Card key={section.title} className="border-foreground/10 bg-card/70 py-0">
                <CardContent className="px-6 py-8">
                  <h3 className="font-display text-3xl tracking-tight">{section.title}</h3>
                  <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="rounded-[32px] border border-foreground px-8 py-16 lg:px-16 lg:py-20">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
                <span className="h-px w-8 bg-foreground/30" />
                Next step
              </span>
              <h2 className="mt-6 font-display text-4xl tracking-tight lg:text-6xl">
                Stop wasting time on unclear decisions.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                If you want clearer direction on what to scale, what to fix, and what to stop,
                Operon is built for that job.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-14 rounded-full px-8 text-base">
                  <Link href={page.ctaHref}>
                    {page.ctaLabel}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
