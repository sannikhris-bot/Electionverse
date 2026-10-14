import type { ActivityKind, CandidateBackground, CountryPack, NomineeSetup, Trait } from '../types';

export const TRAITS: Record<Trait, { name: string; description: string }> = {
  orator: { name: 'Orator', description: 'Rallies, interviews and debates hit 25% harder.' },
  fundraiser: { name: 'Fundraiser', description: 'Fundraisers raise 50% more.' },
  organiser: { name: 'Grassroots Organiser', description: 'Canvassing and get-out-the-vote work 30% better; +20% volunteers.' },
  policy: { name: 'Policy Expert', description: 'Interviews and visits +20%; issue focus matters more.' },
  charismatic: { name: 'Charismatic', description: 'Market walks and roadshows +20%; name recognition grows faster.' },
  localHero: { name: 'Local Hero', description: 'Every activity in your home region is 50% stronger.' },
};

export const BACKGROUNDS: Record<CandidateBackground, { name: string; description: string }> = {
  teacher: { name: 'Teacher', description: 'Campus and community visits +10%.' },
  business: { name: 'Business Owner', description: 'Start with 20% more funds.' },
  doctor: { name: 'Doctor', description: 'Start with higher credibility.' },
  organiser: { name: 'Union Organiser', description: 'Start with 25% more volunteers.' },
  veteran: { name: 'Veteran', description: 'Recover more energy each night.' },
  lawyer: { name: 'Lawyer', description: 'Debate responses score higher.' },
  pastor: { name: 'Faith Leader', description: 'Rallies +10%.' },
  farmer: { name: 'Farmer', description: 'Market walks +10%.' },
};

const TRAIT_KIND_BONUS: Partial<Record<Trait, Partial<Record<ActivityKind, number>>>> = {
  orator: { rally: 1.25, interview: 1.25 },
  organiser: { canvass: 1.3, gotv: 1.3 },
  policy: { interview: 1.2, visit: 1.2 },
  charismatic: { market: 1.2, roadshow: 1.2 },
};

const BACKGROUND_KIND_BONUS: Partial<Record<CandidateBackground, Partial<Record<ActivityKind, number>>>> = {
  teacher: { visit: 1.1 },
  pastor: { rally: 1.1 },
  farmer: { market: 1.1 },
};

/** Multiplier for the player's activities from traits and background. */
export function traitMultiplier(pack: CountryPack, nominee: NomineeSetup, kind: ActivityKind, regionId: string): number {
  let m = 1;
  for (const t of nominee.traits) m *= TRAIT_KIND_BONUS[t]?.[kind] ?? 1;
  m *= BACKGROUND_KIND_BONUS[nominee.background]?.[kind] ?? 1;
  if (nominee.traits.includes('localHero')) {
    const home = pack.regions.find((r) => r.id === nominee.homeRegionId);
    const here = pack.regions.find((r) => r.id === regionId);
    if (regionId === nominee.homeRegionId) m *= 1.5;
    else if (home?.group && home.group === here?.group) m *= 1.15;
  }
  return m;
}

/** Issue-match multiplier: rewards talking about what this region cares about. */
export function issueMultiplier(pack: CountryPack, regionId: string, focusIssueId: string | undefined, policyTrait: boolean): number {
  if (!focusIssueId) return 1;
  const profile = pack.issueProfiles.find((p) => p.regionId === regionId);
  if (!profile) return 1;
  const weights = Object.values(profile.priorities);
  const max = Math.max(...weights, 0.0001);
  const w = (profile.priorities[focusIssueId] ?? 0) / max; // 0..1
  const spread = policyTrait ? 0.65 : 0.5;
  return 0.85 + w * spread; // 0.85 .. 1.35 (1.5 with policy trait)
}

export function energyMultiplier(energy: number): number {
  if (energy >= 50) return 1;
  if (energy >= 30) return 0.85;
  return 0.6;
}

/**
 * rivalSkill: how well rivals judge where to go (less noise).
 * rivalPower: rivals' effect per activity, standing in for the traits and
 * staff experience the player gets from nominee creation.
 */
export const DIFFICULTY = {
  guided: { player: 1.15, rivalSkill: 0.4, rivalPower: 1.0, undecided: 0.16 },
  normal: { player: 1, rivalSkill: 0.7, rivalPower: 1.6, undecided: 0.14 },
  hard: { player: 0.9, rivalSkill: 1, rivalPower: 1.9, undecided: 0.12 },
} as const;
