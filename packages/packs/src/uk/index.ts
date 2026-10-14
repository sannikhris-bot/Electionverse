import type { CountryPack, Region } from '@electionverse/engine';
import { hashString } from '@electionverse/engine';
import { buildActivities, COMMON_EVENTS, RIVAL_ARCHETYPES } from '../common';
import { UK_EVENTS } from './events';

/**
 * United Kingdom pack.
 *
 * REAL: 650 House of Commons constituencies (2024 boundaries), grouped into
 * Scotland, Wales, Northern Ireland and England's nine regions with their real
 * seat counts; 326 seats for a majority; first past the post in every seat; a
 * hung parliament when nobody has a majority; the exit poll at 10 p.m.;
 * Great Britain's parties do not stand in Northern Ireland, the SNP stands
 * only in Scotland and Plaid Cymru only in Wales.
 *
 * PLACEHOLDER (TODO-VERIFY, replace with the House of Commons Library 2024
 * results): starting vote shares by region, registered electors by region
 * (about 73,000 per seat, the 2023 boundary review's target range), turnout and
 * issue priorities. Party platforms are empty until sourced. The Speaker's seat
 * is treated like any other.
 */

const OTHER = 'other';

/** Starting shares (placeholder). Remainder goes to "other". */
type Shares = { lab: number; con: number; ref: number; lib: number; grn: number; snp: number; pc: number };
type Row = [id: string, name: string, x: number, y: number, nation: string, seats: number, place: string, shares: Shares];

const z = { lab: 0, con: 0, ref: 0, lib: 0, grn: 0, snp: 0, pc: 0 };

const REGIONS: Row[] = [
  ['sco', 'Scotland', 1, 0, 'Scotland', 57, 'Glasgow', { ...z, lab: 0.3, con: 0.14, ref: 0.07, lib: 0.09, grn: 0.04, snp: 0.31 }],
  ['ni', 'Northern Ireland', 0, 1, 'Northern Ireland', 18, 'Belfast', { ...z }],
  ['ne', 'North East', 2, 1, 'England', 27, 'Newcastle', { ...z, lab: 0.4, con: 0.19, ref: 0.22, lib: 0.06, grn: 0.07 }],
  ['nw', 'North West', 1, 2, 'England', 73, 'Manchester', { ...z, lab: 0.41, con: 0.2, ref: 0.16, lib: 0.08, grn: 0.07 }],
  ['yh', 'Yorkshire and the Humber', 2, 2, 'England', 54, 'Leeds', { ...z, lab: 0.38, con: 0.21, ref: 0.18, lib: 0.07, grn: 0.07 }],
  ['wal', 'Wales', 0, 3, 'Wales', 32, 'Cardiff', { ...z, lab: 0.35, con: 0.19, ref: 0.16, lib: 0.06, grn: 0.05, pc: 0.14 }],
  ['wm', 'West Midlands', 1, 3, 'England', 57, 'Birmingham', { ...z, lab: 0.35, con: 0.27, ref: 0.18, lib: 0.07, grn: 0.07 }],
  ['em', 'East Midlands', 2, 3, 'England', 47, 'Nottingham', { ...z, lab: 0.34, con: 0.28, ref: 0.19, lib: 0.07, grn: 0.07 }],
  ['ee', 'East of England', 3, 3, 'England', 61, 'Norwich', { ...z, lab: 0.29, con: 0.3, ref: 0.17, lib: 0.12, grn: 0.07 }],
  ['sw', 'South West', 0, 4, 'England', 58, 'Bristol', { ...z, lab: 0.24, con: 0.3, ref: 0.15, lib: 0.22, grn: 0.07 }],
  ['se', 'South East', 1, 4, 'England', 91, 'Brighton', { ...z, lab: 0.23, con: 0.32, ref: 0.14, lib: 0.21, grn: 0.07 }],
  ['lon', 'London', 2, 4, 'England', 75, 'London', { ...z, lab: 0.43, con: 0.21, ref: 0.09, lib: 0.11, grn: 0.11 }],
];

/** Placeholder electorate per seat (TODO-VERIFY: replace with the 2024 electorate by region). */
const ELECTORS_PER_SEAT = 73_000;
/** Points moved from Labour to the Conservatives in the placeholder so the race starts competitive. */
const PLACEHOLDER_NARROWING = 0.035;
/** Placeholder turnout (TODO-VERIFY). */
const TURNOUT = 0.6;

const ISSUES = [
  { id: 'living', name: 'Cost of living' },
  { id: 'nhs', name: 'The NHS' },
  { id: 'economy', name: 'Economy and growth' },
  { id: 'immigration', name: 'Immigration' },
  { id: 'housing', name: 'Housing' },
  { id: 'climate', name: 'Climate and energy' },
  { id: 'crime', name: 'Crime and policing' },
  { id: 'education', name: 'Schools' },
  { id: 'care', name: 'Social care' },
];

