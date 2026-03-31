#!/usr/bin/env python3
"""
fetch_competitors.py

For each indication in pipeline_asset, fetches:
  1. Phase 2+ active competitor trials from ClinicalTrials.gov → competitor_trial table
  2. FDA-approved drugs for that indication from OpenFDA → approved_drug table

Run weekly to keep competitive intelligence fresh. Each company's page queries
by ticker, so data is stored per (ticker, indication) pair.

Usage:
  python fetch_competitors.py                  # all companies
  python fetch_competitors.py --ticker BOT     # one company
  python fetch_competitors.py --dry-run        # print results, no DB writes
"""

import argparse
import os
import re
import time
import requests
from datetime import date

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
CT_API      = "https://clinicaltrials.gov/api/v2/studies"
FDA_API     = "https://api.fda.gov/drug/label.json"

HEADERS_SUPA = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# Phases to include (Phase 2 and above only)
INCLUDE_PHASES = {"PHASE2", "PHASE3", "PHASE4"}

# Statuses to include
ACTIVE_STATUSES = [
    "RECRUITING", "ACTIVE_NOT_RECRUITING",
    "NOT_YET_RECRUITING", "ENROLLING_BY_INVITATION",
]

# Expand common abbreviations for CT.gov search (not stored — normalised form is stored)
INDICATION_SEARCH_OVERRIDES: dict[str, str] = {
    "nsclc":  "non-small cell lung cancer",
    "sclc":   "small cell lung cancer",
    "gbm":    "glioblastoma",
    "mbc":    "metastatic breast cancer",
    "tnbc":   "triple-negative breast cancer",
    "hcc":    "hepatocellular carcinoma",
    "rcc":    "renal cell carcinoma",
    "aml":    "acute myeloid leukemia",
    "cll":    "chronic lymphocytic leukemia",
    "dlbcl":  "diffuse large b-cell lymphoma",
    "t1d":    "type 1 diabetes",
    "t2d":    "type 2 diabetes",
    "ra":     "rheumatoid arthritis",
    "als":    "amyotrophic lateral sclerosis",
    "cf":     "cystic fibrosis",
    "dmd":    "duchenne muscular dystrophy",
    "pd":     "parkinson's disease",
    "ad":     "alzheimer's disease",
    "ms":     "multiple sclerosis",
    "ibd":    "inflammatory bowel disease",
    "uc":     "ulcerative colitis",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalise(raw: str) -> str:
    """Normalise indication for storage key — lowercase + strip only."""
    return raw.lower().strip()


def search_term(norm: str) -> str:
    """Best search term for external APIs — expand abbreviations if known."""
    return INDICATION_SEARCH_OVERRIDES.get(norm, norm)


def parse_date(d) -> str | None:
    if not d:
        return None
    if isinstance(d, dict):
        d = d.get("date", "")
    try:
        parts = str(d).strip().split("-")
        if len(parts) == 3:
            return str(d).strip()[:10]
        if len(parts) == 2:
            return f"{parts[0]}-{parts[1]}-01"
        return None
    except Exception:
        return None


# ── Supabase ──────────────────────────────────────────────────────────────────

def get_tracked_sponsors() -> set[str]:
    """Lowercase names of all ASX companies we already track."""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/company",
        headers=HEADERS_SUPA,
        params={"select": "name", "status": "eq.active"},
        timeout=15,
    )
    names = {row["name"].lower() for row in (r.json() if r.status_code == 200 else [])}
    # Also cover known sponsor aliases used in fetch_trials.py
    names.update({
        "mesoblast", "imugene", "botanix pharmaceuticals", "telix pharmaceuticals",
        "radiopharm theranostics", "clarity pharmaceuticals", "neuren pharmaceuticals",
        "opthea", "chimeric therapeutics", "patrys", "percheron therapeutics",
        "pyc therapeutics", "race oncology", "amplia therapeutics", "actinogen medical",
        "starpharma", "syntara", "acrux", "aroa biosurgery", "ebr systems",
        "4dmedical", "control bionics", "nanosonics", "polynovo", "csl",
        "anteris technologies", "botanix sb inc.", "botanix sb inc",
    })
    return names


