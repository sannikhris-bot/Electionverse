/**
 * Countries shown on the World Map. Only countries with a playable pack in
 * PACKS can be played; the rest are previews with a short system explainer.
 */
export interface WorldCountry {
  id: string;
  name: string;
  flag: string;
  continent: string;
  system: string;
  explainer: string;
  status: 'playable' | 'inDevelopment' | 'preview';
  /** Rough position on the stylised world map (0-100 each axis). */
  x: number;
  y: number;
}

export const WORLD: WorldCountry[] = [
  { id: 'us', name: 'United States', flag: '🇺🇸', continent: 'North America', system: 'Electoral College', explainer: 'Win states, not just votes: each state awards all its electoral votes to its winner. 270 of 538 wins.', status: 'playable', x: 20, y: 38 },
  { id: 'ca', name: 'Canada', flag: '🇨🇦', continent: 'North America', system: 'First past the post', explainer: '343 ridings, each won by the most votes. 172 seats for a majority; otherwise a minority government must hold the confidence of the House.', status: 'inDevelopment', x: 19, y: 25 },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', continent: 'Europe', system: 'First past the post', explainer: '650 constituencies, each won by the most votes. 326 seats for a majority; otherwise a hung parliament.', status: 'inDevelopment', x: 46, y: 27 },
  { id: 'za', name: 'South Africa', flag: '🇿🇦', continent: 'Africa', system: 'Proportional representation', explainer: '400 seats shared in proportion to votes. 201 for a majority; Parliament then elects the President, often after coalition talks.', status: 'inDevelopment', x: 53, y: 76 },
  { id: 'ng', name: 'Nigeria', flag: '🇳🇬', continent: 'Africa', system: 'Presidential with spread rule', explainer: 'Win the most votes and at least 25% in two-thirds of the states, or face a runoff.', status: 'inDevelopment', x: 49, y: 55 },
  { id: 'in', name: 'India', flag: '🇮🇳', continent: 'Asia', system: 'First past the post', explainer: 'The world\'s largest election: 543 constituencies in a multi-phase vote.', status: 'preview', x: 70, y: 48 },
  { id: 'br', name: 'Brazil', flag: '🇧🇷', continent: 'South America', system: 'Two-round presidential', explainer: 'A majority wins in round one; otherwise the top two meet in a runoff.', status: 'preview', x: 31, y: 66 },
  { id: 'ke', name: 'Kenya', flag: '🇰🇪', continent: 'Africa', system: 'Presidential with spread rule', explainer: 'Over half the votes and at least 25% in at least half of the 47 counties.', status: 'preview', x: 58, y: 60 },
  { id: 'fr', name: 'France', flag: '🇫🇷', continent: 'Europe', system: 'Two-round presidential', explainer: 'Two rounds two weeks apart; the top two meet in a runoff if nobody wins a majority.', status: 'preview', x: 47, y: 32 },
  { id: 'de', name: 'Germany', flag: '🇩🇪', continent: 'Europe', system: 'Mixed-member proportional', explainer: 'Two votes: one for a local candidate, one for a party list that sets the overall balance.', status: 'preview', x: 50, y: 29 },
  { id: 'gh', name: 'Ghana', flag: '🇬🇭', continent: 'Africa', system: 'Two-round presidential', explainer: 'More than half the votes wins; otherwise a runoff.', status: 'preview', x: 46, y: 55 },
  { id: 'au', name: 'Australia', flag: '🇦🇺', continent: 'Oceania', system: 'Preferential voting', explainer: 'Voters rank candidates; preferences flow until someone passes 50%.', status: 'preview', x: 84, y: 74 },
];
