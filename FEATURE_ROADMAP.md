# Ad Analytics Platform: Feature Roadmap & Implementation Guide

**Last Updated:** 2026-05-13  
**Total Features:** 10  
**Estimated Timeline:** 8–12 weeks  

---

## 📊 Roadmap Overview

### Phase 1: Foundation (Weeks 1–3) — HIGH PRIORITY
These are quick-win features that leverage existing infrastructure and drive immediate user value.

| # | Feature | Priority | Complexity | Est. Days | Key Dependencies |
|---|---------|----------|-----------|----------|------------------|
| 1 | Ad Fatigue Detector | **HIGH** | Medium | 5 | Daily data pipeline |
| 4 | Product Margin Calculator | **HIGH** | Medium | 4 | Product cost DB |
| 6 | Multi-Product Dashboard | **HIGH** | Medium | 6 | Data model update |
| 10 | Weekly Digest Email | **HIGH** | Medium | 5 | Email service, scheduler |

**Phase 1 Outcome:** Core portfolio management + alerting system

---

### Phase 2: Advanced Analytics (Weeks 4–6) — MEDIUM PRIORITY
Features that require external API integrations and build on Phase 1.

| # | Feature | Priority | Complexity | Est. Days | Key Dependencies |
|---|---------|----------|-----------|----------|------------------|
| 2 | Budget Pacing Calculator | **HIGH** | Medium | 4 | Seasonality engine |
| 3 | Competitor Ad Spy Feed | **MEDIUM** | High | 8 | Meta Ad Library API |
| 5 | Creative Brief Generator | **MEDIUM** | Medium | 6 | LLM integration |
| 9 | TikTok vs Meta Comparator | **MEDIUM** | Medium | 5 | TikTok Ads API |

**Phase 2 Outcome:** Decision support + competitive intelligence

---

### Phase 3: Specialized Tools (Weeks 7–12) — MEDIUM PRIORITY
Niche features for specific user segments; can run in parallel with Phase 2.

| # | Feature | Priority | Complexity | Est. Days | Key Dependencies |
|---|---------|----------|-----------|----------|------------------|
| 7 | Winning Product Tracker | **MEDIUM** | High | 10 | 3 external APIs (AliExpress, CJ, Google Trends) |
| 8 | Abandoned Cart Recovery | **MEDIUM** | Medium | 6 | Shopify API |

---

## 🚀 Recommended Build Order (By Dependency & Impact)

