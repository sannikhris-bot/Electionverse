import type { CountryPack } from '../types';

export interface PackIssue {
  level: 'error' | 'warning';
  message: string;
}

/**
 * Names of real people must never appear in pack content. This list is a
 * safety net, not a complete check: human review is still required.
 * Matching is case-insensitive on whole words.
 */
export const DEFAULT_BLOCKED_NAMES: string[] = [];

export function validatePack(pack: CountryPack, blockedNames: string[] = DEFAULT_BLOCKED_NAMES): PackIssue[] {
  const issues: PackIssue[] = [];
  const err = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });

  const regionIds = new Set(pack.regions.map((r) => r.id));
  const partyIds = new Set(pack.parties.map((p) => p.id));
  const issueIds = new Set(pack.issues.map((i) => i.id));
  const sourceIds = new Set(pack.sources.map((s) => s.id));
  const eventIds = new Set(pack.events.map((e) => e.id));

  if (regionIds.size !== pack.regions.length) err('Duplicate region ids.');
  if (partyIds.size !== pack.parties.length) err('Duplicate party ids.');
  if (pack.parties.filter((p) => p.playable).length < 2) err('A pack needs at least two playable parties.');

  // Baselines
  for (const r of pack.regions) {
    const b = pack.baselines.find((x) => x.regionId === r.id);
    if (!b) {
      err(`Region ${r.id} has no baseline.`);
      continue;
    }
    const total = Object.values(b.shares).reduce((a, v) => a + v, 0);
    if (total > 1.0001) err(`Baseline shares in ${r.id} sum to ${total.toFixed(3)} (> 1).`);
    if (total < 0.98 && !partyIds.has('other')) warn(`Baseline shares in ${r.id} sum to ${total.toFixed(3)} and the pack has no "other" party.`);
    for (const p of pack.parties.filter((x) => x.playable)) {
      if (b.shares[p.id] === undefined) err(`Region ${r.id} has no baseline for party ${p.id}.`);
    }
    for (const k of Object.keys(b.shares)) if (!partyIds.has(k)) err(`Baseline in ${r.id} names unknown party ${k}.`);
    if (b.turnout <= 0 || b.turnout > 1) err(`Turnout in ${r.id} must be between 0 and 1.`);
    if (r.stake < 0 || r.registeredVoters <= 0) err(`Region ${r.id} needs a non-negative stake and positive registered voters.`);
  }
  for (const b of pack.baselines) if (!regionIds.has(b.regionId)) err(`Baseline for unknown region ${b.regionId}.`);
  for (const [pid, ids] of Object.entries(pack.notStanding ?? {})) {
    if (!partyIds.has(pid)) err(`notStanding names unknown party ${pid}.`);
    for (const id of ids) {
      if (!regionIds.has(id)) err(`notStanding for ${pid} names unknown region ${id}.`);
      const share = pack.baselines.find((b) => b.regionId === id)?.shares[pid] ?? 0;
      if (share > 0) err(`${pid} does not stand in ${id} but has a baseline share there.`);
    }
  }

  // Issue profiles
  for (const ip of pack.issueProfiles) {
    if (!regionIds.has(ip.regionId)) err(`Issue profile for unknown region ${ip.regionId}.`);
    for (const k of Object.keys(ip.priorities)) if (!issueIds.has(k)) err(`Issue profile ${ip.regionId} names unknown issue ${k}.`);
  }

  // Win rule satisfiable
  const stakeTotal = pack.regions.reduce((a, r) => a + r.stake, 0);
  const wr = pack.winRule;
  if (wr.type === 'electoralCollege') {
    if (stakeTotal !== wr.totalVotes) err(`Electoral votes sum to ${stakeTotal}, expected ${wr.totalVotes}.`);
    if (wr.toWin > wr.totalVotes) err('toWin exceeds total electoral votes.');
  } else if (wr.type === 'firstPastThePost') {
    if (stakeTotal !== wr.totalSeats) err(`Seats sum to ${stakeTotal}, expected ${wr.totalSeats}.`);
    if (wr.majority > wr.totalSeats) err('Majority exceeds total seats.');
  } else if (wr.type === 'proportionalList') {
    if (wr.majority > wr.totalSeats) err('Majority exceeds total seats.');
  } else if (wr.type === 'presidentialSpread') {
    for (const id of [...wr.unitRegionIds, ...wr.alsoRequired]) if (!regionIds.has(id)) err(`Spread rule names unknown region ${id}.`);
    if (wr.requiredUnits > wr.unitRegionIds.length) err('requiredUnits exceeds the number of units.');
  }

  // Platform sourcing
  for (const p of pack.parties) {
    for (const pos of p.platform) {
      if (!issueIds.has(pos.issueId)) err(`Party ${p.id} platform names unknown issue ${pos.issueId}.`);
      if (!pos.sourceId) {
        if (pack.placeholderData) warn(`Party ${p.id} platform on ${pos.issueId} has no source yet (placeholder).`);
        else err(`Party ${p.id} platform on ${pos.issueId} has no source.`);
      } else if (!sourceIds.has(pos.sourceId)) err(`Party ${p.id} cites unknown source ${pos.sourceId}.`);
    }
  }

  // Events
  for (const e of pack.events) {
    if (e.choices.length < 2) err(`Event ${e.id} needs at least two choices.`);
    for (const c of e.choices) if (c.delayed && !eventIds.has(c.delayed.eventId)) err(`Event ${e.id}/${c.id} schedules unknown event ${c.delayed.eventId}.`);
  }

  // Activities, media, rivals
  if (!pack.activities.some((a) => a.kind === 'rest')) err('Pack needs a rest activity.');
  if (pack.mediaOutlets.length === 0) err('Pack needs at least one fictional media outlet.');
  if (pack.pollsters.length === 0) err('Pack needs at least one fictional pollster.');
  if (pack.rivalArchetypes.length === 0) err('Pack needs at least one rival archetype.');

  // Status and review
  if (pack.status === 'playable' && pack.placeholderData) warn('Pack is playable but contains placeholder data marked TODO-VERIFY.');
  if (pack.status === 'playable' && !pack.contentReviewedOn) warn('Pack has not had a fact and legal review.');

  // Real-person name scan
  if (blockedNames.length) {
    const text = JSON.stringify(pack).toLowerCase();
    for (const name of blockedNames) {
      const re = new RegExp(`\\b${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (re.test(text)) err(`Pack content mentions a blocked real-person name: "${name}".`);
    }
  }
  return issues;
}
