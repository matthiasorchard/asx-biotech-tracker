#!/usr/bin/env python3
"""
poll_announcements.py

Fetches ASX company announcements for every active company in Supabase,
classifies them by title keywords, and upserts into the announcement table.

Usage:
  python poll_announcements.py                 # fetch 20 per company
  python poll_announcements.py --backfill      # fetch 100 per company
  python poll_announcements.py --ticker BOT    # single ticker
"""

import argparse
import os
import sys
import time
import requests

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
ASX_API = "https://asx.api.markitdigital.com/asx-research/1.0/companies/{ticker}/announcements"
ASX_DOC_URL = "https://asx.api.markitdigital.com/asx-research/1.0/file/{doc_key}"

HEADERS_SUPA = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# ── Classification ─────────────────────────────────────────────────────────────
# Order matters: first match wins. Each entry is (category_enum, [keyword, ...])
# Keywords are checked case-insensitively against the announcement title.
CLASSIFICATION_RULES: list[tuple[str, list[str]]] = [
    # quarterly cash flow / appendix 4C
    ("quarterly_4c", ["appendix 4c", "quarterly cash flow"]),
    # half-year / half year
    ("half_year_report", ["half year", "half-year", "appendix 4e", "appendix 4d"]),
    # annual report
    ("annual_report", ["annual report", "annual financial", "full year results", "full-year results"]),
    # quarterly activities
    ("quarterly_activities", ["quarterly activities", "quarterly report", "quarterly update", "appendix 5b"]),
    # capital raise
    ("capital_raise", [
        "placement", "share purchase plan", "spp", "capital raise", "capital raising",
        "entitlement offer", "rights issue", "convertible note", "issue of securities",
        "proposed issue", "cleansing notice",
    ]),
    # director / officer changes
    ("director_appointment", ["director appointment", "appointment of", "appointed as", "new director", "new ceo", "new cfo"]),
    ("director_resignation", ["director resignation", "resignation of", "resigned", "ceasing to be a director"]),
    # insider trading / substantial holders
    ("insider_trade", [
        "change in director", "director's interest", "directors interest",
        "substantial holder", "ceasing to be a substantial", "becoming a substantial",
        "appendix 3y", "appendix 3x",
    ]),
    # clinical trial results
    ("trial_results", [
        "trial results", "clinical results", "phase 1", "phase 2", "phase 3",
        "phase i", "phase ii", "phase iii", "data readout", "topline", "top-line",
        "primary endpoint", "efficacy data", "safety data", "clinical data",
        "study results", "trial data",
    ]),
    # regulatory / FDA / TGA
    ("regulatory", [
        "fda", "tga", "ema", "regulatory", "approval", "clearance", "510k",
        "ind application", "nda", "bla", "marketing authorisation", "marketing authorization",
        "breakthrough designation", "fast track", "orphan drug",
    ]),
    # partnership / licensing / collaboration
    ("partnership", [
        "partnership", "collaboration", "licence agreement", "license agreement",
        "licensing", "co-development", "co development", "merger", "acquisition",
        "term sheet", "mou", "memorandum of understanding",
    ]),
    # AGM / general meeting
    ("agm", [
        "annual general meeting", "agm", "extraordinary general meeting", "egm",
        "notice of meeting", "results of meeting",
    ]),
    # presentations / conferences
    ("presentation", [
        "presentation", "conference", "investor day", "investor update",
        "corporate overview", "roadshow",
    ]),
    # share buyback
    ("buyback", ["buy-back", "buyback", "notification of buy-back", "on-market buy-back"]),
    # trading halt
    ("trading_halt", ["trading halt", "query response", "price query"]),
]


