# Nigeria 2023 data: status

| Data | Status | Location |
| --- | --- | --- |
| Registered voters and PVCs collected by state (INEC, as at 5 Feb 2023) | Imported; reconciles to INEC national totals (93,469,008 and 87,209,007); 15 of 16 states match an independent source; not yet checked against the original INEC PDF | `registration/` |
| Presidential votes by state | **UNVERIFIED placeholder** (below) | `raw/source_a_thenigerialawyer.txt` |

## Presidential votes by state

**Status: UNVERIFIED. Placeholder for playtesting only. Do not publish as official data.**

The Nigeria game pack needs state-by-state 2023 presidential results (36 states + FCT). The official INEC sources could not be reached from the build environment (inecnigeria.org is blocked), so the pack currently uses a press transcription that is known to contain errors.

## INEC national totals (declared 1 March 2023), used as the reconciliation target

| Item | Value |
| --- | --- |
| APC (Tinubu) | 8,794,726 |
| PDP (Atiku) | 6,984,520 |
| LP (Obi) | 6,101,533 |
| NNPP (Kwankwaso) | 1,496,687 |
| Registered voters | 93,469,008 |
| Total valid votes | 24,025,940 |

## Source A: press transcription (used as placeholder)

`raw/source_a_thenigerialawyer.txt`, from thenigerialawyer.com, "Final results of 2023 presidential election as declared by INEC", retrieved 2026-10-14.

State columns do **not** reconcile with the INEC national totals:

| Party | Sum of states | INEC total | Difference |
| --- | --- | --- | --- |
| APC | 8,805,835 | 8,794,726 | +11,109 |
| PDP | 6,884,510 | 6,984,520 | -100,010 |
| LP | 6,101,632 | 6,101,533 | +99 |
| NNPP | 1,511,687 | 1,496,687 | +15,000 |

## Second-source checks (Wikipedia per-state pages, retrieved 2026-10-14)

Most per-state results tables were empty. Where figures exist they sometimes disagree with Source A:

| State | Field | Source A | Wikipedia |
| --- | --- | --- | --- |
| Kano | APC | 517,341 | 506,412 |
| Edo | APC | 144,471 | 112,581 |
| Edo | LP | 331,163 | 293,962 |
| Edo | PDP | 89,585 | 81,311 |
| Ekiti | APC | 201,494 | 201,486 |
| Ekiti | LP | 11,396 | 11,397 |
| Enugu | LP | 428,740 | 428,640 |

Anambra, Bauchi and Bayelsa agree on all four parties.

## What is needed to verify

1. INEC Form EC8D (state collation) for each of the 37 units, or the EC8E national summary.
2. Registered voters by state: received (see `registration/`); confirm against the original INEC PDF.

Acceptance: every party column sums exactly to the INEC totals above; valid votes sum to 24,025,940.

## How the game uses the placeholder

- Shares for APC, PDP, LP and NNPP come from Source A; "other" uses the national residual share (2.70%) in every state.
- Registered voters are INEC's by state. Turnout by state = placeholder valid votes / INEC registered voters (so it varies by state, e.g. Lagos low, Kano higher).
- All of this is replaced when INEC files are supplied.
