# ElectionVerse: U.S. 2024 Official Presidential Election Data — Claude Handoff Pack

## Status
**SOURCE/BUILD PACK — NOT A VERIFIED POPULATED DATASET.** The authoritative official files are linked below, but their binary bytes could not be retrieved in this environment. The provided `us_2024_template.csv` has 51 jurisdiction records with empty metric fields. **Never ship empty or estimated values as certified data.** Claude Code must download the original source files and run the extraction and validation steps before this can be considered a verified dataset.

## Authoritative sources
1. **FEC 2024 official presidential election results**, state-certified results compiled by the Federal Election Commission: https://www.fec.gov/documents/5645/2024presgeresults.xlsx ; PDF cross-reference: https://www.fec.gov/documents/5644/2024presgeresults.pdf . FEC landing: https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/ . Compiled January 16, 2025.
2. **EAC 2024 Election Administration and Voting Survey (EAVS), v2.0** (published February 12, 2026), jurisdiction-level machine-readable CSV ZIP: https://www.eac.gov/sites/default/files/2026-02/2024_EAVS_for_Public_Release_nolabel_V2_csv.zip . Main landing: https://www.eac.gov/research-and-data/studies-and-reports . Codebook: https://www.eac.gov/sites/default/files/2025-06/2024_EAVS_Codebook.xlsx . EAVS 2024 report: https://www.eac.gov/sites/default/files/2025-06/2024_EAVS_Report_508c.pdf .
3. Official EAVS instructions (A1 and F1): https://eavsportal.com/Downloads/2024/2024_EAVS_FINAL_508c_v2.pdf .

## Scope
2024 U.S. PRESIDENTIAL GENERAL election, 50 states plus District of Columbia. No territories; presidential popular vote differs from ballots counted across all contests. All figures and derived percentages MUST be reproducible from the authoritative documents.

## Mandatory definitions
- `presidential_votes_total`: official FEC total votes for president per state, including all candidates and qualifying write-in votes. Never replace with all-ballot participation.
- `democratic_votes`, `republican_votes`: vote tallies attributed to Harris and Trump, respectively; verify party cross-endorsements and state ballot-line fusion before claiming totals 'by party'. Candidate aggregation is the recommended cross-state comparable measure.
- `other_presidential_votes`: presidential_votes_total − democratic_votes − republican_votes. Includes third parties, independents and write-ins; add candidate/party breakdown in a separate long-form file if possible.
- `democratic_share_pct`: 100 × democratic_votes / presidential_votes_total; analogous for Republican and other. Percentages should sum ~100 within rounding.
- `registered_total`: EAVS **A1a** (registered and eligible, active plus inactive and other reported categories as applicable). Do NOT conflate with A1b active registrations.
- `registered_active`: EAVS **A1b**. Register levels refer to 2024 general election; state definitions differ.
- `counted_ballots_total`: EAVS **F1a** (number of voters who cast ballots counted in November 2024 general election across all offices).
- `turnout_pct_active_registration`: 100 × F1a / A1b; may exceed 100 in individual jurisdictions and must be flagged, not silently capped or changed.
- `turnout_pct_total_registration`: 100 × F1a / A1a; include only if both fields valid, explain definition.
- `turnout_pct_cvap`: use separately sourced 2023 Census citizen voting-age population from EAC tables if reliably available, otherwise null.
- `turnout_count` is `counted_ballots_total`, **not** presidential votes.

## Output schema
See `us_2024_template.csv` and `schema.json`. Preserve integer raw votes; compute shares from unrounded integer totals, then round final display values.

## QA acceptance checks
- Exactly 51 distinct 2-letter jurisdictions, no territories.
- All 51 FEC presidential vote totals must reconcile with source document state totals.
- All positive raw metrics integer; no assumptions about missing EAVS values.
- Candidate votes plus other = presidential total in all states.
- Distinguish candidate votes vs party ballot lines, especially NY and states with cross-endorsement.
- For Maine and Nebraska, statewide popular totals are NOT equivalent to district Electoral College assignments; keep Electoral College results in a separate table.
- No percentage used as both votes per presidential contest and general-election turnout.
- Track dataset release version and per-column provenance.
- FEC and EAC source documents must be downloaded and stored under `raw/` in the Claude project to ensure reproducibility.
- Validate EAC geographic column and jurisdiction aggregations using EAVS codebook. Some EAC data may contain a statewide summary row as well as county rows — **do not double count**.
- Never display unresolved blank values as zero.
- Include download date, source checksums and exception log.

## Use in ElectionVerse
Store this historical dataset as READ-ONLY CIVIC REFERENCE, isolated from the fictional game simulator. Labels: `Actual certified election results, 2024` vs `Fictional ElectionVerse results`. No projections or voter targeting. Do not use actual 2024 outcomes as a proxy for game results without explicit neutral game design and disclaimers.

## Next step
Open `CLAUDE_CODE_PROMPT.md` in Claude Code and give Claude this folder. Claude needs network access to download, verify and populate the official files.
