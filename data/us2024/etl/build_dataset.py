"""
Build the ElectionVerse US 2024 official presidential dataset.

Inputs (raw/, provided by the project owner, checksums recorded in the manifest):
  - 2024presgeresults.xlsx  FEC "Official 2024 Presidential General Election Results",
                            compiled January 16, 2025.
  - 2024_EAVS_for_Public_Release_nolabel_V2_csv.zip  EAC 2024 EAVS, v2.0.

Outputs (output/):
  - us_presidential_2024_official_51.csv / .json   one row per state + DC (schema.json)
  - us_presidential_2024_candidates_long.csv        votes by candidate per state
  - us_electoral_votes_2024.csv                     electoral votes as certified (separate table)
  - eavs_exceptions.csv                             jurisdictions with missing EAVS values
  - field_lineage.csv, source_manifest.json, qa_report.md

Rules (from the source pack README):
  - Never estimate. Missing stays null, never zero.
  - A state EAVS total is only reported when every jurisdiction in that state
    reports a valid value; otherwise null, with the partial sum in the exception log.
  - Presidential votes (FEC) and ballots counted (EAVS F1a) are kept separate.

Run:  python3 -I etl/build_dataset.py   (from data/us2024)
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
OUT = ROOT / "output"

FEC_FILE = RAW / "2024presgeresults.xlsx"
EAVS_ZIP = RAW / "2024_EAVS_for_Public_Release_nolabel_V2_csv.zip"
EAVS_CSV_NAME = "2024_EAVS_for_Public_Release_nolabel_V2.csv"

SOURCES = {
    "fec_xlsx": {
        "path": "raw/2024presgeresults.xlsx",
        "origin_url": "https://www.fec.gov/documents/5645/2024presgeresults.xlsx",
        "title": "Official 2024 Presidential General Election Results (FEC, compiled January 16, 2025)",
    },
    "eavs_zip": {
        "path": "raw/2024_EAVS_for_Public_Release_nolabel_V2_csv.zip",
        "origin_url": "https://www.eac.gov/sites/default/files/2026-02/2024_EAVS_for_Public_Release_nolabel_V2_csv.zip",
        "title": "EAC 2024 Election Administration and Voting Survey, public release v2.0 (CSV)",
    },
}

TERRITORIES = {"AS", "GU", "MP", "PR", "VI"}
DEM_CANDIDATE = "HARRIS"
REP_CANDIDATE = "TRUMP"
FEC_META_COLUMNS = {"STATE", "ELECTORAL VOTES", "ELECTORAL VOTE: TRUMP (R)", "ELECTORAL VOTE: HARRIS (D)", "TOTAL VOTES"}

FIELDS = [
    "state", "state_abbr", "year",
    "presidential_votes_total", "democratic_votes", "republican_votes", "other_presidential_votes",
    "democratic_share_pct", "republican_share_pct", "other_share_pct",
    "registered_total", "registered_active", "counted_ballots_total",
    "turnout_pct_total_registration", "turnout_pct_active_registration",
]


class QAError(Exception):
    pass


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_jurisdictions() -> list[dict]:
    return json.loads((ROOT / "jurisdictions.json").read_text())


# ---------------------------------------------------------------------------
# FEC
# ---------------------------------------------------------------------------

def read_fec() -> tuple[dict[str, dict], dict, list[str]]:
    """Return per-state candidate votes, the sheet's national total row, and candidate columns."""
    wb = openpyxl.load_workbook(FEC_FILE, data_only=True)
    if len(wb.worksheets) != 1:
        raise QAError(f"FEC workbook has {len(wb.worksheets)} sheets; expected 1")
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h).strip() if h is not None else "" for h in rows[0]]
    if header[0] != "STATE" or header[-1] != "TOTAL VOTES":
        raise QAError(f"Unexpected FEC header: {header[:3]} ... {header[-1]}")
    candidates = [h for h in header if h and h not in FEC_META_COLUMNS]
    for required in (DEM_CANDIDATE, REP_CANDIDATE):
        if required not in candidates:
            raise QAError(f"Candidate column {required} not found")

    states: dict[str, dict] = {}
    total_row = None
    for r in rows[1:]:
        key = r[0]
        if key is None:
            continue
        key = str(key).strip()
        rec = dict(zip(header, r))
        if key == "Total:":
            total_row = rec
            continue
        if key == "Percentage:":
            continue
        if len(key) == 2 and key.isalpha():
            if key in states:
                raise QAError(f"Duplicate FEC row for {key}")
            states[key] = rec
    if total_row is None:
        raise QAError("FEC national total row not found")
    return states, total_row, candidates


