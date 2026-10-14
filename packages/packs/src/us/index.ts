import type { CountryPack, Region } from '@electionverse/engine';
import { hashString } from '@electionverse/engine';
import { buildActivities, COMMON_EVENTS, RIVAL_ARCHETYPES } from '../common';
import { US_BASELINE_2024 } from './baseline2024';
import { US_EVENTS } from './events';

/**
 * United States pack.
 *
 * REAL: state names, 2024-2028 electoral vote apportionment, 270-to-win rule,
 * and the starting position: certified 2024 presidential results (FEC) and
 * registration (EAC EAVS), generated into baseline2024.ts from data/us2024.
 * Game-only fallbacks for registered voters in HI, ME and ND are marked there.
 * TODO-VERIFY (placeholder): regional issue priorities.
 * Party platforms are empty until summarised from published platforms with sources.
 * KNOWN GAP: Maine and Nebraska award some electoral votes by congressional
 * district; the game currently treats every state as winner-take-all.
 */

type Row = [id: string, name: string, ev: number, x: number, y: number, group: string, place: string];

const STATES: Row[] = [
  ['ak', 'Alaska', 3, 0, 0, 'West', 'Anchorage'],
  ['me', 'Maine', 4, 10, 0, 'Northeast', 'Portland'],
  ['vt', 'Vermont', 3, 9, 1, 'Northeast', 'Burlington'],
  ['nh', 'New Hampshire', 4, 10, 1, 'Northeast', 'Manchester'],
  ['wa', 'Washington', 12, 0, 2, 'West', 'Seattle'],
  ['id', 'Idaho', 4, 1, 2, 'West', 'Boise'],
  ['mt', 'Montana', 4, 2, 2, 'West', 'Billings'],
  ['nd', 'North Dakota', 3, 3, 2, 'Midwest', 'Fargo'],
  ['mn', 'Minnesota', 10, 4, 2, 'Midwest', 'Minneapolis'],
  ['il', 'Illinois', 19, 5, 2, 'Midwest', 'Chicago'],
  ['wi', 'Wisconsin', 10, 6, 2, 'Midwest', 'Milwaukee'],
  ['mi', 'Michigan', 15, 7, 2, 'Midwest', 'Detroit'],
  ['ny', 'New York', 28, 8, 2, 'Northeast', 'New York City'],
  ['ri', 'Rhode Island', 4, 9, 2, 'Northeast', 'Providence'],
  ['ma', 'Massachusetts', 11, 10, 2, 'Northeast', 'Boston'],
  ['or', 'Oregon', 8, 0, 3, 'West', 'Portland'],
  ['nv', 'Nevada', 6, 1, 3, 'West', 'Las Vegas'],
  ['wy', 'Wyoming', 3, 2, 3, 'West', 'Cheyenne'],
  ['sd', 'South Dakota', 3, 3, 3, 'Midwest', 'Sioux Falls'],
  ['ia', 'Iowa', 6, 4, 3, 'Midwest', 'Des Moines'],
  ['in', 'Indiana', 11, 5, 3, 'Midwest', 'Indianapolis'],
  ['oh', 'Ohio', 17, 6, 3, 'Midwest', 'Columbus'],
  ['pa', 'Pennsylvania', 19, 7, 3, 'Northeast', 'Philadelphia'],
  ['nj', 'New Jersey', 14, 8, 3, 'Northeast', 'Newark'],
  ['ct', 'Connecticut', 7, 9, 3, 'Northeast', 'Hartford'],
  ['ca', 'California', 54, 0, 4, 'West', 'Los Angeles'],
  ['ut', 'Utah', 6, 1, 4, 'West', 'Salt Lake City'],
  ['co', 'Colorado', 10, 2, 4, 'West', 'Denver'],
  ['ne', 'Nebraska', 5, 3, 4, 'Midwest', 'Omaha'],
  ['mo', 'Missouri', 10, 4, 4, 'Midwest', 'St. Louis'],
  ['ky', 'Kentucky', 8, 5, 4, 'South', 'Louisville'],
  ['wv', 'West Virginia', 4, 6, 4, 'South', 'Charleston'],
  ['va', 'Virginia', 13, 7, 4, 'South', 'Richmond'],
  ['md', 'Maryland', 10, 8, 4, 'South', 'Baltimore'],
  ['de', 'Delaware', 3, 9, 4, 'South', 'Wilmington'],
  ['az', 'Arizona', 11, 1, 5, 'West', 'Phoenix'],
  ['nm', 'New Mexico', 5, 2, 5, 'West', 'Albuquerque'],
  ['ks', 'Kansas', 6, 3, 5, 'Midwest', 'Wichita'],
  ['ar', 'Arkansas', 6, 4, 5, 'South', 'Little Rock'],
  ['tn', 'Tennessee', 11, 5, 5, 'South', 'Nashville'],
  ['nc', 'North Carolina', 16, 6, 5, 'South', 'Charlotte'],
  ['sc', 'South Carolina', 9, 7, 5, 'South', 'Columbia'],
  ['dc', 'District of Columbia', 3, 8, 5, 'South', 'Washington'],
  ['ok', 'Oklahoma', 7, 3, 6, 'South', 'Oklahoma City'],
  ['la', 'Louisiana', 8, 4, 6, 'South', 'New Orleans'],
  ['ms', 'Mississippi', 6, 5, 6, 'South', 'Jackson'],
  ['al', 'Alabama', 9, 6, 6, 'South', 'Birmingham'],
  ['ga', 'Georgia', 16, 7, 6, 'South', 'Atlanta'],
  ['hi', 'Hawaii', 4, 0, 7, 'West', 'Honolulu'],
  ['tx', 'Texas', 40, 3, 7, 'South', 'Houston'],
  ['fl', 'Florida', 30, 8, 7, 'South', 'Miami'],
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

const BASE = new Map(US_BASELINE_2024.map((b) => [b.id, b]));
function base(id: string) {
  const b = BASE.get(id);
  if (!b) throw new Error(`No 2024 baseline for ${id}`);
  return b;
}

const regions: Region[] = STATES.map(([id, name, ev, x, y, group, place]) => ({
  id,
  name,
  group,
  x,
  y,
  stake: ev,
  registeredVoters: base(id).registeredVoters,
  landmark: place,
}));

export const usPack: CountryPack = {
  id: 'us',
  version: '0.2.0',
  contentReviewedOn: null,
  placeholderData: true,
  dataNotes: [
    'Starting support and turnout: actual certified 2024 results (FEC and EAC). Everything that happens in play is fictional.',
    'Regional issue priorities are placeholders until survey data is added.',
    'Party platforms will be added from published sources.',
    'Maine and Nebraska are treated as winner-take-all for now; in reality they split some electoral votes by district.',
  ],
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
  // Actual certified election results, 2024 (starting position only).
  baselines: STATES.map(([id]) => ({ regionId: id, shares: { ...base(id).shares }, turnout: base(id).turnout })),
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
    { id: 'fec2024', title: 'FEC, Official 2024 Presidential General Election Results (compiled January 16, 2025)', url: 'https://www.fec.gov/documents/5645/2024presgeresults.xlsx', note: 'Vote shares by state. Dataset and QA report: data/us2024.' },
    { id: 'eavs2024', title: 'EAC, 2024 Election Administration and Voting Survey, v2.0', url: 'https://www.eac.gov/sites/default/files/2026-02/2024_EAVS_for_Public_Release_nolabel_V2_csv.zip', note: 'Registered voters (A1a). Dataset and QA report: data/us2024.' },
    { id: 'apportionment', title: 'Electoral vote apportionment for the 2024 and 2028 elections (based on the 2020 Census)', note: 'Electoral vote counts per state. Verify against the National Archives Electoral College pages before release.' },
  ],
};
