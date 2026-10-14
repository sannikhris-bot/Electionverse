import type { CountryPack, Region } from '@electionverse/engine';
import { hashString } from '@electionverse/engine';
import { buildActivities, COMMON_EVENTS, RIVAL_ARCHETYPES } from '../common';
import { US_EVENTS } from './events';

/**
 * United States pack.
 *
 * REAL: state names, 2024-2028 electoral vote apportionment, 270-to-win rule.
 * TODO-VERIFY (placeholder): every baseline share, turnout figure and
 * registered-voter count below is an illustrative approximation for
 * playtesting only. Replace with certified 2024 state results before release.
 * Party platforms are empty until summarised from published platforms with sources.
 */

type Row = [id: string, name: string, ev: number, x: number, y: number, group: string, lean: number, place: string];

// lean = PLACEHOLDER Democratic two-party share, rounded, for playtesting only.
const STATES: Row[] = [
  ['ak', 'Alaska', 3, 0, 0, 'West', 0.44, 'Anchorage'],
  ['me', 'Maine', 4, 10, 0, 'Northeast', 0.53, 'Portland'],
  ['vt', 'Vermont', 3, 9, 1, 'Northeast', 0.64, 'Burlington'],
  ['nh', 'New Hampshire', 4, 10, 1, 'Northeast', 0.51, 'Manchester'],
  ['wa', 'Washington', 12, 0, 2, 'West', 0.58, 'Seattle'],
  ['id', 'Idaho', 4, 1, 2, 'West', 0.32, 'Boise'],
  ['mt', 'Montana', 4, 2, 2, 'West', 0.39, 'Billings'],
  ['nd', 'North Dakota', 3, 3, 2, 'Midwest', 0.31, 'Fargo'],
  ['mn', 'Minnesota', 10, 4, 2, 'Midwest', 0.52, 'Minneapolis'],
  ['il', 'Illinois', 19, 5, 2, 'Midwest', 0.56, 'Chicago'],
  ['wi', 'Wisconsin', 10, 6, 2, 'Midwest', 0.49, 'Milwaukee'],
  ['mi', 'Michigan', 15, 7, 2, 'Midwest', 0.49, 'Detroit'],
  ['ny', 'New York', 28, 8, 2, 'Northeast', 0.56, 'New York City'],
  ['ri', 'Rhode Island', 4, 9, 2, 'Northeast', 0.56, 'Providence'],
  ['ma', 'Massachusetts', 11, 10, 2, 'Northeast', 0.62, 'Boston'],
  ['or', 'Oregon', 8, 0, 3, 'West', 0.56, 'Portland'],
  ['nv', 'Nevada', 6, 1, 3, 'West', 0.49, 'Las Vegas'],
  ['wy', 'Wyoming', 3, 2, 3, 'West', 0.27, 'Cheyenne'],
  ['sd', 'South Dakota', 3, 3, 3, 'Midwest', 0.35, 'Sioux Falls'],
  ['ia', 'Iowa', 6, 4, 3, 'Midwest', 0.43, 'Des Moines'],
  ['in', 'Indiana', 11, 5, 3, 'Midwest', 0.4, 'Indianapolis'],
  ['oh', 'Ohio', 17, 6, 3, 'Midwest', 0.44, 'Columbus'],
  ['pa', 'Pennsylvania', 19, 7, 3, 'Northeast', 0.49, 'Philadelphia'],
  ['nj', 'New Jersey', 14, 8, 3, 'Northeast', 0.53, 'Newark'],
  ['ct', 'Connecticut', 7, 9, 3, 'Northeast', 0.57, 'Hartford'],
  ['ca', 'California', 54, 0, 4, 'West', 0.6, 'Los Angeles'],
  ['ut', 'Utah', 6, 1, 4, 'West', 0.39, 'Salt Lake City'],
  ['co', 'Colorado', 10, 2, 4, 'West', 0.55, 'Denver'],
  ['ne', 'Nebraska', 5, 3, 4, 'Midwest', 0.4, 'Omaha'],
  ['mo', 'Missouri', 10, 4, 4, 'Midwest', 0.41, 'St. Louis'],
  ['ky', 'Kentucky', 8, 5, 4, 'South', 0.34, 'Louisville'],
  ['wv', 'West Virginia', 4, 6, 4, 'South', 0.29, 'Charleston'],
  ['va', 'Virginia', 13, 7, 4, 'South', 0.53, 'Richmond'],
  ['md', 'Maryland', 10, 8, 4, 'South', 0.63, 'Baltimore'],
  ['de', 'Delaware', 3, 9, 4, 'South', 0.57, 'Wilmington'],
  ['az', 'Arizona', 11, 1, 5, 'West', 0.49, 'Phoenix'],
  ['nm', 'New Mexico', 5, 2, 5, 'West', 0.53, 'Albuquerque'],
  ['ks', 'Kansas', 6, 3, 5, 'Midwest', 0.42, 'Wichita'],
  ['ar', 'Arkansas', 6, 4, 5, 'South', 0.34, 'Little Rock'],
  ['tn', 'Tennessee', 11, 5, 5, 'South', 0.35, 'Nashville'],
  ['nc', 'North Carolina', 16, 6, 5, 'South', 0.48, 'Charlotte'],
  ['sc', 'South Carolina', 9, 7, 5, 'South', 0.41, 'Columbia'],
  ['dc', 'District of Columbia', 3, 8, 5, 'South', 0.9, 'Washington'],
  ['ok', 'Oklahoma', 7, 3, 6, 'South', 0.32, 'Oklahoma City'],
  ['la', 'Louisiana', 8, 4, 6, 'South', 0.39, 'New Orleans'],
  ['ms', 'Mississippi', 6, 5, 6, 'South', 0.38, 'Jackson'],
  ['al', 'Alabama', 9, 6, 6, 'South', 0.35, 'Birmingham'],
  ['ga', 'Georgia', 16, 7, 6, 'South', 0.49, 'Atlanta'],
  ['hi', 'Hawaii', 4, 0, 7, 'West', 0.62, 'Honolulu'],
  ['tx', 'Texas', 40, 3, 7, 'South', 0.43, 'Houston'],
  ['fl', 'Florida', 30, 8, 7, 'South', 0.44, 'Miami'],
];

