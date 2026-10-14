import { describe, expect, it } from 'vitest';
import {
  type WinRuleConfig,
  allianceOptions,
  applyAction,
  debateRounds,
  nationalShares,
  newCampaign,
  previewDay,
  replay,
  validatePack,
  type CampaignAction,
  type CampaignState,
  type CountryPack,
  type NewCampaignOptions,
} from '../src';
import { testPack } from './fixtures';

const opts: NewCampaignOptions = {
  seed: 12345,
  partyId: 'a',
  nominee: { name: 'Avery Stone', background: 'teacher', traits: ['orator', 'organiser'], homeRegionId: 'r3' },
};

/** A simple scripted player: rally and canvass in the closest regions, debate sensibly, pick first choices. */
function autoplay(pack: CountryPack, start: CampaignState): { state: CampaignState; actions: CampaignAction[] } {
  let state = start;
  const actions: CampaignAction[] = [];
  for (let guard = 0; guard < 200 && state.phase !== 'finished'; guard++) {
    let action: CampaignAction;
    if (state.phase === 'awaitingDebate') action = { type: 'debate', responses: ['message', 'counter', 'humour'] };
    else if (state.phase === 'awaitingEvent') {
      const ev = pack.events.find((e) => e.id === state.pending!.eventId)!;
      action = { type: 'resolveEvent', choiceId: ev.choices[0]!.id };
    } else if (state.phase === 'pollingDay') action = { type: 'holdElection' };
    else if (state.phase === 'coalition') {
      const opt = state.result!.coalitionOptions?.[0];
      action = { type: 'coalition', choice: opt ? opt.partners : 'concede' };
    } else {
      const late = state.day > pack.calendar.days - pack.calendar.gotvDays;
      const target = ['r3', 'r2', 'r4'][state.day % 3]!;
      const stops = state.meters.funds < 120
        ? [{ regionId: target, activityId: 'fundraiser' }, { regionId: target, activityId: 'canvass' }]
        : [{ regionId: target, activityId: 'rally', focusIssueId: 'health' }, { regionId: target, activityId: late ? 'gotv' : 'canvass' }];
      action = previewDay(pack, state, stops).valid ? { type: 'planDay', stops } : { type: 'planDay', stops: [{ regionId: state.location, activityId: 'rest' }] };
    }
    state = applyAction(pack, state, action);
    actions.push(action);
  }
  return { state, actions };
}

describe('newCampaign', () => {
  it('creates normalised regions and one AI rival', () => {
    const pack = testPack();
    const s = newCampaign(pack, opts);
    for (const r of Object.values(s.regions)) {
      const total = Object.values(r.shares).reduce((a, b) => a + b, 0) + r.undecided;
      expect(total).toBeCloseTo(1, 6);
    }
    expect(s.rivals.map((r) => r.partyId)).toEqual(['b']);
    expect(s.phase).toBe('campaign');
  });

  it('rejects unknown or non-playable parties', () => {
    expect(() => newCampaign(testPack(), { ...opts, partyId: 'other' })).toThrow();
    expect(() => newCampaign(testPack(), { ...opts, partyId: 'zzz' })).toThrow();
  });
});

describe('campaign day', () => {
  it('validates time, funds and stop count', () => {
    const pack = testPack();
    const s = newCampaign(pack, opts);
    const tooMany = previewDay(pack, s, [
      { regionId: 'r1', activityId: 'rally' },
      { regionId: 'r1', activityId: 'rally' },
      { regionId: 'r1', activityId: 'rally' },
      { regionId: 'r1', activityId: 'rally' },
    ]);
    expect(tooMany.valid).toBe(false);
    expect(() => applyAction(pack, s, { type: 'planDay', stops: [] })).toThrow();
  });

  it('a rally raises support where it happens', () => {
    const pack = testPack();
    let s = newCampaign(pack, { ...opts, seed: 7 });
    const before = s.regions.r3!.shares.a!;
    s = applyAction(pack, s, { type: 'planDay', stops: [{ regionId: 'r3', activityId: 'rally', focusIssueId: 'health' }] });
    const report = s.pendingDayReport ?? s.reports.at(-1)!;
    expect(report.stops[0]!.tier).not.toBe('skipped');
    if (report.stops[0]!.tier !== 'incident') expect(report.stops[0]!.supportDelta).toBeGreaterThan(0);
    expect(s.regions.r3!.shares.a).not.toBe(before);
  });

  it('applies delayed event consequences on a later day', () => {
    const pack = testPack();
    pack.events = pack.events.map((e) => (e.id === 'storm' ? { ...e, weight: 1000 } : e));
    let s = newCampaign(pack, opts);
    // Keep planning until the storm appears, then choose the option with a follow-up.
    for (let i = 0; i < 6 && s.phase !== 'awaitingEvent'; i++) {
      if (s.phase === 'awaitingDebate') s = applyAction(pack, s, { type: 'debate', responses: ['message', 'message', 'message'] });
      else s = applyAction(pack, s, { type: 'planDay', stops: [{ regionId: 'r1', activityId: 'canvass' }] });
    }
    expect(s.pending?.eventId).toBe('storm');
    s = applyAction(pack, s, { type: 'resolveEvent', choiceId: 'go' });
    expect(s.delayed).toHaveLength(1);
    expect(s.delayed[0]!.eventId).toBe('storm-follow');
  });
});

