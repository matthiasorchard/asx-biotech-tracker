#!/usr/bin/env python3
"""
fetch_publications.py

Searches PubMed for clinical publications related to each tracked ASX company,
using drug names from pipeline_asset + company affiliation.

Detects ASCO/ASH/ESMO/AACR conference abstracts by journal name.

Usage:
  python fetch_publications.py                  # all companies
  python fetch_publications.py --ticker BOT     # single company
  python fetch_publications.py --days 180       # lookback window (default 365)
"""

import argparse
import re
import time
from datetime import date, datetime

import requests

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://zdnhdbkjwlzvzdxjctai.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbmhkYmtqd2x6dnpkeGpjdGFpIiwicm9sZ"
    "SI6ImFub24iLCJpYXQiOjE3NzQyMTAwOTQsImV4cCI6MjA4OTc4NjA5NH0"
    "._GAcI7-mFZoVAJxQhJwNo1G6e5EXba2HVoWghBCqTuM"
)
PUBMED_SEARCH  = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_SUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

HEADERS_SUPA = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates",
}

# Journal → conference mapping
CONFERENCE_JOURNALS = {
    "j clin oncol":         "ASCO",
    "journal of clinical oncology": "ASCO",
    "jco oncol pract":      "ASCO",
    "blood":                "ASH",
    "blood adv":            "ASH",
    "ann oncol":            "ESMO",
    "annals of oncology":   "ESMO",
    "eur j cancer":         "ESMO",
    "cancer res":           "AACR",
    "cancer research":      "AACR",
    "clin cancer res":      "AACR",
    "j thorac oncol":       "IASLC",
}

# Drug name terms too generic to search usefully
SKIP_TERMS = {
    "car-t", "car t", "mrna", "sirna", "adc", "tki",
    "antibody", "vaccine", "peptide", "gene therapy",
}


# ── Supabase helpers ───────────────────────────────────────────────────────────

