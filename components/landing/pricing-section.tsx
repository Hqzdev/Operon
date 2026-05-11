import { ArrowRight, Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For solo founders",
    price: { monthly: "14.99" },
    features: [
      "New leads every hour",
      "Autopilot mode",
      "500 AI-written replies, ready to post",
      "Reply and DM without leaving the app",
      "Track 2 products",
      "Instant email and in-app notifications",
    ],
    cta: "Try it free",
    popular: false,
  },
  {
    name: "Pro",
    description: "For growing businesses",
    price: { monthly: "29.99" },
    features: [
      "Everything in Starter",
      "Track 5 products",
      "1,000 AI-written replies/month",
      "REST API access",
      "Priority support",
    ],
    cta: "Try it free",
    popular: true,
  },
  {
    name: "Agency",
    description: "For agencies and teams",
    price: { monthly: "79.99" },
    features: [
      "Everything in Pro",
      "Unlimited products, replies, and scans",
      "Up to 5 team members",
      "Priority 24-hour support",
    ],
    cta: "Try it free",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-32 lg:py-40 border-t border-foreground/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mx-auto max-w-4xl mb-20 text-center">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-6">
            Pricing
          </span>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground mb-6">
            Pick a plan.
            <br />
            <span className="text-stroke">Start in two minutes.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Seven days free. One click to cancel.
          </p>
          <p className="mt-10 text-muted-foreground">Join <span className="font-semibold text-foreground">571</span> businesses and freelancers</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-px bg-foreground/10">
          {plans.map((plan, idx) => (
            <div
              key={plan.name}
              className={`relative p-8 lg:p-12 bg-background ${
                plan.popular ? "md:-my-4 md:py-12 lg:py-16 border-2 border-foreground" : ""
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-8 px-3 py-1 bg-foreground text-primary-foreground text-xs font-mono uppercase tracking-widest">
                  Core plan
                </span>
              )}

              {/* Plan Header */}
              <div className="mb-8">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-3xl text-foreground mt-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8 pb-8 border-b border-foreground/10">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl lg:text-6xl text-foreground">
                    ${plan.price.monthly}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`w-full py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all group ${
                  plan.popular
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="mt-12 text-center text-sm text-muted-foreground">
          14-day money-back guarantee. Cancel in one click.
        </p>
      </div>
    </section>
  );
}
