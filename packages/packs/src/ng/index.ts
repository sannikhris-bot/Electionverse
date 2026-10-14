import type { CountryPack, Region } from '@electionverse/engine';
import { hashString } from '@electionverse/engine';
import { buildActivities, COMMON_EVENTS, RIVAL_ARCHETYPES } from '../common';
import { NG_EVENTS } from './events';

/**
 * Nigeria pack.
 *
 * REAL: the 36 states and FCT, the six geopolitical zones, the presidential
 * win rule (most votes and at least 25% in two-thirds of the states, FCT
 * counted as a unit as the Supreme Court held in 2023, otherwise a runoff),
 * and the campaign ending 24 hours before polling day.
 *
 * TODO-VERIFY (placeholder): starting vote shares come from a press
 * transcription of INEC's declared state results that does NOT reconcile with
 * INEC's national totals (see data/ng2023/README.md). "Other" share and
 * turnout use national averages in every state. Replace with INEC Form EC8D
 * figures and INEC registered voters by state before release.
 * Issue priorities are placeholders. Party platforms are empty until sourced.
 *
 * KNOWN GAP: the real runoff is between the leader and the candidate who won
 * a majority in the most states; the engine uses the top two by votes.
 */

type Row = [id: string, name: string, x: number, y: number, zone: string, place: string];

const STATES: Row[] = [
  ['so', 'Sokoto', 1, 0, 'North West', 'Sokoto'],
  ['za', 'Zamfara', 2, 0, 'North West', 'Gusau'],
  ['kt', 'Katsina', 3, 0, 'North West', 'Katsina'],
  ['kn', 'Kano', 4, 0, 'North West', 'Kano'],
  ['ji', 'Jigawa', 5, 0, 'North West', 'Dutse'],
  ['yo', 'Yobe', 6, 0, 'North East', 'Damaturu'],
  ['bo', 'Borno', 7, 0, 'North East', 'Maiduguri'],
  ['ke', 'Kebbi', 0, 1, 'North West', 'Birnin Kebbi'],
  ['ni', 'Niger', 1, 1, 'North Central', 'Minna'],
  ['kd', 'Kaduna', 3, 1, 'North West', 'Kaduna'],
  ['ba', 'Bauchi', 4, 1, 'North East', 'Bauchi'],
  ['go', 'Gombe', 5, 1, 'North East', 'Gombe'],
  ['ad', 'Adamawa', 7, 1, 'North East', 'Yola'],
  ['oy', 'Oyo', 0, 2, 'South West', 'Ibadan'],
  ['kw', 'Kwara', 1, 2, 'North Central', 'Ilorin'],
  ['fc', 'Federal Capital Territory', 2, 2, 'North Central', 'Abuja'],
  ['na', 'Nasarawa', 3, 2, 'North Central', 'Lafia'],
  ['pl', 'Plateau', 4, 2, 'North Central', 'Jos'],
  ['ta', 'Taraba', 5, 2, 'North East', 'Jalingo'],
  ['og', 'Ogun', 0, 3, 'South West', 'Abeokuta'],
  ['os', 'Osun', 1, 3, 'South West', 'Osogbo'],
  ['ek', 'Ekiti', 2, 3, 'South West', 'Ado-Ekiti'],
  ['ko', 'Kogi', 3, 3, 'North Central', 'Lokoja'],
  ['be', 'Benue', 4, 3, 'North Central', 'Makurdi'],
  ['la', 'Lagos', 0, 4, 'South West', 'Lagos'],
  ['on', 'Ondo', 1, 4, 'South West', 'Akure'],
  ['ed', 'Edo', 2, 4, 'South South', 'Benin City'],
  ['an', 'Anambra', 3, 4, 'South East', 'Onitsha'],
  ['en', 'Enugu', 4, 4, 'South East', 'Enugu'],
  ['eb', 'Ebonyi', 5, 4, 'South East', 'Abakaliki'],
  ['de', 'Delta', 2, 5, 'South South', 'Asaba'],
  ['im', 'Imo', 3, 5, 'South East', 'Owerri'],
  ['ab', 'Abia', 4, 5, 'South East', 'Aba'],
  ['cr', 'Cross River', 5, 5, 'South South', 'Calabar'],
  ['by', 'Bayelsa', 2, 6, 'South South', 'Yenagoa'],
  ['ri', 'Rivers', 3, 6, 'South South', 'Port Harcourt'],
  ['ak', 'Akwa Ibom', 4, 6, 'South South', 'Uyo'],
];

