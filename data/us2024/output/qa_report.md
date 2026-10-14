# QA report: US 2024 presidential dataset

Built 2026-10-14T19:37:33+00:00 by `etl/build_dataset.py`. Status: **PASSED** (the script raises and writes nothing if a hard check fails).

## Hard checks passed

- Exactly 51 distinct jurisdictions (50 states + DC); territories (AS, GU, MP, PR, VI) excluded.
- In every state, all candidate, none-of-these and scattered write-in columns sum exactly to FEC TOTAL VOTES.
- The 51 state totals sum to the FEC national total row: 155,238,302 votes.
- Every candidate column summed over the states equals that candidate's FEC national total.
- Electoral votes total 538 and reconcile with the FEC totals (Trump 312, Harris 226).
- Democratic + Republican + other votes equal the presidential total in every state.
- No EAVS jurisdiction is counted twice (no state has a statewide summary row alongside other rows; Alaska reports a single statewide row).
- No value is filled with zero: blanks and EAVS negative special codes stay null.

## Definitions

- Democratic and Republican votes are the FEC candidate columns for Harris and Trump. The FEC sheet already reports each candidate as one aggregated column, so fusion ballot lines (such as New York's) are not double counted.
- `presidential_votes_total` (FEC) and `counted_ballots_total` (EAVS F1a) are different measures and are never mixed.
- EAVS A1a (total registered) is not always A1b + A1c: states report other categories differently.

## Null values and why

- `registered_total`: HI, ME, ND
- `registered_active`: HI, IL, ME, ND, OH
- `counted_ballots_total`: AR, HI, ME, UT
- `turnout_pct_total_registration`: AR, HI, ME, ND, UT
- `turnout_pct_active_registration`: AR, HI, IL, ME, ND, OH, UT

## EAVS exceptions (full list in `eavs_exceptions.csv`)

- AR F1a: 3 of 75 jurisdictions missing (DESHA COUNTY, LEE COUNTY, SALINE COUNTY). Partial sum excluding them: 1,122,278. Reported as null.
- HI A1a: 1 of 5 jurisdictions missing (KALAWAO COUNTY). Partial sum excluding them: 861,333. Reported as null.
- HI A1b: 1 of 5 jurisdictions missing (KALAWAO COUNTY). Partial sum excluding them: 765,998. Reported as null.
- HI F1a: 1 of 5 jurisdictions missing (KALAWAO COUNTY). Partial sum excluding them: 522,236. Reported as null.
- IL A1b: 1 of 108 jurisdictions missing (CHRISTIAN COUNTY). Partial sum excluding them: 8,104,485. Reported as null.
- ME A1a: 8 of 497 jurisdictions missing (BROOKTON TWP, CONNOR TWP, EDMUNDS TWP, KINGSBURY PLT, MAGALLOWAY TWP, NASHVILLE PLT and 2 more). Partial sum excluding them: 1,223,468. Reported as null.
- ME A1b: 8 of 497 jurisdictions missing (BROOKTON TWP, CONNOR TWP, EDMUNDS TWP, KINGSBURY PLT, MAGALLOWAY TWP, NASHVILLE PLT and 2 more). Partial sum excluding them: 1,041,826. Reported as null.
- ME F1a: 7 of 497 jurisdictions missing (BROOKTON TWP, CONNOR TWP, EDMUNDS TWP, KINGSBURY PLT, MAGALLOWAY TWP, NASHVILLE PLT and 1 more). Partial sum excluding them: 842,447. Reported as null.
- ND A1a: 53 of 53 jurisdictions missing (ADAMS COUNTY, BARNES COUNTY, BENSON COUNTY, BILLINGS COUNTY, BOTTINEAU COUNTY, BOWMAN COUNTY and 47 more). Partial sum excluding them: 0. Reported as null.
- ND A1b: 53 of 53 jurisdictions missing (ADAMS COUNTY, BARNES COUNTY, BENSON COUNTY, BILLINGS COUNTY, BOTTINEAU COUNTY, BOWMAN COUNTY and 47 more). Partial sum excluding them: 0. Reported as null.
- OH A1b: 1 of 88 jurisdictions missing (PERRY COUNTY). Partial sum excluding them: 7,054,966. Reported as null.
- UT F1a: 1 of 29 jurisdictions missing (CACHE COUNTY). Partial sum excluding them: 1,466,896. Reported as null.
- North Dakota has no voter registration, so A1a and A1b are not reported for any county; turnout against registration is not defined.

## Flags (reported, not corrected)

- MD: presidential votes (3,038,334) exceed EAVS ballots counted F1a (3,028,813); definitions differ, flagged.
- MS: presidential votes (1,228,008) exceed EAVS ballots counted F1a (1,225,176); definitions differ, flagged.
- VT: presidential votes (369,422) exceed EAVS ballots counted F1a (361,604); definitions differ, flagged.
- ME: electoral votes split by district (Trump 1, Harris 3); the statewide popular vote is not the electoral vote result. See us_electoral_votes_2024.csv.
- NE: electoral votes split by district (Trump 4, Harris 1); the statewide popular vote is not the electoral vote result. See us_electoral_votes_2024.csv.

## Provenance

Source files were uploaded by the project owner, not downloaded from the origin URLs by this build. Their structure matches the published releases (FEC compilation footer dated January 16, 2025; EAVS v2 file dated 2026-02-24). Checksums are in `source_manifest.json`. To confirm provenance, download the files from the URLs in the manifest and compare SHA-256.

## Use in ElectionVerse

Read-only civic reference, labelled "Actual certified election results, 2024". The game uses it only to set each state's starting position; everything that happens during play is fictional.
