#!/usr/bin/env python3
"""
fetch_hotcopper.py

Scrapes HotCopper forum activity for each tracked ASX biotech and stores
daily snapshots in the hotcopper_snapshot table.

Captures:
  - Post/thread counts in last 24h, 7d, 30d
  - Total reply engagement across recent threads
  - Simple title-keyword sentiment (bullish / bearish word counts)
  - Top 5 recent thread titles

Usage:
  python fetch_hotcopper.py                  # all companies
  python fetch_hotcopper.py --ticker BOT     # single company
"""

import argparse
import re
import time
from datetime import date, datetime, timedelta

import requests
from bs4 import BeautifulSoup

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://zdnhdbkjwlzvzdxjctai.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbmhkYmtqd2x6dnpkeGpjdGFpIiwicm9sZ"
    "SI6ImFub24iLCJpYXQiOjE3NzQyMTAwOTQsImV4cCI6MjA4OTc4NjA5NH0"
    "._GAcI7-mFZoVAJxQhJwNo1G6e5EXba2HVoWghBCqTuM"
)
HC_BASE = "https://hotcopper.com.au/asx"

HEADERS_SUPA = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}
HEADERS_HC = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-AU,en;q=0.9",
}

# Simple sentiment word lists
BULLISH_WORDS = {
    "approval", "approved", "milestone", "breakthrough", "positive", "strong",
    "gain", "growth", "revenue", "contract", "partnership", "deal", "upgrade",
    "buy", "accumulate", "target", "upside", "potential", "exciting", "great",
    "success", "successful", "phase 3", "phase3", "fda", "tga", "granted",
    "enrolled", "topline", "top-line", "efficacy", "safe", "significant",
}
BEARISH_WORDS = {
    "concern", "delay", "delayed", "dilution", "dilutive", "sell", "selling",
    "dump", "failed", "failure", "miss", "disappointing", "halt", "suspend",
    "cash", "burn", "runway", "raise", "placement", "spp", "conversion",
    "down", "drop", "fall", "weak", "negative", "trial failure", "missed",
    "terminated", "withdrawn", "adverse", "warning",
}


# ── Supabase helpers ───────────────────────────────────────────────────────────

def get_companies(ticker_filter=None):
    url = f"{SUPABASE_URL}/rest/v1/company"
    params = {"select": "ticker", "order": "ticker.asc"}
    if ticker_filter:
        params["ticker"] = f"eq.{ticker_filter}"
    r = requests.get(url, headers=HEADERS_SUPA, params=params, timeout=15)
    r.raise_for_status()
    return [row["ticker"] for row in r.json()]


def upsert_snapshot(row: dict) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/hotcopper_snapshot?on_conflict=ticker,snapshot_date"
    r = requests.post(url, headers=HEADERS_SUPA, json=row, timeout=15)
    return r.status_code in (200, 201)


# ── HotCopper scraping ─────────────────────────────────────────────────────────

def parse_hc_date(raw: str, today: date) -> date | None:
    """Parse HC thread dates: 'HH:MM' = today, 'DD/MM/YY' = that date, else None."""
    raw = raw.strip()
    if not raw:
        return None
    # Time-only (today's post): "14:23"
    if re.match(r"^\d{1,2}:\d{2}$", raw):
        return today
    # Date format: "31/03/26" or "31/03/2026"
    m = re.match(r"^(\d{1,2})/(\d{2})/(\d{2,4})$", raw)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if year < 100:
            year += 2000
        return date(year, month, day)
    return None


def parse_reply_count(raw: str) -> int:
    """Convert '23K' or '1.2K' or '846' to integer."""
    raw = raw.strip().upper().replace(",", "")
    if not raw:
        return 0
    if raw.endswith("K"):
        try:
            return int(float(raw[:-1]) * 1000)
        except ValueError:
            return 0
    try:
        return int(raw)
    except ValueError:
        return 0


