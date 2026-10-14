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
| `packages/packs` | Country packs (data only) and the world list. US is playable; UK, South Africa, Canada and Nigeria are listed as in development. |
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

30 tests: every win rule against hand-checked counts, determinism and exact replay, delayed events, debate scoring, full campaigns under all four rules, pack validation, and a balance check over 20 simulated US campaigns per side. A browser play-through (create nominee, 15 days, events, two debates, Election Night, passport) runs with no errors.

Balance today (scripted strong player, Normal): the side starting behind on the map wins about 3 in 4; the side starting ahead wins about 19 in 20; camping in one safe state wins under half.

## Placeholder data: must be replaced before release

The US pack is marked `placeholderData: true` and shows a "Playtest build" notice in the app.

- **Real**: state names, electoral votes per state (2024 to 2028 apportionment), 270 to win.
- **Placeholder (TODO-VERIFY)**: every baseline share, turnout figure, registered-voter count and regional issue priority. Replace with certified 2024 state results and aggregated survey data.
- **Empty**: party platforms. Add summaries from the parties' published platforms, each with a source, before release.

All nominees, rivals, anchors, outlets and pollsters are fictional.

## Known gaps and deviations from the blueprint

- Map is a tile-grid cartogram (react-native-svg and views), not Skia. It works in Expo Go and on web; Skia can come later for animation.
- Street scenes are text (activity flavour, events), not illustrated scenes yet.
- No Supabase, accounts or cloud saves yet (local saves only), no Daily Crisis screen yet (the engine already supports daily seeds via `dailySeed`).
- Colour-blind patterns on the map are not done; tile labels and screen-reader text carry the leader so colour is not the only signal.
- `npx expo install` could not reach Expo's servers from the build machine, so dependency versions were pinned from Expo SDK 57's bundled module list. Run `npx expo install --check` once on your machine.

## Next steps (blueprint build order)

1. Replace US placeholder data with certified results and sourced platforms; rerun the balance test.
2. UK pack (FPTP clusters, exit poll at 10 p.m., hung parliament).
3. South Africa, Canada and Nigeria packs (the Nigeria pack ships after its 16 January 2027 election).
4. Illustrated street scenes, sound, Election Night animation.
5. Supabase sync, Daily Crisis, accessibility pass, performance on midrange Android.
