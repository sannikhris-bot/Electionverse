# ElectionVerse

A mobile election campaign simulator: you are a fictional nominee for a real party, running a day-by-day campaign on a real map under real electoral rules, ending in Election Night.

This repository is **build step 1 to 3 of the blueprint**: the campaign engine with all five win rules, one playable country (United States, placeholder data), and a playable Expo app.

## Run it

Requires Node 20+.

```bash
npm install                 # from the repo root (npm workspaces)
npm test                    # engine + pack tests
npm run typecheck           # all packages

cd apps/mobile
npx expo start              # scan the QR code with Expo Go, or press w for web
```

## Layout

| Path | What it is |
| --- | --- |
| `packages/engine` | Pure TypeScript campaign engine. No UI, no country code. Seeded, deterministic, replayable. |
| `packages/packs` | Country packs (data only) and the world list. US and Nigeria are playable; UK, South Africa and Canada are listed as in development. |
| `apps/mobile` | Expo Router app (iOS, Android, web). |

## What works

- **World map and list**: search, filter by status, country explainers, wishlist for non-playable countries.
- **Party select and nominee creator**: background, two traits, home region on the map, running mate, difficulty (Guided, Normal, Hard).
- **Campaign HQ**: meters (Momentum, Funds, Energy, Unity, Credibility), daily national poll from rotating fictional pollsters with margin of error, internal projection map, region drill-down with top local issues and rival activity.
- **Day planner**: up to 3 stops a day, road or air travel with real time and cost, 11 activities, issue focus, live hours/funds/energy check.
- **Events**: 22 events with 2 to 3 choices, cooldowns and delayed consequences (a promise comes back days later).
- **Rival AI**: same rules and resources as the player, four archetypes, reacts where you gained ground, noisier judgement on easier difficulty.
- **Debates**: three rounds; read the rival's tell, pick Counter, Pivot, Humour or Stay on message.
- **Polling day and Election Night**: undecided voters break, get-out-the-vote lifts turnout, a seeded polling error, then a staged reveal with the 270 tracker, national vote, closest races and the days that moved the race.
- **Coalition talks** (used by FPTP and proportional packs): minimal winning coalitions with odds, minority government or concede.
- **Saves**: the run is stored as seed + action log and replayed exactly on launch. Career Passport records every finished run.

## Engine

- `newCampaign(pack, opts)` and `applyAction(pack, state, action)`: a pure reducer. `replay(pack, opts, actions)` rebuilds any run exactly.
- Win rules: `electoralCollege`, `firstPastThePost` (seat clusters with seeded seat-level swing), `proportionalList` (Hare quota, largest remainder, threshold), `presidentialSpread` (plurality + minimum share in N units, optional runoff), plus coalition formation.
- `validatePack(pack, blockedNames)`: baselines sum correctly, every playable party has a baseline in every region, win rule is satisfiable, platform items are sourced, real-person name blocklist.

## Tests

39 tests: every win rule against hand-checked counts, determinism and exact replay, delayed events, debate scoring, full campaigns under all four rules, pack validation, and a balance check over 20 simulated US campaigns per side. A browser play-through (create nominee, 15 days, events, two debates, Election Night, passport) runs with no errors.

Balance figures are in the table below.

## US data

The US starting position now comes from **actual certified 2024 results**, built and checked in `data/us2024`:

```bash
cd data/us2024
python3 -I etl/build_dataset.py        # FEC + EAC -> output/ (fails loudly on any QA break)
python3 -I etl/test_dataset.py         # independent re-read of the raw files
python3 -I etl/export_game_baseline.py # output/ -> packages/packs/src/us/baseline2024.ts
```

- **Real**: state names, electoral votes, 270 to win, starting vote shares by state (FEC), registered voters (EAC EAVS A1a), turnout (presidential votes / registered).
- **Game-only fallbacks** (marked in `baseline2024.ts`, never written to the dataset): registered voters for Hawaii and Maine (a few tiny jurisdictions unreported) and North Dakota (no voter registration).
- **Still placeholder**: regional issue priorities. **Empty**: party platforms (to be summarised from published platforms, with sources).
- **Gap**: Maine and Nebraska split some electoral votes by district; the game treats every state as winner-take-all. Under winner-take-all the 2024 map still totals 312 to 226.

All nominees, rivals, anchors, outlets and pollsters are fictional.

## Nigeria pack

Playable, with **placeholder starting data** (shown in the app).

- **Real**: the 36 states and FCT, the six geopolitical zones, the win rule (most votes and at least 25% in 24 of 37 units, with the FCT counted as a unit as the Supreme Court held in 2023; otherwise a runoff), campaigning ending 24 hours before polling day.
- **INEC registration**: registered voters by state (as at 5 February 2023) from the INEC pack in `data/ng2023/registration` (validated; reconciles to 93,469,008). Shown in the lobby as a 2023 civic record with PVC collection by state.
- **Placeholder (TODO-VERIFY)**: starting vote shares come from a press transcription of INEC's 2023 state declarations that does not add up to INEC's national totals; minor-party share uses the national average. Details and the evidence are in `data/ng2023/README.md`. Still needed: INEC Form EC8D for each state (or the EC8E summary).
- **Look**: Nigeria screens use the flag's green (#008751) and white, with a green-white-green band; other countries keep the navy and gold.
- **Signature mechanics**: the 25% spread tracker (Campaign HQ and Election Night), zone-by-zone results, zone spillover from big events, and **alliance talks** (days 2 to 8: ask another party to stand down and endorse you; smaller parties are likelier to agree; one attempt).
- **Gap**: the real runoff is between the leader and the candidate who won the most states; the engine uses the top two by votes.
- Nigeria's next presidential election is on 16 January 2027 and its campaign is under way. Keep this pack in playtesting until after that vote.

## Balance (scripted player that reads debate tells, Normal, 20 runs each)

| Scenario | Wins |
| --- | --- |
| US, Democratic, swing-state campaign | 15 |
| US, Republican, swing-state campaign | 18 |
| US, Democratic, camping in California | 5 |
| Nigeria, APC (front-runner) | 19 |
| Nigeria, PDP with alliance talks | 9 |
| Nigeria, PDP without an alliance | 0 |

Debates are contested: the rival also performs, and only the difference moves the race. Rivals have their own good and bad news days.

## Known gaps and deviations from the blueprint

- Map is a tile-grid cartogram (react-native-svg and views), not Skia. It works in Expo Go and on web; Skia can come later for animation.
- Street scenes are text (activity flavour, events), not illustrated scenes yet.
- No Supabase, accounts or cloud saves yet (local saves only), no Daily Crisis screen yet (the engine already supports daily seeds via `dailySeed`).
- Colour-blind patterns on the map are not done; tile labels and screen-reader text carry the leader so colour is not the only signal.
- `npx expo install` could not reach Expo's servers from the build machine, so dependency versions were pinned from Expo SDK 57's bundled module list. Run `npx expo install --check` once on your machine.

## Next steps (blueprint build order)

1. Add sourced party platforms and regional issue data; split Maine and Nebraska by district.
2. UK pack (FPTP clusters, exit poll at 10 p.m., hung parliament).
3. Verify Nigeria with INEC files; then South Africa, Canada and UK packs.
4. Illustrated street scenes, sound, Election Night animation.
5. Supabase sync, Daily Crisis, accessibility pass, performance on midrange Android.
