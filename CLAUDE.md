@AGENTS.md

## Project Overview

ASX Biotech Tracker — a Next.js dashboard tracking ASX-listed biotech companies. Monitors cash runway, clinical catalysts, capital raises, buybacks, and director transactions. Live at asx-biotech-tracker.netlify.app.

## Current Status

**Tier 1:** Complete
**Tier 2:** Complete — TrackRecord, weekly summary, director tx overlay, IPO handling, feedback form, buyback tracker all shipped
**Next (Tier 2 remaining):**
- 10c: Clinical trial enrollment velocity (ClinicalTrials.gov v2 data already available)
- 10d: Cross-market intelligence (non-ASX competitors per indication)

**Tier 3+:** Accounts/auth, watchlists, newsletter, patents, executive remuneration — not started

## Tech Stack

- **Frontend:** Next.js App Router, Tailwind CSS (dark-first, green highlights), Recharts
- **Backend:** Supabase (Postgres + REST, anon key, RLS on all tables)
- **Deployment:** Netlify — site `a1a49f85-4b4c-4a5b-9a1b-13e2d0ac2438`
- **Python scripts** (at `C:\Users\matth\`): `fetch_prices.py`, `fetch_trials.py`, `parse_announcements.py`, `poll_announcements.py`, `parse_buybacks.py`

## Database Schema

Supabase project: `zdnhdbkjwlzvzdxjctai`

| Table | Purpose | Key columns |
|---|---|---|
| `company` | 27 ASX biotechs (master) | `ticker` (PK), `name`, `market_cap_m`, `shares_outstanding_m`, `status` |
| `company_dashboard` | **View** — aggregated per-company metrics | `ticker`, `runway_months`, `cash_at_end`, `is_cf_positive`, `most_advanced_stage`, `pipeline_assets` |
| `quarterly_4c` | ASX Appendix 4C cashflow filings | `ticker`, `quarter_end`, `total_operating_cf`, `cash_at_end`, `burn_rate` (generated — never insert) |
| `pipeline_asset` | Drug candidates per company | `ticker`, `drug_name`, `indication`, `stage` (enum), `expected_next_milestone` |
| `catalyst` | Binary events (readouts, regulatory) | `ticker`, `event_type`, `expected_date`, `confidence`, `impact`, `status`, `original_expected_date`, `times_delayed` |
| `clinical_trial` | ClinicalTrials.gov data (463 rows) | `ticker`, `nct_id`, `status`, `phase`, `enrollment_target`, `enrollment_actual`, `primary_completion_date` |
| `capital_raise` | Placements, SPPs, rights issues | `ticker`, `announce_date`, `raise_type`, `amount_m`, `shares_issued_m`, `price_per_share` |
| `buyback` | Share buybacks (negative dilution) | `ticker`, `announce_date`, `shares_cancelled_m`, `amount_m`, `buyback_type`, `announcement_id` |
| `announcement` | ASX announcements (123 rows, auto-polled) | `ticker`, `title`, `release_date`, `category`, `asx_url`, `asx_id` (unique) |
| `insider_tx` | Director share transactions (3Y filings) | `ticker`, `director_name`, `tx_type`, `tx_date`, `shares`, `price` |
| `price_snapshot` | Daily OHLCV (1480 rows) | `ticker`, `snapshot_date`, `close_price`, `market_cap_m` |
| `partnership_deal` | Licensing/co-dev deals | `ticker`, `partner_name`, `deal_type`, `upfront_m`, `total_milestones_m`, `royalty_rate_pct` |
| `feedback` | User bug/feature reports | `type` (bug/feature/data/other), `message`, `email`, `ticker` |

**Enums:** `pipeline_stage` (discovery → approved), `catalyst_type`, `catalyst_confidence` (confirmed/expected/speculative), `raise_type`, `insider_tx_type`

## Key Constraints & Gotchas

- `burn_rate` is a **generated column** in `quarterly_4c` — never insert it directly
- `company_dashboard` is a **view** — joining it with `!inner` in PostgREST times out; use two parallel queries instead
- 9 companies missing Q4 2025 4C data (ACW, AMP, CBL, CU6, MSB, PAB, PRN, PYC, RCR) — they file April 2026
- `generateStaticParams` removed from company page — pages render on-demand (ISR) to avoid concurrent Supabase timeouts at build
- ASX Markit search API hard-capped at 5 results regardless of params
- CBL, NAN, RCR have zero ClinicalTrials.gov results
- All Tailwind accent colours are **green** (not cyan) — use `green-*` classes throughout
