import { Rng, hashString } from '../rng';
import type {
  CountryPack,
  ElectoralCollegeConfig,
  FirstPastThePostConfig,
  PresidentialSpreadConfig,
  ProportionalListConfig,
  RegionResult,
  WinRuleOutcome,
} from '../types';

export type RegionVotes = Record<string, Record<string, number>>;

export interface WinRuleInput {
  pack: CountryPack;
  votes: RegionVotes;
  /** Seed used for deterministic seat-level variation and runoff transfers. */
  seed: number;
  /** Momentum per party, used to tilt runoff vote transfers. */
  momentum?: Record<string, number>;
}

const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

function sorted(o: Record<string, number>): [string, number][] {
  // Ties broken by party id so results are deterministic.
  return Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function regionBasics(regionId: string, votes: Record<string, number>): Omit<RegionResult, 'awarded'> {
  const total = sum(votes);
  const ranked = sorted(votes);
  const [w, r] = [ranked[0], ranked[1]];
  return {
    regionId,
    votes,
    turnout: total,
    winnerPartyId: w ? w[0] : '',
    margin: total > 0 && w ? (w[1] - (r ? r[1] : 0)) / total : 0,
  };
}

function nationalVotes(votes: RegionVotes): Record<string, number> {
  const out: Record<string, number> = {};
  for (const rv of Object.values(votes)) for (const [p, v] of Object.entries(rv)) out[p] = (out[p] ?? 0) + v;
  return out;
}

// ---------------------------------------------------------------------------

export function electoralCollege(input: WinRuleInput, cfg: ElectoralCollegeConfig): WinRuleOutcome {
  const tally: Record<string, number> = {};
  const regionResults: RegionResult[] = [];
  for (const region of input.pack.regions) {
    const v = input.votes[region.id];
    if (!v) continue;
    const base = regionBasics(region.id, v);
    const awarded = { [base.winnerPartyId]: region.stake };
    tally[base.winnerPartyId] = (tally[base.winnerPartyId] ?? 0) + region.stake;
    regionResults.push({ ...base, awarded });
  }
  const ranked = sorted(tally);
  const top = ranked[0];
  const winner = top && top[1] >= cfg.toWin ? top[0] : null;
  const tie = !winner && ranked.length > 1 && ranked[0]![1] === ranked[1]![1];
  return {
    tally,
    winnerPartyId: winner,
    decisive: winner !== null,
    regionResults,
    nationalVotes: nationalVotes(input.votes),
    status: winner ? 'won' : tie ? 'tie' : 'hung',
    notes: winner
      ? [`${cfg.toWin} of ${cfg.totalVotes} electoral votes reached.`]
      : ['No candidate reached the required electoral votes; in this simulation the race is unresolved.'],
  };
}

// ---------------------------------------------------------------------------

export function firstPastThePost(input: WinRuleInput, cfg: FirstPastThePostConfig): WinRuleOutcome {
  const tally: Record<string, number> = {};
  const regionResults: RegionResult[] = [];
  for (const region of input.pack.regions) {
    const v = input.votes[region.id];
    if (!v) continue;
    const base = regionBasics(region.id, v);
    const total = sum(v);
    const awarded: Record<string, number> = {};
    // Each region is a cluster of `stake` seats. Seat-level shares vary
    // around the cluster share with a fixed, seeded swing per seat, so a
    // narrow cluster lead wins most (not all) of its seats.
    const rng = new Rng(input.seed ^ hashString(`fptp:${region.id}`));
    for (let i = 0; i < region.stake; i++) {
      let best = '';
      let bestShare = -Infinity;
      for (const [p, pv] of Object.entries(v)) {
        const share = (total > 0 ? pv / total : 0) + rng.normal(0, cfg.seatSpread) * (pv > 0 ? 1 : 0);
        if (share > bestShare || (share === bestShare && p < best)) {
          best = p;
          bestShare = share;
        }
      }
      awarded[best] = (awarded[best] ?? 0) + 1;
      tally[best] = (tally[best] ?? 0) + 1;
    }
    regionResults.push({ ...base, awarded });
  }
  const top = sorted(tally)[0];
  const winner = top && top[1] >= cfg.majority ? top[0] : null;
  return {
    tally,
    winnerPartyId: winner,
    decisive: winner !== null,
    regionResults,
    nationalVotes: nationalVotes(input.votes),
    status: winner ? 'won' : 'hung',
    notes: winner
      ? [`Majority of ${cfg.majority} of ${cfg.totalSeats} seats reached.`]
      : [`No party reached ${cfg.majority} seats.`],
  };
}

// ---------------------------------------------------------------------------

/** Largest-remainder (Hare quota) allocation of `seats` by vote totals. */
export function largestRemainder(votes: Record<string, number>, seats: number, threshold = 0): Record<string, number> {
  const total = sum(votes);
  const eligible = Object.fromEntries(Object.entries(votes).filter(([, v]) => total > 0 && v / total >= threshold));
  const eligibleTotal = sum(eligible);
  const out: Record<string, number> = {};
  if (eligibleTotal <= 0 || seats <= 0) return out;
  const quota = eligibleTotal / seats;
  const rems: [string, number][] = [];
  let given = 0;
  for (const [p, v] of Object.entries(eligible)) {
    const q = v / quota;
    out[p] = Math.floor(q);
    given += out[p]!;
    rems.push([p, q - Math.floor(q)]);
  }
  rems.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (let i = 0; given < seats; i++, given++) {
    const [p] = rems[i % rems.length]!;
    out[p] = (out[p] ?? 0) + 1;
  }
  return out;
}

export function proportionalList(input: WinRuleInput, cfg: ProportionalListConfig): WinRuleOutcome {
  const national = nationalVotes(input.votes);
  const tally = largestRemainder(national, cfg.totalSeats, cfg.threshold);
  const regionResults: RegionResult[] = input.pack.regions
    .filter((r) => input.votes[r.id])
    .map((r) => ({ ...regionBasics(r.id, input.votes[r.id]!), awarded: {} }));
  const top = sorted(tally)[0];
  const winner = top && top[1] >= cfg.majority ? top[0] : null;
  return {
    tally,
    winnerPartyId: winner,
    decisive: winner !== null,
    regionResults,
    nationalVotes: national,
    status: winner ? 'won' : 'hung',
    notes: [
      `${cfg.totalSeats} seats allocated nationally by quota and largest remainder.`,
      winner ? `Majority of ${cfg.majority} reached.` : `No party reached ${cfg.majority} seats.`,
    ],
  };
}

// ---------------------------------------------------------------------------

export function presidentialSpread(input: WinRuleInput, cfg: PresidentialSpreadConfig): WinRuleOutcome {
  const national = nationalVotes(input.votes);
  const spread: Record<string, number> = {};
  const regionResults: RegionResult[] = [];
  const reachedIn: Record<string, Set<string>> = {};
  for (const region of input.pack.regions) {
    const v = input.votes[region.id];
    if (!v) continue;
    const total = sum(v);
    const reached = Object.entries(v)
      .filter(([, pv]) => total > 0 && pv / total >= cfg.minShare)
      .map(([p]) => p);
    for (const p of reached) {
      (reachedIn[p] ??= new Set()).add(region.id);
      if (cfg.unitRegionIds.includes(region.id)) spread[p] = (spread[p] ?? 0) + 1;
    }
    regionResults.push({ ...regionBasics(region.id, v), awarded: {}, reachedMinShare: reached });
  }
  const ranked = sorted(national);
  const leader = ranked[0]?.[0] ?? null;
  const notes: string[] = [];
  const meetsSpread = (p: string) =>
    (spread[p] ?? 0) >= cfg.requiredUnits && cfg.alsoRequired.every((r) => reachedIn[p]?.has(r));
  const nationalTally: Record<string, number> = {};
  const nTotal = sum(national);
  for (const [p, v] of Object.entries(national)) nationalTally[p] = nTotal > 0 ? v / nTotal : 0;

  if (leader && meetsSpread(leader)) {
    notes.push(
      `Most votes nationally and at least ${Math.round(cfg.minShare * 100)}% in ${spread[leader]} units (needed ${cfg.requiredUnits}).`,
    );
    return {
      tally: nationalTally,
      winnerPartyId: leader,
      decisive: true,
      regionResults,
      nationalVotes: national,
      status: 'won',
      spread,
      notes,
    };
  }
  notes.push(
    leader
      ? `The leader reached ${Math.round(cfg.minShare * 100)}% in only ${spread[leader] ?? 0} units (needed ${cfg.requiredUnits}).`
      : 'No votes cast.',
  );
  if (!cfg.runoff || ranked.length < 2) {
    return { tally: nationalTally, winnerPartyId: null, decisive: false, regionResults, nationalVotes: national, status: 'hung', spread, notes };
  }
  // Runoff between the top two. Votes for eliminated parties transfer in
  // proportion to the finalists' first-round shares, tilted by momentum,
  // with some abstention.
  const [a, b] = [ranked[0]![0], ranked[1]![0]];
  const rng = new Rng(input.seed ^ hashString('runoff'));
  const ma = input.momentum?.[a] ?? 0;
  const mb = input.momentum?.[b] ?? 0;
  const runoffVotes: Record<string, number> = { [a]: national[a] ?? 0, [b]: national[b] ?? 0 };
  const sa = national[a] ?? 0;
  const sb = national[b] ?? 0;
  let pa = sa + sb > 0 ? sa / (sa + sb) : 0.5;
  pa = Math.min(0.9, Math.max(0.1, pa + (ma - mb) * 0.01 + rng.normal(0, 0.03)));
  for (const [p, v] of Object.entries(national)) {
    if (p === a || p === b) continue;
    const transferring = v * 0.75;
    runoffVotes[a]! += transferring * pa;
    runoffVotes[b]! += transferring * (1 - pa);
  }
  const winner = (runoffVotes[a] ?? 0) >= (runoffVotes[b] ?? 0) ? a : b;
  notes.push('A runoff between the top two candidates decided the race.');
  return {
    tally: nationalTally,
    winnerPartyId: winner,
    decisive: true,
    regionResults,
    nationalVotes: national,
    status: 'runoff',
    spread,
    runoff: { partyIds: [a, b], votes: runoffVotes, winnerPartyId: winner },
    notes,
  };
}

// ---------------------------------------------------------------------------

export function applyWinRule(input: WinRuleInput): WinRuleOutcome {
  const cfg = input.pack.winRule;
  switch (cfg.type) {
    case 'electoralCollege':
      return electoralCollege(input, cfg);
    case 'firstPastThePost':
      return firstPastThePost(input, cfg);
    case 'proportionalList':
      return proportionalList(input, cfg);
    case 'presidentialSpread':
      return presidentialSpread(input, cfg);
  }
}

export function majorityOf(pack: CountryPack): number | null {
  const cfg = pack.winRule;
  if (cfg.type === 'firstPastThePost' || cfg.type === 'proportionalList') return cfg.majority;
  if (cfg.type === 'electoralCollege') return cfg.toWin;
  return null;
}

export function usesCoalitions(pack: CountryPack): boolean {
  const cfg = pack.winRule;
  return (cfg.type === 'firstPastThePost' || cfg.type === 'proportionalList') && cfg.coalition;
}
