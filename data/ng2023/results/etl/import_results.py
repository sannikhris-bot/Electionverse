"""
Import the Nigeria 2023 presidential results pack (APC, PDP, LP, NNPP by state).

Run: python3 -I etl/import_results.py   (from data/ng2023/results)

What this does, in line with the pack's own instructions:
  1. Integrity checks on the file as received: 37 unique jurisdictions, non-negative
     integer votes, CSV and JSON agree, four-party totals and shares recompute.
  2. National aggregation check against INEC's declared totals. Mismatches are
     REPORTED, never silently fixed. The received file is kept unchanged.
  3. A separate RECONCILED version applies only documented alternative
     transcriptions (each with its source), and only if they make every party
     reconcile exactly. Both versions are written; the correction log lists every change.
  4. Generates packages/packs/src/ng/results2023.ts for the game (reconciled version).

Status of all figures: published INEC-declared figures; EC8D not individually verified.
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
OUT = ROOT / "output"
GAME_TS = ROOT.parent.parent.parent / "packages" / "packs" / "src" / "ng" / "results2023.ts"

PARTIES = ["APC", "PDP", "LP", "NNPP"]
INEC_NATIONAL = {"APC": 8_794_726, "PDP": 6_984_520, "LP": 6_101_533, "NNPP": 1_496_687}
INEC_VALID_TOTAL = 24_025_940  # all parties, national

NAME_TO_ID = {
    "Abia": "ab", "Adamawa": "ad", "Akwa Ibom": "ak", "Anambra": "an", "Bauchi": "ba", "Bayelsa": "by",
    "Benue": "be", "Borno": "bo", "Cross River": "cr", "Delta": "de", "Ebonyi": "eb", "Edo": "ed",
    "Ekiti": "ek", "Enugu": "en", "Gombe": "go", "Imo": "im", "Jigawa": "ji", "Kaduna": "kd",
    "Kano": "kn", "Katsina": "kt", "Kebbi": "ke", "Kogi": "ko", "Kwara": "kw", "Lagos": "la",
    "Nasarawa": "na", "Niger": "ni", "Ogun": "og", "Ondo": "on", "Osun": "os", "Oyo": "oy",
    "Plateau": "pl", "Rivers": "ri", "Sokoto": "so", "Taraba": "ta", "Yobe": "yo", "Zamfara": "za",
    "FCT": "fc",
}

# Documented alternative transcriptions. Applied only to the reconciled version.
CORRECTIONS = [
    {
        "state": "Kano", "party": "APC", "received": 517_341, "corrected": 506_412,
        "source": "Wikipedia, '2023 Nigerian presidential election in Kano State', statewide results table (retrieved 2026-10-14)",
        "reason": "The APC column is 10,929 over INEC's national total as received; this alternative accounts for exactly that difference.",
    },
    {
        "state": "Nasarawa", "party": "PDP", "received": 147_083, "corrected": 147_093,
        "source": "Alternative transcription listed in the pack's own README ('Nasarawa PDP: 147,083 vs 147,093')",
        "reason": "The PDP column is 10 under INEC's national total as received; this alternative accounts for exactly that difference.",
    },
]


class QAError(Exception):
    pass


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def load():
    csv_rows = list(csv.DictReader(open(RAW / "nigeria_2023_presidential_4party_states.csv", newline="")))
    js = json.loads((RAW / "nigeria_2023_presidential_4party_states.json").read_text())
    return csv_rows, js


def check_received(csv_rows, js):
    if len(csv_rows) != 37 or len(js["rows"]) != 37:
        raise QAError(f"Expected 37 rows; CSV {len(csv_rows)}, JSON {len(js['rows'])}")
    names = [r["state"] for r in csv_rows]
    if len(set(names)) != 37 or set(names) != set(NAME_TO_ID):
        raise QAError(f"Jurisdictions differ from the 37 expected: {set(names) ^ set(NAME_TO_ID)}")
    js_by = {r["state"]: r for r in js["rows"]}
    votes = {}
    for r in csv_rows:
        st = r["state"]
        v = {}
        for p in PARTIES:
            raw = r[f"{p}_votes"]
            if not raw.isdigit():
                raise QAError(f"{st} {p}: not a non-negative integer ({raw!r})")
            v[p] = int(raw)
            if js_by[st]["votes"][p] != v[p]:
                raise QAError(f"{st} {p}: CSV and JSON disagree")
        total = sum(v.values())
        if total != int(r["four_party_total"]) or total != js_by[st]["four_party_total"]:
            raise QAError(f"{st}: four_party_total does not recompute")
        for p in PARTIES:
            if abs(round(100 * v[p] / total, 4) - float(r[f"{p}_pct_four_party"])) > 0.0002:
                raise QAError(f"{st} {p}: four-party share does not recompute")
        leader = max(PARTIES, key=lambda p: v[p])
        if leader != r["leader_among_four"]:
            raise QAError(f"{st}: leader_among_four is {r['leader_among_four']}, recomputed {leader}")
        votes[st] = v
    return votes


def aggregate(votes):
    return {p: sum(v[p] for v in votes.values()) for p in PARTIES}


def main() -> int:
    OUT.mkdir(exist_ok=True)
    csv_rows, js = load()
    received = check_received(csv_rows, js)
    agg_received = aggregate(received)
    diff_received = {p: agg_received[p] - INEC_NATIONAL[p] for p in PARTIES}
    # The pack's own aggregation block must match what we compute.
    for p in PARTIES:
        if js["aggregation_check"][p]["difference"] != diff_received[p]:
            raise QAError(f"Pack's aggregation_check for {p} disagrees with recomputation")

    reconciled = {st: dict(v) for st, v in received.items()}
    for c in CORRECTIONS:
        if reconciled[c["state"]][c["party"]] != c["received"]:
            raise QAError(f"Correction precondition failed for {c['state']} {c['party']}")
        reconciled[c["state"]][c["party"]] = c["corrected"]
    agg_reconciled = aggregate(reconciled)
    diff_reconciled = {p: agg_reconciled[p] - INEC_NATIONAL[p] for p in PARTIES}
    if any(diff_reconciled.values()):
        raise QAError(f"Reconciled version still does not match INEC totals: {diff_reconciled}")

    def write(path: Path, data):
        with path.open("w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "state", *[f"{p}_votes" for p in PARTIES], "four_party_total", "leader_among_four"])
            for st in sorted(data, key=lambda s: NAME_TO_ID[s]):
                v = data[st]
                w.writerow([NAME_TO_ID[st], st, *[v[p] for p in PARTIES], sum(v.values()), max(PARTIES, key=lambda p: v[p])])

    write(OUT / "ng_2023_presidential_4party_as_received.csv", received)
    write(OUT / "ng_2023_presidential_4party_reconciled.csv", reconciled)
    with (OUT / "corrections_log.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["state", "party", "received", "corrected", "source", "reason"])
        w.writeheader()
        w.writerows(CORRECTIONS)
    (OUT / "source_manifest.json").write_text(json.dumps({
        "status": "published INEC-declared figures; EC8D not individually verified",
        "received_files": {p.name: sha256(p) for p in sorted(RAW.iterdir()) if p.is_file()},
        "pack_sources": js["source_urls"],
        "note": "Provided by the project owner on 2026-10-14. Received file kept unchanged; reconciled file applies the documented corrections in corrections_log.csv.",
    }, indent=2))

    leaders = {}
    for v in reconciled.values():
        l = max(PARTIES, key=lambda p: v[p])
        leaders[l] = leaders.get(l, 0) + 1
    other_national = INEC_VALID_TOTAL - sum(INEC_NATIONAL.values())
    lines = [
        "# QA report: Nigeria 2023 presidential results (APC, PDP, LP, NNPP by state)",
        "",
        "Status: **published INEC-declared figures; EC8D not individually verified.**",
        "",
        "## Integrity checks on the file as received (all passed)",
        "",
        "- 37 unique jurisdictions (36 states + FCT); every name maps to the game map.",
        "- Every vote count is a non-negative integer; CSV and JSON agree cell by cell.",
        "- Four-party totals, four-party shares and the leader in each state recompute exactly.",
        "- The pack's own aggregation block matches the recomputation.",
        "",
        "## National aggregation against INEC's declared totals",
        "",
        "| Party | INEC national | As received | Difference | Reconciled | Difference |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for p in PARTIES:
        lines.append(f"| {p} | {INEC_NATIONAL[p]:,} | {agg_received[p]:,} | {diff_received[p]:+,} | {agg_reconciled[p]:,} | {diff_reconciled[p]:+,} |")
    lines += [
        "",
        "## Corrections in the reconciled version (the received file is unchanged)",
        "",
        "| State | Party | Received | Reconciled | Source |",
        "| --- | --- | --- | --- | --- |",
    ]
    lines += [f"| {c['state']} | {c['party']} | {c['received']:,} | {c['corrected']:,} | {c['source']} |" for c in CORRECTIONS]
    lines += [
        "",
        "Each correction is an alternative transcription found in another source, and each one accounts for the exact national difference in its column. They are the most likely readings, not verified ones: confirm both against the Kano and Nasarawa EC8D forms.",
        "",
        "## Other conflicts the pack lists (not changed; values reconcile as received)",
        "",
        "Benue APC (310,468 vs 310,648), Cross River NNPP (1,644 vs 16,644), Ekiti LP (11,397 vs 11,396), Enugu LP (428,640 vs 428,740), Kwara LP and NNPP, Ogun APC (341,554 vs 341,558), Ondo LP (47,350 vs 44,405), Zamfara PDP (193,978 vs 93,978). The file's choices are consistent with the national totals; confirm against EC8D.",
        "",
        "## State winners among the four parties (reconciled)",
        "",
        ", ".join(f"{p} {leaders.get(p, 0)}" for p in PARTIES) + " (FCT counted with LP).",
        "",
        "## Limits",
        "",
        f"- Shares in this pack are of the four parties only. Valid votes for all parties by state are not supplied; nationally, the other 14 candidates received {other_national:,} votes ({100 * other_national / INEC_VALID_TOTAL:.2f}% of {INEC_VALID_TOTAL:,} valid votes).",
        "- In the game, the 'other' share uses that national figure in every state (placeholder) and turnout is four-party votes grossed up by it, divided by INEC registered voters.",
        "- Historical figures are kept separate from simulated game results.",
    ]
    (OUT / "qa_report.md").write_text("\n".join(lines) + "\n")

    game_rows = [{"id": NAME_TO_ID[st], **{p.lower(): reconciled[st][p] for p in PARTIES}} for st in sorted(reconciled, key=lambda s: NAME_TO_ID[s])]
    GAME_TS.write_text("\n".join([
        "// GENERATED by data/ng2023/results/etl/import_results.py. Do not edit by hand.",
        "// Nigeria 2023 presidential votes by state for APC, PDP, LP and NNPP.",
        "// Status: published INEC-declared figures; EC8D not individually verified.",
        "// Reconciled to INEC's national totals with the documented corrections in data/ng2023/results/output/corrections_log.csv.",
        "",
        "export interface NgResultRecord {",
        "  id: string;",
        "  apc: number;",
        "  pdp: number;",
        "  lp: number;",
        "  nnpp: number;",
        "}",
        "",
        "export const NG_RESULTS_2023: NgResultRecord[] = " + json.dumps(game_rows, indent=2) + ";",
        "",
        f"export const NG_NATIONAL_2023 = {{ apc: {INEC_NATIONAL['APC']}, pdp: {INEC_NATIONAL['PDP']}, lp: {INEC_NATIONAL['LP']}, nnpp: {INEC_NATIONAL['NNPP']}, valid: {INEC_VALID_TOTAL} }};",
        "",
    ]))
    print("OK: received file passes integrity checks")
    print("  as received vs INEC:", diff_received)
    print("  reconciled vs INEC:", diff_reconciled)
    print("  leaders:", leaders)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except QAError as e:
        print(f"QA FAILED: {e}", file=sys.stderr)
        sys.exit(1)
