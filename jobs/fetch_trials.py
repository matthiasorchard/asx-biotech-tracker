#!/usr/bin/env python3
"""
fetch_trials.py

Fetches clinical trial data from ClinicalTrials.gov for all ASX biotech
companies and upserts into the clinical_trial table in Supabase.

Uses the public ClinicalTrials.gov v2 API (no auth required).

Usage:
  python fetch_trials.py               # all companies
  python fetch_trials.py --ticker RAD  # single company
"""

import argparse
import json
import time
import requests

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://zdnhdbkjwlzvzdxjctai.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbmhkYmtqd2x6dnpkeGpjdGFpIiwicm9sZ"
    "SI6ImFub24iLCJpYXQiOjE3NzQyMTAwOTQsImV4cCI6MjA4OTc4NjA5NH0"
    "._GAcI7-mFZoVAJxQhJwNo1G6e5EXba2HVoWghBCqTuM"
)
CT_API = "https://clinicaltrials.gov/api/v2/studies"

HEADERS_SUPA = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# Manual overrides for sponsor search terms that differ from company name
SPONSOR_OVERRIDES = {
    "RAD": "Radiopharm Theranostics",
    "RCR": "Racura",
    "TLX": "Telix Pharmaceuticals",
    "CU6": "Clarity Pharmaceuticals",
    "IMU": "Imugene",
    "IMM": "Immutep",
    "BOT": "Botanix Pharmaceuticals",
    "MSB": "Mesoblast",
    "NEU": "Neuren Pharmaceuticals",
    "OPT": "Opthea",
    "CHM": "Chimeric Therapeutics",
    "PAB": "Patrys",
    "PRN": "Percheron Therapeutics",
    "PYC": "PYC Therapeutics",
    "RAC": "Race Oncology",
    "AMP": "Amplia Therapeutics",
    "ACW": "Actinogen Medical",
    "STA": "Starpharma",
    "SYT": "Syntara",
    "ACR": "Acrux",
    "ARX": "Aroa Biosurgery",
    "EBR": "EBR Systems",
    "4DX": "4DMedical",
    "CBL": "Control Bionics",
    "NAN": "Nanosonics",
    "PNV": "PolyNovo",
    "CSL": "CSL",
    "GBT": "Anteris Technologies",
    "AVR": "Anteris Technologies",
}

# ── Supabase helpers ───────────────────────────────────────────────────────────

