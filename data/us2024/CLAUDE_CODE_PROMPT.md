# Prompt to paste into Claude Code

You are a senior U.S. election-data engineer. In this folder you have an ElectionVerse 2024 U.S. presidential election source/build pack.

**Goal:** Produce a **fully populated, audit-ready** CSV and JSON dataset for all 50 states and Washington DC, with 2024 **official certified presidential vote counts and candidate/party shares**, **active and total registered voters**, and **general-election ballots counted and turnout**. Distinguish presidential votes from ballots counted. Do not estimate anything or invent data.

Sources:
- FEC Excel https://www.fec.gov/documents/5645/2024presgeresults.xlsx
- FEC PDF https://www.fec.gov/documents/5644/2024presgeresults.pdf
- EAC v2 CSV zip https://www.eac.gov/sites/default/files/2026-02/2024_EAVS_for_Public_Release_nolabel_V2_csv.zip
- EAC codebook https://www.eac.gov/sites/default/files/2025-06/2024_EAVS_Codebook.xlsx
- EAC report https://www.eac.gov/sites/default/files/2025-06/2024_EAVS_Report_508c.pdf
- EAC 2024 questionnaire https://eavsportal.com/Downloads/2024/2024_EAVS_FINAL_508c_v2.pdf

Tasks:
1. Download original source documents into `raw/`, noting retrieval time, URL and SHA-256.
2. Inspect the Excel sheets, columns, merged cells, notes, state identifiers, total rows and alternate ballot line structures. Extract by candidate from the FEC tables (Harris, Trump, other candidates) for all states. Ensure any write-in and scattered totals are accounted for. Verify state totals and national sums directly against the FEC table. If FEC displays a candidate on multiple party ballot lines, avoid duplicate counting, document this as candidate-aligned vote share.
3. Inspect the EAC V2 ZIP and codebook. Identify **A1a** total registered, **A1b** active registered, **F1a** counted general-election ballots. Aggregate exactly once to each state/DC. Respect missing/data-not-available codes and state-level survey comments. Do not automatically sum total and county summary rows.
4. Merge the FEC and EAC outputs keyed by state abbreviation. Compute `democratic_share_pct`, `republican_share_pct`, `other_share_pct`, `turnout_pct_active_registration`, `turnout_pct_total_registration` only from valid denominators. Keep separate `presidential_votes_total` and `counted_ballots_total`.
5. Produce `output/us_presidential_2024_official_51.csv`, `.json`, `output/us_presidential_2024_candidates_long.csv`, `output/qa_report.md`, `output/source_manifest.json`, `output/field_lineage.csv`, and reproducible Python ETL scripts/tests.
6. Cross-check against the FEC PDF and EAC report's definitions. Use null for any unavailable values, document exceptions. Fail QA if any presidential-state total is unverified, if a jurisdiction is missing, or if any schema columns are silently filled with zeros.
7. Treat these as static historical educational reference data. Display ElectionVerse gameplay as explicitly fictional; do not build real voter persuasion or targeting functions.

Show the validated first five states plus DC as examples, then write final files. If downloads are blocked, state this candidly and leave records unpopulated; don't output unverified data.
