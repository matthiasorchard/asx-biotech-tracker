#!/usr/bin/env python3
"""
fetch_prices.py

Pulls daily closing prices, volume, and market cap from Yahoo Finance
for all active ASX companies in Supabase and upserts into price_snapshot.

ASX tickers need a .AX suffix for Yahoo Finance (e.g. BOT -> BOT.AX).

Usage:
  python fetch_prices.py               # today's prices for all companies
  python fetch_prices.py --ticker BOT  # single company
  python fetch_prices.py --days 30     # last 30 days for all companies
"""

import argparse
import os
import time
from datetime import date, timedelta

import requests
import yfinance as yf

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}


# ── Supabase helpers ───────────────────────────────────────────────────────────

def get_tickers(ticker_filter: str | None) -> list[str]:
    url = f"{SUPABASE_URL}/rest/v1/company"
    params = {"select": "ticker", "order": "ticker.asc"}
    if ticker_filter:
        params["ticker"] = f"eq.{ticker_filter}"
    r = requests.get(url, headers=HEADERS, params=params, timeout=15)
    r.raise_for_status()
    return [row["ticker"] for row in r.json()]


def upsert_snapshots(rows: list[dict]) -> bool:
    if not rows:
        return True
    url = f"{SUPABASE_URL}/rest/v1/price_snapshot?on_conflict=ticker,snapshot_date"
    r = requests.post(url, headers=HEADERS, json=rows, timeout=15)
    if r.status_code in (200, 201):
        return True
    print(f"  Upsert failed {r.status_code}: {r.text[:200]}")
    return False


# ── Price fetching ─────────────────────────────────────────────────────────────

def fetch_ticker_prices(ticker: str, start: date, end: date) -> list[dict]:
    """Fetch OHLCV + market cap for a ticker over a date range."""
    yf_symbol = f"{ticker}.AX"
    try:
        stock = yf.Ticker(yf_symbol)
        hist = stock.history(start=start.isoformat(), end=(end + timedelta(days=1)).isoformat())

        if hist.empty:
            print(f"  {ticker}: no data from Yahoo Finance")
            return []

        # Get shares outstanding for market cap calculation
        info = {}
        try:
            info = stock.info or {}
        except Exception:
            pass

        shares_outstanding = info.get("sharesOutstanding") or info.get("impliedSharesOutstanding")

        rows = []
        for dt, row in hist.iterrows():
            snapshot_date = dt.date().isoformat()
            close = round(float(row["Close"]), 4) if row["Close"] else None
            volume = int(row["Volume"]) if row["Volume"] else None

            # Market cap in AUD millions
            market_cap_m = None
            if close and shares_outstanding:
                market_cap_m = round((close * shares_outstanding) / 1_000_000, 2)

            rows.append({
                "ticker": ticker,
                "snapshot_date": snapshot_date,
                "close_price": close,
                "volume": volume,
                "market_cap_m": market_cap_m,
            })

        # Update shares_outstanding_m on company record
        if shares_outstanding:
            shares_m = round(shares_outstanding / 1_000_000, 2)
            update_company_shares(ticker, shares_m)

        return rows

    except Exception as e:
        print(f"  {ticker}: error — {e}")
        return []


def update_company_shares(ticker: str, shares_m: float):
    url = f"{SUPABASE_URL}/rest/v1/company?ticker=eq.{ticker}"
    requests.patch(url, headers=HEADERS, json={"shares_outstanding_m": shares_m}, timeout=15)


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch ASX prices from Yahoo Finance")
    parser.add_argument("--ticker", metavar="TICKER", help="Only fetch this ticker")
    parser.add_argument("--days", type=int, default=1,
                        help="Number of days of history to fetch (default: 1 = today only)")
    args = parser.parse_args()

    tickers = get_tickers(args.ticker.upper() if args.ticker else None)
    if not tickers:
        print("No companies found.")
        return

    end_date = date.today()
    start_date = end_date - timedelta(days=args.days)

    print(f"Fetching prices for {len(tickers)} companies ({start_date} to {end_date})...\n")

    total_rows = 0
    errors = 0

    for ticker in tickers:
        rows = fetch_ticker_prices(ticker, start_date, end_date)
        if rows:
            ok = upsert_snapshots(rows)
            if ok:
                prices = [r["close_price"] for r in rows if r["close_price"]]
                latest = prices[-1] if prices else None
                print(f"  {ticker}: {len(rows)} day(s) upserted — latest close ${latest}")
                total_rows += len(rows)
            else:
                errors += 1
        else:
            errors += 1
        time.sleep(0.3)  # be polite to Yahoo Finance

    print(f"\n{'='*50}")
    print(f"Done. {total_rows} price rows upserted, {errors} errors.")


if __name__ == "__main__":
    main()