/**
 * TODO-VERIFY: APC, PDP, LP, NNPP votes by state as printed in a press
 * transcription of INEC's declarations (data/ng2023/raw/source_a_thenigerialawyer.txt).
 * Known not to reconcile with INEC national totals. Placeholder only.
 */
const PLACEHOLDER_VOTES: Record<string, [apc: number, pdp: number, lp: number, nnpp: number]> = {
  fc: [90902, 74194, 281717, 4517], ab: [8914, 22676, 327095, 1239], ad: [182881, 417611, 105648, 8006],
  ak: [160620, 214012, 132683, 7796], an: [5111, 9036, 584621, 1967], ba: [316694, 426607, 27373, 72103],
  by: [42572, 68818, 49975, 540], be: [310648, 130081, 308372, 4740], bo: [252282, 190921, 7205, 4626],
  cr: [130520, 95425, 179917, 16644], de: [90183, 161600, 341866, 3122], eb: [42402, 13503, 259738, 1661],
  ed: [144471, 89585, 331163, 2743], ek: [201494, 89554, 11396, 264], en: [4772, 15749, 428740, 1808],
  go: [146977, 319123, 26160, 10520], im: [66406, 30234, 360495, 1552], ji: [421390, 386587, 1889, 98234],
  kd: [399293, 554360, 294494, 92969], kn: [517341, 131716, 28513, 997279], kt: [482283, 489045, 6376, 69386],
  ke: [248088, 285175, 10682, 5038], ko: [240751, 145104, 56217, 4238], kw: [263572, 136909, 31166, 3141],
  la: [572606, 75750, 582454, 8442], na: [172922, 147083, 191361, 12715], ni: [375183, 284898, 80452, 21836],
  og: [341554, 123831, 85829, 2200], on: [369924, 115463, 47350, 930], os: [343945, 354366, 23283, 713],
  oy: [449884, 182977, 99110, 4095], pl: [307195, 243808, 466272, 8869], ri: [231591, 88468, 175071, 1322],
  so: [285444, 288679, 6568, 1300], ta: [135165, 189017, 146315, 12818], yo: [151459, 198567, 2406, 18270],
  za: [298396, 93978, 1660, 4044],
};

/** INEC national figures (declared 1 March 2023). */
const NATIONAL = { valid: 24_025_940, registered: 93_469_008, top4: 8_794_726 + 6_984_520 + 6_101_533 + 1_496_687 };
const OTHER_SHARE = 1 - NATIONAL.top4 / NATIONAL.valid; // about 2.70%, applied in every state (placeholder)
const TURNOUT = NATIONAL.valid / NATIONAL.registered; // about 25.7%, applied in every state (placeholder)

function placeholderBaseline(id: string) {
  const v = PLACEHOLDER_VOTES[id];
  if (!v) throw new Error(`No placeholder votes for ${id}`);
  const top4 = v[0] + v[1] + v[2] + v[3];
  const k = (1 - OTHER_SHARE) / top4;
  const shares = { apc: v[0] * k, pdp: v[1] * k, lp: v[2] * k, nnpp: v[3] * k, adc: 0, other: OTHER_SHARE };
  const valid = top4 / (1 - OTHER_SHARE);
  return { shares, registered: Math.round(valid / TURNOUT) };
}

const ISSUES = [
  { id: 'economy', name: 'Cost of living' },
  { id: 'security', name: 'Insecurity' },
  { id: 'power', name: 'Electricity' },
  { id: 'fuel', name: 'Fuel prices' },
  { id: 'jobs', name: 'Youth jobs' },
  { id: 'education', name: 'Education' },
  { id: 'health', name: 'Health care' },
  { id: 'corruption', name: 'Corruption' },
  { id: 'farming', name: 'Farming and food' },
];

const regions: Region[] = STATES.map(([id, name, x, y, zone, place]) => ({
  id,
  name,
  group: zone,
  x,
  y,
  // The spread rule counts states, so every unit carries one "state" of stake.
  stake: 1,
  registeredVoters: placeholderBaseline(id).registered,
  landmark: place,
}));