describe('debate', () => {
  it('produces deterministic rounds and rewards the best response', () => {
    const pack = testPack();
    let s = newCampaign(pack, opts);
    while (s.phase !== 'awaitingDebate') {
      if (s.phase === 'awaitingEvent') s = applyAction(pack, s, { type: 'resolveEvent', choiceId: pack.events.find((e) => e.id === s.pending!.eventId)!.choices[1]!.id });
      else s = applyAction(pack, s, { type: 'planDay', stops: [{ regionId: 'r1', activityId: 'rest' }] });
    }
    expect(s.day).toBe(4);
    expect(s.phase).toBe('awaitingDebate');
    const rounds = debateRounds(pack, s);
    expect(debateRounds(pack, s)).toEqual(rounds);
    const best = { attack: 'humour', policy: 'counter', record: 'pivot' } as const;
    const ideal = applyAction(pack, s, { type: 'debate', responses: rounds.map((r) => best[r.style]) });
    expect(ideal.pendingDebate?.verdict).toBe('won');
    expect(ideal.meters.momentum).toBeGreaterThan(s.meters.momentum);
    // Debates are contested: answering badly against the same rival performance loses ground.
    const worst = { attack: 'pivot', policy: 'humour', record: 'humour' } as const;
    const bad = applyAction(pack, s, { type: 'debate', responses: rounds.map((r) => worst[r.style]) });
    expect(bad.pendingDebate!.rivalScore).toBe(ideal.pendingDebate!.rivalScore);
    expect(bad.pendingDebate?.verdict).toBe('lost');
    expect(bad.meters.momentum).toBeLessThan(s.meters.momentum);
  });
});

describe('full campaign', () => {
  it('plays to a result under every win rule', () => {
    const rules = [
      { type: 'electoralCollege', totalVotes: 36, toWin: 19 },
      { type: 'firstPastThePost', totalSeats: 36, majority: 19, seatSpread: 0.03, coalition: true },
      { type: 'proportionalList', totalSeats: 100, majority: 51, threshold: 0, coalition: true },
      { type: 'presidentialSpread', minShare: 0.25, requiredUnits: 4, unitRegionIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'], alsoRequired: [], runoff: true },
    ] satisfies WinRuleConfig[];
    for (const rule of rules) {
      const pack = testPack(rule);
      const { state } = autoplay(pack, newCampaign(pack, opts));
      expect(state.phase).toBe('finished');
      expect(state.result).toBeDefined();
      expect(state.result!.explanation.summary.length).toBeGreaterThan(0);
      expect(['won', 'lost', 'coalition', 'minority', 'opposition']).toContain(state.result!.playerOutcome);
      expect(state.reports).toHaveLength(pack.calendar.days);
    }
  });

  it('replays exactly from seed and action log', () => {
    const pack = testPack();
    const { state, actions } = autoplay(pack, newCampaign(pack, opts));
    const again = replay(pack, opts, actions);
    expect(again).toEqual(state);
  });

  it('different seeds give different campaigns', () => {
    const pack = testPack();
    const a = autoplay(pack, newCampaign(pack, opts)).state;
    const b = autoplay(pack, newCampaign(pack, { ...opts, seed: 999 })).state;
    expect(JSON.stringify(a.result!.outcome.nationalVotes)).not.toEqual(JSON.stringify(b.result!.outcome.nationalVotes));
  });

  it('player campaigning beats doing nothing on average', () => {
    const pack = testPack();
    let active = 0;
    let idle = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const o = { ...opts, seed };
      const s1 = autoplay(pack, newCampaign(pack, o)).state;
      let s2 = newCampaign(pack, o);
      while (s2.phase !== 'finished') {
        if (s2.phase === 'awaitingDebate') s2 = applyAction(pack, s2, { type: 'debate', responses: ['message', 'message', 'message'] });
        else if (s2.phase === 'awaitingEvent') s2 = applyAction(pack, s2, { type: 'resolveEvent', choiceId: pack.events.find((e) => e.id === s2.pending!.eventId)!.choices[1]!.id });
        else if (s2.phase === 'pollingDay') s2 = applyAction(pack, s2, { type: 'holdElection' });
        else if (s2.phase === 'coalition') s2 = applyAction(pack, s2, { type: 'coalition', choice: 'concede' });
        else s2 = applyAction(pack, s2, { type: 'planDay', stops: [{ regionId: s2.location, activityId: 'rest' }] });
      }
      const share = (s: CampaignState) => {
        const v = s.result!.outcome.nationalVotes;
        return (v.a ?? 0) / Object.values(v).reduce((x, y) => x + y, 0);
      };
      active += share(s1);
      idle += share(s2);
    }
    expect(active).toBeGreaterThan(idle);
  });

  it('keeps every region normalised after a full run', () => {
    const pack = testPack();
    const { state } = autoplay(pack, newCampaign(pack, opts));
    for (const r of Object.values(state.regions)) {
      const total = Object.values(r.shares).reduce((a, b) => a + b, 0) + r.undecided;
      expect(total).toBeCloseTo(1, 6);
      for (const v of Object.values(r.shares)) expect(v).toBeGreaterThanOrEqual(0);
    }
    const nat = nationalShares(pack, state.regions);
    expect(nat.shares.a! + nat.shares.b! + nat.shares.other! + nat.undecided).toBeCloseTo(1, 6);
  });
});

