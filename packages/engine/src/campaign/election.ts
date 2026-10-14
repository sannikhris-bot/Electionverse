import { Rng, hashString } from '../rng';
import { applyWinRule, largestRemainder, majorityOf, usesCoalitions, type RegionVotes } from '../winRules';
import type { CampaignState, CoalitionOption, CountryPack, ElectionResult, Explanation, WinRuleOutcome } from '../types';
import { clamp, partyName, regionById, round, standsIn } from '../util';
import { clone } from './day';
import { OTHER_PARTY } from './setup';

/**
 * Polling day: undecided voters break (tilted by momentum), each party's
 * turnout is lifted by its get-out-the-vote work, and a small seeded
 * "polling error" is applied per region before the win rule counts votes.
 */
/** Standard deviation of the national polling-day error on the player's share. */
export const ELECTION_NOISE = { national: 0.015, regional: 0.01 };

export function countVotes(pack: CountryPack, state: CampaignState): RegionVotes {
  const rng = new Rng(state.seed ^ hashString(`count:${state.packId}`));
  const momentum: Record<string, number> = { [state.playerPartyId]: state.meters.momentum };
  for (const r of state.rivals) momentum[r.partyId] = r.momentum;
  const nationalError = rng.normal(0, ELECTION_NOISE.national);
  const votes: RegionVotes = {};
  for (const region of pack.regions) {
    const rs = state.regions[region.id]!;
    const weights: Record<string, number> = {};
    let wTotal = 0;
    for (const [p, s] of Object.entries(rs.shares)) {
      const w = s * (1 + 0.03 * (momentum[p] ?? 0));
      weights[p] = Math.max(0, w);
      wTotal += weights[p]!;
    }
    const turnout = clamp(rs.baseTurnout + rng.normal(0, 0.015), 0.2, 0.95);
    const out: Record<string, number> = {};
    for (const [p, s] of Object.entries(rs.shares)) {
      if (!standsIn(pack, p, region.id)) {
        out[p] = 0;
        continue;
      }
      const fromUndecided = wTotal > 0 ? rs.undecided * 0.85 * (weights[p]! / wTotal) : 0;
      let share = s + fromUndecided;
      if (p === state.playerPartyId) share += nationalError;
      share += rng.normal(0, ELECTION_NOISE.regional);
      const lift = 1 + (rs.gotv[p] ?? 0);
      out[p] = Math.max(0, Math.round(region.registeredVoters * turnout * share * lift));
    }
    votes[region.id] = out;
  }
  return votes;
}

/** Minimal winning coalitions that include the player's party. */
export function coalitionOptions(pack: CountryPack, state: CampaignState, outcome: WinRuleOutcome): CoalitionOption[] {
  const majority = majorityOf(pack);
  if (majority === null) return [];
  const me = state.playerPartyId;
  const mySeats = outcome.tally[me] ?? 0;
  const others = Object.entries(outcome.tally)
    .filter(([p, s]) => p !== me && p !== OTHER_PARTY && s > 0)
    .sort((a, b) => b[1] - a[1]);
  const largest = Object.entries(outcome.tally).sort((a, b) => b[1] - a[1])[0]?.[0];
  const options: CoalitionOption[] = [];
  const n = others.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const partners: string[] = [];
    let seats = mySeats;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) {
      partners.push(others[i]![0]);
      seats += others[i]![1];
    }
    if (partners.length > 3 || seats < majority) continue;
    // Only the largest party in a coalition leads it.
    if (partners.some((p) => (outcome.tally[p] ?? 0) > mySeats)) continue;
    // Minimal: dropping any partner loses the majority.
    const minimal = partners.every((p) => seats - (outcome.tally[p] ?? 0) < majority);
    if (!minimal) continue;
    const chance = clamp(
      0.3 + state.meters.unity / 250 + (largest === me ? 0.15 : 0) - 0.1 * (partners.length - 1) - (seats - majority) * 0.002,
      0.05,
      0.92,
    );
    options.push({ partners, seats, chance: round(chance, 2) });
  }
  return options.sort((a, b) => b.chance - a.chance).slice(0, 4);
}

function explain(pack: CountryPack, state: CampaignState, outcome: WinRuleOutcome): Explanation {
  const me = state.playerPartyId;
  const decisive = outcome.regionResults
    .map((r) => {
      const stake = regionById(pack, r.regionId).stake;
      const won = r.winnerPartyId === me;
      const votes = r.votes;
      const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
      const mine = (votes[me] ?? 0) / total;
      const best = Math.max(...Object.entries(votes).filter(([p]) => p !== me).map(([, v]) => v / total), 0);
      return { regionId: r.regionId, margin: round(mine - best, 4), stake, playerWon: won };
    })
    .sort((a, b) => Math.abs(a.margin) / Math.sqrt(a.stake) - Math.abs(b.margin) / Math.sqrt(b.stake))
    .slice(0, 5);

  const keyDays = [...state.reports]
    .sort((a, b) => Math.abs(b.nationalDelta) - Math.abs(a.nationalDelta))
    .slice(0, 3)
    .map((r) => {
      const parts: string[] = [];
      for (const s of r.stops) {
        const act = pack.activities.find((a) => a.id === s.activityId);
        parts.push(`${act?.name ?? s.activityId} in ${regionById(pack, s.regionId).name}${s.tier === 'great' ? ' (big success)' : s.tier === 'incident' ? ' (went wrong)' : ''}`);
      }
      if (r.event) parts.push(`event: ${r.event.outcome}`);
      if (r.debate) parts.push(`debate ${r.debate.verdict}`);
      return { day: r.day, summary: parts.join('; '), delta: r.nationalDelta };
    });

  const total = Object.values(outcome.nationalVotes).reduce((a, b) => a + b, 0) || 1;
  const myShare = (outcome.nationalVotes[me] ?? 0) / total;
  const summary = [
    `You took ${(myShare * 100).toFixed(1)}% of the national vote.`,
    ...outcome.notes,
  ];
  const debates = state.reports.filter((r) => r.debate);
  if (debates.length) summary.push(`Debates: ${debates.map((d) => d.debate!.verdict).join(', ')}.`);
  const gotvRegions = Object.entries(state.regions).filter(([, r]) => (r.gotv[me] ?? 0) > 0.02).length;
  summary.push(gotvRegions ? `Your get-out-the-vote operation lifted turnout in ${gotvRegions} ${gotvRegions === 1 ? 'region' : 'regions'}.` : 'You ran no serious get-out-the-vote operation.');
  return { decisiveRegions: decisive, keyDays, summary };
}