export const ngPack: CountryPack = {
  id: 'ng',
  version: '0.1.0-placeholder',
  contentReviewedOn: null,
  placeholderData: true,
  dataNotes: [
    'Starting support is a PLACEHOLDER from a press transcription of INEC\'s 2023 state declarations that does not add up to INEC\'s national totals. It will be replaced with INEC\'s official state forms.',
    'Turnout and minor-party share use national averages in every state for now.',
    'Regional issue priorities are placeholders. Party platforms will be added from published sources.',
    'Win rule: most votes plus at least 25% in 24 of the 37 units (36 states and the FCT), as the Supreme Court held in 2023; otherwise a runoff.',
    'Alliance talks (days 2 to 8): ask another party to stand down and endorse you. Smaller parties are likelier to say yes.',
  ],
  // Big events are covered across the geopolitical zone.
  zoneSpillover: 0.25,
  // Opposition alliances are central to Nigerian campaigns. Tuned so an alliance makes a
  // challenger competitive without deciding the race on its own.
  allianceTalks: { fromDay: 2, toDay: 8, transfer: 0.32 },
  names: { en: 'Nigeria' },
  status: 'playable',
  continent: 'Africa',
  flag: '🇳🇬',
  systemSummary:
    'A presidential race with a spread rule: win the most votes nationwide and at least 25% in two-thirds of the states, or face a runoff. Campaigning ends 24 hours before polling day.',
  calendar: { days: 15, debateDays: [9], blackoutHours: 24, gotvDays: 3, hoursPerDay: 14 },
  office: { title: { en: 'President' }, hasRunningMate: true, runningMateTitle: { en: 'Running mate' } },
  winRule: {
    type: 'presidentialSpread',
    minShare: 0.25,
    requiredUnits: 24,
    unitRegionIds: STATES.map(([id]) => id),
    alsoRequired: [],
    runoff: true,
  },
  regions,
  // Difficulty follows the placeholder starting map. Colours are distinct map colours, not official branding.
  parties: [
    { id: 'apc', name: { en: 'All Progressives Congress' }, shortName: 'APC', colour: '#1E88E5', platform: [], manifestoSource: null, resources: { funds: 1300, volunteers: 1800 }, difficulty: 2, playable: true },
    { id: 'pdp', name: { en: 'Peoples Democratic Party' }, shortName: 'PDP', colour: '#E53935', platform: [], manifestoSource: null, resources: { funds: 1200, volunteers: 1600 }, difficulty: 4, playable: true },
    { id: 'lp', name: { en: 'Labour Party' }, shortName: 'LP', colour: '#43A047', platform: [], manifestoSource: null, resources: { funds: 800, volunteers: 1700 }, difficulty: 4, playable: true },
    { id: 'nnpp', name: { en: 'New Nigeria Peoples Party' }, shortName: 'NNPP', colour: '#F2A93B', platform: [], manifestoSource: null, resources: { funds: 600, volunteers: 900 }, difficulty: 5, playable: true },
    { id: 'adc', name: { en: 'African Democratic Congress' }, shortName: 'ADC', colour: '#8E44AD', platform: [], manifestoSource: null, resources: { funds: 700, volunteers: 800 }, difficulty: 5, playable: true },
    { id: 'other', name: { en: 'Other parties' }, shortName: 'Other', colour: '#8A94A6', platform: [], manifestoSource: null, resources: { funds: 0, volunteers: 0 }, difficulty: 5, playable: false },
  ],
  // TODO-VERIFY: placeholder baselines (see header).
  baselines: STATES.map(([id]) => ({ regionId: id, shares: placeholderBaseline(id).shares, turnout: TURNOUT })),
  issues: ISSUES,
  // TODO-VERIFY: placeholder issue priorities.
  issueProfiles: STATES.map(([id, , , , zone]) => {
    const h = hashString(`ng-issues:${id}`);
    const priorities: Record<string, number> = {};
    ISSUES.forEach((iss, i) => {
      priorities[iss.id] = 1 + ((h >>> (i * 3)) % 4);
    });
    priorities.economy = (priorities.economy ?? 1) + 2;
    if (zone === 'North East' || zone === 'North West' || zone === 'North Central') priorities.security = (priorities.security ?? 1) + 2;
    if (zone === 'North West' || zone === 'North Central') priorities.farming = (priorities.farming ?? 1) + 1;
    return { regionId: id, priorities };
  }),
  activities: buildActivities({
    canvass: { name: 'House-to-house', flavour: ['Going house to house in the neighbourhoods of {place}', 'Volunteers knock on compound gates across {place}'] },
    market: { name: 'Market walkabout', flavour: ['A walkabout through the main market in {place}', 'Traders crowd around you in the market at {place}'] },
    rally: { name: 'Mega rally', description: 'A stadium rally with music and a sea of party colours. Expensive.', flavour: ['A packed stadium rally in {place}', 'Drummers and dancers open your rally in {place}'] },
    roadshow: { name: 'Motorcade roadshow', description: 'A motorcade through towns and junctions. Tiring, loud and visible.', flavour: ['Your motorcade crawls through the streets of {place}', 'Okada riders escort your roadshow into {place}'] },
    visit: { name: 'Campus and motor park visit', flavour: ['A town hall with students in {place}', 'Meeting drivers and traders at a motor park in {place}'] },
    interview: { name: 'Radio phone-in', description: 'A live phone-in in English and Pidgin. Reaches the whole country a little.', flavour: ['A live phone-in on Lagoon FM'] },
    leaders: { name: 'Palace courtesy visit', description: 'Visit traditional rulers and community leaders for their blessing.', flavour: ['A courtesy visit to the palace in {place}', 'Community leaders receive you in {place}'] },
    posters: { name: 'Billboards and posters', flavour: ['Your posters go up across {place}'] },
    fundraiser: { name: 'Fundraising dinner', flavour: ['A fundraising dinner in {place}'] },
    gotv: { name: 'Polling-unit mobilisation', description: 'Train party agents and remind supporters where and when to vote.', flavour: ['Party agents are trained for every polling unit in {place}'] },
  }),
  events: [...COMMON_EVENTS, ...NG_EVENTS],
  mediaOutlets: [
    { id: 'nen', name: 'Naija Evening News', kind: 'tv' },
    { id: 'courier', name: 'The Daily Courier', kind: 'paper' },
    { id: 'lagoon', name: 'Lagoon FM', kind: 'radio' },
    { id: 'gist', name: 'GistCentral', kind: 'social' },
  ],
  pollsters: [
    { id: 'savannah', name: 'Savannah Research', sampleSize: 1200 },
    { id: 'harmattan', name: 'Harmattan Polling', sampleSize: 1000 },
    { id: 'lagoonan', name: 'Lagoon Analytics', sampleSize: 1500 },
  ],
  rivalArchetypes: RIVAL_ARCHETYPES,
  rivalNominees: [
    { id: 'gidado', name: 'Haruna Tanko Gidado', bio: 'Fictional two-term governor with a formidable party machine.' },
    { id: 'okonkwo', name: 'Adaeze Okonkwo-Bassey', bio: 'Fictional businesswoman and former minister, popular with young voters online.' },
    { id: 'coker', name: 'Tunde Adewale-Coker', bio: 'Fictional senator known for crowd-pleasing rallies.' },
    { id: 'ndako', name: 'Zainab Lawal-Ndako', bio: 'Fictional economist and reform campaigner.' },
    { id: 'ibe', name: 'Emeka Nwachukwu Ibe', bio: 'Fictional lawyer and grassroots organiser.' },
  ],
  electionNight: {
    targetLabel: 'Most votes + 25% in 24 states',
    unitLabel: 'state',
    anchors: [
      { id: 'adeyemi', name: 'Funmi Adeyemi-Clarke', bio: 'Fictional lead anchor, Naija Evening News.' },
      { id: 'danladi', name: 'Yakubu Danladi', bio: 'Fictional elections analyst.' },
    ],
    revealOrder: 'byGroup',
  },
  sources: [
    { id: 'constitution-134', title: 'Constitution of the Federal Republic of Nigeria 1999 (as amended), section 134', note: 'Presidential election win requirements and second election.' },
    { id: 'sc-2023-fct', title: 'Supreme Court of Nigeria, judgment of 26 October 2023 (Atiku Abubakar and Peter Obi appeals)', url: 'https://www.icirnigeria.org/supreme-court-upholds-pepc-ruling-on-25-votes-in-fct/', note: 'Upheld that 25% in the FCT is not separately required.' },
    { id: 'inec-2023-totals', title: 'INEC declaration of the 2023 presidential election result, 1 March 2023', note: 'National totals used to check state figures. State figures pending INEC Form EC8D.' },
  ],
};
