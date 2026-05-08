"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatedWave } from "./animated-wave";

type FooterLink = {
  name: string;
  href: string;
  badge?: string;
};

const footerLinks: Array<{
  title: string;
  href: string;
  links: FooterLink[];
}> = [
  {
    title: "Product",
    href: "/#features",
    links: [
      { name: "Features", href: "/#features" },
      { name: "How it works", href: "/#how-it-works" },
      { name: "FAQ", href: "/#developers" },
      { name: "Trending ad problems", href: "/trending-ad-problems" },
    ],
  },
  {
    title: "Account",
    href: "/register",
    links: [
      { name: "Create free account", href: "/register" },
      { name: "Log in", href: "/login" },
    ],
  },
  {
    title: "Compare",
    href: "/alternatives/triple-whale",
    links: [
      { name: "vs Triple Whale", href: "/vs/triple-whale" },
      { name: "Triple Whale alternative", href: "/alternatives/triple-whale" },
      { name: "Madgicx alternative", href: "/alternatives/madgicx" },
    ],
  },
  {
    title: "Legal",
    href: "/privacy",
    links: [
      { name: "Privacy policy", href: "/privacy" },
      { name: "Terms of service", href: "/terms" },
    ],
  },
];

const socialLinks: Array<{ name: string; href: string }> = [];

export function FooterSection() {
  return (
    <footer className="relative border-t border-foreground/10">
      {/* Animated wave background */}
      <div className="absolute inset-0 h-64 opacity-20 pointer-events-none overflow-hidden">
        <AnimatedWave />
      </div>
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Main Footer */}
        <div className="py-16 lg:py-24">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <Link href="/" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display">Operon</span>
                <span className="text-xs text-muted-foreground font-mono">TM</span>
              </Link>

              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs">
                Clear direction for e-commerce sellers who want to stop wasting money on weak ads and uncertain decisions.
              </p>

              {socialLinks.length > 0 && (
                <div className="flex gap-6">
                  {socialLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                    >
                      {link.name}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Link Columns */}
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-medium mb-6">
                  <Link href={group.href} className="hover:text-muted-foreground transition-colors">
                    {group.title}
                  </Link>
                </h3>
                <ul className="space-y-4">
                  {group.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                      >
                        {link.name}
                        {"badge" in link && link.badge && (
                          <span className="text-xs px-2 py-0.5 bg-foreground text-background rounded-full">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            2026 Operon. All rights reserved.
          </p>

          <div className="text-sm text-muted-foreground">
            Clear decisions for sellers who want better results.
          </div>
        </div>
      </div>
    </footer>
  );
}