def as_int(v) -> int | None:
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        raise QAError(f"Unexpected boolean value {v}")
    if isinstance(v, float):
        if not v.is_integer():
            raise QAError(f"Non-integer vote count {v}")
        return int(v)
    if isinstance(v, int):
        return v
    s = str(v).replace(",", "").strip()
    if not s:
        return None
    return int(s)


# ---------------------------------------------------------------------------
# EAVS
# ---------------------------------------------------------------------------

def read_eavs() -> list[dict]:
    with zipfile.ZipFile(EAVS_ZIP) as z:
        names = z.namelist()
        if names != [EAVS_CSV_NAME]:
            raise QAError(f"Unexpected EAVS zip contents: {names}")
        with z.open(EAVS_CSV_NAME) as f:
            text = io.TextIOWrapper(f, encoding="utf-8-sig", newline="")
            return list(csv.DictReader(text))


def eavs_value(raw: str) -> int | None:
    """Valid non-negative integer, or None for blanks and EAVS special codes (negative values such as -88, -99)."""
    s = (raw or "").strip()
    if not s:
        return None
    x = float(s)
    if not x.is_integer():
        raise QAError(f"Non-integer EAVS count {raw}")
    return int(x) if x >= 0 else None


def aggregate_eavs(rows: list[dict], wanted: set[str]):
    totals: dict[str, dict] = {}
    exceptions: list[dict] = []
    by_state: dict[str, list[dict]] = {}
    for r in rows:
        s = r["State_Abbr"].strip()
        if s in TERRITORIES:
            continue
        by_state.setdefault(s, []).append(r)
    unexpected = set(by_state) - wanted
    if unexpected:
        raise QAError(f"EAVS has unexpected jurisdictions: {sorted(unexpected)}")
    for s, jrows in by_state.items():
        # Guard against a statewide summary row alongside its own county rows.
        summary = [r for r in jrows if r["FIPSCode"].strip().endswith("00000000")]
        if summary and len(jrows) > 1:
            raise QAError(f"{s} has a statewide summary row and {len(jrows) - 1} other rows; would double count")
        rec = {"jurisdictions": len(jrows)}
        for field in ("A1a", "A1b", "F1a"):
            vals = [(r, eavs_value(r[field])) for r in jrows]
            missing = [(r, r[field]) for r, v in vals if v is None]
            partial = sum(v for _, v in vals if v is not None)
            if missing:
                rec[field] = None
                for r, raw in missing:
                    exceptions.append({
                        "state_abbr": s,
                        "field": field,
                        "fips": r["FIPSCode"].strip(),
                        "jurisdiction": r["Jurisdiction_Name"].strip(),
                        "raw_value": raw.strip() if raw else "(blank)",
                        "state_partial_sum_excluding_missing": partial,
                        "jurisdictions_missing_in_state": len(missing),
                        "jurisdictions_in_state": len(jrows),
                    })
            else:
                rec[field] = partial
        totals[s] = rec
    return totals, exceptions


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def pct(num: int | None, den: int | None, dp: int = 4) -> float | None:
    if num is None or den is None or den <= 0:
        return None
    return round(100 * num / den, dp)


