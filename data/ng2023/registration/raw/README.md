# ElectionVerse — Nigeria INEC 2023 Historical Voter Registration Pack

This dataset covers all 36 states and the Federal Capital Territory (FCT) for the 2023 general election.

**Original user-provided INEC source:** https://www.inecnigeria.org/wp-content/uploads/2023/02/PVCs-Collected-Registered-Voters.pdf

**Supporting official INEC report:** https://inecnigeria.org/wp-content/uploads/2024/02/2023-GENERAL-ELECTION-REPORT-1.pdf (Table 8.13)

**Supplemental transcribed table used to verify registered voters:** https://www.studocu.com/row/document/university-of-port-harcourt/social-sciences/pvcs-collected-registered-voters/122740592

## Important provenance limitation
The INEC source URL was indexed and its summary and 37 collected-PVC counts were retrievable via web search; direct PDF download was not possible from this environment. The registration figures were transcribed from an independently mirrored full table and corroborated by the INEC 2023 General Election Report's indexed table. Figures are not a direct parser extraction of the user-linked original PDF. Before using as an authoritative production database, download and independently verify the original PDF and full INEC Table 8.13. The source figures reconcile exactly to the national published totals.

## Included files
- `nigeria_2023_inec_registered_pvcs_by_state.csv` — 37 jurisdiction rows.
- `nigeria_2023_inec_registered_pvcs_by_state.json` — identical rows, totals, provenance.
- `CLAUDE_CODE_PROMPT.md` — instructions to incorporate into ElectionVerse.
- `sources.json` — source register and caveats.

## National verification
- Registered voters: **93,469,008**.
- Collected PVCs as at 5 February 2023: **87,209,007**.
- Calculated uncollected PVCs: **6,260,001**.
- 37 geographic records.

**Data limitation:** PVC collection is not actual voter turnout; this source does not provide candidate votes, party vote shares, or election results. `actual_voter_turnout` and `presidential_votes_by_party` are intentionally `null` in JSON.

**Potential discrepancy:** Some contemporary published uncollected-PVC totals report 6,259,229, not 6,260,001 (difference 772). The calculated column here is explicitly registered minus collected and should not be labeled as INEC's directly published uncollected count; verify source-level reconciliation before production use. INEC's later report states a different final count of 87,394,106 PVCs collected. Preserve date and document version, don't overwrite this snapshot.

## Gameplay use
Store data as historical sourced data only, not a prediction or a signal about how real individuals will vote. Fictional game elections must use separately labeled synthetic results.
