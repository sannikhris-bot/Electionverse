# QA report: INEC 2023 registered voters and PVCs collected

Status: **imported, passes all checks, not yet verified against the original INEC PDF** (the pack's own figures were transcribed from a mirrored table).

## Checks passed

- 37 jurisdictions (36 states + FCT), no duplicates, every name maps to the game map.
- Registered voters sum to 93,469,008 (INEC national total 93,469,008).
- PVCs collected sum to 87,209,007 (snapshot as at 5 February 2023).
- CSV and JSON agree record by record; collected never exceeds registered; derived columns recompute exactly.
- Turnout and party votes are null, as the source has none.

## Independent cross-check (registered voters, Wikipedia per-state pages)

15 of 16 states agree exactly.

| State | This pack | Wikipedia | Agree |
| --- | --- | --- | --- |
| Abia | 2,120,808 | 2,120,808 | yes |
| Adamawa | 2,196,566 | 2,196,566 | yes |
| Akwa Ibom | 2,357,418 | 2,357,418 | yes |
| Anambra | 2,656,437 | 2,536,156 | **no** |
| Bauchi | 2,749,268 | 2,749,268 | yes |
| Bayelsa | 1,056,862 | 1,056,862 | yes |
| Benue | 2,777,727 | 2,777,727 | yes |
| Borno | 2,513,281 | 2,513,281 | yes |
| Cross River | 1,766,466 | 1,766,466 | yes |
| Delta | 3,221,697 | 3,221,697 | yes |
| Ebonyi | 1,597,646 | 1,597,646 | yes |
| Ekiti | 987,647 | 987,647 | yes |
| Enugu | 2,112,793 | 2,112,793 | yes |
| Gombe | 1,575,794 | 1,575,794 | yes |
| Imo | 2,419,922 | 2,419,922 | yes |
| Kano | 5,921,370 | 5,921,370 | yes |

Anambra is the only disagreement. The pack's figure is the one that makes all 37 states sum to INEC's national total, so the pack's value is used; confirm against the original PDF.

## Discrepancies recorded, not reconciled

- Uncollected PVCs: registered minus collected = 6,260,001; some contemporary reports publish 6,259,229 (difference 772).
- INEC's later 2023 General Election Report gives a final 87,394,106 PVCs collected. That is a later snapshot and is not merged into this one.

## To mark as official_verified

Parse the original INEC PDF (PVCs-Collected-Registered-Voters.pdf) and Table 8.13 of the 2023 General Election Report and compare all 37 rows.
