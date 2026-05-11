"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, MessageSquare, Send } from "lucide-react";
import { AnimatedSphere } from "./animated-sphere";

const words = ["find", "score", "reply", "track"];

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Animated sphere background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[800px] lg:h-[800px] opacity-40 pointer-events-none">
        <AnimatedSphere />
      </div>
      
      {/* Subtle grid lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-32 lg:py-40">
        {/* Eyebrow */}
        <div 
          className={`mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
            <span className="w-8 h-px bg-foreground/30" />
            Reddit customer acquisition on autopilot
          </span>
        </div>
        
        {/* Main headline */}
        <div className="mb-12">
          <h1 
            className={`text-[clamp(3.5rem,10vw,9rem)] font-display leading-[0.92] tracking-tight transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="block">Reddit customers.</span>
            <span className="block">
              On{" "}
              <span className="relative inline-block">
                <span 
                  key={wordIndex}
                  className="inline-flex"
                >
                  {words[wordIndex].split("").map((char, i) => (
                    <span
                      key={`${wordIndex}-${i}`}
                      className="inline-block animate-char-in"
                      style={{
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-foreground/10" />
              </span>
            </span>
          </h1>
        </div>
        
        {/* Description */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-end">
          <p 
            className={`text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
          Operon finds people asking for what you sell, scores every thread, drafts the first reply or DM, and keeps the pipeline moving while you focus on closing.
          </p>
          
          {/* CTAs */}
          <div 
            className={`flex flex-col sm:flex-row items-start gap-4 transition-all duration-700 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Button 
              asChild
              size="lg" 
              className="bg-foreground hover:bg-foreground/90 text-background px-8 h-14 text-base rounded-full group"
            >
              <Link href="/register">
                Start free trial
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
            >
              <Link href="#pipeline">See the workspace</Link>
            </Button>
          </div>
        </div>
        
      </div>
      
      <div
        className={`relative z-10 max-w-[1400px] mx-auto w-full px-6 lg:px-12 -mt-16 pb-24 transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-foreground/10 bg-background/75 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-foreground/10 pb-4">
              <div>
                <div className="font-display text-2xl tracking-tight">Leads</div>
                <div className="text-sm text-muted-foreground">Last scan 27m ago</div>
              </div>
              <div className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Autopilot</div>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 md:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-background">
                {[
                  ["Best Reddit marketing strategies for getting organic traffic?", "93%", "48m"],
                  ["Anyone found a tool that makes team outreach easier?", "91%", "4h"],
                  ["What tool takes LinkedIn outreach off your plate?", "87%", "1d"],
                ].map(([title, score, time], index) => (
                  <div key={title} className={`border-b border-foreground/10 p-4 last:border-0 ${index === 0 ? "bg-foreground/[0.04]" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="line-clamp-2 text-sm font-medium">{title}</div>
                      <div className="shrink-0 text-sm font-semibold text-emerald-600">{score}</div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Queued</span>
                      <span>{time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-background p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-display text-2xl tracking-tight">High-intent Reddit thread</h3>
                  <span className="text-sm font-semibold text-emerald-600">93%</span>
                </div>
                <p className="mt-4 rounded-2xl border border-foreground/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  Why it is relevant: the author is asking how to find serious customer conversations on Reddit and already mentions organic traffic and AI search visibility.
                </p>
                <div className="mt-5 grid gap-3 text-sm">
                  {[
                    "Generate a personal reply from the post context",
                    "Open the original thread when you want to inspect it",
                    "Move contacted leads into the follow-up pipeline",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-muted-foreground">
                      <Check className="size-4 text-foreground" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-foreground/10 bg-background/75 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3 border-b border-foreground/10 pb-4">
              <MessageSquare className="size-5" />
              <div>
                <div className="text-sm font-semibold">Alex</div>
                <div className="text-xs text-muted-foreground">u/alexbuilds · high intent</div>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="ml-auto max-w-[85%] rounded-2xl bg-foreground px-4 py-3 text-sm leading-6 text-background">
                Hey, saw your post about clients paying late. Built a tool that auto-chases unpaid invoices. Want the link?
              </div>
              <div className="max-w-[82%] rounded-2xl border border-foreground/10 bg-muted/40 px-4 py-3 text-sm leading-6">
                wait this is exactly what I need. yes send me
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Send className="size-3" />
                Replied in 4 minutes
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats marquee - full width outside container */}
      <div 
        className={`relative left-0 right-0 pb-16 transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex gap-16 marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16">
              {[
                { value: "Every thread", label: "scored and explained", company: "LEAD DISCOVERY" },
                { value: "35% reply rate", label: "from high-intent outreach", company: "AUTOPILOT" },
                { value: "DMs + comments", label: "one workspace", company: "PIPELINE" },
                { value: "571 businesses", label: "and freelancers joined", company: "OPERON" },
              ].map((stat) => (
                <div key={`${stat.company}-${i}`} className="flex items-baseline gap-4">
                  <span className="text-4xl lg:text-5xl font-display">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                    <span className="block font-mono text-xs mt-1">{stat.company}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Scroll indicator */}
      
    </section>
  );
}