def build() -> dict:
    OUT.mkdir(exist_ok=True)
    juris = load_jurisdictions()
    abbrs = [j["state_abbr"] for j in juris]
    if len(abbrs) != 51 or len(set(abbrs)) != 51:
        raise QAError("jurisdictions.json must list 51 distinct jurisdictions")
    names = {j["state_abbr"]: j["state"] for j in juris}

    fec, fec_total, candidates = read_fec()
    if set(fec) != set(abbrs):
        raise QAError(f"FEC states differ from jurisdictions: missing {set(abbrs) - set(fec)}, extra {set(fec) - set(abbrs)}")

    eavs_rows = read_eavs()
    eavs, exceptions = aggregate_eavs(eavs_rows, set(abbrs))
    if set(eavs) != set(abbrs):
        raise QAError(f"EAVS states differ: missing {set(abbrs) - set(eavs)}")

    issues: list[str] = []
    out_rows, long_rows, ev_rows = [], [], []
    for s in abbrs:
        rec = fec[s]
        total = as_int(rec["TOTAL VOTES"])
        cand_votes = {c: as_int(rec[c]) for c in candidates}
        cand_sum = sum(v for v in cand_votes.values() if v is not None)
        if total is None or cand_sum != total:
            raise QAError(f"{s}: candidate columns sum to {cand_sum}, TOTAL VOTES is {total}")
        dem = cand_votes[DEM_CANDIDATE]
        rep = cand_votes[REP_CANDIDATE]
        if dem is None or rep is None:
            raise QAError(f"{s}: missing Harris or Trump votes")
        other = total - dem - rep
        e = eavs[s]
        row = {
            "state": names[s],
            "state_abbr": s,
            "year": 2024,
            "presidential_votes_total": total,
            "democratic_votes": dem,
            "republican_votes": rep,
            "other_presidential_votes": other,
            "democratic_share_pct": pct(dem, total),
            "republican_share_pct": pct(rep, total),
            "other_share_pct": pct(other, total),
            "registered_total": e["A1a"],
            "registered_active": e["A1b"],
            "counted_ballots_total": e["F1a"],
            "turnout_pct_total_registration": pct(e["F1a"], e["A1a"]),
            "turnout_pct_active_registration": pct(e["F1a"], e["A1b"]),
        }
        if row["turnout_pct_active_registration"] is not None and row["turnout_pct_active_registration"] > 100:
            issues.append(f"{s}: turnout against active registration is {row['turnout_pct_active_registration']:.2f}% (> 100%, flagged, not capped).")
        if e["F1a"] is not None and total > e["F1a"]:
            issues.append(f"{s}: presidential votes ({total:,}) exceed EAVS ballots counted F1a ({e['F1a']:,}); definitions differ, flagged.")
        out_rows.append(row)
        for c, v in cand_votes.items():
            if v is not None:
                long_rows.append({"state_abbr": s, "candidate_column": c, "votes": v, "share_pct": pct(v, total)})
        ev_rows.append({
            "state_abbr": s,
            "electoral_votes": as_int(rec["ELECTORAL VOTES"]),
            "electoral_votes_trump": as_int(rec["ELECTORAL VOTE: TRUMP (R)"]) or 0,
            "electoral_votes_harris": as_int(rec["ELECTORAL VOTE: HARRIS (D)"]) or 0,
        })

    # National reconciliation against the sheet's own total row.
    nat_total = sum(r["presidential_votes_total"] for r in out_rows)
    if nat_total != as_int(fec_total["TOTAL VOTES"]):
        raise QAError(f"National total {nat_total} != FEC total row {fec_total['TOTAL VOTES']}")
    for c in candidates:
        col_sum = sum(as_int(fec[s][c]) or 0 for s in abbrs)
        if col_sum != (as_int(fec_total[c]) or 0):
            raise QAError(f"Candidate {c}: states sum {col_sum} != total row {fec_total[c]}")
    ev_total = sum(r["electoral_votes"] for r in ev_rows)
    ev_t = sum(r["electoral_votes_trump"] for r in ev_rows)
    ev_h = sum(r["electoral_votes_harris"] for r in ev_rows)
    if (ev_total, ev_t, ev_h) != (538, as_int(fec_total["ELECTORAL VOTE: TRUMP (R)"]), as_int(fec_total["ELECTORAL VOTE: HARRIS (D)"])):
        raise QAError(f"Electoral votes do not reconcile: {ev_total}, {ev_t}, {ev_h}")
    for r in ev_rows:
        if r["electoral_votes_trump"] + r["electoral_votes_harris"] != r["electoral_votes"]:
            raise QAError(f"{r['state_abbr']}: electoral votes do not add up")
        if r["electoral_votes_trump"] and r["electoral_votes_harris"]:
            issues.append(
                f"{r['state_abbr']}: electoral votes split by district (Trump {r['electoral_votes_trump']}, Harris {r['electoral_votes_harris']}); "
                "the statewide popular vote is not the electoral vote result. See us_electoral_votes_2024.csv."
            )

    write_outputs(out_rows, long_rows, ev_rows, exceptions, issues, fec_total, eavs, abbrs)
    return {"rows": out_rows, "issues": issues, "exceptions": exceptions}