describe('alliance talks', () => {
  const threeParty = () => {
    const pack = testPack({ type: 'presidentialSpread', minShare: 0.25, requiredUnits: 4, unitRegionIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'], alsoRequired: [], runoff: true });
    pack.parties.splice(2, 0, { id: 'c', name: { en: 'Gamma Party' }, shortName: 'Gamma', colour: '#33aa33', platform: [], manifestoSource: null, resources: { funds: 300, volunteers: 300 }, difficulty: 4, playable: true });
    pack.baselines = pack.baselines.map((b) => ({ ...b, shares: { a: 0.3, b: 0.42, c: 0.2, other: 0.08 } }));
    pack.allianceTalks = { fromDay: 1, toDay: 3, transfer: 0.4 };
    return pack;
  };

  it('offers talks only in the window, never with the front-runner, once per campaign', () => {
    const pack = threeParty();
    const s = newCampaign(pack, opts);
    const options = allianceOptions(pack, s);
    expect(options.map((o) => o.partyId)).toEqual(['c']); // b leads nationally, so it is not offered
    expect(allianceOptions({ ...pack, allianceTalks: undefined }, s)).toEqual([]);
    const after = applyAction(pack, s, { type: 'proposeAlliance', partnerId: 'c' });
    expect(after.alliance?.partnerId).toBe('c');
    expect(allianceOptions(pack, after)).toEqual([]);
    expect(() => applyAction(pack, after, { type: 'proposeAlliance', partnerId: 'c' })).toThrow();
  });

  it('a successful alliance moves support and stands the partner down; a failure costs unity', () => {
    const pack = threeParty();
    let success: CampaignState | undefined;
    let failure: CampaignState | undefined;
    for (let seed = 1; seed < 60 && (!success || !failure); seed++) {
      const s = newCampaign(pack, { ...opts, seed });
      const next = applyAction(pack, s, { type: 'proposeAlliance', partnerId: 'c' });
      if (next.alliance!.success && !success) {
        success = next;
        expect(next.regions.r1!.shares.a!).toBeGreaterThan(s.regions.r1!.shares.a!);
        expect(next.regions.r1!.shares.c!).toBeLessThan(s.regions.r1!.shares.c!);
        expect(next.rivals.map((r) => r.partyId)).toEqual(['b']);
      }
      if (!next.alliance!.success && !failure) {
        failure = next;
        expect(next.meters.unity).toBeLessThan(s.meters.unity);
        expect(next.rivals.map((r) => r.partyId)).toEqual(['b', 'c']);
      }
      for (const r of Object.values(next.regions)) {
        expect(Object.values(r.shares).reduce((x, y) => x + y, 0) + r.undecided).toBeCloseTo(1, 6);
      }
    }
    expect(success).toBeDefined();
    expect(failure).toBeDefined();
  });
});

describe('validatePack', () => {
  it('passes the test pack with only placeholder warnings', () => {
    const issues = validatePack(testPack());
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('catches wrong electoral vote totals and missing baselines', () => {
    const pack = testPack({ type: 'electoralCollege', totalVotes: 538, toWin: 270 });
    pack.baselines = pack.baselines.slice(1);
    const errors = validatePack(pack).filter((i) => i.level === 'error').map((i) => i.message);
    expect(errors.some((m) => m.includes('Electoral votes sum'))).toBe(true);
    expect(errors.some((m) => m.includes('no baseline'))).toBe(true);
  });

  it('blocks listed real-person names', () => {
    const pack = testPack();
    pack.rivalNominees = [{ id: 'x', name: 'Real Person', bio: '' }];
    expect(validatePack(pack, ['Real Person']).some((i) => i.level === 'error')).toBe(true);
  });
});
