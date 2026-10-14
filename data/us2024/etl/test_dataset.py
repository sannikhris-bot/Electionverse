"""
Independent checks on the built dataset. Re-reads the raw files by a different
route (cell coordinates in the FEC sheet, a streaming pass over EAVS) and
compares with output/. Run: python3 -I etl/test_dataset.py
"""
import csv, io, json, zipfile
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
failures = []

def check(cond, msg):
    if not cond:
        failures.append(msg)

rows = list(csv.DictReader(open(OUT / "us_presidential_2024_official_51.csv")))
by = {r["state_abbr"]: r for r in rows}
template = [r["state_abbr"] for r in csv.DictReader(open(ROOT / "us_2024_template.csv"))]

# 1. Shape and schema
schema = json.loads((ROOT / "schema.json").read_text())
check(list(rows[0].keys()) == schema["required_fields"], "columns differ from schema.json")
check(sorted(by) == sorted(template) and len(rows) == 51, "jurisdiction set differs from template")

# 2. FEC re-read by column letter: L? find columns by header text in row 1.
ws = openpyxl.load_workbook(ROOT / "raw/2024presgeresults.xlsx", data_only=True).worksheets[0]
hdr = {ws.cell(1, c).value: c for c in range(1, ws.max_column + 1)}
for r in range(2, 53):
    s = ws.cell(r, 1).value
    fr = by.get(s)
    check(fr is not None, f"FEC row {r} state {s} missing from output")
    if not fr:
        continue
    check(int(fr["democratic_votes"]) == ws.cell(r, hdr["HARRIS"]).value, f"{s} Harris mismatch")
    check(int(fr["republican_votes"]) == ws.cell(r, hdr["TRUMP"]).value, f"{s} Trump mismatch")
    check(int(fr["presidential_votes_total"]) == ws.cell(r, hdr["TOTAL VOTES"]).value, f"{s} total mismatch")
    d, rp, o, t = (int(fr[k]) for k in ("democratic_votes", "republican_votes", "other_presidential_votes", "presidential_votes_total"))
    check(d + rp + o == t, f"{s} D+R+O != total")
    share_sum = sum(float(fr[k]) for k in ("democratic_share_pct", "republican_share_pct", "other_share_pct"))
    check(abs(share_sum - 100) < 0.001, f"{s} shares sum to {share_sum}")
check(ws.cell(53, 1).value == "Total:", "FEC total row moved")
check(sum(int(r["presidential_votes_total"]) for r in rows) == ws.cell(53, hdr["TOTAL VOTES"]).value, "national total mismatch")
check(sum(int(r["democratic_votes"]) for r in rows) == ws.cell(53, hdr["HARRIS"]).value, "national Harris mismatch")
check(sum(int(r["republican_votes"]) for r in rows) == ws.cell(53, hdr["TRUMP"]).value, "national Trump mismatch")

# 3. Electoral votes
ev = list(csv.DictReader(open(OUT / "us_electoral_votes_2024.csv")))
check(sum(int(e["electoral_votes"]) for e in ev) == 538, "EV total != 538")
check(sum(int(e["electoral_votes_trump"]) for e in ev) == 312, "Trump EV != 312")
check(sum(int(e["electoral_votes_harris"]) for e in ev) == 226, "Harris EV != 226")

# 4. EAVS re-aggregation, streaming, with an independent missing rule
agg, bad = {}, set()
with zipfile.ZipFile(ROOT / "raw/2024_EAVS_for_Public_Release_nolabel_V2_csv.zip") as z:
    name = z.namelist()[0]
    with z.open(name) as f:
        for rec in csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig", newline="")):
            s = rec["State_Abbr"]
            if s not in by:
                continue
            for field in ("A1a", "A1b", "F1a"):
                v = rec[field].strip()
                if v == "" or float(v) < 0:
                    bad.add((s, field))
                else:
                    agg[(s, field)] = agg.get((s, field), 0) + int(float(v))
for s, fr in by.items():
    for field, col in (("A1a", "registered_total"), ("A1b", "registered_active"), ("F1a", "counted_ballots_total")):
        if (s, field) in bad:
            check(fr[col] == "", f"{s} {col} should be null (incomplete source)")
        else:
            check(fr[col] != "" and int(fr[col]) == agg.get((s, field)), f"{s} {col} mismatch")
check(by["ND"]["registered_total"] == "" and by["ND"]["turnout_pct_total_registration"] == "", "ND registration should be null")

# 5. No zero used as a stand-in for missing
for r in rows:
    for k, v in r.items():
        check(v != "0", f"{r['state_abbr']} {k} is zero")

print("PASS" if not failures else "FAIL")
for f in failures:
    print(" -", f)
raise SystemExit(1 if failures else 0)
