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
| `packages/packs` | Country packs (data only) and the world list. US, Nigeria and the UK are playable; South Africa and Canada are listed as in development. |
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
- Win rules: `electoralCollege`, `firstPastThePost` (seat clusters with seeded seat-level swing), `proportionalList` (Hare quota, largest remainder, threshold), `presidentialSpread` (plurality + minimum share in N units, optional runoff), plus coalition formation (only the largest party in a coalition leads it). Packs can say where a party does not stand (`notStanding`), and can add a broadcasters' exit poll on Election Night (`electionNight.exitPoll`).
- `validatePack(pack, blockedNames)`: baselines sum correctly, every playable party has a baseline in every region, win rule is satisfiable, platform items are sourced, real-person name blocklist.

## Tests

50 tests: every win rule against hand-checked counts, determinism and exact replay, delayed events, debate scoring, full campaigns under all four rules, pack validation, and a balance check over 20 simulated US campaigns per side. A browser play-through (create nominee, 15 days, events, two debates, Election Night, passport) runs with no errors.

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

Playable. Starting position from INEC-declared 2023 results and INEC registration (provenance shown in the app).

- **Real**: the 36 states and FCT, the six geopolitical zones, the win rule (most votes and at least 25% in 24 of 37 units, with the FCT counted as a unit as the Supreme Court held in 2023; otherwise a runoff), campaigning ending 24 hours before polling day.
- **INEC registration**: registered voters by state (as at 5 February 2023) from the INEC pack in `data/ng2023/registration` (validated; reconciles to 93,469,008). Shown in the lobby as a 2023 civic record with PVC collection by state.
- **2023 results**: APC, PDP, LP and NNPP votes by state from the results pack in `data/ng2023/results` (integrity-checked; reconcile exactly to INEC's national totals after two documented corrections, Kano APC and Nasarawa PDP; EC8D forms not individually verified).
- **Placeholder (TODO-VERIFY)**: the 14 minor candidates' share uses the national 2.70% in every state; regional issue priorities. Details and the evidence are in `data/ng2023/README.md`. Still needed to fully verify: INEC Form EC8D for each state (or the EC8E summary) and the original INEC registration PDF.
- **Look**: Nigeria screens use the flag's green (#008751) and white, with a green-white-green band; other countries keep the navy and gold.
- **Signature mechanics**: the 25% spread tracker (Campaign HQ and Election Night), zone-by-zone results, zone spillover from big events, and **alliance talks** (days 2 to 8: ask another party to stand down and endorse you; smaller parties are likelier to agree; one attempt).
- **Runoff**: as in section 134(3) of the Constitution, the leader meets the remaining candidate who won the most states (ties broken by votes), not simply the runner-up by votes.
- **Launch game.** Decision (15 October 2026): Nigeria is the game Politikat launches with. Launch is planned close to Nigeria's 16 January 2027 presidential vote, so the blueprint's safeguards apply: fictional nominees only, "Simulated result, not a prediction" on every result, no promotion of game results during the legal campaign blackout, and counsel review under Nigeria's electoral law before launch.

## United Kingdom pack

Playable, with **placeholder starting support** until the House of Commons Library 2024 results are imported (the lobby says so).

- **Real**: 650 constituencies (2024 boundaries) with the real seat count in Scotland (57), Wales (32), Northern Ireland (18) and each English region (543 in all); 326 for a majority; first past the post in each seat (seat-level swing within each region); a hung parliament and coalition talks otherwise; Great Britain's parties do not stand in Northern Ireland, the SNP stands only in Scotland and Plaid Cymru only in Wales.
- **Placeholder (TODO-VERIFY)**: starting vote shares by region (narrowed by 3.5 points between Labour and the Conservatives so the race starts as a contest), electors per region (73,000 per seat), turnout (60%) and issue priorities. Northern Ireland's parties are grouped as "Others". The Speaker's seat is treated like any other.
- **Look**: UK screens use the Union Flag: navy surfaces (from #012169), flag red (#C8102E) for buttons and highlights with white text (5.9:1), a lighter red (#FF5C70) for red text on navy (6.5:1), white as the second accent, and a small Union Flag with the cross's white-red-white arm at the top of every UK screen.
- **Signature mechanics**: the 10 p.m. exit poll before any seat is declared (close to the result, not exact), an internal seat projection at Campaign HQ, battle bus tours, knock-up operations, hustings, and UK events (fictional people only).

## Balance (scripted player that reads debate tells, Normal, 20 runs each)

| Scenario | Wins |
| --- | --- |
| US, Democratic, swing-state campaign | 15 |
| US, Republican, swing-state campaign | 18 |
| US, Democratic, camping in California | 5 |
| Nigeria, APC (front-runner) | 19 |
| Nigeria, PDP with alliance talks | 10 |
| Nigeria, PDP without an alliance | 0 |
| UK, Labour (placeholder start), majority or coalition | 16 |
| UK, Conservative, marginal-seat campaign, majority or coalition | 8 |
| UK, Conservative, only in its safe South East | 4 |

Debates are contested: the rival also performs, and only the difference moves the race. Rivals have their own good and bad news days.

## Known gaps and deviations from the blueprint

- Map is a tile-grid cartogram (react-native-svg and views), not Skia. It works in Expo Go and on web; Skia can come later for animation.
- Street scenes are text (activity flavour, events), not illustrated scenes yet.
- No Supabase, accounts or cloud saves yet (local saves only), no Daily Crisis screen yet (the engine already supports daily seeds via `dailySeed`).
- Colour-blind patterns on the map are not done; tile labels and screen-reader text carry the leader so colour is not the only signal.
- `npx expo install` could not reach Expo's servers from the build machine, so dependency versions were pinned from Expo SDK 57's bundled module list. Run `npx expo install --check` once on your machine.

## The Ladder (launch game prototype)

`apps/ladder-prototype/index.html` is a playable, single-file prototype of the launch game: a political snakes and ladders.

- **Board**: a building in cross-section. Ground floor: the people (traders, nurses, journalists, police, the military and more). Floor 1 (green, easy, rungs 1 to 10), Floor 2 (amber, hard, 11 to 20), Floor 3 (red, hardest, 21 to 30). At the top, a ballroom with the High Table, where winners take a seat beside fictional founding leaders.
- **Challenges** come from each part of society (45 in all, 15 per floor). A right move climbs 1 or 3 rungs, a wrong one drops 1 or 3. "Bold" answers can go either way, helped by public trust. Timers shrink from 25 to 18 to 12 seconds; hesitating in the red floor costs 3 rungs.
- **Allies**: win a group over and it becomes an ally that can cut a 3-rung fall to 1.
- **Modes**: solo against 1 to 3 rival candidates, or pass-and-play for 2 to 4 players.
- **Tension**: the ladder sways more on higher floors; a drone, a heartbeat and a ticking clock build with height (sound starts when you press Begin).
- **Balance** (simulated, 4,000 games, against 2 rivals): a near-perfect player wins about 83%, a good player about 52%, a careless one about 22%.
- **Candidates**: five 3D candidate characters (APC, PDP, LP, APGA, SDP) supplied as art, cut out to transparent WebP in `apps/ladder-prototype/assets/candidates`. They hop up the ladder, wobble when they fall and take the INCOMING seat when they win. The brief for matching art for everyone else is in `assets/CHARACTER_PROMPTS.md`.
- **Society and former presidents**: 36 society characters (one per challenge group) and 12 fictional former presidents, generated with Higgsfield (`gpt_image_2_5`) using two candidate images as style references, so the whole cast shares one 3D look. Cut-outs live in `assets/society/<group>.webp` and `assets/presidents/pres-NN.webp` (440 px tall, about 15 to 40 KB each). They sway in the ground-floor crowd, appear as door portraits on each floor, talk, cheer or slump as the challenge speaker, and sit either side of the INCOMING chair. None is modelled on a real person. The older code-drawn rig is still in the file as a fallback.
- Real parties, fictional candidates; vote buying, violence and military shortcuts always lose.


The product is now **Politikat**, a politics-only social app (polls on seven topics, video polls, live debate responses) with ElectionVerse as its game. The full plan is the [Politikat blueprint](https://claude.ai/code/artifact/07b2a6e3-422b-413f-a3c8-fda76c5abdb6) (Claude Docs).

1. Build the social app on this codebase: phone-verified accounts, the seven topic channels, Today's Five and the poll formats (Supabase backend).
2. Video polls, replies, duels and debate responses, with moderation and screening.
3. ElectionVerse's Nigeria campaign as the Play tab (`LAUNCH_GAME` in `packages/packs`), weekly challenge seeded by topic polls.
4. Closed beta with founding members, then public launch (about 13 weeks from the start of the build).
5. After launch: live debate rooms, US/UK/Canada games, verify Nigeria with INEC EC8D forms, import the UK 2024 results.
