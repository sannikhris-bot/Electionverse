import { Rng, hashString } from '../rng';
import type { CampaignState, CountryPack, NewCampaignOptions, RegionState, RivalState } from '../types';
import { normaliseRegion } from '../util';
import { DIFFICULTY } from './modifiers';

export const ENGINE_VERSION = 1;
export const OTHER_PARTY = 'other';

/** Parties that campaign actively (the player plus AI rivals). */
export function activeParties(pack: CountryPack): string[] {
  return pack.parties.filter((p) => p.playable).map((p) => p.id);
}

export function newCampaign(pack: CountryPack, opts: NewCampaignOptions): CampaignState {
  const party = pack.parties.find((p) => p.id === opts.partyId);
  if (!party) throw new Error(`Unknown party ${opts.partyId}`);
  if (!party.playable) throw new Error(`Party ${opts.partyId} is not playable`);
  if (!pack.regions.some((r) => r.id === opts.nominee.homeRegionId)) {
    throw new Error(`Unknown home region ${opts.nominee.homeRegionId}`);
  }
  const difficulty = opts.difficulty ?? 'normal';
  const rng = new Rng(opts.seed ^ hashString(pack.id));
  const undecided = Math.min(0.4, DIFFICULTY[difficulty].undecided * (pack.volatility ?? 1));

  const regions: Record<string, RegionState> = {};
  for (const region of pack.regions) {
    const base = pack.baselines.find((b) => b.regionId === region.id);
    if (!base) throw new Error(`No baseline for region ${region.id}`);
    const shares: Record<string, number> = {};
    let listed = 0;
    for (const p of pack.parties) {
      const s = base.shares[p.id] ?? 0;
      shares[p.id] = s;
      listed += s;
    }
    // Remainder of the last real result goes to "other" when the pack has it.
    if (listed < 1 && shares[OTHER_PARTY] !== undefined) shares[OTHER_PARTY] = (shares[OTHER_PARTY] ?? 0) + (1 - listed);
    for (const k of Object.keys(shares)) shares[k] = shares[k]! * (1 - undecided);
    regions[region.id] = normaliseRegion({
      shares,
      undecided,
      baseTurnout: base.turnout,
      gotv: {},
      visits: {},
      recognition: region.id === opts.nominee.homeRegionId ? 0.6 : 0.2,
    });
  }

  const rivalIds = activeParties(pack).filter((p) => p !== opts.partyId);
  const rivals: RivalState[] = rivalIds.map((pid, i) => {
    const rp = pack.parties.find((p) => p.id === pid)!;
    const nominee = pack.rivalNominees[i % Math.max(1, pack.rivalNominees.length)] ?? {
      id: `rival-${pid}`,
      name: `${rp.shortName} nominee`,
      bio: 'A fictional nominee.',
    };
    const archetype = rng.pick(pack.rivalArchetypes);
    // Rival starts in the region where its party is strongest.
    let best = pack.regions[0]!.id;
    let bestShare = -1;
    for (const r of pack.regions) {
      const s = regions[r.id]!.shares[pid] ?? 0;
      if (s > bestShare) {
        best = r.id;
        bestShare = s;
      }
    }
    return {
      partyId: pid,
      nominee,
      archetypeId: archetype.id,
      location: best,
      funds: rp.resources.funds,
      energy: 100,
      momentum: 0,
      lastStops: [],
    };
  });

  const pollsterBias: Record<string, Record<string, number>> = {};
  for (const pollster of pack.pollsters) {
    const bias: Record<string, number> = {};
    for (const p of pack.parties) bias[p.id] = rng.normal(0, 0.01);
    pollsterBias[pollster.id] = bias;
  }

  const bg = opts.nominee.background;
  const traits = opts.nominee.traits;
  return {
    engineVersion: ENGINE_VERSION,
    packId: pack.id,
    packVersion: pack.version,
    seed: opts.seed,
    rng: rng.state,
    day: 1,
    phase: pack.calendar.debateDays.includes(1) ? 'awaitingDebate' : 'campaign',
    difficulty,
    playerPartyId: opts.partyId,
    nominee: opts.nominee,
    meters: {
      momentum: 0,
      funds: Math.round(party.resources.funds * (bg === 'business' ? 1.2 : 1)),
      energy: 100,
      unity: 70,
      credibility: bg === 'doctor' ? 70 : 60,
      volunteers: Math.round(
        party.resources.volunteers * (bg === 'organiser' ? 1.25 : 1) * (traits.includes('organiser') ? 1.2 : 1),
      ),
    },
    location: opts.nominee.homeRegionId,
    regions,
    rivals,
    pollsterBias,
    delayed: [],
    eventCooldowns: {},
    news: [],
    polls: [],
    reports: [],
  };
}