const ISSUES = [
  { id: 'economy', name: 'Cost of living' },
  { id: 'jobs', name: 'Jobs and manufacturing' },
  { id: 'health', name: 'Health care' },
  { id: 'immigration', name: 'Immigration' },
  { id: 'education', name: 'Education' },
  { id: 'energy', name: 'Energy and climate' },
  { id: 'housing', name: 'Housing' },
  { id: 'safety', name: 'Public safety' },
  { id: 'farming', name: 'Farming and rural life' },
];

const regions: Region[] = STATES.map(([id, name, ev, x, y, group, , place]) => ({
  id,
  name,
  group,
  x,
  y,
  stake: ev,
  // TODO-VERIFY: placeholder registered voters scaled from electoral votes.
  registeredVoters: Math.round((ev - 2) * 480_000 + 300_000),
  landmark: place,
}));

export const usPack: CountryPack = {
  id: 'us',
  version: '0.1.0-placeholder',
  contentReviewedOn: null,
  placeholderData: true,
  names: { en: 'United States' },
  status: 'playable',
  continent: 'North America',
  flag: '🇺🇸',
  systemSummary:
    'A presidential race decided by the Electoral College: win a state and take all its electoral votes. 270 of 538 wins.',
  calendar: { days: 15, debateDays: [6, 11], blackoutHours: 0, gotvDays: 3, hoursPerDay: 14 },
  office: { title: { en: 'President' }, hasRunningMate: true, runningMateTitle: { en: 'Running mate' } },
  winRule: { type: 'electoralCollege', totalVotes: 538, toWin: 270 },
  regions,
  // Difficulty follows the starting map: the placeholder baseline gives 312 electoral votes to the
  // Republican side and 226 to the Democratic side. Recompute when real baselines land.
  parties: [
    { id: 'dem', name: { en: 'Democratic Party' }, shortName: 'Democratic', colour: '#2F6BFF', platform: [], manifestoSource: null, resources: { funds: 1200, volunteers: 1500 }, difficulty: 4, playable: true },
    { id: 'rep', name: { en: 'Republican Party' }, shortName: 'Republican', colour: '#E5383B', platform: [], manifestoSource: null, resources: { funds: 1200, volunteers: 1500 }, difficulty: 2, playable: true },
    { id: 'lib', name: { en: 'Libertarian Party' }, shortName: 'Libertarian', colour: '#E9B44C', platform: [], manifestoSource: null, resources: { funds: 260, volunteers: 300 }, difficulty: 5, playable: true },
    { id: 'grn', name: { en: 'Green Party' }, shortName: 'Green', colour: '#2BA84A', platform: [], manifestoSource: null, resources: { funds: 220, volunteers: 280 }, difficulty: 5, playable: true },
    { id: 'other', name: { en: 'Other candidates' }, shortName: 'Other', colour: '#8A94A6', platform: [], manifestoSource: null, resources: { funds: 0, volunteers: 0 }, difficulty: 5, playable: false },
  ],
  // TODO-VERIFY: placeholder baselines for playtesting. Replace with certified 2024 results.
  baselines: STATES.map(([id, , , , , , lean]) => {
    const major = 0.97;
    return { regionId: id, shares: { dem: lean * major, rep: (1 - lean) * major, lib: 0.01, grn: 0.008, other: 0.012 }, turnout: 0.6 + ((hashString(id) % 100) / 100) * 0.1 };
  }),
  issues: ISSUES,
  // TODO-VERIFY: placeholder issue priorities. Replace with aggregated public survey data.
  issueProfiles: STATES.map(([id, , , , , group]) => {
    const h = hashString(`issues:${id}`);
    const priorities: Record<string, number> = {};
    ISSUES.forEach((iss, i) => {
      priorities[iss.id] = 1 + ((h >>> (i * 3)) % 5);
    });
    priorities.economy = (priorities.economy ?? 1) + 2;
    if (group === 'Midwest' || group === 'South') priorities.farming = (priorities.farming ?? 1) + 2;
    return { regionId: id, priorities };
  }),
  activities: buildActivities({
    canvass: { name: 'Door-knocking', flavour: ['Door-knocking in the suburbs of {place}', 'A Saturday canvass with volunteers in {place}'] },
    market: { name: 'County fair walkabout', flavour: ['Corn dogs and handshakes at a county fair outside {place}', 'A walk down Main Street in {place}'] },
    rally: { name: 'Rally', flavour: ['An arena rally in {place}', 'An airport-hangar rally outside {place}'] },
    roadshow: { name: 'Bus tour', description: 'A bus tour through small towns. Tiring, beloved locally.', flavour: ['The campaign bus rolls through small towns near {place}'] },
    visit: { name: 'Diner, factory or campus stop', flavour: ['Breakfast at a diner in {place}', 'A factory-floor tour near {place}', 'A campus town hall in {place}'] },
    interview: { name: 'TV interview', flavour: ['A prime-time interview on National Evening Report'] },
    leaders: { name: 'Union hall and business roundtable', flavour: ['A union hall meeting in {place}', 'A roundtable with small-business owners in {place}'] },
    posters: { name: 'Yard signs and billboards', flavour: ['Yard signs go up across {place}'] },
    fundraiser: { name: 'Donor fundraiser', flavour: ['A donor dinner in {place}'] },
    gotv: { name: 'Get out the vote', flavour: ['Volunteers drive voters to the polls in {place}'] },
  }),
  events: [...COMMON_EVENTS, ...US_EVENTS],
  mediaOutlets: [
    { id: 'ner', name: 'National Evening Report', kind: 'tv' },
    { id: 'ledger', name: 'The Daily Ledger', kind: 'paper' },
    { id: 'heartland', name: 'Heartland Talk Radio', kind: 'radio' },
    { id: 'trending', name: 'TrendingNow', kind: 'social' },
  ],
  pollsters: [
    { id: 'northfield', name: 'Northfield Analytics', sampleSize: 1100 },
    { id: 'bluestem', name: 'Bluestem Research', sampleSize: 900 },
    { id: 'cardinal', name: 'Cardinal Point Polling', sampleSize: 1400 },
  ],
  rivalArchetypes: RIVAL_ARCHETYPES,
  rivalNominees: [
    { id: 'whitfield', name: 'Dana Whitfield', bio: 'Fictional two-term governor known for a disciplined, data-driven campaign.' },
    { id: 'brannigan', name: 'Theo Brannigan', bio: 'Fictional businessman turned senator with a booming rally style.' },
    { id: 'okafor', name: 'Grace Okafor-Lind', bio: 'Fictional former mayor and outsider candidate.' },
    { id: 'reyes', name: 'Luis Reyes-Hart', bio: 'Fictional activist and community organiser.' },
  ],
  electionNight: {
    targetLabel: '270 to win',
    unitLabel: 'electoral votes',
    anchors: [
      { id: 'anchor1', name: 'Marla Quince', bio: 'Fictional lead anchor, National Evening Report.' },
      { id: 'anchor2', name: 'Desmond Platt', bio: 'Fictional elections analyst.' },
    ],
    revealOrder: 'byStake',
  },
  sources: [
    { id: 'apportionment', title: 'Electoral vote apportionment for the 2024 and 2028 elections (based on the 2020 Census)', note: 'Electoral vote counts per state. Verify against the National Archives Electoral College pages before release.' },
  ],
};