const GB_PARTIES = ['lab', 'con', 'ref', 'lib', 'grn'];
const ids = (pred: (r: Row) => boolean) => REGIONS.filter(pred).map((r) => r[0]);

const regions: Region[] = REGIONS.map(([id, name, x, y, nation, seats, place]) => ({
  id,
  name,
  group: nation,
  x,
  y,
  stake: seats,
  registeredVoters: seats * ELECTORS_PER_SEAT,
  landmark: place,
}));

export const ukPack: CountryPack = {
  id: 'uk',
  version: '0.1.0',
  contentReviewedOn: null,
  placeholderData: true,
  dataNotes: [
    'Starting support is a PLACEHOLDER, not the 2024 result. It will be replaced with the official 2024 constituency results from the House of Commons Library. Everything that happens in play is fictional.',
    'Real: 650 seats with the real 2024 seat count in Scotland (57), Wales (32), Northern Ireland (18) and each English region; 326 for a majority; first past the post in every seat; a hung parliament otherwise.',
    'Great Britain\'s parties do not stand in Northern Ireland; the SNP stands only in Scotland and Plaid Cymru only in Wales. Northern Ireland\'s parties are grouped as "Others" in this version.',
    'Placeholders: electors per region (about 73,000 per seat), turnout and regional issue priorities. Party platforms will be added from published sources.',
  ],
  notStanding: {
    ...Object.fromEntries(GB_PARTIES.map((p) => [p, ['ni']])),
    snp: ids((r) => r[0] !== 'sco'),
    pc: ids((r) => r[0] !== 'wal'),
  },
  // No zone spillover: England is one "nation" of 543 seats, so local campaigning stays local.
  names: { en: 'United Kingdom' },
  status: 'playable',
  continent: 'Europe',
  flag: '🇬🇧',
  systemSummary:
    'A general election: 650 constituencies, each won by whoever gets the most votes. 326 seats gives a majority; short of that, a hung parliament and talks to form a government.',
  calendar: { days: 15, debateDays: [5, 11], blackoutHours: 0, gotvDays: 3, hoursPerDay: 14 },
  office: { title: { en: 'Prime Minister' }, hasRunningMate: false },
  winRule: { type: 'firstPastThePost', totalSeats: 650, majority: 326, seatSpread: 0.06, coalition: true },
  regions,
  // Difficulty follows the placeholder starting map. Colours are distinct map colours, not official branding.
  parties: [
    { id: 'lab', name: { en: 'Labour Party' }, shortName: 'Labour', colour: '#D50000', platform: [], manifestoSource: null, resources: { funds: 1200, volunteers: 1700 }, difficulty: 2, playable: true },
    { id: 'con', name: { en: 'Conservative and Unionist Party' }, shortName: 'Conservative', colour: '#1976D2', platform: [], manifestoSource: null, resources: { funds: 1300, volunteers: 1400 }, difficulty: 3, playable: true },
    { id: 'ref', name: { en: 'Reform UK' }, shortName: 'Reform', colour: '#00BCD4', platform: [], manifestoSource: null, resources: { funds: 900, volunteers: 900 }, difficulty: 5, playable: true },
    { id: 'lib', name: { en: 'Liberal Democrats' }, shortName: 'Lib Dem', colour: '#F9A825', platform: [], manifestoSource: null, resources: { funds: 800, volunteers: 1300 }, difficulty: 5, playable: true },
    { id: 'grn', name: { en: 'Green Party' }, shortName: 'Green', colour: '#43A047', platform: [], manifestoSource: null, resources: { funds: 500, volunteers: 1000 }, difficulty: 5, playable: true },
    { id: 'snp', name: { en: 'Scottish National Party' }, shortName: 'SNP', colour: '#FDD835', platform: [], manifestoSource: null, resources: { funds: 0, volunteers: 0 }, difficulty: 5, playable: false },
    { id: 'pc', name: { en: 'Plaid Cymru' }, shortName: 'Plaid', colour: '#00897B', platform: [], manifestoSource: null, resources: { funds: 0, volunteers: 0 }, difficulty: 5, playable: false },
    { id: OTHER, name: { en: 'Others (incl. Northern Ireland parties)' }, shortName: 'Others', colour: '#8A94A6', platform: [], manifestoSource: null, resources: { funds: 0, volunteers: 0 }, difficulty: 5, playable: false },
  ],
  // PLACEHOLDER starting position (see header).
  baselines: REGIONS.map(([id, , , , , , , raw]) => {
    // Narrowed so the placeholder starts as a contest rather than a landslide.
    const s = raw.lab > 0 ? { ...raw, lab: raw.lab - PLACEHOLDER_NARROWING, con: raw.con + PLACEHOLDER_NARROWING } : raw;
    const listed = s.lab + s.con + s.ref + s.lib + s.grn + s.snp + s.pc;
    return { regionId: id, shares: { ...s, [OTHER]: Math.max(0, 1 - listed) }, turnout: TURNOUT };
  }),
  issues: ISSUES,
  // TODO-VERIFY: placeholder issue priorities.
  issueProfiles: REGIONS.map(([id, , , , nation]) => {
    const h = hashString(`uk-issues:${id}`);
    const priorities: Record<string, number> = {};
    ISSUES.forEach((iss, i) => {
      priorities[iss.id] = 1 + ((h >>> (i * 3)) % 4);
    });
    priorities.living = (priorities.living ?? 1) + 2;
    priorities.nhs = (priorities.nhs ?? 1) + 1;
    if (id === 'lon' || id === 'se') priorities.housing = (priorities.housing ?? 1) + 1;
    if (nation !== 'England') priorities.economy = (priorities.economy ?? 1) + 1;
    return { regionId: id, priorities };
  }),
  activities: buildActivities({
    canvass: { name: 'Door-knocking', flavour: ['Knocking doors on the terraced streets of {place}', 'Volunteers with clipboards work the estates of {place}'] },
    market: { name: 'High street walkabout', flavour: ['A walkabout down the high street in {place}', 'Shoppers stop you outside the market hall in {place}'] },
    rally: { name: 'Rally', description: 'A packed hall or a big outdoor rally. Expensive.', flavour: ['A packed rally in {place}', 'Supporters wave placards as you take the stage in {place}'] },
    roadshow: { name: 'Battle bus tour', description: 'A day on the battle bus through towns and marginal seats. Tiring.', flavour: ['The battle bus rolls into {place}', 'Your bus tour stops at a seafront and two market towns near {place}'] },
    visit: { name: 'Hospital or factory visit', flavour: ['Hard hat and hi-vis at a factory near {place}', 'Meeting staff on a hospital ward in {place}'] },
    interview: { name: 'Studio interview', description: 'A grilling on a national programme. Reaches the whole country a little.', flavour: ['A tough studio interview on Albion News'] },
    leaders: { name: 'Local endorsements', description: 'Win over council leaders, union branches and business owners.', flavour: ['Coffee with council leaders in {place}', 'A local union branch hears your pitch in {place}'] },
    posters: { name: 'Leaflets and posters', flavour: ['Leaflets go through letterboxes across {place}'] },
    fundraiser: { name: 'Fundraising dinner', flavour: ['A fundraising dinner in {place}'] },
    gotv: { name: 'Knock-up operation', description: 'Polling-day "knocking up": volunteers remind every supporter to vote.', flavour: ['Volunteers knock up your supporters across {place}'] },
  }),
  events: [...COMMON_EVENTS, ...UK_EVENTS],
  mediaOutlets: [
    { id: 'albion', name: 'Albion News', kind: 'tv' },
    { id: 'herald', name: 'The Morning Herald', kind: 'paper' },
    { id: 'meridian', name: 'Radio Meridian', kind: 'radio' },
    { id: 'chatter', name: 'Chatterbox', kind: 'social' },
  ],
  pollsters: [
    { id: 'thistle', name: 'Thistle and Rose Research', sampleSize: 2000 },
    { id: 'northgate', name: 'Northgate Polling', sampleSize: 1500 },
    { id: 'meridianinsight', name: 'Meridian Insight', sampleSize: 1800 },
  ],
  rivalArchetypes: RIVAL_ARCHETYPES,
  rivalNominees: [
    { id: 'hartley', name: 'Eleanor Hartley-Price', bio: 'Fictional former barrister and shadow cabinet veteran.' },
    { id: 'lloyd', name: 'Gareth Lloyd-Evans', bio: 'Fictional ex-rugby coach turned crowd-pleasing campaigner.' },
    { id: 'chandra', name: 'Priya Chandra-Holt', bio: 'Fictional economist and former council leader.' },
    { id: 'mcbride', name: 'Fergus McBride-Allan', bio: 'Fictional businessman with a large online following.' },
    { id: 'ashworth', name: 'Siobhan Ashworth-Reid', bio: 'Fictional community organiser from a coastal town.' },
  ],
  electionNight: {
    targetLabel: '326 seats for a majority',
    unitLabel: 'seat',
    anchors: [
      { id: 'pembury', name: 'Jonathan Pembury', bio: 'Fictional lead presenter, Albion News election night.' },
      { id: 'okafor', name: 'Aisha Okafor-Grant', bio: 'Fictional elections analyst at the touchscreen.' },
    ],
    revealOrder: 'byStake',
    exitPoll: { label: '10 p.m. exit poll', seatError: 0.06 },
  },
  sources: [
    { id: 'hoc-2024', title: 'House of Commons Library, General election 2024 results', note: 'To replace the placeholder starting shares, electorate and turnout.' },
    { id: 'pca-2023', title: 'Parliamentary Constituencies Order 2023', note: 'The 650 constituencies used from 2024; seat counts by nation and region.' },
  ],
};
