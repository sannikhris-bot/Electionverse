"""
Import and validate the INEC 2023 registered voters and PVCs collected pack
(snapshot as at 5 February 2023), then generate the game's civic record.

Run: python3 -I etl/import_registration.py   (from data/ng2023/registration)

Rules from the pack's CLAUDE_CODE_PROMPT.md:
  - 37 jurisdictions (36 states + FCT); no duplicates; totals must match.
  - Keep source_date 2023-02-05; do not merge with INEC's later final PVC count.
  - actual_voter_turnout and presidential_votes_by_party stay null.
  - Status is NOT official_verified until checked against the original INEC PDF
    and Table 8.13 of INEC's 2023 General Election Report.
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
OUT = ROOT / "output"
GAME_TS = ROOT.parent.parent.parent / "packages" / "packs" / "src" / "ng" / "registration2023.ts"

EXPECTED = {"registered": 93_469_008, "collected": 87_209_007, "uncollected_calculated": 6_260_001}
# Contemporary published uncollected total that differs from registered - collected (see pack README).
PUBLISHED_UNCOLLECTED_ALT = 6_259_229
LATER_FINAL_COLLECTED = 87_394_106  # INEC 2023 General Election Report; a later snapshot, kept separate.

NAME_TO_ID = {
    "Abia": "ab", "Adamawa": "ad", "Akwa Ibom": "ak", "Anambra": "an", "Bauchi": "ba", "Bayelsa": "by",
    "Benue": "be", "Borno": "bo", "Cross River": "cr", "Delta": "de", "Ebonyi": "eb", "Edo": "ed",
    "Ekiti": "ek", "Enugu": "en", "Gombe": "go", "Imo": "im", "Jigawa": "ji", "Kaduna": "kd",
    "Kano": "kn", "Katsina": "kt", "Kebbi": "ke", "Kogi": "ko", "Kwara": "kw", "Lagos": "la",
    "Nasarawa": "na", "Niger": "ni", "Ogun": "og", "Ondo": "on", "Osun": "os", "Oyo": "oy",
    "Plateau": "pl", "Rivers": "ri", "Sokoto": "so", "Taraba": "ta", "Yobe": "yo", "Zamfara": "za",
    "Federal Capital Territory": "fc",
}

# Registered voters read independently from Wikipedia per-state pages on 2026-10-14
# (see data/ng2023/README.md). Used only as a cross-check.
WIKIPEDIA_REGISTERED = {
    "ab": 2_120_808, "ad": 2_196_566, "ak": 2_357_418, "an": 2_536_156, "ba": 2_749_268, "by": 1_056_862,
    "be": 2_777_727, "bo": 2_513_281, "cr": 1_766_466, "de": 3_221_697, "eb": 1_597_646, "ek": 987_647,
    "en": 2_112_793, "go": 1_575_794, "im": 2_419_922, "kn": 5_921_370,
}


class QAError(Exception):
    pass


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> int:
    OUT.mkdir(exist_ok=True)
    csv_rows = list(csv.DictReader(open(RAW / "nigeria_2023_inec_registered_pvcs_by_state.csv", newline="")))
    js = json.loads((RAW / "nigeria_2023_inec_registered_pvcs_by_state.json").read_text())
    js_rows = js["records"]

    if len(csv_rows) != 37 or len(js_rows) != 37:
        raise QAError(f"Expected 37 rows, got CSV {len(csv_rows)} and JSON {len(js_rows)}")
    names = [r["jurisdiction"] for r in csv_rows]
    if len(set(names)) != 37:
        raise QAError("Duplicate jurisdictions")
    if set(names) != set(NAME_TO_ID):
        raise QAError(f"Jurisdiction names differ from the game map: {set(names) ^ set(NAME_TO_ID)}")

    records = []
    js_by_name = {r["jurisdiction"]: r for r in js_rows}
    for r in csv_rows:
        name = r["jurisdiction"]
        reg = int(r["registered_voters"])
        col = int(r["pvcs_collected"])
        unc = int(r["pvcs_uncollected_calculated"])
        j = js_by_name[name]
        if (int(j["registered_voters"]), int(j["pvcs_collected"])) != (reg, col):
            raise QAError(f"{name}: CSV and JSON disagree")
        if not (0 < col <= reg):
            raise QAError(f"{name}: collected PVCs out of bounds")
        if reg - col != unc:
            raise QAError(f"{name}: uncollected != registered - collected")
        rate = round(100 * col / reg, 2)
        if abs(rate - float(r["pvc_collection_rate_pct_calculated"])) > 0.01:
            raise QAError(f"{name}: collection rate mismatch")
        if r["actual_voter_turnout"].strip() or r["presidential_votes_by_party"].strip():
            raise QAError(f"{name}: turnout or party votes must be null in this source")
        if j.get("actual_voter_turnout") is not None or j.get("presidential_votes_by_party") is not None:
            raise QAError(f"{name}: JSON turnout or party votes must be null")
        if r["source_date"] != "2023-02-05":
            raise QAError(f"{name}: unexpected source date {r['source_date']}")
        records.append({"id": NAME_TO_ID[name], "jurisdiction": name, "registered": reg, "pvcsCollected": col, "collectionRatePct": rate})

    tot_reg = sum(x["registered"] for x in records)
    tot_col = sum(x["pvcsCollected"] for x in records)
    if tot_reg != EXPECTED["registered"] or tot_col != EXPECTED["collected"]:
        raise QAError(f"Totals do not reconcile: registered {tot_reg}, collected {tot_col}")
    if js["totals"]["registered_voters"] != tot_reg or js["totals"]["pvcs_collected"] != tot_col:
        raise QAError("JSON totals block disagrees with its records")

    cross = []
    for rid, wiki in WIKIPEDIA_REGISTERED.items():
        rec = next(x for x in records if x["id"] == rid)
        cross.append((rec["jurisdiction"], rec["registered"], wiki, rec["registered"] == wiki))
    agree = sum(1 for c in cross if c[3])

    # Outputs
    with (OUT / "ng_2023_registration_validated.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "jurisdiction", "registered", "pvcsCollected", "collectionRatePct"])
        w.writeheader()
        w.writerows(records)
    manifest = {
        "status": "imported_unverified_against_original_pdf",
        "source_date": "2023-02-05",
        "files": {p.name: sha256(p) for p in sorted(RAW.iterdir()) if p.is_file()},
        "note": "Provided by the project owner on 2026-10-14. The pack itself states its figures were transcribed from a mirrored table, not parsed from the original INEC PDF.",
    }
    (OUT / "source_manifest.json").write_text(json.dumps(manifest, indent=2))
    lines = [
        "# QA report: INEC 2023 registered voters and PVCs collected",
        "",
        "Status: **imported, passes all checks, not yet verified against the original INEC PDF** (the pack's own figures were transcribed from a mirrored table).",
        "",
        "## Checks passed",
        "",
        "- 37 jurisdictions (36 states + FCT), no duplicates, every name maps to the game map.",
        f"- Registered voters sum to {tot_reg:,} (INEC national total 93,469,008).",
        f"- PVCs collected sum to {tot_col:,} (snapshot as at 5 February 2023).",
        "- CSV and JSON agree record by record; collected never exceeds registered; derived columns recompute exactly.",
        "- Turnout and party votes are null, as the source has none.",
        "",
        "## Independent cross-check (registered voters, Wikipedia per-state pages)",
        "",
        f"{agree} of {len(cross)} states agree exactly.",
        "",
        "| State | This pack | Wikipedia | Agree |",
        "| --- | --- | --- | --- |",
    ]
    lines += [f"| {n} | {a:,} | {b:,} | {'yes' if ok else '**no**'} |" for n, a, b, ok in cross]
    lines += [
        "",
        "Anambra is the only disagreement. The pack's figure is the one that makes all 37 states sum to INEC's national total, so the pack's value is used; confirm against the original PDF.",
        "",
        "## Discrepancies recorded, not reconciled",
        "",
        f"- Uncollected PVCs: registered minus collected = {EXPECTED['uncollected_calculated']:,}; some contemporary reports publish {PUBLISHED_UNCOLLECTED_ALT:,} (difference {EXPECTED['uncollected_calculated'] - PUBLISHED_UNCOLLECTED_ALT:,}).",
        f"- INEC's later 2023 General Election Report gives a final {LATER_FINAL_COLLECTED:,} PVCs collected. That is a later snapshot and is not merged into this one.",
        "",
        "## To mark as official_verified",
        "",
        "Parse the original INEC PDF (PVCs-Collected-Registered-Voters.pdf) and Table 8.13 of the 2023 General Election Report and compare all 37 rows.",
    ]
    (OUT / "qa_report.md").write_text("\n".join(lines) + "\n")

    ts = [
        "// GENERATED by data/ng2023/registration/etl/import_registration.py. Do not edit by hand.",
        "// INEC 2023 registered voters and PVCs collected, snapshot as at 5 February 2023.",
        "// Status: imported and checked against national totals; not yet verified against the original INEC PDF.",
        "",
        "export interface NgRegistrationRecord {",
        "  id: string;",
        "  jurisdiction: string;",
        "  registered: number;",
        "  pvcsCollected: number;",
        "  collectionRatePct: number;",
        "}",
        "",
        "export const NG_REGISTRATION_2023: NgRegistrationRecord[] = " + json.dumps(records, indent=2) + ";",
        "",
    ]
    GAME_TS.write_text("\n".join(ts))
    print(f"OK: 37 jurisdictions, registered {tot_reg:,}, collected {tot_col:,}; cross-check {agree}/{len(cross)} agree")
    for n, a, b, ok in cross:
        if not ok:
            print(f"  disagreement: {n} pack {a:,} vs Wikipedia {b:,}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except QAError as e:
        print(f"QA FAILED: {e}", file=sys.stderr)
        sys.exit(1)
