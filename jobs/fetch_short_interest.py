"""
fetch_short_interest.py  —  Download ASIC daily aggregated short position data.

ASIC publishes short positions for all ASX stocks with a T+4 lag (4 trading days after
the reporting day). This script downloads the latest available file, filters to tracked
companies, and upserts into the short_interest table.

Usage:
  python fetch_short_interest.py            # fetch latest available report
  python fetch_short_interest.py --date 2025-03-20   # fetch a specific date
  python fetch_short_interest.py --history  # fetch last 30 available reports (backfill)

Data source: https://asic.gov.au/regulatory-resources/markets/short-selling/short-selling-data/
File URL pattern: https://download.asic.gov.au/short-selling/RR{YYYYMMDD}-001-SSDailyAggShortPos.csv
"""

import argparse
import csv
import io
import os
from datetime import date, timedelta
from urllib.request import urlopen, Request
from supabase import create_client

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://zdnhdbkjwlzvzdxjctai.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbmhkYmtqd2x6dnpkeGpjdGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTAwOTQsImV4cCI6MjA4OTc4NjA5NH0._GAcI7-mFZoVAJxQhJwNo1G6e5EXba2HVoWghBCqTuM')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

ASIC_URL = 'https://download.asic.gov.au/short-selling/RR{date}-001-SSDailyAggShortPos.csv'
ASIC_PAGE = 'https://asic.gov.au/regulatory-resources/markets/short-selling/short-selling-data/'

HEADERS = {'User-Agent': 'ASX-Biotech-Tracker/1.0 (research tool)'}


def get_tracked_tickers():
    res = supabase.from_('company').select('ticker').eq('status', 'active').execute()
    return {r['ticker'] for r in (res.data or [])}


def business_days_back(n):
    """Return the last n weekdays as date strings YYYYMMDD."""
    days = []
    d = date.today()
    while len(days) < n:
        d -= timedelta(days=1)
        if d.weekday() < 5:  # Mon-Fri
            days.append(d)
    return days


def try_fetch_csv(report_date):
    """Try to download an ASIC short selling CSV for a given date. Returns (csv_text, url) or (None, None)."""
    date_str = report_date.strftime('%Y%m%d')
    url = ASIC_URL.format(date=date_str)
    try:
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=15) as resp:
            content = resp.read().decode('utf-8', errors='replace')
            if 'Product Code' in content or 'PRODUCT CODE' in content:
                return content, url
    except Exception:
        pass
    return None, None


def find_latest_report(max_lookback=14):
    """Find the most recent available ASIC short selling report (T+4 lag)."""
    candidates = business_days_back(max_lookback)
    for d in candidates:
        csv_text, url = try_fetch_csv(d)
        if csv_text:
            return csv_text, d.isoformat(), url
    return None, None, None


def parse_csv(csv_text, tracked_tickers):
    """Parse ASIC CSV and return rows for tracked companies only."""
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = []
    for row in reader:
        # Column names vary slightly across files — handle both cases
        ticker = (row.get('Product Code') or row.get('PRODUCT CODE') or '').strip()
        if not ticker or ticker not in tracked_tickers:
            continue

        short_shares_raw = (row.get('Reported Short Positions') or row.get('REPORTED SHORT POSITIONS') or '').replace(',', '').strip()
        total_raw = (row.get('Total Product in Issue') or row.get('TOTAL PRODUCT IN ISSUE') or '').replace(',', '').strip()
        pct_raw = (row.get('% of Total Product in Issue Reported as Short Positions') or
                   row.get('% OF TOTAL PRODUCT IN ISSUE REPORTED AS SHORT POSITIONS') or '').strip()

        try:
            short_shares = int(short_shares_raw) if short_shares_raw else None
        except ValueError:
            short_shares = None
        try:
            total_shares = int(total_raw) if total_raw else None
        except ValueError:
            total_shares = None
        try:
            short_pct = float(pct_raw.replace('%', '')) if pct_raw else None
        except ValueError:
            short_pct = None

        rows.append({
            'ticker': ticker,
            'short_position_shares': short_shares,
            'total_shares': total_shares,
            'short_pct': short_pct,
        })
    return rows


def fetch_and_store(report_date=None, dry_run=False):
    """Fetch a report for a given date (or latest if None) and store results."""
    tracked = get_tracked_tickers()

    if report_date:
        d = date.fromisoformat(report_date)
        csv_text, url = try_fetch_csv(d)
        if not csv_text:
            print(f"No ASIC report available for {report_date}")
            return 0
        date_str = report_date
    else:
        csv_text, date_str, url = find_latest_report()
        if not csv_text:
            print("Could not find a recent ASIC short selling report (checked last 14 business days)")
            return 0

    print(f"Report date: {date_str}")
    print(f"Source: {url}")

    rows = parse_csv(csv_text, tracked)
    print(f"Found {len(rows)} tracked companies in report")

    if not rows:
        return 0

    for r in rows:
        pct = r['short_pct']
        print(f"  {r['ticker']:6}  {pct:.2f}%  ({r['short_position_shares']:,} short / {r['total_shares']:,} total)" if pct and r['short_position_shares'] and r['total_shares'] else f"  {r['ticker']}  —")

    if not dry_run:
        records = [
            {**r, 'report_date': date_str, 'source_url': url}
            for r in rows
        ]
        supabase.from_('short_interest').upsert(records, on_conflict='ticker,report_date').execute()
        print(f"\nDone: Saved {len(records)} short interest records for {date_str}")
    else:
        print("\n[dry-run] would save", len(rows), "records")

    return len(rows)


def fetch_history(days=30, dry_run=False):
    """Backfill short interest for the last N business days."""
    tracked = get_tracked_tickers()
    candidates = business_days_back(days + 10)  # extra buffer for T+4 lag
    total = 0
    found = 0
    for d in candidates:
        if found >= days:
            break
        csv_text, url = try_fetch_csv(d)
        if not csv_text:
            continue
        found += 1
        date_str = d.isoformat()
        rows = parse_csv(csv_text, tracked)
        if rows and not dry_run:
            records = [{**r, 'report_date': date_str, 'source_url': url} for r in rows]
            supabase.from_('short_interest').upsert(records, on_conflict='ticker,report_date').execute()
            total += len(rows)
            print(f"  {date_str}: saved {len(rows)} records")
        elif rows:
            print(f"  {date_str}: would save {len(rows)} records [dry-run]")

    print(f"\nDone: History backfill complete — {total} records saved")


def main():
    parser = argparse.ArgumentParser(description='Fetch ASIC short selling data')
    parser.add_argument('--date', help='Specific report date YYYY-MM-DD (default: latest available)')
    parser.add_argument('--history', action='store_true', help='Backfill last 30 available reports')
    parser.add_argument('--dry-run', action='store_true', help='Show results without saving')
    args = parser.parse_args()

    if args.history:
        fetch_history(dry_run=args.dry_run)
    else:
        fetch_and_store(report_date=args.date, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
