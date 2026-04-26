export type MarketingPage = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
};

export const marketingPages: MarketingPage[] = [
  {
    slug: "features",
    label: "Features",
    eyebrow: "Product",
    title: "Features built around better decisions.",
    intro:
      "Every part of Operon is designed to help small e-commerce sellers stop wasting money and move faster with more confidence.",
    sections: [
      {
        title: "Clear calls instead of confusion",
        body:
          "You do not need to stare at numbers and wonder what they mean. You get a direct answer on whether to push harder, fix the setup, keep testing, or shut it down.",
      },
      {
        title: "Faster action on weak campaigns",
        body:
          "The sooner you spot a weak product or ad, the less money it burns. Operon helps you react earlier and waste less budget.",
      },
      {
        title: "Specific next steps",
        body:
          "The goal is not more information. The goal is knowing exactly what to do next so your next test is smarter than the last one.",
      },
    ],
    highlights: [
      "Clear decision guidance",
      "Faster ad reviews",
      "Practical next actions",
      "Less wasted testing",
    ],
    ctaLabel: "Start Your Trial",
    ctaHref: "/register",
  },
  {
    slug: "how-it-works",
    label: "How it works",
    eyebrow: "Product",
    title: "A simple flow from numbers to action.",
    intro:
      "You enter your results, Operon reviews them, and you get a clear next step. No clutter, no long reports, no guesswork.",
    sections: [
      {
        title: "1. Enter your numbers",
        body:
          "Add your latest product and ad results in a few minutes. This gives you a fast picture of what is happening right now.",
      },
      {
        title: "2. Get a clear diagnosis",
        body:
          "Operon reviews the signals and identifies the biggest issue behind weak performance so you stop making random changes.",
      },
      {
        title: "3. Take the next action",
        body:
          "You get a practical answer on what to scale, what to fix, what to test again, and what to stop before more money disappears.",
      },
    ],
    highlights: [
      "Fast setup",
      "Simple review flow",
      "Clear actions",
      "Less confusion",
    ],
    ctaLabel: "See Pricing",
    ctaHref: "/pricing",
  },
  {
    slug: "pricing",
    label: "Pricing",
    eyebrow: "Product",
    title: "Simple pricing for sellers who want clarity.",
    intro:
      "Choose the plan that fits your current stage, start quickly, and upgrade when your store grows.",
    sections: [
      {
        title: "Starter — $19/month",
        body:
          "A simple way to get basic decision insights with manual data input. Best for sellers who want clear direction without overcomplicating their workflow.",
      },
      {
        title: "Pro — $49/month",
        body:
          "Full recommendations, deeper performance analysis, and history tracking for store owners who need stronger guidance every week.",
      },
      {
        title: "Scale — $99/month",
        body:
          "Built for growing operators managing more than one store and needing broader visibility, stronger insights, and faster support.",
      },
    ],
    highlights: [
      "Starter: $19/month",
      "Pro: $49/month",
      "Scale: $99/month",
      "Upgrade anytime",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/register",
  },
  {
    slug: "payments",
    label: "Payments",
    eyebrow: "Product",
    title: "Simple, trusted payments with instant access.",
    intro:
      "Pay through YooKassa using bank cards and local payment methods. Checkout is safe, familiar, and easy to complete.",
    sections: [
      {
        title: "Familiar ways to pay",
        body:
          "Customers can use bank cards and local payment methods, which makes checkout feel straightforward and trusted.",
      },
      {
        title: "Safe and secure checkout",
        body:
          "Payment should not feel risky or confusing. The process is built to feel smooth, reliable, and easy to complete.",
      },
      {
        title: "Instant access after payment",
        body:
          "As soon as the payment goes through, access starts right away so there is no delay between checkout and getting to work.",
      },
    ],
    highlights: [
      "YooKassa checkout",
      "Bank cards supported",
      "Local payment methods",
      "Instant access",
    ],
    ctaLabel: "Subscribe Now",
    ctaHref: "/register",
  },
  {
    slug: "faq",
    label: "FAQ",
    eyebrow: "Support",
    title: "Straight answers before you start.",
    intro:
      "If you are considering Operon for your store, these are the questions that matter most.",
    sections: [
      {
        title: "Do I need experience?",
        body:
          "No. Operon is built to help store owners make better calls even if they are not experts in analytics or performance marketing.",
      },
      {
        title: "Will this guarantee profit?",
        body:
          "No tool can guarantee profit. What Operon does is help you make smarter decisions, reduce waste, and improve how you test and scale.",
      },
      {
        title: "How fast will I see results?",
        body:
          "Many sellers get useful direction on the first day because the value comes from faster decisions, not from waiting weeks for setup.",
      },
      {
        title: "How do payments work?",
        body:
          "Payments go through YooKassa. You can pay with bank cards and local payment methods, and access starts right after payment is completed.",
      },
    ],
    highlights: [
      "No experience required",
      "Faster clarity",
      "Simple payments",
      "Quick start",
    ],
    ctaLabel: "Create Account",
    ctaHref: "/register",
  },
  {
    slug: "contact",
    label: "Contact",
    eyebrow: "Support",
    title: "Talk to us about your store and your goals.",
    intro:
      "If you want help choosing a plan or understanding whether Operon is a fit, we are here to help.",
    sections: [
      {
        title: "For new sellers",
        body:
          "If you are just getting started, we can help you understand which plan makes the most sense for your current stage.",
      },
      {
        title: "For growing operators",
        body:
          "If you are managing more products, more campaigns, or more than one store, we can point you toward the best setup.",
      },
      {
        title: "For agencies and teams",
        body:
          "If you support multiple clients or brands, Operon can help your team move faster with clearer direction across accounts.",
      },
    ],
    highlights: [
      "Plan guidance",
      "Fast answers",
      "Support for teams",
      "Practical next steps",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/register",
  },
  {
    slug: "shopify-sellers",
    label: "Shopify sellers",
    eyebrow: "Market",
    title: "Built for Shopify sellers who need faster decisions.",
    intro:
      "When you are running a Shopify store, slow decisions cost money. Operon helps you review products and ads with more clarity and less wasted spend.",
    sections: [
      {
        title: "Review products faster",
        body:
          "See when a product deserves more budget, when it needs a better angle, and when it should be dropped before it drains more cash.",
      },
      {
        title: "Fix weak ads sooner",
        body:
          "Weak creatives can eat through your budget quickly. Operon helps you spot those weak points earlier.",
      },
      {
        title: "Keep testing with more confidence",
        body:
          "Instead of making changes based on emotion, you get practical direction based on how the product is really performing.",
      },
    ],
    highlights: [
      "Faster product reviews",
      "Less wasted ad spend",
      "Better test decisions",
      "Clear direction",
    ],
    ctaLabel: "Start Your Trial",
    ctaHref: "/register",
  },
  {
    slug: "dtc-brands",
    label: "DTC brands",
    eyebrow: "Market",
    title: "Clearer decisions for growing DTC brands.",
    intro:
      "As a DTC brand grows, weak choices become more expensive. Operon helps you make cleaner calls across products, offers, and campaigns.",
    sections: [
      {
        title: "Protect your budget",
        body:
          "Growth is hard when money keeps leaking into setups that should have been changed or stopped earlier.",
      },
      {
        title: "Move the team faster",
        body:
          "Everyone benefits when the next move is obvious. Operon makes it easier to align on what should happen next.",
      },
      {
        title: "Improve testing discipline",
        body:
          "Better decisions come from better review habits. Operon helps your brand stay focused instead of reacting randomly.",
      },
    ],
    highlights: [
      "Cleaner growth decisions",
      "Better team alignment",
      "More focused testing",
      "Stronger budget control",
    ],
    ctaLabel: "Choose a Plan",
    ctaHref: "/pricing",
  },
  {
    slug: "dropshipping-stores",
    label: "Dropshipping stores",
    eyebrow: "Market",
    title: "A better decision flow for dropshipping stores.",
    intro:
      "When you are testing quickly, bad decisions stack up fast. Operon helps you find what deserves another chance and what should be cut early.",
    sections: [
      {
        title: "Stop weak tests earlier",
        body:
          "Dropshipping often moves fast, which makes it easy to keep poor performers live for too long. Operon helps you act sooner.",
      },
      {
        title: "Know what to change",
        body:
          "Not every bad result means the same thing. Sometimes the ad is weak, sometimes the offer is off, and sometimes the product is the real problem.",
      },
      {
        title: "Protect your next test budget",
        body:
          "The goal is not just to stop losing. It is to move your money toward stronger tests and better opportunities.",
      },
    ],
    highlights: [
      "Faster test reviews",
      "Clearer product calls",
      "Less wasted spend",
      "Better next steps",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/register",
  },
  {
    slug: "agencies",
    label: "Agencies",
    eyebrow: "Market",
    title: "Help your agency make clearer calls across accounts.",
    intro:
      "When your team is reviewing multiple products and campaigns, clear direction matters even more. Operon helps agencies move faster without losing focus.",
    sections: [
      {
        title: "Review more accounts with less friction",
        body:
          "Your team should not waste hours debating the same weak signals. Operon helps make the next move easier to spot.",
      },
      {
        title: "Give clients clearer answers",
        body:
          "Clients want to know what should change now, not what another dashboard means. Operon helps your agency communicate with more confidence.",
      },
      {
        title: "Stay focused on what matters",
        body:
          "The more accounts you manage, the more important it is to separate winning opportunities from weak tests quickly.",
      },
    ],
    highlights: [
      "Faster account reviews",
      "Stronger client communication",
      "More focused execution",
      "Better team clarity",
    ],
    ctaLabel: "Talk to Us",
    ctaHref: "/contact",
  },
  {
    slug: "why-it-works",
    label: "Why it works",
    eyebrow: "Trust",
    title: "Why sellers trust the direction Operon gives.",
    intro:
      "The value is not in showing more numbers. The value is in making those numbers easier to act on with confidence.",
    sections: [
      {
        title: "The advice stays short and practical",
        body:
          "Sellers do not need long reports when money is being spent every day. Operon keeps the output direct and useful.",
      },
      {
        title: "It focuses on action, not noise",
        body:
          "The point is to reduce hesitation and help you move faster when the data is already telling you something important.",
      },
      {
        title: "It helps you build better review habits",
        body:
          "Better results often come from making cleaner decisions consistently. Operon helps create that consistency.",
      },
    ],
    highlights: [
      "Short, practical guidance",
      "Less hesitation",
      "Cleaner decisions",
      "Better review habits",
    ],
    ctaLabel: "Start Your Trial",
    ctaHref: "/register",
  },
  {
    slug: "clear-guidance",
    label: "Clear guidance",
    eyebrow: "Trust",
    title: "Clear guidance when your numbers feel messy.",
    intro:
      "Weak performance often creates confusion before it creates action. Operon helps turn mixed signals into a practical next step.",
    sections: [
      {
        title: "Know what matters first",
        body:
          "You should not have to guess which metric deserves attention right now. Operon helps surface the issue that matters most.",
      },
      {
        title: "Avoid random changes",
        body:
          "Changing too many things at once is expensive. Clear guidance helps you test with more discipline and better focus.",
      },
      {
        title: "Act with more confidence",
        body:
          "The best decisions are often the ones you can make quickly because the path forward is obvious.",
      },
    ],
    highlights: [
      "Less confusion",
      "Better focus",
      "More confident action",
      "Cleaner testing",
    ],
    ctaLabel: "See How It Works",
    ctaHref: "/how-it-works",
  },
  {
    slug: "safe-checkout",
    label: "Safe checkout",
    eyebrow: "Trust",
    title: "A checkout flow that feels simple and trustworthy.",
    intro:
      "When someone is ready to pay, the process should feel clear, safe, and easy to finish. That is the standard we follow.",
    sections: [
      {
        title: "Easy to understand",
        body:
          "Confusing payment steps reduce confidence. A simple checkout keeps the experience smooth from start to finish.",
      },
      {
        title: "Built for trust",
        body:
          "People are more likely to complete payment when the process feels familiar, reliable, and professionally handled.",
      },
      {
        title: "Quick access after payment",
        body:
          "Once payment is complete, the user should be able to continue immediately without friction or delay.",
      },
    ],
    highlights: [
      "Trusted checkout",
      "Simple payment flow",
      "Fast completion",
      "Instant access",
    ],
    ctaLabel: "View Payments",
    ctaHref: "/payments",
  },
];

export const marketingPagesBySlug = Object.fromEntries(
  marketingPages.map((page) => [page.slug, page]),
) as Record<string, MarketingPage>;
