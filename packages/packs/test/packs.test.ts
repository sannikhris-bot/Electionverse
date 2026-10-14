import { describe, expect, it } from 'vitest';
import { applyAction, newCampaign, previewDay, validatePack, type CampaignState, type CountryPack } from '@electionverse/engine';
import { PACKS, WORLD, usPack } from '../src';

function play(pack: CountryPack, seed: number, partyId: string, smart: boolean): CampaignState {
  const home = smart ? 'pa' : 'ca';
  let s = newCampaign(pack, { seed, partyId, nominee: { name: 'Sam Rivera', background: 'teacher', traits: ['orator', 'organiser'], homeRegionId: home } });
  const swing = ['pa', 'mi', 'wi', 'ga', 'az', 'nv', 'nc'];
  for (let guard = 0; guard < 300 && s.phase !== 'finished'; guard++) {
    if (s.phase === 'awaitingDebate') s = applyAction(pack, s, { type: 'debate', responses: ['message', 'message', 'message'] });
    else if (s.phase === 'awaitingEvent') s = applyAction(pack, s, { type: 'resolveEvent', choiceId: pack.events.find((e) => e.id === s.pending!.eventId)!.choices[0]!.id });
    else if (s.phase === 'pollingDay') s = applyAction(pack, s, { type: 'holdElection' });
    else if (s.phase === 'coalition') s = applyAction(pack, s, { type: 'coalition', choice: 'concede' });
    else {
      const target = smart ? swing[s.day % swing.length]! : 'ca';
      const late = s.day > pack.calendar.days - pack.calendar.gotvDays;
      let stops = [
        { regionId: target, activityId: s.meters.funds > 150 ? 'rally' : 'fundraiser', travel: 'air' as 'road' | 'air' },
        { regionId: target, activityId: late ? 'gotv' : 'canvass' },
      ];
      if (!previewDay(pack, s, stops).valid) stops = [{ regionId: s.location, activityId: 'fundraiser', travel: 'road' as const }];
      if (!previewDay(pack, s, stops).valid) stops = [{ regionId: s.location, activityId: 'rest', travel: 'road' as const }];
      s = applyAction(pack, s, { type: 'planDay', stops });
    }
  }
  return s;
}

describe('pack registry', () => {
  it('every playable world country has a pack, and every pack is on the map', () => {
    for (const c of WORLD.filter((w) => w.status === 'playable')) expect(PACKS[c.id]).toBeDefined();
    for (const id of Object.keys(PACKS)) expect(WORLD.some((w) => w.id === id)).toBe(true);
  });
});

describe('US pack', () => {
  it('has 50 states plus DC and 538 electoral votes', () => {
    expect(usPack.regions).toHaveLength(51);
    expect(usPack.regions.reduce((a, r) => a + r.stake, 0)).toBe(538);
  });

  it('passes validation with no errors', () => {
    const issues = validatePack(usPack);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    // Placeholder status must be visible, not hidden.
    expect(issues.some((i) => i.message.includes('placeholder'))).toBe(true);
  });

  it('starts from the certified 2024 result', () => {
    // Winner-take-all on the certified shares gives Trump 312 and Harris 226: Maine's and Nebraska's
    // district splits (1 and 1) cancel out under winner-take-all.
    const ev: Record<string, number> = {};
    for (const r of usPack.regions) {
      const b = usPack.baselines.find((x) => x.regionId === r.id)!;
      const w = b.shares.dem! > b.shares.rep! ? 'dem' : 'rep';
      ev[w] = (ev[w] ?? 0) + r.stake;
    }
    expect(ev).toEqual({ rep: 312, dem: 226 });
    // Spot checks against the FEC file (candidate votes / total votes).
    const pa = usPack.baselines.find((b) => b.regionId === 'pa')!;
    expect(pa.shares.rep).toBeCloseTo(3543308 / 7058732, 5);
    expect(pa.shares.dem).toBeCloseTo(3423042 / 7058732, 5);
    for (const b of usPack.baselines) {
      const total = Object.values(b.shares).reduce((a, v) => a + v, 0);
      expect(total).toBeCloseTo(1, 4);
      expect(b.turnout).toBeGreaterThan(0.3);
      expect(b.turnout).toBeLessThan(1);
    }
  });

  it('has a unique tile for every state on the map', () => {
    const tiles = new Set(usPack.regions.map((r) => `${r.x},${r.y}`));
    expect(tiles.size).toBe(51);
  });

  it('is balanced: targeted campaigning beats untargeted, and the trailing party can win but not easily', () => {
    const results = { smartDem: 0, smartRep: 0, lazyDem: 0 };
    const N = 20;
    for (let seed = 1; seed <= N; seed++) {
      if (play(usPack, seed, 'dem', true).result!.playerOutcome === 'won') results.smartDem++;
      if (play(usPack, seed, 'rep', true).result!.playerOutcome === 'won') results.smartRep++;
      if (play(usPack, seed, 'dem', false).result!.playerOutcome === 'won') results.lazyDem++;
    }
    (globalThis as { console?: { log: (...a: unknown[]) => void } }).console?.log('US balance over', N, 'seeds:', results);
    // The side starting behind on the map must be winnable but not a walkover for strong play.
    expect(results.smartDem).toBeGreaterThanOrEqual(N * 0.2);
    expect(results.smartDem).toBeLessThanOrEqual(N * 0.9);
    expect(results.smartRep).toBeGreaterThan(0);
    // Smart targeting must beat camping in a safe state.
    expect(results.smartDem).toBeGreaterThan(results.lazyDem);
  });
});