def get_companies(ticker_filter=None):
    url = f"{SUPABASE_URL}/rest/v1/company"
    params = {"select": "ticker,name", "order": "ticker.asc"}
    if ticker_filter:
        params["ticker"] = f"eq.{ticker_filter}"
    r = requests.get(url, headers=HEADERS_SUPA, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def get_existing_trials(ticker: str) -> dict:
    """Fetch current primary_completion_date + has_results for all trials of this ticker."""
    url = f"{SUPABASE_URL}/rest/v1/clinical_trial"
    params = {
        "select": "nct_id,primary_completion_date,has_results",
        "ticker": f"eq.{ticker}",
    }
    r = requests.get(url, headers=HEADERS_SUPA, params=params, timeout=15)
    if r.status_code == 200:
        return {row["nct_id"]: row for row in r.json()}
    return {}


def detect_and_log_changes(new_rows: list, existing: dict) -> None:
    """Compare new CT.gov data to existing DB values; log changes to trial_date_change."""
    from datetime import date as _date

    changes = []
    for row in new_rows:
        nct_id = row.get("nct_id")
        old = existing.get(nct_id)
        if not old:
            continue  # new trial, no baseline to compare

        # Check primary_completion_date drift
        old_date = old.get("primary_completion_date")
        new_date = row.get("primary_completion_date")
        if old_date and new_date and old_date != new_date:
            try:
                delta = (_date.fromisoformat(new_date) - _date.fromisoformat(old_date)).days
                changes.append({
                    "nct_id":        nct_id,
                    "ticker":        row["ticker"],
                    "field_name":    "primary_completion_date",
                    "old_value":     old_date,
                    "new_value":     new_date,
                    "days_delta":    delta,
                })
                direction = f"+{delta}d (slipped)" if delta > 0 else f"{delta}d (pulled forward)"
                print(f"    ⚠ DATE CHANGE {nct_id}: {old_date} → {new_date} ({direction})")
            except Exception:
                pass

        # Check has_results flip (trial just posted results to CT.gov)
        old_has = old.get("has_results", False)
        new_has = row.get("has_results", False)
        if not old_has and new_has:
            changes.append({
                "nct_id":        nct_id,
                "ticker":        row["ticker"],
                "field_name":    "has_results",
                "old_value":     "false",
                "new_value":     "true",
                "days_delta":    None,
            })
            print(f"    ★ RESULTS POSTED {nct_id}: trial results now on CT.gov")

    if changes:
        url = f"{SUPABASE_URL}/rest/v1/trial_date_change"
        r = requests.post(url, headers=HEADERS_SUPA, json=changes, timeout=15)
        if r.status_code not in (200, 201):
            print(f"  trial_date_change insert failed {r.status_code}: {r.text[:200]}")


def upsert_trials(rows):
    if not rows:
        return True
    url = f"{SUPABASE_URL}/rest/v1/clinical_trial?on_conflict=nct_id"
    r = requests.post(url, headers=HEADERS_SUPA, json=rows, timeout=15)
    if r.status_code in (200, 201):
        return True
    print(f"  Upsert failed {r.status_code}: {r.text[:300]}")
    return False


def upsert_enrollment_snapshots(rows):
    """Insert today's enrollment snapshot for trials that have enrollment_actual."""
    snapshots = [
        {"nct_id": r["nct_id"], "ticker": r["ticker"], "enrollment_actual": r["enrollment_actual"]}
        for r in rows if r.get("enrollment_actual") is not None
    ]
    if not snapshots:
        return
    url = f"{SUPABASE_URL}/rest/v1/trial_enrollment_snapshot?on_conflict=nct_id,snapshot_date"
    headers = {**HEADERS_SUPA, "Prefer": "resolution=ignore-duplicates"}
    r = requests.post(url, headers=headers, json=snapshots, timeout=15)
    if r.status_code not in (200, 201):
        print(f"  Snapshot upsert failed {r.status_code}: {r.text[:200]}")


# ── ClinicalTrials.gov API ─────────────────────────────────────────────────────

CT_FIELDS = ",".join([
    "NCTId", "BriefTitle", "OfficialTitle", "OverallStatus", "Phase",
    "StudyType", "Condition", "InterventionName", "LeadSponsorName",
    "EnrollmentCount", "StartDate", "PrimaryCompletionDate", "CompletionDate",
    "LastUpdatePostDate", "LocationFacility", "LocationCountry",
    "LocationStatus", "HasResults", "ArmGroupLabel",
])

def fetch_company_trials(sponsor_name, page_size=50):
    """Fetch all trials for a sponsor from ClinicalTrials.gov."""
    all_studies = []
    next_token = None

    while True:
        params = {
            "query.spons": sponsor_name,
            "fields": CT_FIELDS,
            "pageSize": page_size,
            "format": "json",
        }
        if next_token:
            params["pageToken"] = next_token

        try:
            r = requests.get(CT_API, params=params, timeout=20,
                             headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200:
                print(f"  ClinicalTrials.gov returned {r.status_code}")
                break
            data = r.json()
            studies = data.get("studies", [])
            all_studies.extend(studies)
            next_token = data.get("nextPageToken")
            if not next_token:
                break
        except Exception as e:
            print(f"  API error: {e}")
            break

    return all_studies


def parse_study(study, ticker):
    """Convert ClinicalTrials.gov study JSON to our DB schema."""
    proto = study.get("protocolSection", {})
    id_mod = proto.get("identificationModule", {})
    status_mod = proto.get("statusModule", {})
    design_mod = proto.get("designModule", {})
    cond_mod = proto.get("conditionsModule", {})
    arms_mod = proto.get("armsInterventionsModule", {})
    sponsor_mod = proto.get("sponsorCollaboratorsModule", {})
    contacts_mod = proto.get("contactsLocationsModule", {})
    results_mod = study.get("resultsSection", {})

    nct_id = id_mod.get("nctId")
    if not nct_id:
        return None

    # Phase
    phases = design_mod.get("phases", [])
    phase = phases[0] if len(phases) == 1 else "/".join(phases) if phases else None

    # Conditions
    conditions = cond_mod.get("conditions", [])

    # Interventions
    interventions = [
        i.get("name") for i in arms_mod.get("interventions", [])
        if i.get("name")
    ]

    # Countries
    locations = contacts_mod.get("locations", [])
    countries = list({loc.get("country") for loc in locations if loc.get("country")})

    # Enrollment
    enrollment_info = status_mod.get("enrollmentInfo", {})
    enrollment = enrollment_info.get("count")
    enrollment_type = enrollment_info.get("type", "")  # ACTUAL or ESTIMATED
    enrollment_actual = enrollment if enrollment_type == "ACTUAL" else None
    enrollment_target = enrollment if enrollment_type == "ESTIMATED" else (enrollment if enrollment_actual is None else None)

    # Dates
    def parse_date(d):
        if not d:
            return None
        # Can be "2024-06-03" or "2024-06" or "June 2024"
        if isinstance(d, dict):
            d = d.get("date", "")
        try:
            parts = str(d).strip().split("-")
            if len(parts) >= 2:
                return f"{parts[0]}-{parts[1]:>02}-01" if len(parts) == 2 else d
            return None
        except Exception:
            return None

    start_date = parse_date(status_mod.get("startDateStruct", {}).get("date"))
    primary_completion = parse_date(status_mod.get("primaryCompletionDateStruct", {}).get("date"))
    completion_date = parse_date(status_mod.get("completionDateStruct", {}).get("date"))
    last_update = parse_date(status_mod.get("lastUpdatePostDateStruct", {}).get("date"))

    return {
        "ticker": ticker,
        "nct_id": nct_id,
        "title": id_mod.get("officialTitle") or id_mod.get("briefTitle"),
        "brief_title": id_mod.get("briefTitle"),
        "status": status_mod.get("overallStatus"),
        "phase": phase,
        "study_type": design_mod.get("studyType"),
        "conditions": conditions if conditions else None,
        "interventions": interventions if interventions else None,
        "enrollment_target": enrollment_target,
        "enrollment_actual": enrollment_actual,
        "start_date": start_date,
        "primary_completion_date": primary_completion,
        "completion_date": completion_date,
        "last_update_date": last_update,
        "locations_count": len(locations) if locations else None,
        "countries": countries if countries else None,
        "sponsor": sponsor_mod.get("leadSponsor", {}).get("name"),
        "has_results": bool(results_mod),
        "ct_url": f"https://clinicaltrials.gov/study/{nct_id}",
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch clinical trials from ClinicalTrials.gov")
    parser.add_argument("--ticker", metavar="TICKER", help="Only fetch this ticker")
    args = parser.parse_args()

    companies = get_companies(args.ticker.upper() if args.ticker else None)
    if not companies:
        print("No companies found.")
        return

    print(f"Fetching clinical trials for {len(companies)} companies...\n")

    total_upserted = 0
    for company in companies:
        ticker = company["ticker"]
        sponsor = SPONSOR_OVERRIDES.get(ticker, company["name"])

        studies = fetch_company_trials(sponsor)
        if not studies:
            print(f"  {ticker}: no trials found for '{sponsor}'")
            time.sleep(0.5)
            continue

        rows = []
        for study in studies:
            row = parse_study(study, ticker)
            if row:
                rows.append(row)

        if rows:
            # Diff against existing before overwriting
            existing = get_existing_trials(ticker)
            detect_and_log_changes(rows, existing)

            ok = upsert_trials(rows)
            if ok:
                active = sum(1 for r in rows if r.get("status") in
                             ("RECRUITING", "ACTIVE_NOT_RECRUITING", "NOT_YET_RECRUITING"))
                snapped = sum(1 for r in rows if r.get("enrollment_actual") is not None)
                print(f"  {ticker}: {len(rows)} trials upserted ({active} active, {snapped} enrollment snapshots)")
                upsert_enrollment_snapshots(rows)
                total_upserted += len(rows)
            else:
                print(f"  {ticker}: upsert failed")
        else:
            print(f"  {ticker}: no parseable trials")

        time.sleep(0.3)  # be polite to ClinicalTrials.gov

    print(f"\n{'='*50}")
    print(f"Done. {total_upserted} trial records upserted.")


if __name__ == "__main__":
    main()
