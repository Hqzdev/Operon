# Quick Reference: Implementation Guide

## 🎯 Phase 1 Priority (Start First)
**Do these in weeks 1–3 to unlock everything else**

### 1️⃣ Multi-Product Dashboard (BLOCKING)
- **Why First:** Core data model for all features
- **Timeline:** 6 days
- **Tech:** React table + sorting/filtering
- **Key Schema:** Add `products.status` (enum), `products.cost`
- **Output:** Table view with ROAS, CPA, 7-day trend
- **Test Data:** 10 products with varied ROAS (0.8 to 4.5)

### 2️⃣ Ad Fatigue Detector (Quick Win)
- **Why Early:** Small, visible value, uses existing data
- **Timeline:** 5 days
- **Tech:** CTR monitoring + threshold alerts
- **Key Logic:** If CTR drops >20% in 3 days → alert
- **Output:** Badge alert + inflection date + creative rotation tip
- **Test Data:** 1 ad with 30-day history showing 25% drop on day 15

### 3️⃣ Product Margin Calculator (Quick Win)
- **Why Early:** Visual insight, drives portfolio decisions
- **Timeline:** 4 days
- **Tech:** 2D heatmap (recharts) + gradient coloring
- **Key Formula:** Break-even = (CPC × conversions) - cost
- **Output:** Interactive grid (CPCs vs conversion rates)
- **Test Data:** 5×5 grid with known profitable/unprofitable combos

### 4️⃣ Weekly Performance Digest (Closes Loop)
- **Why Week 4:** Depends on Phase 1 data, drives engagement
- **Timeline:** 5 days
- **Tech:** SendGrid + email templates + cron scheduler
- **Key Logic:** Rank products by ROAS delta, generate 3 actions
- **Output:** HTML email every Monday 22:00 UTC
- **Test:** Send to yourself + 5 beta users

---

## 📋 Phase 2 (Weeks 5–8)

| Feature | Days | Blocker? | External API? | Start Week |
|---------|------|----------|--------------|-----------|
| Budget Pacing Calculator | 4 | No (after seasonality check) | No | Week 3 |
| Competitor Ad Spy Feed | 8 | No | **Meta API** | Week 5 |
| Creative Brief Generator | 6 | No | **LLM (OpenAI/Claude)** | Week 5 |
| TikTok vs Meta Comparator | 5 | No | **TikTok API** | Week 6 |

---

## 🔧 Phase 3 (Weeks 9–12)

| Feature | Days | Complexity | Start Week | Note |
|---------|------|-----------|-----------|------|
| Winning Product Tracker | 10 | **HIGH** | Week 7 | 3 APIs (AliExpress, CJ, Trends) |
| Abandoned Cart Recovery | 6 | Medium | Week 10 | Shopify only, can skip if not needed |

---

## 🚦 Build Order Decision Tree

```
START HERE:
  ↓
Does your schema support multiple products?
  ├─ NO → Build Multi-Product Dashboard first (6 days)
  └─ YES → Skip, continue
  ↓
Do you have CTR data history (30+ days)?
  ├─ NO → Build data aggregation pipeline first
  └─ YES → Build Ad Fatigue Detector (5 days)
  ↓
Do you have product cost data?
  ├─ NO → Add to products table
  └─ YES → Build Margin Calculator (4 days)
  ↓
Do you have a scheduler service (Celery/Bull)?
  ├─ NO → Set up first (2 days)
  └─ YES → Build Weekly Digest (5 days)
  ↓
PHASE 1 COMPLETE ✓
  ↓
Ready for Phase 2? Check API access:
  ├─ Meta Ad Library: Applied? → Competitor Ad Spy (8 days)
  ├─ OpenAI/Claude: Account ready? → Creative Brief (6 days)
  └─ TikTok Ads: Approved? → TikTok Comparator (5 days)
```

---

## 💾 Database Schema Essentials

### Products Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255),
  cost DECIMAL(10, 2),              -- Product cost (for margin calc)
  status ENUM('SCALE', 'KILL', 'TEST'),
  category VARCHAR(100),             -- For competitor filtering
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Ad Metrics Table (Daily Snapshot)
```sql
CREATE TABLE ad_daily_metrics (
  id UUID PRIMARY KEY,
  ad_id VARCHAR(255),
  date DATE,
  ctr DECIMAL(5, 2),                 -- Click-through rate
  roas DECIMAL(10, 2),
  cpa DECIMAL(10, 2),
  budget DECIMAL(10, 2),
  created_at TIMESTAMP
);
```

### Watchlist Table (Product Tracker)
```sql
CREATE TABLE product_watchlist (
  id UUID PRIMARY KEY,
  user_id UUID,
  product_id VARCHAR(255),           -- AliExpress/external ID
  product_name VARCHAR(255),
  date_added TIMESTAMP,
  market_status VARCHAR(50),         -- "heating_up", "stable", "cooling"
  last_price DECIMAL(10, 2),
  competitor_count INT,
  google_trends_svi INT,             -- Search Volume Index
  created_at TIMESTAMP
);
```

---

## 🏗️ Infrastructure Setup Checklist

