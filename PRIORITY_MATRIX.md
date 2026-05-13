# Feature Priority Matrix

## Impact vs. Effort (Two-Dimensional Analysis)

```
                          HIGH EFFORT
                            ↑
                            |
     8 ●─────────────┐      |      ┌─────────────●
       │             │      |      │             │
     7 │  RESEARCH   │      |      │  STRATEGIC  │
       │  (Low ROI)  │      |      │  (Do Last)  │
     6 │             │      |      │             │
   E   │             │      |      │             │
   F 5 ├─────────────┼──────┼──────┼─────────────┤
   F   │             │      |      │             │
   O 4 │   FILL-INS  │      |      │   QUICK     │
   R   │   (Maybe)   │      |      │   WINS      │
   T 3 │             │      |      │  (Do First) │
       │             │      |      │             │
     2 │             │      |      │             │
       │             │      |      │             │
     1 ●─────────────┘      |      ┌─────────────●
       └──────────────────┼─────────────────────→ HIGH IMPACT
       LOW                 |      MEDIUM        HIGH
```

## Plotted Features

```
IMPACT SCORES (1–10):
- Ad Fatigue Detector: 9/10 (direct ROAS impact)
- Product Margin Calc: 8/10 (profitable decisions)
- Multi-Product Dashboard: 10/10 (enables all others)
- Budget Pacing: 7/10 (optimization guidance)
- Weekly Digest: 8/10 (engagement + actions)
- Competitor Ad Spy: 6/10 (research, not actions)
- Creative Brief Gen: 5/10 (quality over quantity)
- TikTok vs Meta: 7/10 (budget allocation)
- Winning Product Tracker: 5/10 (early warning)
- Abandoned Cart Recovery: 4/10 (niche audience)

EFFORT SCORES (1–10):
- Ad Fatigue Detector: 3/10 (small)
- Product Margin Calc: 2/10 (simple grid)
- Multi-Product Dashboard: 5/10 (requires schema change)
- Budget Pacing: 3/10 (mostly math)
- Weekly Digest: 4/10 (email + scheduler)
- Competitor Ad Spy: 8/10 (API complexity)
- Creative Brief Gen: 6/10 (LLM integration)
- TikTok vs Meta: 5/10 (API + logic)
- Winning Product Tracker: 8/10 (3 parallel APIs)
- Abandoned Cart Recovery: 4/10 (Shopify only)
```

## By Quadrant

### 🟢 QUICK WINS (High Impact, Low Effort)
**Do These First (Weeks 1–3)**

1. **Product Margin Calculator** 
   - Impact: 8 | Effort: 2
   - ROI: 400% (4x impact for 1x effort)
   - Why: Instant profitability insight

2. **Ad Fatigue Detector**
   - Impact: 9 | Effort: 3
   - ROI: 300% (3x impact for 1x effort)
   - Why: Prevents budget waste

3. **Multi-Product Dashboard**
   - Impact: 10 | Effort: 5
   - ROI: 200% (2x impact for 1x effort)
   - Why: Enables everything; minor schema work

### 🟡 WORTH IT (High Impact, Medium Effort)
**Do in Phase 2 (Weeks 4–6)**

4. **Budget Pacing Calculator**
   - Impact: 7 | Effort: 3
   - ROI: 233%

5. **Weekly Performance Digest**
   - Impact: 8 | Effort: 4
   - ROI: 200%

6. **TikTok vs Meta Comparator**
   - Impact: 7 | Effort: 5
   - ROI: 140%

### 🔵 RESEARCH/FEATURE (Medium Impact, High Effort)
**Do in Phase 2–3 (Weeks 6–10)**

7. **Competitor Ad Spy Feed**
   - Impact: 6 | Effort: 8
   - ROI: 75% (worth it for competitive advantage)

8. **Creative Brief Generator**
   - Impact: 5 | Effort: 6
   - ROI: 83% (nice to have, not critical)

### 🟣 SPECIALIZED (Lower Impact, High Effort)
**Do Last or Skip (Weeks 10+)**

9. **Winning Product Tracker**
   - Impact: 5 | Effort: 8
   - ROI: 63% (do only if target users need it)

10. **Abandoned Cart Recovery Score**
    - Impact: 4 | Effort: 4
    - ROI: 100% (only if Shopify users are 50%+ of base)

---

## Timeline Recommendation

### ⏰ Week 1–2 (Foundation)
```
PARALLEL TRACK:
├─ Multi-Product Dashboard (5–6 days) ← BLOCKING, start first
└─ Ad Fatigue Detector (4–5 days) ← Can start day 2
```

### ⏰ Week 3–4 (Optimization)
```
PARALLEL TRACK:
├─ Product Margin Calculator (2–3 days)
└─ Budget Pacing Calculator (3–4 days)
```