def score_sentiment(titles: list[str]) -> tuple[float, float]:
    """Return (bulls_pct, bears_pct) based on keyword matching in thread titles."""
    bull_hits = 0
    bear_hits = 0
    for title in titles:
        words = set(title.lower().split())
        bull_hits += len(words & BULLISH_WORDS)
        bear_hits += len(words & BEARISH_WORDS)
    total = bull_hits + bear_hits
    if total == 0:
        return 50.0, 50.0
    return round(bull_hits / total * 100, 1), round(bear_hits / total * 100, 1)


def scrape_ticker(ticker: str) -> dict | None:
    url = f"{HC_BASE}/{ticker.lower()}/"
    try:
        r = requests.get(url, headers=HEADERS_HC, timeout=15)
        if r.status_code != 200:
            print(f"  {ticker}: HC returned {r.status_code}")
            return None
    except Exception as e:
        print(f"  {ticker}: request error — {e}")
        return None

    soup = BeautifulSoup(r.text, "html.parser")
    today = date.today()

    thread_div = soup.find("div", class_="thread-list-component")
    if not thread_div:
        print(f"  {ticker}: thread list not found in page")
        return None

    thread_rows = thread_div.find_all("tr", class_=lambda c: c and "thread" in str(c).lower())
    if not thread_rows:
        print(f"  {ticker}: no thread rows")
        return None

    count_24h = 0
    count_7d = 0
    count_30d = 0
    total_replies_7d = 0
    top_titles = []
    all_titles = []

    cutoff_24h = today - timedelta(days=1)
    cutoff_7d  = today - timedelta(days=7)
    cutoff_30d = today - timedelta(days=30)

    for row in thread_rows:
        # Title: first <a> tag in the row that isn't a user link
        title = ""
        for a in row.find_all("a"):
            txt = a.text.strip()
            if txt and len(txt) > 5 and "Ann:" not in txt[:5]:
                title = txt.split("\n")[0].strip()
                break
        if not title:
            # Fallback: first meaningful text in row
            a_tag = row.find("a")
            title = a_tag.text.strip().split("\n")[0] if a_tag else ""

        # Date: first stats-td
        date_td = row.find("td", class_=lambda c: c and "stats-td" in str(c) and "replies" not in str(c))
        thread_date = parse_hc_date(date_td.text if date_td else "", today)

        # Replies
        replies_td = row.find("td", class_=lambda c: c and "replies-td" in str(c))
        replies = parse_reply_count(replies_td.text if replies_td else "")

        if thread_date is None:
            continue

        all_titles.append(title)

        if thread_date >= cutoff_24h:
            count_24h += 1
        if thread_date >= cutoff_7d:
            count_7d += 1
            total_replies_7d += replies
        if thread_date >= cutoff_30d:
            count_30d += 1

        if len(top_titles) < 5 and title:
            top_titles.append(title)

    bulls_pct, bears_pct = score_sentiment(all_titles)

    return {
        "ticker":          ticker,
        "snapshot_date":   today.isoformat(),
        "post_count_24h":  count_24h,
        "post_count_7d":   count_7d,
        "post_count_30d":  count_30d,
        "bulls_pct":       bulls_pct,
        "bears_pct":       bears_pct,
        "top_post_titles": top_titles,
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch HotCopper activity snapshots")
    parser.add_argument("--ticker", metavar="TICKER", help="Only fetch this ticker")
    args = parser.parse_args()

    tickers = get_companies(args.ticker.upper() if args.ticker else None)
    print(f"Fetching HotCopper data for {len(tickers)} companies...\n")

    ok_count = 0
    for ticker in tickers:
        snapshot = scrape_ticker(ticker)
        if snapshot:
            if upsert_snapshot(snapshot):
                p24 = snapshot["post_count_24h"]
                p7  = snapshot["post_count_7d"]
                bulls = snapshot["bulls_pct"]
                print(f"  {ticker}: {p24} posts/24h | {p7} posts/7d | {bulls}% bullish")
                ok_count += 1
            else:
                print(f"  {ticker}: DB upsert failed")
        else:
            print(f"  {ticker}: no data")
        time.sleep(1.5)  # polite scraping — ~1 req/1.5s

    print(f"\nDone. {ok_count}/{len(tickers)} snapshots saved.")


if __name__ == "__main__":
    main()
