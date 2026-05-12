"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bell, Check, Inbox, MessageSquare, Package, Send, Shield, SlidersHorizontal } from "lucide-react";

const pipelineTabs = ["Find customers", "Reply from your inbox", "Alerts", "API"];

const comparisons = [
  ["Operon vs Mention", "For teams who want Reddit customers, not a broad social listening dashboard."],
  ["Operon vs Awario", "Compare Reddit-native outreach workflows against broad keyword monitoring."],
  ["Operon vs Brandwatch", "For teams who need revenue from Reddit, not an enterprise research stack."],
  ["Operon vs Sprout Social", "Compare Reddit outreach against a broader social media management stack."],
  ["Operon vs Redreach", "Compare reply quality, autopilot workflow, and total cost."],
  ["Operon vs F5Bot", "See the difference between free alerts and a full Reddit outreach pipeline."],
];

const faq = [
  ["How does this work?", "Add your product URL or description. Operon scans relevant subreddits, scores posts by buying intent and fit, then drafts replies or DMs from the actual thread context."],
  ["What kind of businesses does this work for?", "It works best for products where customers describe problems in public: SaaS, services, agencies, templates, tools, marketplaces, and e-commerce niches with active Reddit communities."],
  ["How do you decide which posts are relevant?", "Each post is scored by keyword fit, problem language, subreddit context, recency, and engagement. You see the score and the reason before replying."],
  ["Can I change my niche or keywords later?", "Yes. Update your product description, niche, keywords, and reply style any time. New scans use the latest context."],
  ["How quickly will I see my first customers?", "Most workspaces can surface sample leads within minutes. Quality depends on the niche, subreddit activity, and how specific your product context is."],
  ["What if the results are not relevant?", "Tighten your keywords, exclude weak subreddits, or lower automation. The workflow is built so you can review leads manually before anything goes out."],
];