def get_indications(ticker_filter: str | None = None) -> dict[str, set[str]]:
    """
    Returns {normalised_indication → set of tickers} from pipeline_asset.
    Only includes rows with a non-null indication.
    """
    params: dict = {"select": "ticker,indication", "indication": "not.is.null"}
    if ticker_filter:
        params["ticker"] = f"eq.{ticker_filter}"
    r = requests.get(f"{SUPABASE_URL}/rest/v1/pipeline_asset", headers=HEADERS_SUPA, params=params, timeout=15)
    result: dict[str, set[str]] = {}
    for row in (r.json() if r.status_code == 200 else []):
        raw = (row.get("indication") or "").strip()
        if not raw:
            continue
        norm = normalise(raw)
        result.setdefault(norm, set()).add(row["ticker"])
    return result


def upsert(table: str, rows: list[dict], conflict_cols: str) -> bool:
    if not rows:
        return True
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict_cols}"
    r = requests.post(url, headers=HEADERS_SUPA, json=rows, timeout=30)
    if r.status_code in (200, 201):
        return True
    print(f"    [FAIL] {table} upsert {r.status_code}: {r.text[:200]}")
    return False


# ── ClinicalTrials.gov ────────────────────────────────────────────────────────

CT_FIELDS = ",".join([
    "NCTId", "BriefTitle", "Phase", "OverallStatus",
    "LeadSponsorName", "EnrollmentCount", "PrimaryCompletionDate", "StudyType",
])