### ⏰ Week 5 (Engagement Loop)
```
SERIAL (depends on earlier features):
└─ Weekly Performance Digest (4–5 days)
```

### ⏰ Week 6–8 (Advanced Features)
```
PARALLEL TRACK:
├─ Competitor Ad Spy Feed (7–8 days) [start week 6]
├─ Creative Brief Generator (5–6 days) [start week 6]
└─ TikTok vs Meta Comparator (4–5 days) [start week 7]
```

### ⏰ Week 9–12 (Specialized)
```
PARALLEL TRACK:
├─ Winning Product Tracker (9–10 days) [start week 9]
└─ Abandoned Cart Recovery (5–6 days) [start week 11, optional]
```

---

## Resource Allocation

### Engineer Days: ~80 total

**Phase 1 (18–20 days):** 1–2 engineers (critical path)
- Multi-Product Dashboard: 6 days
- Ad Fatigue Detector: 5 days
- Product Margin Calculator: 3 days
- Infrastructure: 4 days (email, scheduler, schema)

**Phase 2 (22–24 days):** 2 engineers (parallel streams)
- Budget Pacing: 4 days
- Weekly Digest: 5 days
- Competitor Spy: 8 days (1 engineer, starts week 6)
- Creative Brief: 6 days (1 engineer, starts week 6)
- TikTok Comparator: 5 days (overlaps weeks 7–8)

**Phase 3 (15–18 days):** 1 engineer (can extend timeline)
- Winning Product Tracker: 10 days
- Abandoned Cart Recovery: 6 days

---

## Dependency Graph

```
START
  ↓
Multi-Product Dashboard ⭐ (6 days) ← CRITICAL PATH
  ├─→ Ad Fatigue Detector (5 days)
  ├─→ Product Margin Calc (3 days)
  └─→ Budget Pacing Calc (4 days)
       └─→ Weekly Digest (5 days) ← CLOSES LOOP
            ↓
            PHASE 1 COMPLETE (3 weeks)

Competitor Spy (8 days) — independent, start week 6
Creative Brief (6 days) — feeds from Competitor Spy + Ad history
TikTok Comparator (5 days) — independent, start week 7

Product Tracker (10 days) — heavy API work, start week 9
Abandoned Cart (6 days) — niche, start week 11 (optional)
```

---

## Go/No-Go Criteria

### 🟢 GO (Schedule in Phase 1)
- **Multi-Product Dashboard:** Unblocks everything
- **Ad Fatigue Detector:** Prevents campaign waste
- **Product Margin Calculator:** Core profitability insight
- **Weekly Digest:** Engagement multiplier

### 🟡 CONDITIONAL (Check before Phase 2)
- **Competitor Ad Spy:** Do IF Meta API access approved
- **TikTok Comparator:** Do IF TikTok users are >20% of base
- **Creative Brief Generator:** Do IF creative rotation is common pain point

### 🔴 NO-GO or BACKLOG
- **Winning Product Tracker:** Only if product research is core to marketing
- **Abandoned Cart Recovery:** Only if Shopify users are >40% of base

---

## Risk-Adjusted Effort

### Hidden Complexity (Add 2–3 days)
- **API Approvals:** Meta, TikTok (apply immediately)
- **Data History:** Ad Fatigue needs 30 days of data (backfill now)
- **Scheduler Setup:** First background job is hardest (invest early)

### Scope Creep Red Flags
- "Can we also track Facebook/Instagram separately?" → +2 days
- "Can we add weekly vs. monthly pacing?" → +2 days
- "Can we predict CTR decline?" → +5 days (nice to have, skip v1)

---

## Success Criteria (Post-Launch)

| Metric | Target | Feature |
|--------|--------|---------|
| Dashboard load <2s (10 products) | 100% | Multi-Product |
| Fatigue alerts (true positives) | 95%+ | Ad Fatigue |
| Weekly Digest open rate | 40%+ | Weekly Digest |
| Margin Calc CTR (users who use it) | 2+ per week | Margin Calc |
| Budget Pacing adoption | 30%+ of campaigns | Budget Pacing |

---

## Version 2.0 Features (Later)

If Phase 1–3 succeeds, consider:

- **A/B Test Calculator** — Significance testing for creative variants
- **Cohort Analysis** — Segment customers by acquisition source
- **Churn Prediction** — Proactive alerts for at-risk products
- **Attribution Model** — Multi-touch attribution across campaigns
- **Recommendation Engine** — "Clients similar to you did X and won"

---

**Decision:** Start with task #6 (Multi-Product Dashboard) → #1 (Ad Fatigue) → #4 (Margin Calc) → #10 (Weekly Digest).

Launch Phase 1 in 3 weeks. Launch Phase 2 in 8 weeks total. Rest is optional based on user demand.