function FindCustomersContent() {
  return (
    <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-foreground/10 px-5 py-4">
        <div>
          <div className="font-display text-2xl tracking-tight">Leads</div>
          <div className="text-sm text-muted-foreground">Sort by quality, recency, or engagement.</div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <button className="rounded-full border border-foreground/10 px-4 py-2 text-sm text-muted-foreground">Quality</button>
          <button className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="size-4" />
            Options
          </button>
        </div>
      </div>

      <div className="grid min-h-[560px] lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-foreground/10 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 border-b border-foreground/10 text-sm">
            <div className="border-b-2 border-foreground px-5 py-4 font-semibold">New <span className="text-muted-foreground">184</span></div>
            <div className="px-5 py-4 text-muted-foreground">Contacted</div>
          </div>
          {[
            ["Best Reddit marketing strategies for getting organic traffic?", "93%", "48m", "Queued"],
            ["Anyone found a tool that finally makes team outreach easier?", "93%", "4h", "Contacted"],
            ["I burned $120k on SDRs before realizing outbound was broken", "93%", "9h", "Interested"],
            ["What tool actually takes LinkedIn outreach off your plate?", "93%", "1d", "Queued"],
            ["App founder here, completely lost on marketing", "93%", "2d", "Queued"],
            ["Claude Cowork vs Manus for local business outreach", "85%", "1h", "Contacted"],
          ].map(([title, score, time, status], index) => (
            <div key={title} className={`border-b border-foreground/10 px-5 py-4 ${index === 0 ? "bg-foreground/[0.04]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="line-clamp-2 text-sm font-medium">{title}</div>
                <div className="shrink-0 text-sm font-semibold text-emerald-600">{score}</div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5">{status}</span>
                <span>{time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-foreground/10 pb-6">
            <div>
              <h3 className="max-w-3xl font-display text-3xl tracking-tight">
                Best Reddit marketing strategies for getting organic traffic?
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>r/seogrowth</span>
                <span>2 upvotes</span>
                <span>7 comments</span>
                <span>48m ago</span>
                <span>u/gradstudentmt</span>
              </div>
            </div>
            <div className="text-lg font-semibold text-emerald-600">93%</div>
          </div>

          <div className="mt-6 rounded-2xl border border-foreground/10 bg-muted/30 p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Why it is relevant</div>
            <p className="text-base leading-7">
              The user wants to use Reddit for customer acquisition and lead generation but lacks the tools to identify serious threads efficiently.
            </p>
          </div>

          <div className="mt-6 space-y-5 text-base leading-8 text-muted-foreground">
            <p>Y&apos;all SEO is slow and ads are expensive nowadays.</p>
            <p>I saw people talking about Reddit threads showing up in Google and AI search results.</p>
            <p>
              But I have no idea what the best Reddit marketing strategies actually are, like{" "}
              <mark className="rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                how do you find high-intent threads?
              </mark>{" "}
              Especially when is it okay to mention your business?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyInboxContent() {
  return (
    <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-foreground/10 px-5 py-4">
        <div>
          <div className="font-display text-2xl tracking-tight">Inbox</div>
          <div className="text-sm text-muted-foreground">AI-drafted replies ready to post.</div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            12 drafts ready
          </span>
        </div>
      </div>

      <div className="grid min-h-[560px] lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-foreground/10 lg:border-b-0 lg:border-r">
          {[
            ["How do I find customers on Reddit without being banned?", "r/startups", "2m", true],
            ["Anyone using Reddit for B2B lead gen?", "r/SaaS", "14m", true],
            ["Best tools for Reddit outreach in 2025?", "r/Entrepreneur", "1h", false],
            ["Reddit DMs for cold outreach — worth it?", "r/sales", "3h", false],
            ["How to mention your product naturally on Reddit", "r/marketing", "5h", false],
          ].map(([title, sub, time, active], index) => (
            <div key={title as string} className={`border-b border-foreground/10 px-5 py-4 ${index === 0 ? "bg-foreground/[0.04]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="line-clamp-2 text-sm font-medium">{title as string}</div>
                {(active as boolean) && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{sub as string}</span>
                <span>{time as string}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 lg:p-8">
          <div className="border-b border-foreground/10 pb-6">
            <h3 className="font-display text-2xl tracking-tight">How do I find customers on Reddit without being banned?</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>r/startups</span>
              <span>·</span>
              <span>u/jennybuilds_</span>
              <span>·</span>
              <span>2m ago</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-foreground/10 bg-muted/30 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Draft</div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">ready to post</span>
            </div>
            <p className="text-base leading-7">
              The key is to add value before mentioning anything. Find threads where people are already asking for exactly what you offer, then reply with a genuinely helpful answer. If your product solves the problem, one natural sentence at the end feels like a recommendation, not spam. Tools like Operon can surface those threads automatically so you are only showing up where you actually belong.
            </p>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="flex-1 rounded-full border border-foreground/20 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">
              Regenerate
            </button>
            <button className="flex-1 rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
              Post reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertsContent() {
  return (
    <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-foreground/10 px-5 py-4">
        <div>
          <div className="font-display text-2xl tracking-tight">Alerts</div>
          <div className="text-sm text-muted-foreground">Instant notifications for high-intent posts.</div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Bell className="mr-1 inline size-3" />
            3 new
          </span>
        </div>
      </div>

      <div className="min-h-[560px] divide-y divide-foreground/10 p-0">
        {[
          {
            title: "High-intent post in r/SaaS",
            body: "Someone asked: \"Is there a tool that finds Reddit leads automatically?\" — 91% match",
            time: "just now",
            badge: "91% match",
            badgeColor: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
            new: true,
          },
          {
            title: "Autopilot scan complete",
            body: "Found 14 new leads across r/Entrepreneur, r/startups, r/SaaS. 6 are above 80%.",
            time: "4m ago",
            badge: "14 leads",
            badgeColor: "text-muted-foreground bg-muted",
            new: true,
          },
          {
            title: "Reply sent via extension",
            body: "Your drafted reply was posted to r/marketing — u/devfounder_ asked about outreach tools.",
            time: "22m ago",
            badge: "Sent",
            badgeColor: "text-muted-foreground bg-muted",
            new: true,
          },
          {
            title: "Weekly digest ready",
            body: "67 leads found this week. 18 replied. 4 marked Interested. Top subreddit: r/Entrepreneur.",
            time: "2h ago",
            badge: "Digest",
            badgeColor: "text-muted-foreground bg-muted",
            new: false,
          },
          {
            title: "New subreddit added to scan",
            body: "r/indiehackers is now included in your autopilot scan based on your product niche.",
            time: "1d ago",
            badge: "Autopilot",
            badgeColor: "text-muted-foreground bg-muted",
            new: false,
          },
        ].map((alert) => (
          <div key={alert.title} className={`flex gap-4 px-5 py-5 ${alert.new ? "bg-foreground/[0.02]" : ""}`}>
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bell className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium">{alert.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${alert.badgeColor}`}>{alert.badge}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground leading-5">{alert.body}</p>
              <span className="mt-1.5 block text-xs text-muted-foreground/60">{alert.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiContent() {
  return (
    <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-foreground/10 px-5 py-4">
        <div>
          <div className="font-display text-2xl tracking-tight">REST API</div>
          <div className="text-sm text-muted-foreground">Pull leads into your own stack.</div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full border border-foreground/10 px-3 py-1.5 text-xs font-mono text-muted-foreground">v1</span>
        </div>
      </div>

      <div className="grid min-h-[560px] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-foreground/10 lg:border-b-0 lg:border-r">
          <div className="border-b border-foreground/10 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Endpoints</div>
          {[
            ["GET", "/v1/leads", "Fetch scored leads"],
            ["POST", "/v1/leads/scan", "Trigger a scan"],
            ["GET", "/v1/leads/:id", "Lead detail"],
            ["POST", "/v1/replies/generate", "Draft a reply"],
            ["GET", "/v1/settings", "Workspace config"],
          ].map(([method, path, desc]) => (
            <div key={path as string} className={`border-b border-foreground/10 px-5 py-4 ${path === "/v1/leads" ? "bg-foreground/[0.04]" : ""}`}>
              <div className="flex items-center gap-3">
                <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${method === "GET" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}>
                  {method as string}
                </span>
                <span className="font-mono text-sm">{path as string}</span>
              </div>
              <div className="mt-1 pl-12 text-xs text-muted-foreground">{desc as string}</div>
            </div>
          ))}
        </div>

        <div className="p-6 lg:p-8">
          <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Example request</div>
          <div className="rounded-2xl bg-[#0d1117] p-5 text-sm font-mono leading-6 text-[#c9d1d9]">
            <div className="mb-3 text-[#8b949e]"># Fetch your top leads</div>
            <div>
              <span className="text-[#79c0ff]">curl</span>
              {" "}https://api.operons.vercel.app/v1/leads \
            </div>
            <div className="pl-4">
              <span className="text-[#79c0ff]">-H</span> <span className="text-[#a5d6ff]">&quot;Authorization: Bearer YOUR_KEY&quot;</span> \
            </div>
            <div className="pl-4">
              <span className="text-[#79c0ff]">-G</span> \
            </div>
            <div className="pl-4">
              <span className="text-[#79c0ff]">-d</span> <span className="text-[#a5d6ff]">&quot;min_score=80&limit=20&quot;</span>
            </div>
          </div>

          <div className="mt-5 mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Response</div>
          <div className="rounded-2xl bg-[#0d1117] p-5 text-sm font-mono leading-6 text-[#c9d1d9]">
            <div><span className="text-[#8b949e">{"{"}</span></div>
            <div className="pl-4"><span className="text-[#79c0ff]">&quot;leads&quot;</span>: [{"{"}</div>
            <div className="pl-8"><span className="text-[#79c0ff]">&quot;id&quot;</span>: <span className="text-[#a5d6ff]">&quot;lr_01hx…&quot;</span>,</div>
            <div className="pl-8"><span className="text-[#79c0ff]">&quot;score&quot;</span>: <span className="text-emerald-400">93</span>,</div>
            <div className="pl-8"><span className="text-[#79c0ff]">&quot;subreddit&quot;</span>: <span className="text-[#a5d6ff]">&quot;r/SaaS&quot;</span>,</div>
            <div className="pl-8"><span className="text-[#79c0ff]">&quot;status&quot;</span>: <span className="text-[#a5d6ff]">&quot;queued&quot;</span></div>
            <div className="pl-4">{"}"}]</div>
            <div>{"}"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PipelineSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="pipeline" className="relative border-t border-foreground/10 py-28 lg:py-36">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <h2 className="font-display text-5xl tracking-tight md:text-6xl lg:text-7xl">
            Your whole pipeline.
            <br />
            One workspace.
          </h2>
          <div className="mt-10 inline-flex flex-wrap justify-center gap-2 rounded-full border border-foreground/10 bg-muted/40 p-2">
            {pipelineTabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={`rounded-full px-5 py-2 text-sm transition-colors ${index === activeTab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <p className="mt-8 text-lg text-muted-foreground">
            Every thread, scored. Every score, explained.
          </p>
        </div>

        {activeTab === 0 && <FindCustomersContent />}
        {activeTab === 1 && <ReplyInboxContent />}
        {activeTab === 2 && <AlertsContent />}
        {activeTab === 3 && <ApiContent />}
      </div>
    </section>
  );
}

export function ChannelsSection() {
  return (
    <section id="features" className="relative border-t border-foreground/10 bg-muted/30 py-28 lg:py-36">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <h2 className="font-display text-5xl tracking-tight md:text-6xl lg:text-7xl">
            Two channels.
            <br />
            Both on autopilot.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Public comments build visibility. Private DMs close deals. Both run from the same product context.
          </p>
        </div>

        <div className="space-y-8">
          <div className="grid gap-8 rounded-3xl border border-foreground/10 bg-background p-6 shadow-sm lg:grid-cols-2 lg:p-10">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-muted px-4 py-2 text-sm">
                <Send className="size-4" />
                Outbound <span className="rounded-full bg-background px-2 py-0.5 text-xs">Primary channel</span>
              </div>
              <h3 className="font-display text-4xl tracking-tight">DMs that start conversations.</h3>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                We message the person who posted the question. A DM skips the public thread and feels like a founder, not a broadcast.
              </p>
              <ul className="mt-8 space-y-4 text-muted-foreground">
                {[
                  "Sent through the browser extension while you sleep",
                  "Targets people already asking for the thing you sell",
                  "Each message is drafted from the post content",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-5">
              <div className="mb-5 flex items-center justify-between border-b border-foreground/10 pb-4 text-sm">
                <span>u/startup_founder · posted in r/SaaS</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Online</span>
              </div>
              <div className="space-y-4">
                <div className="ml-auto max-w-[86%] rounded-2xl bg-foreground px-4 py-3 text-sm leading-6 text-background">
                  hey saw your post about finding customers on Reddit, built something for this actually. want me to send you a link?
                </div>
                <div className="max-w-[86%] rounded-2xl bg-background px-4 py-3 text-sm leading-6">
                  wait really? I&apos;ve been doing this manually for months. yeah send it
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 rounded-3xl border border-foreground/10 bg-background p-6 shadow-sm lg:grid-cols-2 lg:p-10">
            <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-5">
              <div className="mb-4 text-sm text-muted-foreground">r/SaaS · u/startup_founder · 2h</div>
              <h4 className="text-xl font-semibold">Anyone knows a tool to find customers on Reddit?</h4>
              <div className="mt-5 border-t border-foreground/10 pt-5">
                <div className="flex gap-4">
                  <div className="text-center text-sm font-semibold">
                    <div>42</div>
                    <div className="text-muted-foreground">votes</div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Went through the same thing last year. Ended up trying Operon after someone here recommended it.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-muted px-4 py-2 text-sm">
                <MessageSquare className="size-4" />
                Inbound
              </div>
              <h3 className="font-display text-4xl tracking-tight">Comments that build authority.</h3>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Helpful replies go where people ask for what you sell. Visibility now, SEO and AI-search equity later.
              </p>
              <ul className="mt-8 space-y-4 text-muted-foreground">
                {[
                  "Helpful comments posted on high-intent threads",
                  "Reddit threads can rank on Google and appear in AI answers",
                  "Every reply is drafted from your product context",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="relative border-t border-foreground/10 py-28 lg:py-36">
      <div className="mx-auto max-w-5xl px-6 lg:px-12">
        <div className="mb-14 text-center">
          <h2 className="font-display text-5xl tracking-tight md:text-6xl">Questions.</h2>
          <div className="mt-8 inline-flex flex-wrap justify-center gap-2 rounded-full border border-foreground/10 bg-muted/40 p-2">
            {[
              ["Product", Package],
              ["Safety", Shield],
              ["Billing", Inbox],
            ].map(([label, Icon]) => {
              const TypedIcon = Icon as typeof Package;
              return (
                <span key={label as string} className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm first:shadow-sm">
                  <TypedIcon className="size-4" />
                  {label as string}
                </span>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-foreground/10 border-y border-foreground/10">
          {faq.map(([question, answer]) => (
            <details key={question} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl font-medium">
                {question}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ComparisonSection() {
  return (
    <section id="compare" className="relative border-t border-foreground/10 bg-muted/30 py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl tracking-tight md:text-5xl">Coming from somewhere else?</h2>
          <p className="mt-4 text-lg text-muted-foreground">Pick the comparison that fits.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {comparisons.map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-foreground/10 bg-background p-8 transition-colors hover:border-foreground/30">
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-4 min-h-14 text-muted-foreground">{description}</p>
              <Link href="/alternatives/madgicx" className="mt-8 inline-flex items-center gap-2 text-sm font-medium">
                Read comparison
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="relative border-t border-foreground/10 py-28 lg:py-36">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-12">
        <h2 className="font-display text-5xl tracking-tight md:text-6xl">Put it on Autopilot.</h2>
        <p className="mt-5 text-lg text-muted-foreground">Enter your URL. See customers in two minutes. Let it run.</p>
        <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <input
            className="h-14 flex-1 rounded-full border border-foreground/20 bg-background px-6 text-base outline-none transition-colors focus:border-foreground"
            placeholder="yourproduct.com"
          />
          <Link
            href="/register"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Find customers
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Free for seven days. Cancel anytime.</p>
      </div>
    </section>
  );
}
