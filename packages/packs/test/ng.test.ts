import { describe, expect, it } from 'vitest';
import { allianceOptions, applyAction, debateRounds, newCampaign, nationalShares, previewDay, presidentialSpread, validatePack, type CampaignState, type CountryPack, type RegionVotes } from '@electionverse/engine';
import { ngPack } from '../src';

/** Reads the rival's tell the way a player would (tells are right about 75% of the time). */
function readTell(tell: string) {
  if (/smirk|personal|one-liner/.test(tell)) return 'humour' as const;
  if (/binder|figures|detail/.test(tell)) return 'counter' as const;
  return 'pivot' as const;
}

function play(pack: CountryPack, seed: number, partyId: string, targets: string[], ally = true): CampaignState {
  let s = newCampaign(pack, { seed, partyId, nominee: { name: 'Chidi Bello-Ade', background: 'organiser', traits: ['orator', 'organiser'], homeRegionId: targets[0]! } });
  for (let guard = 0; guard < 300 && s.phase !== 'finished'; guard++) {
    if (s.phase === 'awaitingDebate') s = applyAction(pack, s, { type: 'debate', responses: debateRounds(pack, s).map((r) => readTell(r.tell)) });
    else if (s.phase === 'awaitingEvent') s = applyAction(pack, s, { type: 'resolveEvent', choiceId: pack.events.find((e) => e.id === s.pending!.eventId)!.choices[0]!.id });
    else if (s.phase === 'pollingDay') s = applyAction(pack, s, { type: 'holdElection' });
    else if (s.phase === 'coalition') s = applyAction(pack, s, { type: 'coalition', choice: 'concede' });
    else if (ally && allianceOptions(pack, s).length) s = applyAction(pack, s, { type: 'proposeAlliance', partnerId: allianceOptions(pack, s)[0]!.partyId });
    else {
      const target = targets[s.day % targets.length]!;
      const late = s.day > pack.calendar.days - pack.calendar.gotvDays;
      let stops = [
        { regionId: target, activityId: s.meters.funds > 150 ? 'rally' : 'fundraiser', travel: 'air' as 'road' | 'air' },
        { regionId: target, activityId: late ? 'gotv' : 'canvass' },
      ];
      if (!previewDay(pack, s, stops).valid) stops = [{ regionId: s.location, activityId: 'fundraiser', travel: 'road' }];
      if (!previewDay(pack, s, stops).valid) stops = [{ regionId: s.location, activityId: 'rest', travel: 'road' }];
      s = applyAction(pack, s, { type: 'planDay', stops });
    }
  }
  return s;
}

describe('Nigeria pack', () => {
  it('has 36 states plus the FCT on unique tiles, in six zones', () => {
    expect(ngPack.regions).toHaveLength(37);
    expect(new Set(ngPack.regions.map((r) => `${r.x},${r.y}`)).size).toBe(37);
    expect(new Set(ngPack.regions.map((r) => r.group))).toEqual(new Set(['North West', 'North East', 'North Central', 'South West', 'South East', 'South South']));
    const byZone: Record<string, number> = {};
    for (const r of ngPack.regions) byZone[r.group!] = (byZone[r.group!] ?? 0) + 1;
    expect(byZone).toEqual({ 'North West': 7, 'North East': 6, 'North Central': 7, 'South West': 6, 'South East': 5, 'South South': 6 });
  });

  it('uses the spread rule: 25% in 24 of 37 units, FCT not separately required, runoff', () => {
    const rule = ngPack.winRule;
    expect(rule.type).toBe('presidentialSpread');
    if (rule.type !== 'presidentialSpread') return;
    expect(rule.minShare).toBe(0.25);
    expect(rule.requiredUnits).toBe(24);
    expect(rule.unitRegionIds).toHaveLength(37);
    expect(rule.alsoRequired).toEqual([]);
    expect(rule.runoff).toBe(true);
  });

  it('passes validation with no errors and flags its placeholder data', () => {
    const issues = validatePack(ngPack);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.some((i) => i.message.includes('placeholder'))).toBe(true);
    expect(ngPack.placeholderData).toBe(true);
    expect(ngPack.dataNotes?.[0]).toMatch(/PLACEHOLDER/);
  });

  it('starting map matches the 2023 pattern of state wins', () => {
    const lead: Record<string, number> = {};
    for (const b of ngPack.baselines) {
      const w = Object.entries(b.shares).filter(([p]) => p !== 'other').sort((a, c) => c[1] - a[1])[0]![0];
      lead[w] = (lead[w] ?? 0) + 1;
    }
    // INEC 2023: APC 12, PDP 12, LP 11 + FCT, NNPP 1 (Kano).
    expect(lead).toEqual({ apc: 12, pdp: 12, lp: 12, nnpp: 1 });
    // Applying the spread rule to the starting map elects the APC, as in 2023.
    const votes: RegionVotes = {};
    for (const r of ngPack.regions) {
      const b = ngPack.baselines.find((x) => x.regionId === r.id)!;
      votes[r.id] = Object.fromEntries(Object.entries(b.shares).map(([p, v]) => [p, Math.round(v * r.registeredVoters * b.turnout)]));
    }
    const out = presidentialSpread({ pack: ngPack, votes, seed: 1 }, ngPack.winRule as never);
    expect(out.winnerPartyId).toBe('apc');
    const s = newCampaign(ngPack, { seed: 1, partyId: 'lp', nominee: { name: 'X', background: 'teacher', traits: ['orator', 'policy'], homeRegionId: 'la' } });
    const nat = nationalShares(ngPack, s.regions).shares;
    expect(nat.apc! > nat.pdp! && nat.pdp! > nat.lp! && nat.lp! > nat.nnpp!).toBe(true);
  });

  it('is playable to a result: front-runner favoured, challengers can win with strong play', () => {
    const N = 20;
    const targets: Record<string, string[]> = {
      apc: ['la', 'kn', 'kd', 'ri', 'oy', 'kt', 'de', 'pl'],
      pdp: ['kd', 'kn', 'kt', 'la', 'ri', 'ji', 'ni', 'oy'],
      lp: ['la', 'ri', 'kd', 'pl', 'de', 'oy', 'be', 'na'],
    };
    const res: Record<string, number> = {};
    for (const party of ['apc', 'pdp', 'lp']) {
      res[party] = 0;
      for (let seed = 1; seed <= N; seed++) {
        const s = play(ngPack, seed, party, targets[party]!);
        expect(s.phase).toBe('finished');
        if (s.result!.playerOutcome === 'won') res[party]++;
      }
    }
    let weak = 0;
    let noAlliance = 0;
    for (let seed = 1; seed <= N; seed++) {
      if (play(ngPack, seed, 'pdp', ['by']).result!.playerOutcome === 'won') weak++;
      if (play(ngPack, seed, 'pdp', targets.pdp!, false).result!.playerOutcome === 'won') noAlliance++;
    }
    (globalThis as { console?: { log: (...a: unknown[]) => void } }).console?.log('NG wins over', N, 'seeds:', res, 'weak PDP:', weak, 'PDP without alliance:', noAlliance);
    // Front-runner favoured; a challenger with an alliance and a national campaign is competitive.
    expect(res.apc).toBeGreaterThanOrEqual(N * 0.6);
    expect(res.pdp).toBeGreaterThanOrEqual(N * 0.2);
    expect(res.pdp).toBeLessThanOrEqual(N * 0.7);
    // The alliance matters, and so does where you campaign.
    expect(res.pdp).toBeGreaterThan(noAlliance);
    expect(res.pdp).toBeGreaterThanOrEqual(weak);
  });
});
