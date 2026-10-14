import { describe, expect, it } from 'vitest';
import { applyAction, debateRounds, firstPastThePost, newCampaign, previewDay, validatePack, type CampaignState, type CountryPack, type RegionVotes } from '@electionverse/engine';
import { ukPack } from '../src';

function readTell(tell: string) {
  if (/smirk|personal|one-liner/.test(tell)) return 'humour' as const;
  if (/binder|figures|detail/.test(tell)) return 'counter' as const;
  return 'pivot' as const;
}

function play(pack: CountryPack, seed: number, partyId: string, targets: string[]): CampaignState {
  let s = newCampaign(pack, { seed, partyId, nominee: { name: 'Alex Morgan-Hale', background: 'organiser', traits: ['orator', 'organiser'], homeRegionId: targets[0]! } });
  for (let guard = 0; guard < 300 && s.phase !== 'finished'; guard++) {
    if (s.phase === 'awaitingDebate') s = applyAction(pack, s, { type: 'debate', responses: debateRounds(pack, s).map((r) => readTell(r.tell)) });
    else if (s.phase === 'awaitingEvent') s = applyAction(pack, s, { type: 'resolveEvent', choiceId: pack.events.find((e) => e.id === s.pending!.eventId)!.choices[0]!.id });
    else if (s.phase === 'pollingDay') s = applyAction(pack, s, { type: 'holdElection' });
    else if (s.phase === 'coalition') {
      const best = s.result!.coalitionOptions?.slice().sort((a, b) => b.chance - a.chance)[0];
      s = applyAction(pack, s, { type: 'coalition', choice: best ? best.partners : 'concede' });
    } else {
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

describe('United Kingdom pack', () => {
  it('has 650 seats with the real 2024 count in each nation and English region', () => {
    expect(ukPack.regions).toHaveLength(12);
    expect(new Set(ukPack.regions.map((r) => `${r.x},${r.y}`)).size).toBe(12);
    expect(ukPack.regions.reduce((a, r) => a + r.stake, 0)).toBe(650);
    const seats = Object.fromEntries(ukPack.regions.map((r) => [r.id, r.stake]));
    expect(seats).toEqual({ sco: 57, wal: 32, ni: 18, ne: 27, nw: 73, yh: 54, em: 47, wm: 57, ee: 61, lon: 75, se: 91, sw: 58 });
    const england = ukPack.regions.filter((r) => r.group === 'England').reduce((a, r) => a + r.stake, 0);
    expect(england).toBe(543);
    expect(ukPack.winRule).toMatchObject({ type: 'firstPastThePost', totalSeats: 650, majority: 326, coalition: true });
  });

  it('only lets parties campaign where they stand', () => {
    for (const p of ['lab', 'con', 'ref', 'lib', 'grn']) expect(ukPack.notStanding?.[p]).toEqual(['ni']);
    expect(ukPack.notStanding?.snp).not.toContain('sco');
    expect(ukPack.notStanding?.snp).toHaveLength(11);
    expect(ukPack.notStanding?.pc).not.toContain('wal');
    const s = newCampaign(ukPack, { seed: 1, partyId: 'lab', nominee: { name: 'X', background: 'teacher', traits: ['orator', 'policy'], homeRegionId: 'nw' } });
    expect(previewDay(ukPack, s, [{ regionId: 'ni', activityId: 'canvass', travel: 'air' }]).valid).toBe(false);
  });

  it('passes validation and says plainly that the starting support is a placeholder', () => {
    const issues = validatePack(ukPack);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(ukPack.placeholderData).toBe(true);
    expect(ukPack.dataNotes?.[0]).toMatch(/PLACEHOLDER, not the 2024 result/);
    expect(ukPack.electionNight.exitPoll?.label).toMatch(/10 p\.m\./);
  });

  it('the placeholder starting map counts to a seat result', () => {
    const votes: RegionVotes = {};
    for (const r of ukPack.regions) {
      const b = ukPack.baselines.find((x) => x.regionId === r.id)!;
      votes[r.id] = Object.fromEntries(Object.entries(b.shares).map(([p, v]) => [p, Math.round(v * r.registeredVoters * b.turnout)]));
    }
    const out = firstPastThePost({ pack: ukPack, votes, seed: 1 }, ukPack.winRule as never);
    expect(Object.values(out.tally).reduce((a, b) => a + b, 0)).toBe(650);
    expect(out.tally.other).toBeGreaterThanOrEqual(18); // Northern Ireland
    expect(out.tally.lab ?? 0).toBeGreaterThan(0);
    (globalThis as { console?: { log: (...a: unknown[]) => void } }).console?.log('UK placeholder start seats:', out.tally);
  });

  it('is playable to a result, with an exit poll and the chance of a hung parliament', () => {
    const N = 20;
    const targets: Record<string, string[]> = {
      lab: ['wm', 'em', 'ee', 'se', 'sco', 'sw', 'nw', 'yh'],
      con: ['wm', 'em', 'ee', 'nw', 'yh', 'ne', 'se', 'wal'],
      lib: ['sw', 'se', 'ee', 'lon', 'sw', 'se'],
    };
    const res: Record<string, Record<string, number>> = {};
    for (const party of Object.keys(targets)) {
      res[party] = {};
      for (let seed = 1; seed <= N; seed++) {
        const s = play(ukPack, seed, party, targets[party]!);
        expect(s.phase).toBe('finished');
        expect(Object.values(s.result!.exitPoll!).reduce((a, b) => a + b, 0)).toBe(650);
        const o = s.result!.playerOutcome;
        res[party]![o] = (res[party]![o] ?? 0) + 1;
      }
    }
    let lazyCon = 0;
    for (let seed = 1; seed <= N; seed++) {
      const o = play(ukPack, seed, 'con', ['se']).result!.playerOutcome;
      if (o === 'won' || o === 'coalition') lazyCon++;
    }
    (globalThis as { console?: { log: (...a: unknown[]) => void } }).console?.log('UK outcomes over', N, 'seeds:', JSON.stringify(res), 'Con campaigning only in its safe South East, won or coalition:', lazyCon);
    const gov = (p: string) => (res[p]!.won ?? 0) + (res[p]!.coalition ?? 0);
    expect(gov('lab')).toBeGreaterThanOrEqual(N * 0.5);
    expect(gov('con')).toBeGreaterThanOrEqual(N * 0.15);
    expect(gov('con')).toBeLessThanOrEqual(N * 0.75);
    expect(gov('con')).toBeGreaterThan(lazyCon);
  });
});