### Week 1–2: Lay the data foundation
1. **Multi-Product Dashboard** (Task #6) — FIRST
   - Extends data model to support all future features
   - Unblocks all other features
   - User immediately sees all products in one place
   - **Tags:** `database`, `core-model`, `blocking`
   - **Action:** Update schema to store: product_id, status (SCALE/KILL/TEST), metrics snapshot

2. **Ad Fatigue Detector** (Task #1) — PARALLEL
   - Uses existing daily data collection
   - Small, self-contained feature
   - High perceived value (users see alerts immediately)
   - **Tags:** `alerts`, `monitoring`, `quick-win`
   - **Action:** Add CTR threshold monitoring to daily pipeline

---

### Week 3: Optimization layer
3. **Product Margin Calculator** (Task #4) — NEXT
   - Depends on: product cost data (add to DB in week 1)
   - Fast to build (2D grid + color coding)
   - Converts product data into profit insight
   - **Tags:** `visualization`, `breakeven`, `profitability`
   - **Action:** Build React component with heatmap library (recharts)

4. **Budget Pacing Calculator** (Task #2) — IN PARALLEL
   - Depends on: existing seasonality engine (verify it exists)
   - High ROI for users (daily implementation guidance)
   - **Tags:** `budget-planning`, `seasonality`, `optimization`
   - **Action:** Integrate with seasonality engine, build day-of-week variance model

---

### Week 4: Automation & Insights
5. **Weekly Performance Digest** (Task #10) — NEXT
   - Depends on: data from tasks 1–4
   - Creates engagement loop (users return weekly)
   - Relatively simple to build (email template + scheduler)
   - **Tags:** `automation`, `email`, `engagement`, `scheduler`
   - **Action:** Set up SendGrid integration, create email template, configure cron job for Sunday 22:00 UTC

---

### Week 5–6: External Integrations (Build in parallel)
6. **Competitor Ad Spy Feed** (Task #3) — HARD DEPENDENCY CHECK FIRST
   - Requires: Meta Ad Library API access (apply now if not approved)
   - High complexity but high competitive advantage
   - **Tags:** `competitive-intel`, `meta-api`, `research`
   - **Action:** Audit API terms, build scraper/integration, rank algorithms

7. **Creative Brief Generator** (Task #5)
   - Depends on: historical creative failure patterns (gather data in weeks 1–4)
   - Medium complexity (LLM prompts + templating)
   - High user perceived value (content creation tool)
   - **Tags:** `ai`, `content-generation`, `creative`
   - **Action:** Design prompt templates, integrate OpenAI/Claude API, build output formatter

8. **TikTok vs Meta Comparator** (Task #9)
   - Depends on: TikTok Ads API access (apply now)
   - Fast to build once API is available (comparison logic)
   - **Tags:** `platform-strategy`, `comparative-analysis`, `tiktok-api`
   - **Action:** Verify TikTok API access, build side-by-side view, implement recommendation logic

---

### Week 7–10: Advanced Monitoring (Can run in parallel with Phase 2)
9. **Winning Product Tracker** (Task #7) — MOST COMPLEX
   - Requires: AliExpress API, Commission Junction API, Google Trends API
   - Start early to handle API approval delays
   - Long polling/background job infrastructure needed
   - **Tags:** `market-research`, `monitoring`, `3x-external-apis`, `background-jobs`
   - **Action:** Map API requirements, build scheduler infrastructure first, then layer each API

10. **Abandoned Cart Recovery Score** (Task #8)
    - Depends on: Shopify API (for target audience)
    - Only build if Shopify users are in target segment
    - Medium complexity
    - **Tags:** `shopify`, `ecommerce`, `conversion-rate`, `playbook`
    - **Action:** Verify Shopify user demand, build recovery rate calculator, generate playbook rules

---

## 🏗️ Technical Implementation Checklist

### Infrastructure Prerequisites (Do First)
- [ ] **Database Schema Update** — Add `product` table with: id, user_id, name, cost, status, category, createdAt, updatedAt
- [ ] **Scheduler Service** — Set up job queue (Bull, Celery, or cloud-native) for recurring tasks (daily/weekly/hourly)
- [ ] **Email Service** — Configure SendGrid or Mailgun account + templates
- [ ] **Data Pipeline** — Ensure daily metric aggregation is robust (no gaps)
- [ ] **API Gateway** — Plan endpoints for each feature (REST or GraphQL)
- [ ] **LLM Integration** — Select provider (OpenAI GPT-4, Claude API) + rate limits
- [ ] **External API Approvals** — Apply for: Meta Ad Library, TikTok Ads, AliExpress, CJ, Google Trends

### Per-Feature Checklist

#### Task #1: Ad Fatigue Detector
- [ ] Add `ctr_history` table (ad_id, date, ctr, budget)
- [ ] Build 3-day rolling change calculation
- [ ] Create alert rule: if delta_ctr < -20%, trigger
- [ ] UI: Show alert badge + inflection date + suggested creatives
- [ ] Test with: Mock data showing 25% drop over 3 days

#### Task #4: Product Margin Calculator
- [ ] Add `product_cost` field to products table
- [ ] Build 2D grid logic: CPC range × Conversion rate range
- [ ] Formula: ROAS = (ASP × CR) / CPC where ASP = cost / 0.4 (assumption)
- [ ] Color scheme: Green (ROAS > 2), Yellow (1–2), Red (< 1)
- [ ] Component: Interactive heatmap (recharts)

#### Task #6: Multi-Product Dashboard
- [ ] Update schema: Add `status` field (enum: SCALE/KILL/TEST) + logic rules
- [ ] Build sortable table: status, ROAS, CPA, 7-day trend, actions
- [ ] Implement bulk actions: Pause, Increase Budget, Rotate Creative
- [ ] Performance summary row (total ROAS, total spend, count by status)

#### Task #2: Budget Pacing Calculator
- [ ] Verify seasonality engine outputs (format, granularity)
- [ ] Build day-of-week variance model (from historical data)
- [ ] Formula: `daily_budget = weekly_budget × (day_multiplier × seasonality_multiplier)`
- [ ] UI: Input form → output daily breakdown + confidence interval

#### Task #10: Weekly Digest
- [ ] Schedule: Cron job Sunday 22:00 UTC
- [ ] Gather: Top 1 product, bottom 1 product, confidence changes
- [ ] Template: HTML email with charts (use Chart.js or embedded SVG)
- [ ] Action generation: Rule-based (ROAS >3 → scale, <1.2 → kill, else → test new creative)
- [ ] Send via: SendGrid API

#### Task #3: Competitor Ad Spy Feed
- [ ] Research: Meta Ad Library API terms (public data? Requires business account?)
- [ ] Build scraper or API integration (rate limits: plan for 100 ads/hour)
- [ ] Rank by: Duration running (proxy for profitability) + engagement metrics
- [ ] UI: Table with columns: Image/Video, Copy, Launch Date, Format, CTA, Days Running
- [ ] Test: Scrape top 100 ads for 3 niches

#### Task #5: Creative Brief Generator
- [ ] Gather: Past creative failures + successes (build dataset)
- [ ] Design prompts: "Generate 3 hooks for [product type] [niche]"
- [ ] Outputs: Hook, 15-sec script, 30-sec script, CTA, emotion
- [ ] Integration: Take competitor ads → generate brief against them
- [ ] Export: Markdown + PDF

#### Task #9: TikTok vs Meta Comparator
- [ ] Verify TikTok Ads API access + rate limits
- [ ] Build data fetcher for both platforms (one product, date range)
- [ ] Metrics: CPA, ROAS, CTR (normalize for platform differences)
- [ ] Recommendation: "Reallocate 40% to TikTok because CPA 30% lower"
- [ ] Include: Platform-specific tips (TikTok sounds, Meta lookalikes)

#### Task #7: Winning Product Tracker
- [ ] Build watchlist table (product_id, dateAdded, marketStatus)
- [ ] AliExpress: Scraper + daily price tracking (store history)
- [ ] CJ: API integration for competitor listings
- [ ] Google Trends: Daily SVI (Search Volume Index) poll
- [ ] Alert logic: `if (price_down AND competitor_count_up AND svi_up) → "market heating up"`
- [ ] Scheduler: Daily run, email on heating up

#### Task #8: Abandoned Cart Recovery Score
- [ ] Shopify API: Fetch abandoned carts + recovery metadata
- [ ] Metric: `recovery_rate = recovered_carts / total_abandoned × 100`
- [ ] Threshold: If < 5%, generate playbook:
  - Email 1: Hour 2 (no discount)
  - Email 2: Hour 24 (10% off)
  - SMS: Hour 36 (urgency)
- [ ] Subject line A/B: 3 pairs (test urgency vs. value)

---

## 📌 Tags Reference

Use these tags in Linear for filtering & organization:

- **`core-model`** — Updates to core data structure (blocking)
- **`database`** — DB schema changes
- **`api-integration`** — Third-party API work (Meta, TikTok, Shopify, etc.)
- **`alerts`** — Notification/alert system features
- **`visualization`** — UI components, charts, dashboards
- **`optimization`** — Budget/strategy optimization features
- **`automation`** — Scheduled/automated workflows
- **`email`** — Email delivery & templating
- **`scheduler`** — Background job scheduling
- **`quick-win`** — Can be done in <1 week, high impact
- **`blocking`** — Blocks other features (do first)
- **`external-api`** — Requires approval/setup from third parties

---

## 💡 Implementation Tips

### 1. **Start with Multi-Product Dashboard** (Most Blocking)
Everything else depends on storing multiple products. Get this right early.

### 2. **Verify API Availability ASAP**
- Meta Ad Library: Check if public or requires business account
- TikTok Ads API: Apply early (can take weeks)
- AliExpress: Reverse-engineer or official API?
- CJ (Commission Junction): Check if API exists + access requirements

### 3. **Use Existing Seasonality Engine**
Don't rebuild—extend it. Budget Pacing Calculator and Weekly Digest both depend on it.

### 4. **Build Email System First**
Weekly Digest depends on SendGrid/Mailgun setup. Do this in week 2.

### 5. **Stagger External Integrations**
Run them in parallel (weeks 5–10) but prioritize by ease:
- Google Trends (easiest, free API)
- Shopify (if target users)
- AliExpress (may need scraper)
- Commission Junction (verify API)
- TikTok Ads (slowest to approve)

### 6. **Plan Data Retention**
- CTR history: Keep 90 days (Ad Fatigue)
- Price history: Keep 6 months (Winning Product Tracker)
- Creative brief snapshots: Keep indefinitely
- Email digests: Archive in S3/Supabase

---

## 🎯 Success Metrics

### Launch Readiness Checklist
- [ ] Phase 1 (4 features) deployed to production
- [ ] Zero blocker bugs in Multi-Product Dashboard
- [ ] Weekly Digest sent to 100% of users successfully
- [ ] Ad Fatigue alerts triggered correctly (5+ test cases)

### User Engagement Targets
- Dashboard daily active users: >60%
- Weekly Digest open rate: >40%
- Budget Pacing Calculator: 3+ uses per user per week
- Multi-Product Dashboard: 2+ actions per user per day

### Performance Targets
- Dashboard load time: <2 seconds
- Digest send time: <100ms per user
- Ad Spy Feed: <500ms to fetch top 10
- Margin Calculator: <200ms grid render

---

## 🔗 Dependencies Matrix

```
Multi-Product Dashboard (blocks all)
    ├→ Ad Fatigue Detector
    ├→ Product Margin Calculator
    ├→ Budget Pacing Calculator (depends on seasonality engine)
    ├→ Weekly Digest (depends on all above + email service)
    └→ Creative Brief Generator (depends on creative history)

Competitor Ad Spy Feed (independent, but informs Creative Brief)

Winning Product Tracker (3 parallel APIs)
    ├→ AliExpress scraper
    ├→ CJ API
    └→ Google Trends API

TikTok vs Meta Comparator (depends on TikTok API access)

Abandoned Cart Recovery (depends on Shopify users, independent otherwise)
```

---

## 📅 Estimated Timeline

```
Week 1–2: Foundation
├─ Multi-Product Dashboard v1
├─ Ad Fatigue Detector
└─ Product Margin Calculator setup

Week 3–4: Optimization
├─ Budget Pacing Calculator
├─ Product Margin Calculator v1
└─ Email service setup

Week 5: Engagement Loop
└─ Weekly Digest (first send)

Week 6–8: Advanced Features (parallel)
├─ Competitor Ad Spy Feed
├─ Creative Brief Generator
└─ TikTok vs Meta Comparator

Week 9–12: Specialized Tools
├─ Winning Product Tracker
└─ Abandoned Cart Recovery Score

Post-launch: Optimization & refinement
```

---

## 🚨 Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Meta API access denied | Medium | High | Apply early, have fallback (manual input) |
| TikTok API delays | High | Medium | Start in week 5, can launch without it |
| Seasonality engine gaps | Medium | Medium | Verify in week 1, own implementation budget |
| Email deliverability | Low | Medium | Use reputable provider (SendGrid), test SPF/DKIM |
| AliExpress scraping blocks | Medium | Low | Build scraper resilience, consider CJ API instead |

---

## 👥 Team & Responsibilities

- **Backend (API + DB):** Tasks 6, 1, 4, 2, 10 (Phase 1 focus)
- **Frontend (UI/UX):** Tasks 4, 6, 9 (dashboards, tables)
- **Integrations:** Tasks 3, 7, 8, 9 (external APIs)
- **DevOps/Infra:** Scheduler, email service, data pipeline
- **ML/AI:** Task 5 (Creative Brief Generator)

---

## ✅ Checklist: Next Steps

- [ ] Share roadmap with team
- [ ] Assign Phase 1 tasks to engineers
- [ ] Verify API access for Phase 2 (Meta, TikTok, AliExpress, CJ)
- [ ] Set up scheduler infrastructure
- [ ] Configure email service (SendGrid)
- [ ] Create Linear project board with tags
- [ ] Schedule kickoff meeting (week 1)

---

**Questions?** Review the individual task descriptions in Linear for detailed implementation notes.
