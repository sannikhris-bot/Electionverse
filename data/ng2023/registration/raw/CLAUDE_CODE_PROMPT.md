# Claude Code: Import the INEC 2023 historical registration/PVC dataset

You are developing ElectionVerse, a global fictional political strategy game. Treat this import as ONE country pack's historical civic dataset, not as core game code or a primary US dataset.

1. Open `nigeria_2023_inec_registered_pvcs_by_state.json` and inspect 37 records for the 36 states plus FCT.
2. Validate sum(registered_voters) = 93,469,008 and sum(pvcs_collected) = 87,209,007. Validate row counts and bounds.
3. Verify the registration and collected figures against the primary INEC PDF and Table 8.13 of INEC's 2023 general election report before marking the import `official_verified`.
4. Preserve `source_date` 2023-02-05 and version history: INEC later published a different final PVC total. Do not overwrite or silently merge snapshots.
5. Keep `actual_voter_turnout` and `presidential_votes_by_party` as null. Do not infer these from PVC collection figures. No candidate results are included.
6. Store data under `country_packs/ng/historical/2023/` (or consistent existing project path), separate from the US country pack.
7. Expose an educational, non-predictive country-history UI labeling 2023, state, registered voter count, PVCs collected, and collection percentage.
8. For fictional strategy gameplay, generate synthetic election outcomes independently; clearly distinguish simulated elections from historical civic statistics.
9. Add import tests covering 37 jurisdictions, duplicates, numeric totals, provenance and null fields.
10. Document discrepancies in the national published uncollected total versus the derived registered-minus-collected sum; report the later INEC report's collection totals separately rather than silently reconciling them.

Do not claim this source has certified votes, actual turnout, or party vote shares.