def fetch_ct_competitors(indication_norm: str, exclude_sponsors: set[str]) -> list[dict]:
    """Fetch Phase 2+ active trials for an indication, excluding our tracked companies."""
    term = search_term(indication_norm)
    rows: list[dict] = []
    next_token = None

    while True:
        params: dict = {
            "query.cond": term,
            "filter.overallStatus": ",".join(ACTIVE_STATUSES),
            "fields": CT_FIELDS,
            "pageSize": 100,
            "format": "json",
        }
        if next_token:
            params["pageToken"] = next_token

        try:
            r = requests.get(CT_API, params=params, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200:
                print(f"    CT.gov {r.status_code} for '{term}'")
                break
            data = r.json()
        except Exception as e:
            print(f"    CT.gov error: {e}")
            break

        for study in data.get("studies", []):
            proto      = study.get("protocolSection", {})
            id_mod     = proto.get("identificationModule", {})
            status_mod = proto.get("statusModule", {})
            design_mod = proto.get("designModule", {})
            sponsor_mod = proto.get("sponsorCollaboratorsModule", {})

            nct_id = id_mod.get("nctId")
            if not nct_id:
                continue

            # Interventional studies only
            if design_mod.get("studyType") != "INTERVENTIONAL":
                continue

            # Phase 2+ filter
            phases = design_mod.get("phases", [])
            if not any(p in INCLUDE_PHASES for p in phases):
                continue

            sponsor = sponsor_mod.get("leadSponsor", {}).get("name", "")
            if sponsor.lower() in exclude_sponsors:
                continue

            phase_str = "/".join(phases) if phases else None
            enrollment = status_mod.get("enrollmentInfo", {}).get("count")

            rows.append({
                "indication":             indication_norm,
                "nct_id":                 nct_id,
                "brief_title":            id_mod.get("briefTitle"),
                "phase":                  phase_str,
                "status":                 status_mod.get("overallStatus"),
                "sponsor":                sponsor or None,
                "enrollment_target":      enrollment,
                "primary_completion_date": parse_date(
                    status_mod.get("primaryCompletionDateStruct", {}).get("date")
                ),
                "registry_url": f"https://clinicaltrials.gov/study/{nct_id}",
                "last_fetched": str(date.today()),
            })

        next_token = data.get("nextPageToken")
        if not next_token:
            break
        time.sleep(0.3)

    return rows


# ── OpenFDA ───────────────────────────────────────────────────────────────────

def fetch_approved_drugs(indication_norm: str) -> list[dict]:
    """
    Query OpenFDA drug label endpoint for approved (NDA/BLA) drugs in this indication.
    Deduplicates by generic name. Filters to prescription drugs only.
    """
    term = search_term(indication_norm)
    # Key words used to confirm the indication text actually matches
    key_words = [w for w in term.lower().split() if len(w) >= 5]

    try:
        r = requests.get(
            FDA_API,
            params={"search": f'indications_and_usage:"{term}"', "limit": 20},
            timeout=20,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        if r.status_code == 404:
            return []
        if r.status_code != 200:
            print(f"    OpenFDA {r.status_code} for '{term}'")
            return []
        data = r.json()
    except Exception as e:
        print(f"    OpenFDA error: {e}")
        return []

    seen_generics: set[str] = set()
    rows: list[dict] = []

    for result in data.get("results", []):
        openfda = result.get("openfda", {})

        generic_names = openfda.get("generic_name", [])
        brand_names   = openfda.get("brand_name", [])
        if not generic_names and not brand_names:
            continue

        generic = generic_names[0].lower() if generic_names else None
        if generic and generic in seen_generics:
            continue

        # Only NDA (new drug application) or BLA (biologics) — not ANDA (generics), not OTC
        app_numbers = openfda.get("application_number", [])
        app_num = next((a for a in app_numbers if a.startswith(("NDA", "BLA"))), None)
        if not app_num:
            continue

        # Confirm indication text actually mentions our search term
        ind_text = " ".join(result.get("indications_and_usage", [])).lower()
        if key_words and not any(kw in ind_text for kw in key_words):
            continue

        if generic:
            seen_generics.add(generic)

        manufacturers = openfda.get("manufacturer_name", [])

        # Build FDA source URL
        clean_num = re.sub(r"^(NDA|BLA)", "", app_num).lstrip("0")
        source_url = (
            f"https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm"
            f"?event=overview.process&ApplNo={clean_num}"
        )

        # effective_time as rough label date ("20231115" → "2023-11-15")
        eff = result.get("effective_time", "")
        label_date = None
        if len(eff) == 8:
            try:
                label_date = f"{eff[:4]}-{eff[4:6]}-{eff[6:8]}"
            except Exception:
                pass

        rows.append({
            "indication":        indication_norm,
            "drug_name":         generic or brand_names[0].lower(),
            "brand_name":        brand_names[0] if brand_names else None,
            "sponsor":           manufacturers[0] if manufacturers else None,
            "label_date":        label_date,
            "application_number": app_num,
            "source_url":        source_url,
            "last_fetched":      str(date.today()),
        })

        if len(rows) >= 8:  # cap per indication — avoids noise
            break

    return rows


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch competitive landscape data")
    parser.add_argument("--ticker",  help="Only process this ticker's indications")
    parser.add_argument("--dry-run", action="store_true", help="Print without writing to DB")
    args = parser.parse_args()

    print("Loading tracked sponsor names...")
    exclude_sponsors = get_tracked_sponsors()

    print("Loading pipeline indications...")
    ticker_filter = args.ticker.upper() if args.ticker else None
    indications = get_indications(ticker_filter)

    if not indications:
        print("No indications found in pipeline_asset.")
        return

    print(f"Found {len(indications)} distinct indication(s).\n")

    total_trials = 0
    total_drugs  = 0

    for norm, tickers in sorted(indications.items()):
        ticker_str = ", ".join(sorted(tickers))
        print(f"\n  [{ticker_str}]  {norm!r}")

        # ── Competitor trials ────────────────────────────────────────────────
        trials_base = fetch_ct_competitors(norm, exclude_sponsors)
        print(f"    CT.gov: {len(trials_base)} competitor trial(s) (Phase 2+, active)")

        if trials_base and not args.dry_run:
            for ticker in tickers:
                rows = [{**t, "ticker": ticker} for t in trials_base]
                upsert("competitor_trial", rows, "ticker,nct_id,indication")

        total_trials += len(trials_base)
        time.sleep(0.5)

        # ── Approved drugs ───────────────────────────────────────────────────
        drugs_base = fetch_approved_drugs(norm)
        print(f"    OpenFDA: {len(drugs_base)} approved drug(s)")
        for d in drugs_base:
            brand = f" ({d['brand_name']})" if d.get("brand_name") else ""
            sponsor = f" — {d['sponsor']}" if d.get("sponsor") else ""
            print(f"      {d['drug_name']}{brand}{sponsor}  [{d.get('application_number', '?')}]")

        if drugs_base and not args.dry_run:
            for ticker in tickers:
                rows = [{**d, "ticker": ticker} for d in drugs_base]
                upsert("approved_drug", rows, "ticker,drug_name,indication")

        total_drugs += len(drugs_base)
        time.sleep(0.5)

    print(f"\n{'='*50}")
    print(f"Done. {total_trials} competitor trials · {total_drugs} approved drugs.")
    if args.dry_run:
        print("(DRY RUN — no DB writes)")


if __name__ == "__main__":
    main()