### Week 1 Setup (Before coding)
- [ ] **Email Service:** SendGrid account + API key + verified domain
- [ ] **Scheduler:** Bull queue (Node) OR Celery (Python) installed + Redis
- [ ] **Database:** Schema created for products + ad_metrics
- [ ] **Secrets:** Store API keys in .env (SendGrid, OpenAI, etc.)
- [ ] **Logging:** Set up structured logging (Winston/Bunyan)

### Week 2 Setup
- [ ] **API Gateway:** Create endpoints for each feature (REST)
- [ ] **Error Handling:** Global middleware for failed tasks
- [ ] **Rate Limiting:** Plan for external API calls (respect limits)
- [ ] **Monitoring:** Basic alerts for scheduler failures

### Week 3+ Setup
- [ ] **LLM Integration:** OpenAI API account (for Creative Brief)
- [ ] **External APIs:** Request access (Meta, TikTok, AliExpress)
- [ ] **Data Retention:** Plan deletion/archival strategy

---

## 📊 Testing Strategy

### Unit Tests (Per Feature)
- Ad Fatigue: Test CTR drop calculation (>20%, <20%, exactly 20%)
- Margin Calc: Test break-even formula (profitable, at-risk, unprofitable)
- Budget Pacing: Test day-of-week multipliers (weekday vs. weekend)
- Digest: Test action generation (all 3 status cases)

### Integration Tests
- Dashboard: Load 5–50 products, measure performance
- Weekly Digest: Full end-to-end (scheduler → email send → verify inbox)
- Competitor Spy: Fetch real ads from Meta Library, rank correctly

### Test Data
- **Phase 1 data:** Create realistic fixtures (10 products, 30 days metrics)
- **Stress test:** 100 products on dashboard (performance OK?)
- **Edge cases:** Zero conversions, negative ROAS, missing data

---

## 📈 Feature Success Metrics

| Feature | Success Metric | Target |
|---------|---|---|
| Multi-Product Dashboard | Load time <2s (10 products) | All launches in <1.5s |
| Ad Fatigue Detector | Alert accuracy (true positives) | 95%+ |
| Margin Calculator | Grid load time | <200ms |
| Budget Pacing | User implements recommendation | 40%+ adoption |
| Weekly Digest | Open rate | >40% |
| Competitor Spy | Scrape success rate | 95%+ without rate limits |
| Creative Brief | User uses output (5+ saves) | 30%+ conversion |
| Product Tracker | Market heating detection accuracy | 90%+ |

---

## 🚀 Launch Readiness

### Pre-Production Checklist
- [ ] All Phase 1 tests passing
- [ ] Zero critical bugs in Multi-Product Dashboard
- [ ] Weekly Digest sent successfully to 5 beta users
- [ ] Dashboard load test: 50+ products under 2 seconds
- [ ] Error logging active (no silent failures)

### Day-1 Production
- [ ] Monitor dashboard performance (check slow queries)
- [ ] Verify weekly digest sends (check email logs)
- [ ] Watch alert accuracy (Ad Fatigue false positives?)
- [ ] Track user engagement (analytics events firing?)

### Post-Launch Metrics
- [ ] Dashboard DAU (daily active users): >60%
- [ ] Digest open rate: >40%
- [ ] Feature usage (Budget Pacing clicks): >5 per user per week
- [ ] Support tickets: <5 product-specific issues per day

---

## 🔗 Linear Tags Reference

When creating tasks in Linear, use these tags:

### Workflow Tags
- `phase-1` / `phase-2` / `phase-3` — Release phase
- `blocking` — Unblocks other features
- `quick-win` — <1 week, high impact

### Technical Tags
- `database` — Schema changes
- `api-integration` — External API work
- `frontend` — UI/component work
- `backend` — API/logic work
- `scheduler` — Background jobs

### Priority Tags
- `high-value` — Core user pain point
- `nice-to-have` — Enhancement
- `experimental` — Research/POC

### Risk Tags
- `external-api-required` — Needs third-party access
- `performance-critical` — Must be fast
- `data-heavy` — Complex computation

---

## 📞 Escalation Paths

**API Access Delays?**
→ Start Phase 2 features that don't need APIs (Creative Brief Generator, Budget Pacing)

**Seasonality Engine Not Ready?**
→ Use simple day-of-week model: Weekday 1.0x, Weekend 0.85x (until engine ready)

**Scheduler Infrastructure Missing?**
→ Use native platform scheduler (AWS EventBridge, Cloud Scheduler) instead of installing Bull/Celery

**Performance Issues on Dashboard?**
→ Implement pagination (show 10 products at a time) or lazy loading

---

## 📖 Documentation Links (Create These)
- [ ] API Docs: /docs/api/features.md (all 10 endpoints)
- [ ] Database Schema: /docs/schema.md
- [ ] Deployment Guide: /docs/deploy.md
- [ ] Troubleshooting: /docs/troubleshooting.md
- [ ] Architecture Decision Log: /docs/ADRs/

---

**Ready to start?** Pick Task #6 (Multi-Product Dashboard) from Linear and let's go! 🚀
