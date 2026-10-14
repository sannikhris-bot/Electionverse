import { Rng, hashString } from '../rng';
import type { CampaignState, CountryPack } from '../types';
import { clamp, nationalShares, partyName, round } from '../util';
import { clone } from './day';

export interface AllianceOption {
  partyId: string;
  /** Partner's national share and the player's, at the time of asking. */
  partnerShare: number;
  playerShare: number;
  /** 0-1 chance that talks succeed. */
  chance: number;
}

/** Parties the player can open alliance talks with today (empty when talks are not possible). */
export function allianceOptions(pack: CountryPack, state: CampaignState): AllianceOption[] {
  const talks = pack.allianceTalks;
  if (!talks || state.alliance || state.phase !== 'campaign') return [];
  if (state.day < talks.fromDay || state.day > talks.toDay) return [];
  const nat = nationalShares(pack, state.regions).shares;
  const me = nat[state.playerPartyId] ?? 0;
  const leader = Object.entries(nat).sort((a, b) => b[1] - a[1])[0]?.[0];
  return state.rivals
    .filter((r) => r.partyId !== leader || r.partyId === state.playerPartyId)
    .map((r) => {
      const theirs = nat[r.partyId] ?? 0;
      // A smaller party is far more willing to back you than a bigger one.
      const size = theirs < me ? 0.3 : -0.15;
      const chance = clamp(0.25 + size + (state.meters.unity - 50) / 200 + (state.meters.credibility - 50) / 300 + state.meters.momentum / 100, 0.05, 0.75);
      return { partyId: r.partyId, partnerShare: round(theirs, 4), playerShare: round(me, 4), chance: round(chance, 2) };
    })
    .filter((o) => o.partnerShare > 0.005)
    .sort((a, b) => b.chance - a.chance);
}

export function proposeAlliance(pack: CountryPack, prev: CampaignState, partnerId: string): CampaignState {
  const opt = allianceOptions(pack, prev).find((o) => o.partyId === partnerId);
  if (!opt) throw new Error('Alliance talks with that party are not possible now.');
  const state = clone(prev);
  const rng = new Rng(state.seed ^ hashString(`alliance:${partnerId}:${state.day}`));
  const success = rng.chance(opt.chance);
  state.alliance = { partnerId, day: state.day, chance: opt.chance, success };
  const outlet = pack.mediaOutlets[0]?.id ?? 'news';
  const partner = partyName(pack, partnerId);
  if (success) {
    const transfer = pack.allianceTalks!.transfer;
    for (const r of Object.values(state.regions)) {
      const theirs = r.shares[partnerId] ?? 0;
      const moving = theirs * transfer;
      const toUndecided = theirs * (1 - transfer) * 0.5;
      r.shares[partnerId] = theirs - moving - toUndecided;
      r.shares[state.playerPartyId] = (r.shares[state.playerPartyId] ?? 0) + moving;
      r.undecided += toUndecided;
    }
    // The partner stands down: it no longer campaigns.
    state.rivals = state.rivals.filter((r) => r.partyId !== partnerId);
    state.meters.momentum = clamp(state.meters.momentum + 4, -20, 20);
    state.meters.unity = clamp(state.meters.unity - 6, 0, 100);
    state.news.push({ day: state.day, outletId: outlet, headline: `${partner} stands down and endorses ${state.nominee.name} in a new alliance`, tone: 'good' });
  } else {
    state.meters.momentum = clamp(state.meters.momentum - 1.5, -20, 20);
    state.meters.unity = clamp(state.meters.unity - 5, 0, 100);
    state.news.push({ day: state.day, outletId: outlet, headline: `Alliance talks between ${state.nominee.name} and the ${partner} collapse`, tone: 'bad' });
  }
  return state;
}
