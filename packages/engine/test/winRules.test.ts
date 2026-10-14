import { describe, expect, it } from 'vitest';
import { electoralCollege, firstPastThePost, largestRemainder, presidentialSpread, proportionalList } from '../src';
import { testPack } from './fixtures';

const votesFor = (pairs: [number, number][]) =>
  Object.fromEntries(pairs.map(([a, b], i) => [`r${i + 1}`, { a, b }]));

describe('electoralCollege', () => {
  it('awards each region winner-take-all and declares a winner at the threshold', () => {
    const pack = testPack({ type: 'electoralCollege', totalVotes: 36, toWin: 19 });
    // a wins r1 (10), r2 (8), r5 (4) = 22; b wins r3 (6), r4 (5), r6 (3) = 14
    const out = electoralCollege({ pack, votes: votesFor([[6, 4], [6, 4], [4, 6], [4, 6], [6, 4], [4, 6]]), seed: 1 }, { type: 'electoralCollege', totalVotes: 36, toWin: 19 });
    expect(out.tally).toEqual({ a: 22, b: 14 });
    expect(out.winnerPartyId).toBe('a');
    expect(out.status).toBe('won');
  });

  it('reports no winner when nobody reaches the threshold', () => {
    const pack = testPack({ type: 'electoralCollege', totalVotes: 36, toWin: 19 });
    // a: r1 10 + r2 8 = 18; b: 18
    const out = electoralCollege({ pack, votes: votesFor([[6, 4], [6, 4], [4, 6], [4, 6], [4, 6], [4, 6]]), seed: 1 }, { type: 'electoralCollege', totalVotes: 36, toWin: 19 });
    expect(out.winnerPartyId).toBeNull();
    expect(out.status).toBe('tie');
  });
});

describe('firstPastThePost', () => {
  const cfg = { type: 'firstPastThePost' as const, totalSeats: 36, majority: 19, seatSpread: 0.03, coalition: true };

  it('gives a landslide region all of its seats', () => {
    const pack = testPack(cfg);
    const out = firstPastThePost({ pack, votes: votesFor([[9, 1], [9, 1], [9, 1], [1, 9], [1, 9], [1, 9]]), seed: 7 }, cfg);
    expect(out.tally).toEqual({ a: 24, b: 12 });
    expect(out.winnerPartyId).toBe('a');
  });

  it('splits a close cluster and can produce a hung parliament', () => {
    const pack = testPack(cfg);
    const out = firstPastThePost({ pack, votes: votesFor([[50, 50], [50, 50], [50, 50], [50, 50], [50, 50], [50, 50]]), seed: 3 }, cfg);
    const seats = (out.tally.a ?? 0) + (out.tally.b ?? 0);
    expect(seats).toBe(36);
    expect(out.tally.a).toBeGreaterThan(0);
    expect(out.tally.b).toBeGreaterThan(0);
  });

  it('is deterministic for the same seed', () => {
    const pack = testPack(cfg);
    const votes = votesFor([[51, 49], [48, 52], [50, 50], [53, 47], [49, 51], [50, 50]]);
    expect(firstPastThePost({ pack, votes, seed: 42 }, cfg).tally).toEqual(firstPastThePost({ pack, votes, seed: 42 }, cfg).tally);
  });
});

describe('largestRemainder and proportionalList', () => {
  it('allocates exactly the seat total by Hare quota and largest remainder', () => {
    // 100 seats, quota 1000: a 45.6 -> 45, b 33.3 -> 33, c 21.1 -> 21 = 99; largest remainder (a .6) gets the last seat.
    expect(largestRemainder({ a: 45600, b: 33300, c: 21100 }, 100)).toEqual({ a: 46, b: 33, c: 21 });
  });

  it('excludes parties below the threshold', () => {
    const out = largestRemainder({ a: 600, b: 380, c: 20 }, 10, 0.05);
    expect(out.c).toBeUndefined();
    expect((out.a ?? 0) + (out.b ?? 0)).toBe(10);
  });

  it('reports a hung result below the majority', () => {
    const cfg = { type: 'proportionalList' as const, totalSeats: 400, majority: 201, threshold: 0, coalition: true };
    const pack = testPack(cfg);
    const out = proportionalList({ pack, votes: { r1: { a: 45, b: 40, other: 15 } }, seed: 1 }, cfg);
    expect(out.tally.a).toBe(180);
    expect(out.status).toBe('hung');
    expect(out.winnerPartyId).toBeNull();
  });
});

describe('presidentialSpread', () => {
  const base = { type: 'presidentialSpread' as const, minShare: 0.25, requiredUnits: 4, unitRegionIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'], alsoRequired: [], runoff: true };

  it('elects the plurality winner who meets the spread rule', () => {
    const pack = testPack(base);
    const out = presidentialSpread({ pack, votes: votesFor([[60, 40], [60, 40], [30, 70], [30, 70], [60, 40], [60, 40]]), seed: 1 }, base);
    expect(out.winnerPartyId).toBe('a');
    expect(out.spread?.a).toBe(6);
    expect(out.status).toBe('won');
  });

  it('sends the race to a runoff when the leader lacks spread', () => {
    const pack = testPack(base);
    // a wins big in 3 regions, gets under 25% in 3 others: spread 3 < 4.
    const votes = {
      r1: { a: 90, b: 10, c: 0 },
      r2: { a: 90, b: 10, c: 0 },
      r3: { a: 90, b: 10, c: 0 },
      r4: { a: 10, b: 50, c: 40 },
      r5: { a: 10, b: 50, c: 40 },
      r6: { a: 10, b: 50, c: 40 },
    };
    const out = presidentialSpread({ pack, votes, seed: 1 }, base);
    expect(out.status).toBe('runoff');
    expect(out.runoff?.partyIds).toEqual(['a', 'b']);
    expect(['a', 'b']).toContain(out.winnerPartyId);
  });

  it('honours regions where the minimum share is also required', () => {
    const cfg = { ...base, alsoRequired: ['r6'], runoff: false };
    const pack = testPack(cfg);
    const out = presidentialSpread({ pack, votes: votesFor([[60, 40], [60, 40], [60, 40], [60, 40], [60, 40], [20, 80]]), seed: 1 }, cfg);
    expect(out.winnerPartyId).toBeNull();
  });
});
