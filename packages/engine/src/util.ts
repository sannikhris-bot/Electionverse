import type { CountryPack, RegionState } from './types';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const round = (v: number, dp = 4) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

/** Re-normalise a region so party shares + undecided sum to exactly 1. */
export function normaliseRegion(r: RegionState): RegionState {
  const total = Object.values(r.shares).reduce((s, v) => s + Math.max(0, v), 0) + Math.max(0, r.undecided);
  if (total <= 0) return r;
  const shares: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.shares)) shares[k] = Math.max(0, v) / total;
  return { ...r, shares, undecided: Math.max(0, r.undecided) / total };
}

/**
 * Move `delta` share points toward `partyId` in a region. A fraction
 * `persuasion` of the gain comes from other parties (proportionally), the
 * rest from undecided voters. Negative delta moves support away to undecided.
 * Returns the new region and the change actually applied.
 */
export function shiftSupport(
  r: RegionState,
  partyId: string,
  delta: number,
  persuasion: number,
): { region: RegionState; applied: number } {
  const shares = { ...r.shares };
  let undecided = r.undecided;
  const current = shares[partyId] ?? 0;
  if (delta >= 0) {
    const fromUndecided = Math.min(undecided, delta * (1 - persuasion));
    const others = Object.entries(shares).filter(([k]) => k !== partyId);
    const othersTotal = others.reduce((s, [, v]) => s + v, 0);
    const fromOthers = Math.min(othersTotal * 0.5, delta - fromUndecided);
    for (const [k, v] of others) {
      if (othersTotal > 0) shares[k] = v - fromOthers * (v / othersTotal);
    }
    undecided -= fromUndecided;
    const applied = fromUndecided + fromOthers;
    shares[partyId] = current + applied;
    return { region: normaliseRegion({ ...r, shares, undecided }), applied };
  }
  const loss = Math.min(current, -delta);
  shares[partyId] = current - loss;
  undecided += loss;
  return { region: normaliseRegion({ ...r, shares, undecided }), applied: -loss };
}

/** Registered-voter weighted national share for each party (undecided excluded from numerator). */
export function nationalShares(pack: CountryPack, regions: Record<string, RegionState>) {
  const totals: Record<string, number> = {};
  let undecided = 0;
  let weight = 0;
  for (const reg of pack.regions) {
    const rs = regions[reg.id];
    if (!rs) continue;
    const w = reg.registeredVoters * rs.baseTurnout;
    weight += w;
    undecided += rs.undecided * w;
    for (const [p, s] of Object.entries(rs.shares)) totals[p] = (totals[p] ?? 0) + s * w;
  }
  const shares: Record<string, number> = {};
  for (const [p, v] of Object.entries(totals)) shares[p] = weight > 0 ? v / weight : 0;
  return { shares, undecided: weight > 0 ? undecided / weight : 0 };
}

export function regionById(pack: CountryPack, id: string) {
  const r = pack.regions.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown region ${id} in pack ${pack.id}`);
  return r;
}

export function partyName(pack: CountryPack, id: string) {
  return pack.parties.find((p) => p.id === id)?.shortName ?? id;
}

/** Travel hours between two regions on the tile grid. */
export function travelHours(pack: CountryPack, from: string, to: string, mode: 'road' | 'air'): number {
  if (from === to) return 0;
  const a = regionById(pack, from);
  const b = regionById(pack, to);
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  if (mode === 'air') return 2 + dist * 0.25;
  return dist * 1.6;
}

export function travelCost(pack: CountryPack, from: string, to: string, mode: 'road' | 'air'): number {
  if (from === to) return 0;
  const a = regionById(pack, from);
  const b = regionById(pack, to);
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return mode === 'air' ? 25 + dist * 4 : dist * 2;
}