def get_companies(ticker_filter=None) -> list[dict]:
    """Return companies with their drug names and affiliation search terms."""
    url = f"{SUPABASE_URL}/rest/v1/company"
    params = {"select": "ticker,name", "order": "ticker.asc"}
    if ticker_filter:
        params["ticker"] = f"eq.{ticker_filter}"
    r = requests.get(url, headers=HEADERS_SUPA, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def get_drug_names(ticker: str) -> list[str]:
    """Return distinct drug search terms for a ticker from pipeline_asset."""
    url = f"{SUPABASE_URL}/rest/v1/pipeline_asset"
    params = {"select": "drug_name", "ticker": f"eq.{ticker}"}
    r = requests.get(url, headers=HEADERS_SUPA, params=params, timeout=15)
    if r.status_code != 200:
        return []

    terms = set()
    for row in r.json():
        raw = row.get("drug_name", "") or ""
        # Extract both the brand name and INN (in parentheses)
        # e.g. "SOFDRA (sofpironium)" → ["SOFDRA", "sofpironium"]
        parts = [raw]
        m = re.search(r'\(([^)]+)\)', raw)
        if m:
            parts.append(m.group(1))
            parts.append(raw[:raw.index('(')].strip())

        for p in parts:
            p = p.strip()
            if len(p) < 4:
                continue
            if p.lower() in SKIP_TERMS:
                continue
            # Skip obvious generic descriptions
            if any(skip in p.lower() for skip in SKIP_TERMS):
                continue
            terms.add(p)

    return list(terms)


def get_existing_pmids(ticker: str) -> set[str]:
    url = f"{SUPABASE_URL}/rest/v1/publication"
    params = {"select": "pmid", "ticker": f"eq.{ticker}"}
    r = requests.get(url, headers=HEADERS_SUPA, params=params, timeout=15)
    return {row["pmid"] for row in r.json()} if r.status_code == 200 else set()


def upsert_publications(rows: list[dict]) -> int:
    if not rows:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/publication?on_conflict=ticker,pmid"
    r = requests.post(url, headers=HEADERS_SUPA, json=rows, timeout=15)
    return len(rows) if r.status_code in (200, 201) else 0


# ── PubMed helpers ─────────────────────────────────────────────────────────────

def detect_conference(journal: str) -> str | None:
    j = journal.lower()
    for key, conf in CONFERENCE_JOURNALS.items():
        if key in j:
            return conf
    return None


def parse_pubmed_date(pubdate: str) -> str | None:
    """Convert PubMed date string to ISO date."""
    if not pubdate:
        return None
    # Formats: "2025 Jun", "2025 Jun 15", "2025"
    for fmt in ("%Y %b %d", "%Y %b", "%Y"):
        try:
            d = datetime.strptime(pubdate.strip(), fmt)
            return d.date().isoformat()
        except ValueError:
            continue
    return None


def search_pubmed(query: str, days: int) -> list[str]:
    """Search PubMed and return list of PMIDs."""
    params = {
        "db":       "pubmed",
        "term":     query,
        "datetype": "pdat",
        "reldate":  days,
        "retmax":   20,
        "retmode":  "json",
    }
    try:
        r = requests.get(PUBMED_SEARCH, params=params,
                         headers={"User-Agent": "ASX-Biotech-Tracker/1.0"},
                         timeout=15)
        return r.json()["esearchresult"]["idlist"]
    except Exception:
        return []


def fetch_summaries(pmids: list[str]) -> dict:
    """Fetch PubMed summaries for a list of PMIDs."""
    if not pmids:
        return {}
    try:
        r = requests.get(PUBMED_SUMMARY,
                         params={"db": "pubmed", "id": ",".join(pmids), "retmode": "json"},
                         headers={"User-Agent": "ASX-Biotech-Tracker/1.0"},
                         timeout=15)
        result = r.json().get("result", {})
        result.pop("uids", None)
        return result
    except Exception:
        return {}


# ── Main processing ────────────────────────────────────────────────────────────

def process_company(ticker: str, company_name: str, days: int) -> int:
    """Search PubMed for a company and upsert new publications. Returns count inserted."""
    drug_terms = get_drug_names(ticker)
    existing = get_existing_pmids(ticker)

    # Build search queries:
    # 1. Drug name searches (Title/Abstract)
    # 2. Company affiliation search
    queries = []
    for term in drug_terms:
        queries.append((f'"{term}"[Title/Abstract]', term))

    # Affiliation search — catches papers by company staff
    queries.append((f'"{company_name}"[Affiliation]', None))

    # Collect all new PMIDs with their matching drug term
    pmid_to_drug: dict[str, str | None] = {}
    for query, drug in queries:
        # Add clinical filter to affiliation searches to reduce noise
        full_query = query
        if drug is None:
            full_query += ' AND ("clinical trial"[pt] OR "phase"[tiab] OR "randomized"[tiab])'
        ids = search_pubmed(full_query, days)
        for pmid in ids:
            if pmid not in existing and pmid not in pmid_to_drug:
                pmid_to_drug[pmid] = drug
        time.sleep(0.4)  # NCBI rate limit: 3 req/s without API key

    if not pmid_to_drug:
        return 0

    # Fetch summaries for new PMIDs
    summaries = fetch_summaries(list(pmid_to_drug.keys()))
    rows = []
    for pmid, doc in summaries.items():
        journal   = doc.get("source", "")
        pub_date  = parse_pubmed_date(doc.get("pubdate", ""))
        pub_types = [t for t in doc.get("pubtype", []) if t != "Journal Article"]
        conf      = detect_conference(journal)
        rows.append({
            "ticker":       ticker,
            "pmid":         pmid,
            "title":        doc.get("title", "")[:500],
            "journal":      journal,
            "pub_date":     pub_date,
            "conference":   conf,
            "drug_name":    pmid_to_drug.get(pmid),
            "abstract_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "pub_types":    pub_types or None,
        })

    inserted = upsert_publications(rows)
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Fetch PubMed publications for ASX biotechs")
    parser.add_argument("--ticker", metavar="TICKER", help="Only process this ticker")
    parser.add_argument("--days",   type=int, default=365, help="Lookback window in days (default 365)")
    args = parser.parse_args()

    companies = get_companies(args.ticker.upper() if args.ticker else None)
    print(f"Searching PubMed for {len(companies)} companies (last {args.days} days)...\n")

    total = 0
    for c in companies:
        ticker = c["ticker"]
        name   = c["name"]
        count  = process_company(ticker, name, args.days)
        if count > 0:
            print(f"  {ticker}: {count} new publication(s) found")
        else:
            print(f"  {ticker}: nothing new")
        total += count
        time.sleep(0.5)

    print(f"\nDone. {total} total publications inserted.")


if __name__ == "__main__":
    main()
