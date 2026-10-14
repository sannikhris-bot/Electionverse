import { Rng, hashString } from '../rng';
import type {
  ActivityConfig,
  CampaignState,
  CountryPack,
  DayReport,
  Effect,
  EventDef,
  NewsItem,
  PollResult,
  RegionState,
  Stop,
  StopResult,
} from '../types';
import { clamp, nationalShares, partyName, regionById, round, shiftSupport, travelCost, travelHours } from '../util';
import { DIFFICULTY, energyMultiplier, issueMultiplier, traitMultiplier } from './modifiers';

export const MAX_STOPS = 3;

// ---------------------------------------------------------------------------
// Day preview (used by the planner UI before committing)
// ---------------------------------------------------------------------------

export interface DayPreview {
  hours: number;
  funds: number;
  energy: number;
  volunteers: number;
  valid: boolean;
  problems: string[];
}

export function previewDay(pack: CountryPack, state: CampaignState, stops: Stop[]): DayPreview {
  const problems: string[] = [];
  let hours = 0;
  let funds = 0;
  let energy = 0;
  let volunteers = 0;
  let loc = state.location;
  if (stops.length === 0) problems.push('Plan at least one stop.');
  if (stops.length > MAX_STOPS) problems.push(`At most ${MAX_STOPS} stops per day.`);
  for (const s of stops) {
    const act = pack.activities.find((a) => a.id === s.activityId);
    if (!act) {
      problems.push(`Unknown activity ${s.activityId}`);
      continue;
    }
    if (!pack.regions.some((r) => r.id === s.regionId)) {
      problems.push(`Unknown region ${s.regionId}`);
      continue;
    }
    const mode = s.travel ?? 'road';
    hours += travelHours(pack, loc, s.regionId, mode) + act.hours;
    funds += travelCost(pack, loc, s.regionId, mode) + act.funds;
    energy += act.energy;
    volunteers += act.volunteers ?? 0;
    loc = s.regionId;
  }
  if (hours > pack.calendar.hoursPerDay) problems.push(`The day needs ${hours.toFixed(1)} hours; only ${pack.calendar.hoursPerDay} available.`);
  if (funds > state.meters.funds) problems.push('Not enough campaign funds.');
  if (volunteers > state.meters.volunteers) problems.push('Not enough volunteers.');
  return { hours: round(hours, 1), funds: Math.round(funds), energy, volunteers, valid: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Activity resolution (shared by player and rivals)
// ---------------------------------------------------------------------------

interface ResolveCtx {
  pack: CountryPack;
  state: CampaignState;
  rng: Rng;
}

const TIER_MULT = { great: 1.6, normal: 1, poor: 0.5, incident: 0.25, skipped: 0 } as const;

function rollTier(rng: Rng, act: ActivityConfig, energy: number, momentum: number): StopResult['tier'] {
  const incident = act.risk * (energy < 30 ? 1.8 : 1);
  const great = clamp(0.16 + momentum * 0.006, 0.05, 0.3);
  const poor = 0.2;
  const r = rng.next();
  if (r < incident) return 'incident';
  if (r < incident + great) return 'great';
  if (r < incident + great + poor) return 'poor';
  return 'normal';
}

function applyRegionDelta(
  regions: Record<string, RegionState>,
  regionId: string,
  partyId: string,
  delta: number,
  persuasion: number,
  diminish: boolean,
): number {
  const r = regions[regionId]!;
  const visits = r.visits[partyId] ?? 0;
  const share = r.shares[partyId] ?? 0;
  const eff = delta * (diminish ? 1 / (1 + 0.6 * visits) : 1) * (delta > 0 ? 1 - share : 1);
  const { region, applied } = shiftSupport(r, partyId, eff, persuasion);
  regions[regionId] = region;
  return applied;
}

function resolveStop(
  ctx: ResolveCtx,
  partyId: string,
  isPlayer: boolean,
  stop: Stop,
  energy: number,
  momentum: number,
  rivalSkill: number,
): StopResult & { energyUsed: number; fundsUsed: number; raised: number; restored: number } {
  const { pack, state, rng } = ctx;
  const act = pack.activities.find((a) => a.id === stop.activityId)!;
  const tier = act.kind === 'rest' || act.kind === 'fundraiser' ? 'normal' : rollTier(rng, act, energy, momentum);
  const region = regionById(pack, stop.regionId);
  let mult = TIER_MULT[tier] * energyMultiplier(energy);
  if (isPlayer) {
    mult *= traitMultiplier(pack, state.nominee, act.kind, stop.regionId);
    mult *= issueMultiplier(pack, stop.regionId, stop.focusIssueId, state.nominee.traits.includes('policy'));
    mult *= 0.7 + 0.3 * (state.regions[stop.regionId]!.recognition ?? 0);
    mult *= DIFFICULTY[state.difficulty].player;
  } else {
    mult *= DIFFICULTY[state.difficulty].rivalPower * (0.9 + 0.1 * rivalSkill);
  }

  let supportDelta = 0;
  if (act.base > 0) {
    if (act.reach === 'local') {
      supportDelta = applyRegionDelta(state.regions, stop.regionId, partyId, act.base * mult, act.persuasion, true);
    } else {
      // Media reach: full effect where the interview happens, a fraction everywhere.
      supportDelta = applyRegionDelta(state.regions, stop.regionId, partyId, act.base * mult, act.persuasion, true);
      for (const r of pack.regions) {
        if (r.id === stop.regionId) continue;
        applyRegionDelta(state.regions, r.id, partyId, act.base * mult * 0.18, act.persuasion, false);
      }
    }
  }
  if (tier === 'incident') {
    supportDelta += applyRegionDelta(state.regions, stop.regionId, partyId, -act.base * 0.6, 0, false);
  }
  const rs = state.regions[stop.regionId]!;
  rs.visits[partyId] = (rs.visits[partyId] ?? 0) + 1;
  if (act.gotv) {
    const late = state.day > pack.calendar.days - pack.calendar.gotvDays;
    const organiser = isPlayer && state.nominee.traits.includes('organiser') ? 1.3 : 1;
    rs.gotv[partyId] = clamp((rs.gotv[partyId] ?? 0) + act.gotv * (late ? 1 : 0.3) * organiser, 0, 0.15);
  }
  if (isPlayer) {
    const charisma = state.nominee.traits.includes('charismatic') ? 1.3 : 1;
    rs.recognition = clamp(rs.recognition + act.recognition * charisma * (tier === 'great' ? 1.5 : 1), 0, 1);
  }
  let raised = 0;
  if (act.raises) {
    const fr = isPlayer && state.nominee.traits.includes('fundraiser') ? 1.5 : 1;
    raised = Math.round(act.raises * fr * (0.8 + rng.next() * 0.4) * (0.7 + 0.3 * (rs.shares[partyId] ?? 0) * 2));
  }
  const note = rng.pick(act.flavour.length ? act.flavour : [act.name]).replace('{place}', region.landmark ?? region.name);
  return {
    regionId: stop.regionId,
    activityId: act.id,
    tier,
    supportDelta: round(supportDelta, 5),
    travelHours: 0,
    note,
    energyUsed: act.energy,
    fundsUsed: act.funds,
    raised,
    restored: act.restores ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Player day
// ---------------------------------------------------------------------------

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function playerShareSnapshot(state: CampaignState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, r] of Object.entries(state.regions)) out[id] = r.shares[state.playerPartyId] ?? 0;
  return out;
}

export function planDay(pack: CountryPack, prev: CampaignState, stops: Stop[]): CampaignState {
  if (prev.phase !== 'campaign') throw new Error(`Cannot plan a day during phase ${prev.phase}`);
  const preview = previewDay(pack, prev, stops);
  if (!preview.valid) throw new Error(preview.problems.join(' '));
  const state = clone(prev);
  const rng = new Rng(state.rng);
  const ctx: ResolveCtx = { pack, state, rng };
  const before = playerShareSnapshot(state);
  const beforeNational = nationalShares(pack, state.regions).shares[state.playerPartyId] ?? 0;

  const results: StopResult[] = [];
  for (const stop of stops) {
    const act = pack.activities.find((a) => a.id === stop.activityId)!;
    const mode = stop.travel ?? 'road';
    const th = travelHours(pack, state.location, stop.regionId, mode);
    state.meters.funds -= travelCost(pack, state.location, stop.regionId, mode);
    state.location = stop.regionId;
    if (state.meters.energy < act.energy) {
      results.push({ regionId: stop.regionId, activityId: act.id, tier: 'skipped', supportDelta: 0, travelHours: round(th, 1), note: 'Too exhausted to go ahead.' });
      continue;
    }
    const r = resolveStop(ctx, state.playerPartyId, true, stop, state.meters.energy, state.meters.momentum, 0);
    state.meters.energy = clamp(state.meters.energy - r.energyUsed + r.restored, 0, 100);
    state.meters.funds += r.raised - r.fundsUsed;
    state.meters.volunteers -= act.volunteers ?? 0;
    if (r.tier === 'great') state.meters.momentum += 1.5;
    if (r.tier === 'incident') {
      state.meters.momentum -= 1.5;
      state.meters.credibility = clamp(state.meters.credibility - 3, 0, 100);
    }
    results.push({ regionId: r.regionId, activityId: r.activityId, tier: r.tier, supportDelta: r.supportDelta, travelHours: round(th, 1), note: r.note });
  }
  state.meters.funds = Math.round(state.meters.funds);

  const report: DayReport = {
    day: state.day,
    stops: results,
    rivalStops: [],
    nationalDelta: 0,
    regionDeltas: {},
    start: { national: beforeNational, shares: before },
  };
  if (state.pendingDebate) {
    report.debate = state.pendingDebate;
    state.pendingDebate = undefined;
  }
  state.pendingDayReport = report;

  // Event draw.
  const kinds = stops.map((s) => pack.activities.find((a) => a.id === s.activityId)!.kind);
  const event = drawEvent(pack, state, rng, kinds);
  state.rng = rng.state;
  if (event) {
    state.pending = { eventId: event.id, regionId: state.location };
    state.phase = 'awaitingEvent';
    return state;
  }
  return endDay(pack, state);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function eligible(pack: CountryPack, state: CampaignState, ev: EventDef, kinds: string[]): boolean {
  if (ev.followUpOnly) return false;
  const c = ev.conditions ?? {};
  if (c.minDay !== undefined && state.day < c.minDay) return false;
  if (c.maxDay !== undefined && state.day > c.maxDay) return false;
  if (c.activityKinds && !c.activityKinds.some((k) => kinds.includes(k))) return false;
  if (c.maxEnergy !== undefined && state.meters.energy > c.maxEnergy) return false;
  if (c.minMomentum !== undefined && state.meters.momentum < c.minMomentum) return false;
  if (c.maxMomentum !== undefined && state.meters.momentum > c.maxMomentum) return false;
  if (c.maxFunds !== undefined && state.meters.funds > c.maxFunds) return false;
  const cd = state.eventCooldowns[ev.id];
  if (cd !== undefined && state.day < cd) return false;
  return true;
}

function drawEvent(pack: CountryPack, state: CampaignState, rng: Rng, kinds: string[]): EventDef | undefined {
  const due = state.delayed.find((d) => d.day <= state.day);
  if (due) {
    state.delayed = state.delayed.filter((d) => d !== due);
    const ev = pack.events.find((e) => e.id === due.eventId);
    if (ev) return ev;
  }
  if (!rng.chance(0.7)) return undefined;
  const pool = pack.events.filter((e) => eligible(pack, state, e, kinds));
  return rng.weighted(pool, (e) => e.weight);
}

export function applyEffects(pack: CountryPack, state: CampaignState, effects: Effect[], regionId: string) {
  for (const e of effects) {
    if (e.type === 'meter') {
      const m = state.meters;
      if (e.meter === 'momentum') m.momentum = clamp(m.momentum + e.delta, -20, 20);
      else if (e.meter === 'funds') m.funds = Math.max(0, Math.round(m.funds + e.delta));
      else if (e.meter === 'volunteers') m.volunteers = Math.max(0, Math.round(m.volunteers + e.delta));
      else m[e.meter] = clamp(m[e.meter] + e.delta, 0, 100);
    } else if (e.type === 'support' || e.type === 'rivalSupport') {
      const targets = e.scope === 'here' ? [regionId] : pack.regions.map((r) => r.id);
      const parties = e.type === 'support' ? [state.playerPartyId] : state.rivals.map((r) => r.partyId);
      for (const t of targets) for (const p of parties) applyRegionDelta(state.regions, t, p, e.delta, 0.3, false);
    } else if (e.type === 'recognition') {
      const targets = e.scope === 'here' ? [regionId] : pack.regions.map((r) => r.id);
      for (const t of targets) state.regions[t]!.recognition = clamp(state.regions[t]!.recognition + e.delta, 0, 1);
    }
  }
}

export function resolveEvent(pack: CountryPack, prev: CampaignState, choiceId: string): CampaignState {
  if (prev.phase !== 'awaitingEvent' || !prev.pending) throw new Error('No event is waiting for a decision.');
  const ev = pack.events.find((e) => e.id === prev.pending!.eventId);
  if (!ev) throw new Error(`Unknown event ${prev.pending.eventId}`);
  const choice = ev.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Unknown choice ${choiceId} for event ${ev.id}`);
  const state = clone(prev);
  applyEffects(pack, state, choice.effects, state.pending!.regionId);
  if (choice.delayed) state.delayed.push({ day: state.day + choice.delayed.afterDays, eventId: choice.delayed.eventId });
  state.eventCooldowns[ev.id] = state.day + ev.cooldown;
  if (state.pendingDayReport) state.pendingDayReport.event = { eventId: ev.id, choiceId, outcome: choice.outcome };
  state.pending = undefined;
  return endDay(pack, state);
}

// ---------------------------------------------------------------------------
// Rival AI
// ---------------------------------------------------------------------------

function rivalTurn(pack: CountryPack, state: CampaignState, rng: Rng): DayReport['rivalStops'] {
  const out: DayReport['rivalStops'] = [];
  const skill = DIFFICULTY[state.difficulty].rivalSkill;
  for (const rival of state.rivals) {
    const archetype = pack.rivalArchetypes.find((a) => a.id === rival.archetypeId) ?? pack.rivalArchetypes[0]!;
    const late = state.day > pack.calendar.days - pack.calendar.gotvDays;
    // Regions where the player gained ground yesterday draw a response.
    const lastReport = state.reports[state.reports.length - 1];
    const today = state.pendingDayReport;
    const threat = (id: string) => (today?.stops.filter((s) => s.regionId === id).reduce((a, s) => a + Math.max(0, s.supportDelta), 0) ?? 0) + Math.max(0, lastReport?.regionDeltas[id] ?? 0);
    // Score regions by value: stake x closeness x room to grow, discounted by travel and repeat visits.
    const scored = pack.regions.map((r) => {
      const rs = state.regions[r.id]!;
      const mine = rs.shares[rival.partyId] ?? 0;
      const top = Math.max(...Object.entries(rs.shares).filter(([p]) => p !== rival.partyId).map(([, v]) => v), 0);
      const closeness = 1 - Math.min(1, Math.abs(mine - top) * 4);
      const defend = mine > top ? 0.4 : 0.2;
      const travel = 1 / (1 + 0.15 * Math.hypot(r.x - regionById(pack, rival.location).x, r.y - regionById(pack, rival.location).y));
      const fresh = 1 / (1 + (rs.visits[rival.partyId] ?? 0));
      const react = 1 + 40 * threat(r.id) * skill;
      const value = Math.sqrt(r.stake) * (archetype.aggression * closeness + (1 - archetype.aggression) * defend + 0.05) * travel * fresh * react;
      // Lower skill = noisier judgement.
      return { r, value: value * (1 + rng.normal(0, 0.6 * (1 - skill))) };
    });
    scored.sort((a, b) => b.value - a.value);
    const stops = Math.min(2, scored.length);
    rival.lastStops = [];
    for (let i = 0; i < stops; i++) {
      const target = scored[i]!.r;
      const kinds = pack.activities.filter((a) => a.kind !== 'rest' && (a.kind !== 'gotv' || late) && a.funds <= rival.funds);
      // Archetype taste, weighted toward activities that actually move votes (more so with skill).
      const act = rng.weighted(kinds, (a) => {
        const taste = archetype.weights[a.kind] ?? 0.2;
        const payoff = a.kind === 'fundraiser' ? (rival.funds < 200 ? 0.012 : 0.002) : a.kind === 'gotv' ? 0.01 : a.base;
        return taste * Math.pow(payoff * 100, skill);
      });
      if (!act) continue;
      if (rival.energy < act.energy) {
        rival.energy = clamp(rival.energy + 30, 0, 100);
        continue;
      }
      const r = resolveStop({ pack, state, rng }, rival.partyId, false, { regionId: target.id, activityId: act.id }, rival.energy, rival.momentum, skill);
      rival.energy = clamp(rival.energy - r.energyUsed + r.restored, 0, 100);
      rival.funds += r.raised - r.fundsUsed;
      rival.location = target.id;
      rival.lastStops.push(target.id);
      if (r.tier === 'great') rival.momentum += 1.2;
      if (r.tier === 'incident') rival.momentum -= 1.2;
      out.push({ partyId: rival.partyId, regionId: target.id, activityId: act.id });
    }
    rival.energy = clamp(rival.energy + 25, 0, 100);
    rival.funds += 40; // Small daily donations.
  }
  return out;
}

// ---------------------------------------------------------------------------
// End of day: rivals, momentum, news, polls
// ---------------------------------------------------------------------------

function momentumDrift(pack: CountryPack, state: CampaignState) {
  const apply = (partyId: string, m: number) => {
    if (Math.abs(m) < 0.5) return;
    for (const r of pack.regions) applyRegionDelta(state.regions, r.id, partyId, m * 0.0007, 0.4, false);
  };
  apply(state.playerPartyId, state.meters.momentum);
  for (const rv of state.rivals) apply(rv.partyId, rv.momentum);
  state.meters.momentum = round(state.meters.momentum * 0.8, 2);
  for (const rv of state.rivals) rv.momentum = round(rv.momentum * 0.8, 2);
}

export function takePoll(pack: CountryPack, state: CampaignState, rng: Rng): PollResult {
  const pollster = pack.pollsters[(state.day - 1) % pack.pollsters.length]!;
  const truth = nationalShares(pack, state.regions);
  const n = pollster.sampleSize;
  const raw: Record<string, number> = {};
  for (const [p, s] of Object.entries(truth.shares)) {
    const bias = state.pollsterBias[pollster.id]?.[p] ?? 0;
    raw[p] = Math.max(0, s + bias + rng.normal(0, Math.sqrt(Math.max(s * (1 - s), 0.0001) / n)));
  }
  const und = Math.max(0, truth.undecided + rng.normal(0, 0.01));
  const total = Object.values(raw).reduce((a, b) => a + b, 0) + und;
  const national: Record<string, number> = {};
  for (const [p, v] of Object.entries(raw)) national[p] = round(v / total, 3);
  return { day: state.day, pollsterId: pollster.id, national, undecided: round(und / total, 3), marginOfError: round(1.96 * Math.sqrt(0.25 / n), 3) };
}

/** Campaign's internal regional estimate shown on the map (noisy, deterministic per day). */
export function regionEstimate(state: CampaignState, regionId: string): Record<string, number> {
  const r = state.regions[regionId];
  if (!r) return {};
  const rng = new Rng(state.seed ^ hashString(`est:${state.day}:${regionId}`));
  const out: Record<string, number> = {};
  for (const [p, s] of Object.entries(r.shares)) out[p] = Math.max(0, s + rng.normal(0, 0.012));
  return out;
}

function makeNews(pack: CountryPack, state: CampaignState, report: DayReport, rng: Rng): NewsItem[] {
  const items: NewsItem[] = [];
  const outlet = () => rng.pick(pack.mediaOutlets).id;
  const me = state.nominee.name;
  const best = [...report.stops].filter((s) => s.tier !== 'skipped').sort((a, b) => b.supportDelta - a.supportDelta)[0];
  const incident = report.stops.find((s) => s.tier === 'incident');
  if (incident) {
    const r = regionById(pack, incident.regionId);
    items.push({ day: report.day, outletId: outlet(), headline: `Trouble for ${me} in ${r.name}: ${incident.note}`, tone: 'bad' });
  }
  if (best && best.tier === 'great') {
    const r = regionById(pack, best.regionId);
    items.push({ day: report.day, outletId: outlet(), headline: `${me} draws a big response in ${r.name}`, tone: 'good' });
  } else if (best) {
    const r = regionById(pack, best.regionId);
    items.push({ day: report.day, outletId: outlet(), headline: `${me} campaigns in ${r.name}`, tone: 'neutral' });
  }
  const rs = report.rivalStops[0];
  if (rs) {
    const rival = state.rivals.find((r) => r.partyId === rs.partyId);
    items.push({
      day: report.day,
      outletId: outlet(),
      headline: `${rival?.nominee.name ?? partyName(pack, rs.partyId)} (${partyName(pack, rs.partyId)}) targets ${regionById(pack, rs.regionId).name}`,
      tone: 'neutral',
    });
  }
  if (report.event) {
    const ev = pack.events.find((e) => e.id === report.event!.eventId);
    if (ev) items.push({ day: report.day, outletId: outlet(), headline: `${ev.title}: ${report.event.outcome}`, tone: 'neutral' });
  }
  return items;
}

export function endDay(pack: CountryPack, prev: CampaignState): CampaignState {
  const state = prev;
  const rng = new Rng(state.rng);
  const report = state.pendingDayReport ?? { day: state.day, stops: [], rivalStops: [], nationalDelta: 0, regionDeltas: {} };
  const before = report.start?.shares ?? {};
  const beforeNational = report.start?.national ?? 0;
  delete report.start;

  report.rivalStops = rivalTurn(pack, state, rng);
  momentumDrift(pack, state);

  for (const r of Object.values(state.regions)) {
    for (const k of Object.keys(r.visits)) r.visits[k] = round(r.visits[k]! * 0.5, 3);
  }
  const vet = state.nominee.background === 'veteran' ? 8 : 0;
  state.meters.energy = clamp(state.meters.energy + 30 + vet, 0, 100);
  state.meters.unity = clamp(state.meters.unity + (70 - state.meters.unity) * 0.1, 0, 100);
  state.meters.funds += 30; // Small daily donations.

  const after = nationalShares(pack, state.regions).shares[state.playerPartyId] ?? 0;
  report.nationalDelta = round(after - beforeNational, 5);
  for (const [id, r] of Object.entries(state.regions)) {
    const d = (r.shares[state.playerPartyId] ?? 0) - (before[id] ?? r.shares[state.playerPartyId] ?? 0);
    if (Math.abs(d) > 0.0005) report.regionDeltas[id] = round(d, 5);
  }

  state.news.push(...makeNews(pack, state, report, rng));
  state.polls.push(takePoll(pack, state, rng));
  state.reports.push(report);
  state.pendingDayReport = undefined;
  state.day += 1;
  state.rng = rng.state;
  if (state.day > pack.calendar.days) state.phase = 'pollingDay';
  else if (pack.calendar.debateDays.includes(state.day)) state.phase = 'awaitingDebate';
  else state.phase = 'campaign';
  return state;
}
