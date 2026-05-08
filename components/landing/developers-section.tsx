"use client";

import { useState, useEffect, useRef } from "react";

const faqItems = [
  {
    label: "Do I need experience?",
    text: "No. The product is built to help store owners make better decisions even if they are not experts in analytics.",
  },
  {
    label: "Will this guarantee profit?",
    text: "No tool can guarantee profit. What it can do is help you make smarter decisions, reduce waste, and improve how you test and scale.",
  },
  {
    label: "How fast will I see results?",
    text: "You can start getting useful direction as soon as you enter your numbers. Many sellers get value on the first day.",
  },
  {
    label: "How do payments work?",
    text: "Payments are processed securely. You can use major credit and debit cards, and your Pro access starts immediately after payment completes. Cancel anytime.",
  },
];

const features = [
  { 
    title: "Make decisions with less stress", 
    description: "No more staring at numbers and wondering what they mean."
  },
  { 
    title: "Spot the real issue faster", 
    description: "Know whether the problem is poor attention, weak demand, or an offer that is not converting."
  },
  { 
    title: "Take specific next steps", 
    description: "Get practical actions you can actually use in your next test."
  },
  { 
    title: "Stay focused on what can win", 
    description: "Spend less energy on weak setups and more on the ones worth pushing."
  },
];

const codeAnimationStyles = `
  .dev-code-line {
    opacity: 0;
    transform: translateX(-8px);
    animation: devLineReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  
  @keyframes devLineReveal {
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .dev-code-char {
    opacity: 0;
    filter: blur(8px);
    animation: devCharReveal 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  
  @keyframes devCharReveal {
    to {
      opacity: 1;
      filter: blur(0);
    }
  }
`;

export function DevelopersSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="developers" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: codeAnimationStyles }} />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Left: Content */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              FAQ
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Common questions.
              <br />
              <span className="text-muted-foreground">Straight answers.</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              If you are wondering whether this is right for your store, start here. The goal is simple: clearer decisions and less wasted money.
            </p>
            
            {/* Features */}
            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 50 + 200}ms` }}
                >
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right: FAQ block */}
          <div
            className={`lg:sticky lg:top-32 transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="border border-foreground/10">
              {/* Tabs */}
              <div className="flex items-center border-b border-foreground/10">
                {faqItems.map((example, idx) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-6 py-4 text-sm font-mono transition-colors relative ${
                      activeTab === idx
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {example.label}
                    {activeTab === idx && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Content */}
              <div className="p-8 bg-foreground/[0.01] min-h-[220px]">
                <div className="text-2xl font-display tracking-tight mb-4">
                  {faqItems[activeTab].label}
                </div>
                <p className="text-foreground/80 leading-relaxed">
                  {faqItems[activeTab].text}
                </p>
              </div>
            </div>
            
            {/* Links */}
            <div className="mt-6 flex items-center gap-6 text-sm">
              <a href="/register" className="text-foreground hover:underline underline-offset-4">
                Start free
              </a>
              <span className="text-foreground/20">|</span>
              <a href="/login" className="text-muted-foreground hover:text-foreground">
                Log in
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