def write_csv(path: Path, rows: list[dict], fields: list[str]):
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r.get(k) is None else r[k]) for k in fields})


def write_outputs(rows, long_rows, ev_rows, exceptions, issues, fec_total, eavs, abbrs):
    built = datetime.now(timezone.utc).isoformat(timespec="seconds")
    write_csv(OUT / "us_presidential_2024_official_51.csv", rows, FIELDS)
    (OUT / "us_presidential_2024_official_51.json").write_text(json.dumps({
        "title": "ElectionVerse 2024 US certified presidential votes and EAC election participation",
        "label": "Actual certified election results, 2024",
        "built_utc": built,
        "null_means": "not available or incomplete in the source; never zero",
        "records": rows,
    }, indent=2))
    write_csv(OUT / "us_presidential_2024_candidates_long.csv", long_rows, ["state_abbr", "candidate_column", "votes", "share_pct"])
    write_csv(OUT / "us_electoral_votes_2024.csv", ev_rows, ["state_abbr", "electoral_votes", "electoral_votes_trump", "electoral_votes_harris"])
    write_csv(OUT / "eavs_exceptions.csv", exceptions, ["state_abbr", "field", "fips", "jurisdiction", "raw_value", "state_partial_sum_excluding_missing", "jurisdictions_missing_in_state", "jurisdictions_in_state"])

    lineage = [
        ("state", "jurisdictions.json", "name"),
        ("state_abbr", "jurisdictions.json; FEC column STATE; EAVS State_Abbr", "join key"),
        ("year", "constant", "2024 general election, 5 November 2024"),
        ("presidential_votes_total", "FEC TOTAL VOTES", "as published; equals the sum of all candidate, none-of-these and scattered write-in columns"),
        ("democratic_votes", "FEC HARRIS", "candidate-aligned across all ballot lines (includes fusion lines)"),
        ("republican_votes", "FEC TRUMP", "candidate-aligned across all ballot lines (includes fusion lines)"),
        ("other_presidential_votes", "derived", "presidential_votes_total - democratic_votes - republican_votes"),
        ("democratic_share_pct", "derived", "100 * democratic_votes / presidential_votes_total, rounded to 4 dp from integers"),
        ("republican_share_pct", "derived", "100 * republican_votes / presidential_votes_total"),
        ("other_share_pct", "derived", "100 * other_presidential_votes / presidential_votes_total"),
        ("registered_total", "EAVS A1a", "sum over all non-territory jurisdictions in the state; null if any jurisdiction is blank or a negative special code"),
        ("registered_active", "EAVS A1b", "same aggregation rule as A1a"),
        ("counted_ballots_total", "EAVS F1a", "ballots counted in the 2024 general election across all offices; same aggregation rule"),
        ("turnout_pct_total_registration", "derived", "100 * F1a / A1a; null when either is null"),
        ("turnout_pct_active_registration", "derived", "100 * F1a / A1b; null when either is null; values over 100 are flagged, not capped"),
    ]
    with (OUT / "field_lineage.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["field", "source", "rule"])
        w.writerows(lineage)

    manifest = {"built_utc": built, "script": "etl/build_dataset.py", "sources": {}}
    for key, meta in SOURCES.items():
        p = ROOT / meta["path"]
        manifest["sources"][key] = {
            **meta,
            "sha256": sha256(p),
            "bytes": p.stat().st_size,
            "acquired": "Uploaded by the project owner on 2026-10-14. Not fetched directly from origin_url (the build environment could not reach fec.gov or eac.gov).",
        }
    (OUT / "source_manifest.json").write_text(json.dumps(manifest, indent=2))

    nulls = {f: [r["state_abbr"] for r in rows if r[f] is None] for f in FIELDS}
    exc_by_state: dict[str, dict] = {}
    for e in exceptions:
        exc_by_state.setdefault(e["state_abbr"], {}).setdefault(e["field"], []).append(e)
    lines = [
        "# QA report: US 2024 presidential dataset",
        "",
        f"Built {built} by `etl/build_dataset.py`. Status: **PASSED** (the script raises and writes nothing if a hard check fails).",
        "",
        "## Hard checks passed",
        "",
        "- Exactly 51 distinct jurisdictions (50 states + DC); territories (AS, GU, MP, PR, VI) excluded.",
        "- In every state, all candidate, none-of-these and scattered write-in columns sum exactly to FEC TOTAL VOTES.",
        f"- The 51 state totals sum to the FEC national total row: {sum(r['presidential_votes_total'] for r in rows):,} votes.",
        "- Every candidate column summed over the states equals that candidate's FEC national total.",
        "- Electoral votes total 538 and reconcile with the FEC totals (Trump 312, Harris 226).",
        "- Democratic + Republican + other votes equal the presidential total in every state.",
        "- No EAVS jurisdiction is counted twice (no state has a statewide summary row alongside other rows; Alaska reports a single statewide row).",
        "- No value is filled with zero: blanks and EAVS negative special codes stay null.",
        "",
        "## Definitions",
        "",
        "- Democratic and Republican votes are the FEC candidate columns for Harris and Trump. The FEC sheet already reports each candidate as one aggregated column, so fusion ballot lines (such as New York's) are not double counted.",
        "- `presidential_votes_total` (FEC) and `counted_ballots_total` (EAVS F1a) are different measures and are never mixed.",
        "- EAVS A1a (total registered) is not always A1b + A1c: states report other categories differently.",
        "",
        "## Null values and why",
        "",
    ]
    for f in FIELDS:
        if nulls[f]:
            lines.append(f"- `{f}`: {', '.join(nulls[f])}")
    lines += ["", "## EAVS exceptions (full list in `eavs_exceptions.csv`)", ""]
    for s, fields in sorted(exc_by_state.items()):
        for field, items in fields.items():
            j = ", ".join(sorted({i["jurisdiction"] for i in items})[:6])
            more = "" if len(items) <= 6 else f" and {len(items) - 6} more"
            lines.append(
                f"- {s} {field}: {len(items)} of {items[0]['jurisdictions_in_state']} jurisdictions missing ({j}{more}). "
                f"Partial sum excluding them: {items[0]['state_partial_sum_excluding_missing']:,}. Reported as null."
            )
    if "ND" in exc_by_state:
        lines.append("- North Dakota has no voter registration, so A1a and A1b are not reported for any county; turnout against registration is not defined.")
    lines += ["", "## Flags (reported, not corrected)", ""]
    lines += [f"- {i}" for i in issues] or ["- None."]
    lines += [
        "",
        "## Provenance",
        "",
        "Source files were uploaded by the project owner, not downloaded from the origin URLs by this build. Their structure matches the published releases (FEC compilation footer dated January 16, 2025; EAVS v2 file dated 2026-02-24). Checksums are in `source_manifest.json`. To confirm provenance, download the files from the URLs in the manifest and compare SHA-256.",
        "",
        "## Use in ElectionVerse",
        "",
        "Read-only civic reference, labelled \"Actual certified election results, 2024\". The game uses it only to set each state's starting position; everything that happens during play is fictional.",
    ]
    (OUT / "qa_report.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    try:
        result = build()
    except QAError as e:
        print(f"QA FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"OK: {len(result['rows'])} jurisdictions, {len(result['exceptions'])} EAVS exceptions, {len(result['issues'])} flags")
    for i in result["issues"]:
        print("  flag:", i)