def classify(title: str, announcement_type: str) -> tuple[str, bool]:
    """
    Returns (category_enum, needs_processing).
    needs_processing is True for quarterly_4c, capital_raise, and insider_trade.
    """
    AUTO_PROCESS = {"quarterly_4c", "half_year_report", "annual_report",
                    "capital_raise", "insider_trade", "partnership",
                    "trial_results", "regulatory", "buyback"}
    t = title.lower()
    for category, keywords in CLASSIFICATION_RULES:
        if any(kw in t for kw in keywords):
            return category, category in AUTO_PROCESS
    return "other", False


# ── Supabase helpers ───────────────────────────────────────────────────────────

def get_active_tickers() -> list[str]:
    url = f"{SUPABASE_URL}/rest/v1/company"
    params = {"select": "ticker", "status": "eq.active", "order": "ticker"}
    r = requests.get(url, headers=HEADERS_SUPA, params=params, timeout=15)
    r.raise_for_status()
    return [row["ticker"] for row in r.json()]


def upsert_announcements(rows: list[dict]) -> int:
    """Upsert a batch of announcement rows. Returns count inserted/updated."""
    if not rows:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/announcement?on_conflict=asx_id"
    r = requests.post(url, headers=HEADERS_SUPA, json=rows, timeout=30)
    if r.status_code not in (200, 201):
        print(f"    [ERROR] Supabase upsert failed {r.status_code}: {r.text[:300]}")
        return 0
    return len(rows)


# ── ASX helpers ────────────────────────────────────────────────────────────────

def fetch_announcements(ticker: str, count: int) -> list[dict]:
    url = ASX_API.format(ticker=ticker)
    params = {"count": count}
    try:
        r = requests.get(url, params=params, timeout=15,
                         headers={"Accept": "application/json"})
        if r.status_code == 404:
            print(f"  [{ticker}] 404 – skipping")
            return []
        r.raise_for_status()
        data = r.json()
        return data.get("data", {}).get("items", [])
    except requests.RequestException as e:
        print(f"  [{ticker}] request error: {e}")
        return []


# ── Main ───────────────────────────────────────────────────────────────────────

def process_ticker(ticker: str, count: int) -> tuple[int, int]:
    """Returns (fetched, upserted)."""
    items = fetch_announcements(ticker, count)
    if not items:
        return 0, 0

    rows = []
    for item in items:
        title = item.get("headline", "")
        atype = item.get("announcementType", "")
        doc_key = item.get("documentKey", "")
        if not doc_key:
            continue  # can't upsert without a key

        category, needs_proc = classify(title, atype)

        # Convert fileSize string like "5508KB" → keep as-is for the size field
        size_str = item.get("fileSize") or None

        rows.append({
            "ticker": ticker,
            "title": title,
            "asx_id": doc_key,
            "asx_url": ASX_DOC_URL.format(doc_key=doc_key),
            "release_date": item.get("date"),
            "size": size_str,
            "category": category,
            "is_price_sensitive": bool(item.get("isPriceSensitive", False)),
            "needs_processing": needs_proc,
        })

    upserted = upsert_announcements(rows)
    return len(items), upserted


def main():
    parser = argparse.ArgumentParser(description="Poll ASX announcements into Supabase")
    parser.add_argument("--backfill", action="store_true",
                        help="Fetch 100 announcements per company instead of 20")
    parser.add_argument("--ticker", metavar="TICKER",
                        help="Process a single ticker only (e.g. BOT)")
    args = parser.parse_args()

    count = 100 if args.backfill else 20

    if args.ticker:
        tickers = [args.ticker.upper()]
    else:
        print("Fetching active tickers from Supabase…")
        tickers = get_active_tickers()
        print(f"Found {len(tickers)} active companies.\n")

    total_fetched = total_upserted = 0
    for ticker in tickers:
        fetched, upserted = process_ticker(ticker, count)
        print(f"  {ticker:6s}  fetched={fetched:3d}  upserted={upserted:3d}")
        total_fetched += fetched
        total_upserted += upserted
        time.sleep(0.25)  # be polite to the ASX API

    print(f"\nDone. Total fetched={total_fetched}  upserted={total_upserted}")


if __name__ == "__main__":
    main()
