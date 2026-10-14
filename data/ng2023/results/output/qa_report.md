# QA report: Nigeria 2023 presidential results (APC, PDP, LP, NNPP by state)

Status: **published INEC-declared figures; EC8D not individually verified.**

## Integrity checks on the file as received (all passed)

- 37 unique jurisdictions (36 states + FCT); every name maps to the game map.
- Every vote count is a non-negative integer; CSV and JSON agree cell by cell.
- Four-party totals, four-party shares and the leader in each state recompute exactly.
- The pack's own aggregation block matches the recomputation.

## National aggregation against INEC's declared totals

| Party | INEC national | As received | Difference | Reconciled | Difference |
| --- | --- | --- | --- | --- | --- |
| APC | 8,794,726 | 8,805,655 | +10,929 | 8,794,726 | +0 |
| PDP | 6,984,520 | 6,984,510 | -10 | 6,984,520 | +0 |
| LP | 6,101,533 | 6,101,533 | +0 | 6,101,533 | +0 |
| NNPP | 1,496,687 | 1,496,687 | +0 | 1,496,687 | +0 |

## Corrections in the reconciled version (the received file is unchanged)

| State | Party | Received | Reconciled | Source |
| --- | --- | --- | --- | --- |
| Kano | APC | 517,341 | 506,412 | Wikipedia, '2023 Nigerian presidential election in Kano State', statewide results table (retrieved 2026-10-14) |
| Nasarawa | PDP | 147,083 | 147,093 | Alternative transcription listed in the pack's own README ('Nasarawa PDP: 147,083 vs 147,093') |

Each correction is an alternative transcription found in another source, and each one accounts for the exact national difference in its column. They are the most likely readings, not verified ones: confirm both against the Kano and Nasarawa EC8D forms.

## Other conflicts the pack lists (not changed; values reconcile as received)

Benue APC (310,468 vs 310,648), Cross River NNPP (1,644 vs 16,644), Ekiti LP (11,397 vs 11,396), Enugu LP (428,640 vs 428,740), Kwara LP and NNPP, Ogun APC (341,554 vs 341,558), Ondo LP (47,350 vs 44,405), Zamfara PDP (193,978 vs 93,978). The file's choices are consistent with the national totals; confirm against EC8D.

## State winners among the four parties (reconciled)

APC 12, PDP 12, LP 12, NNPP 1 (FCT counted with LP).

## Limits

- Shares in this pack are of the four parties only. Valid votes for all parties by state are not supplied; nationally, the other 14 candidates received 648,474 votes (2.70% of 24,025,940 valid votes).
- In the game, the 'other' share uses that national figure in every state (placeholder) and turnout is four-party votes grossed up by it, divided by INEC registered voters.
- Historical figures are kept separate from simulated game results.
