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
    slug: "product",
    label: "Product",
    eyebrow: "Product",
    title: "The product layer for clearer seller decisions.",
    intro:
      "Operon brings the key parts of e-commerce decision-making into one simple flow: review the numbers, understand the issue, and choose the next move.",
    sections: [
      {
        title: "Features that point to action",
        body:
          "The product is designed around practical recommendations, not dashboards that leave you guessing what to do next.",
      },
      {
        title: "A workflow sellers can repeat",
        body:
          "Use the same clear review process for products, ads, offers, and tests so your decisions become faster and more consistent.",
      },
      {
        title: "Free and ready to use",
        body:
          "No subscription required. Create your account and access all features immediately.",
      },
    ],
    highlights: [
      "Decision guidance",
      "Simple workflow",
      "Free to use",
      "Fast access",
    ],
    ctaLabel: "Explore Features",
    ctaHref: "/features",
  },
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
    ctaLabel: "Get Started",
    ctaHref: "/register",
  },
  {
    slug: "pricing",
    label: "Pricing",
    eyebrow: "Product",
    title: "Free to start. No subscription required.",
    intro:
      "Operon is available to all sellers. Create your account, connect your store, and start making clearer decisions today.",
    sections: [
      {
        title: "Start immediately",
        body:
          "No setup fee, no subscription. Create your account and start using the analysis workbench right away.",
      },
      {
        title: "All features included",
        body:
          "Every tool — analysis, budget allocation, scenario simulator, and integrations — is available to every user.",
      },
      {
        title: "Built for sellers at every stage",
        body:
          "Whether you are testing your first product or managing multiple ad sets, Operon gives you the same clear guidance.",
      },
    ],
    highlights: [
      "No subscription",
      "All features included",
      "Free to start",
      "No credit card required",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/register",
  },
  {
    slug: "support",
    label: "Support",
    eyebrow: "Support",
    title: "Support for sellers who want clear answers.",
    intro:
      "Find the main answers about Operon, payments, setup, and whether the product fits the way your store works.",
    sections: [
      {
        title: "Quick answers before you start",
        body:
          "The FAQ covers the practical questions sellers usually ask before creating an account or choosing a plan.",
      },
      {
        title: "Help getting started",
        body:
          "If you need help setting up your account or connecting your store, the FAQ covers the most common setup questions.",
      },
      {
        title: "A direct path to contact",
        body:
          "If you have a question about the product or how it fits your store, the contact page gives you a simple next step.",
      },
    ],
    highlights: [
      "FAQ",
      "Setup help",
      "Product guidance",
      "Contact options",
    ],
    ctaLabel: "Read FAQ",
    ctaHref: "/faq",
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
        title: "How do I get started?",
        body:
          "Just create an account. There is no subscription or payment required. You can start using all features immediately after registration.",
      },
    ],
    highlights: [
      "No experience required",
      "Faster clarity",
      "Free to start",
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
      "If you want to understand whether Operon is a fit for your business, we are here to help.",
    sections: [
      {
        title: "For new sellers",
        body:
          "If you are just getting started, we can help you understand how Operon fits your current stage and what to focus on first.",
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
    slug: "market",
    label: "Market",
    eyebrow: "Market",
    title: "Built for the sellers and teams testing growth every day.",
    intro:
      "Operon fits e-commerce operators who need cleaner decisions across products, ads, stores, and client accounts.",
    sections: [
      {
        title: "For Shopify sellers",
        body:
          "Review product and ad performance faster so you can decide what deserves more budget and what needs to change.",
      },
      {
        title: "For DTC brands",
        body:
          "Keep product, offer, and campaign decisions focused as the cost of weak execution gets higher.",
      },
      {
        title: "For stores and agencies",
        body:
          "Dropshipping teams and agencies can use the same decision flow to protect budgets and move accounts forward.",
      },
    ],
    highlights: [
      "Shopify sellers",
      "DTC brands",
      "Dropshipping stores",
      "Agencies",
    ],
    ctaLabel: "View Shopify Page",
    ctaHref: "/shopify-sellers",
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
    ctaLabel: "Get Started",
    ctaHref: "/register",
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
    ctaLabel: "Get Started",
    ctaHref: "/register",
  },
  {
    slug: "trust",
    label: "Trust",
    eyebrow: "Trust",
    title: "A clearer, safer way to make e-commerce decisions.",
    intro:
      "Trust comes from short guidance, practical reasoning, and a checkout flow that feels simple when a seller is ready to start.",
    sections: [
      {
        title: "Why the guidance works",
        body:
          "Operon focuses on turning messy signals into direct next steps, which helps sellers act with less hesitation.",
      },
      {
        title: "Clear advice over noise",
        body:
          "The experience is built to keep attention on the decision that matters most instead of adding more complexity.",
      },
      {
        title: "Simple access experience",
        body:
          "Getting started is straightforward. The account setup is quick and the tools are ready to use immediately.",
      },
    ],
    highlights: [
      "Practical reasoning",
      "Clear guidance",
      "Less confusion",
      "Simple access",
    ],
    ctaLabel: "Why It Works",
    ctaHref: "/why-it-works",
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
    label: "Safe access",
    eyebrow: "Trust",
    title: "A secure, simple way to get started.",
    intro:
      "Getting into Operon should feel easy and trustworthy. Your account and data are handled securely from day one.",
    sections: [
      {
        title: "Easy to get started",
        body:
          "The onboarding flow is clear and quick. You can be up and running in minutes with no complex setup required.",
      },
      {
        title: "Built for trust",
        body:
          "Your store data and analysis history are handled securely, so you can focus on decisions instead of worrying about access.",
      },
      {
        title: "Always available when you need it",
        body:
          "Once your account is active, everything is ready. No delays, no waiting — just the tools you need to make better calls.",
      },
    ],
    highlights: [
      "Secure access",
      "Simple onboarding",
      "Fast setup",
      "Always available",
    ],
    ctaLabel: "Create Account",
    ctaHref: "/register",
  },

  // Feature pages linked from PipelineSection tabs
  {
    slug: "find-customers",
    label: "Find customers",
    eyebrow: "Feature",
    title: "Find customers the moment they ask for what you sell.",
    intro:
      "Operon scans Reddit continuously and surfaces posts where real people describe the exact problem your product solves — scored by intent, explained in plain language.",
    sections: [
      {
        title: "Scored by buying intent",
        body:
          "Every post gets a relevance score based on keyword fit, problem language, subreddit context, recency, and engagement. You see the score and the reason before you do anything.",
      },
      {
        title: "Across every relevant subreddit",
        body:
          "Operon monitors the subreddits where your customers actually talk — not just the obvious ones. New matches surface automatically as fresh posts are scanned.",
      },
      {
        title: "Autopilot or manual review",
        body:
          "Run in autopilot mode to get notified the moment a high-intent post appears, or review the lead queue yourself before anything goes out.",
      },
    ],
    highlights: [
      "Intent-scored leads",
      "Continuous scanning",
      "Subreddit coverage",
      "Autopilot mode",
    ],
    ctaLabel: "Start finding customers",
    ctaHref: "/register",
  },
  {
    slug: "reply-from-inbox",
    label: "Reply from your inbox",
    eyebrow: "Feature",
    title: "Draft replies and DMs without leaving your workspace.",
    intro:
      "When Operon finds a high-intent thread, it drafts a reply or DM from the actual post context — ready to send, edit, or discard in one click from your inbox.",
    sections: [
      {
        title: "Context-aware drafts",
        body:
          "The draft is written from the thread — not a generic template. It references what the poster asked, matches the subreddit tone, and positions your product naturally.",
      },
      {
        title: "One inbox for everything",
        body:
          "New leads, drafted replies, sent messages, and follow-ups all live in one place. No switching between Reddit tabs and spreadsheets.",
      },
      {
        title: "Edit before you send",
        body:
          "Every draft is editable. Review the copy, adjust the angle, and send when you are ready — or skip if the lead is not a fit.",
      },
    ],
    highlights: [
      "Thread-aware copy",
      "One unified inbox",
      "Edit before sending",
      "Reply and DM support",
    ],
    ctaLabel: "Try it free",
    ctaHref: "/register",
  },
  {
    slug: "alerts",
    label: "Alerts",
    eyebrow: "Feature",
    title: "Get notified the moment a customer is asking.",
    intro:
      "Operon watches Reddit in the background and sends you an alert the moment a high-intent post appears — so you can be the first to reply.",
    sections: [
      {
        title: "Real-time lead alerts",
        body:
          "New posts that match your product context trigger an alert immediately. You can respond while the thread is still active and competition is low.",
      },
      {
        title: "Quiet mode by default",
        body:
          "Alerts only fire on posts that clear your confidence and intent threshold. No spam, no low-quality noise — just the leads worth acting on.",
      },
      {
        title: "Digest or instant",
        body:
          "Choose between an hourly digest of new leads or instant notifications for the highest-scoring posts. Switch any time from your settings.",
      },
    ],
    highlights: [
      "Real-time notifications",
      "Confidence threshold filter",
      "Hourly digest option",
      "No noise",
    ],
    ctaLabel: "Set up alerts",
    ctaHref: "/register",
  },
  {
    slug: "api-access",
    label: "API",
    eyebrow: "Feature",
    title: "Pipe Reddit leads directly into your own stack.",
    intro:
      "The Operon REST API gives your team programmatic access to scored leads, drafted replies, and pipeline data — so you can build custom workflows without manual exports.",
    sections: [
      {
        title: "Full lead access via REST",
        body:
          "Fetch scored leads, relevance explanations, post metadata, and draft copy through a standard REST API. Integrate with your CRM, Slack bot, or internal tooling in minutes.",
      },
      {
        title: "Webhooks for real-time events",
        body:
          "Subscribe to new lead events and get a POST request the moment Operon surfaces a high-intent post — no polling required.",
      },
      {
        title: "Available on Pro and Agency",
        body:
          "API access is included on Pro and Agency plans. Every endpoint is documented and versioned so integrations stay stable as the product evolves.",
      },
    ],
    highlights: [
      "REST API",
      "Webhook support",
      "CRM-ready",
      "Versioned endpoints",
    ],
    ctaLabel: "View API docs",
    ctaHref: "/docs",
  },
];

export const marketingPagesBySlug = Object.fromEntries(
  marketingPages.map((page) => [page.slug, page]),
) as Record<string, MarketingPage>;