function headlineFor(pack: CountryPack, state: CampaignState, outcome: WinRuleOutcome, player: ElectionResult['playerOutcome']): string {
  const office = pack.office.title.en;
  const name = state.nominee.name;
  if (player === 'won') return `${name} wins for the ${pack.parties.find((p) => p.id === state.playerPartyId)?.name.en ?? partyName(pack, state.playerPartyId)} and will be ${office}`;
  if (player === 'coalition') return `${name} to lead a coalition government`;
  if (player === 'minority') return `${name} to lead a minority government`;
  if (outcome.winnerPartyId) return `${partyName(pack, outcome.winnerPartyId)} wins; ${name} concedes`;
  return `No outright winner; ${name} heads into opposition`;
}

/**
 * The exit poll: the real seat result blurred by a seeded relative error per
 * party, re-scaled to the seat total. Close to the result, rarely exact.
 */
export function exitPoll(pack: CountryPack, seed: number, outcome: WinRuleOutcome): Record<string, number> | null {
  const cfg = pack.electionNight.exitPoll;
  const rule = pack.winRule;
  if (!cfg || (rule.type !== 'firstPastThePost' && rule.type !== 'proportionalList')) return null;
  const rng = new Rng(seed ^ hashString(`exitpoll:${pack.id}`));
  const est: Record<string, number> = {};
  for (const [p, seats] of Object.entries(outcome.tally).sort(([a], [b]) => a.localeCompare(b))) {
    if (seats > 0) est[p] = Math.max(0, seats * (1 + rng.normal(0, cfg.seatError)));
  }
  return largestRemainder(est, rule.totalSeats);
}

export function holdElection(pack: CountryPack, prev: CampaignState): CampaignState {
  if (prev.phase !== 'pollingDay') throw new Error('Polling day has not arrived.');
  const state = clone(prev);
  const votes = countVotes(pack, state);
  const momentum: Record<string, number> = { [state.playerPartyId]: state.meters.momentum };
  for (const r of state.rivals) momentum[r.partyId] = r.momentum;
  const outcome = applyWinRule({ pack, votes, seed: state.seed, momentum });
  const me = state.playerPartyId;
  let player: ElectionResult['playerOutcome'];
  let coalitionOpts: CoalitionOption[] | undefined;
  if (outcome.winnerPartyId === me) player = 'won';
  else if (outcome.winnerPartyId === null && usesCoalitions(pack)) {
    coalitionOpts = coalitionOptions(pack, state, outcome);
    const largest = Object.entries(outcome.tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    player = coalitionOpts.length || largest === me ? 'opposition' : 'lost';
  } else player = 'lost';

  state.result = {
    outcome,
    playerOutcome: player,
    headline: '',
    coalitionOptions: coalitionOpts,
    explanation: explain(pack, state, outcome),
  };
  const ep = exitPoll(pack, state.seed, outcome);
  if (ep) state.result.exitPoll = ep;
  const largest = Object.entries(outcome.tally).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (coalitionOpts && (coalitionOpts.length || largest === me)) {
    state.phase = 'coalition';
    state.result.headline = 'Hung result: coalition talks begin';
  } else {
    state.phase = 'finished';
    state.result.headline = headlineFor(pack, state, outcome, player);
  }
  return state;
}

export function formCoalition(pack: CountryPack, prev: CampaignState, partners: string[] | 'minority' | 'concede'): CampaignState {
  if (prev.phase !== 'coalition' || !prev.result) throw new Error('No coalition talks are under way.');
  const state = clone(prev);
  const result = state.result!;
  const largest = Object.entries(result.outcome.tally).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (partners === 'concede') {
    result.playerOutcome = 'opposition';
  } else if (partners === 'minority') {
    if (largest !== state.playerPartyId) throw new Error('Only the largest party can try to govern as a minority.');
    result.playerOutcome = 'minority';
  } else {
    const opt = result.coalitionOptions?.find((o) => o.partners.length === partners.length && o.partners.every((p) => partners.includes(p)));
    if (!opt) throw new Error('That coalition is not on the table.');
    const rng = new Rng(state.seed ^ hashString(`coalition:${partners.join(',')}`));
    const formed = rng.chance(opt.chance);
    result.coalition = { partners, formed };
    result.playerOutcome = formed ? 'coalition' : largest === state.playerPartyId ? 'minority' : 'opposition';
  }
  result.headline = headlineFor(pack, state, result.outcome, result.playerOutcome);
  state.phase = 'finished';
  return state;
}
