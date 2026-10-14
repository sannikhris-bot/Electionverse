import type { CountryPack, Region } from '@electionverse/engine';
import { hashString } from '@electionverse/engine';
import { buildActivities, COMMON_EVENTS, RIVAL_ARCHETYPES } from '../common';
import { NG_EVENTS } from './events';
import { NG_REGISTRATION_2023 } from './registration2023';
import { NG_NATIONAL_2023, NG_RESULTS_2023 } from './results2023';

/**
 * Nigeria pack.
 *
 * REAL: the 36 states and FCT, the six geopolitical zones, the presidential
 * win rule (most votes and at least 25% in two-thirds of the states, FCT
 * counted as a unit as the Supreme Court held in 2023, otherwise a runoff),
 * and the campaign ending 24 hours before polling day.
 *
 * Starting position: 2023 presidential votes by state for APC, PDP, LP and
 * NNPP (published INEC-declared figures, reconciled to INEC's national totals;
 * EC8D forms not individually verified; data/ng2023/results) and INEC
 * registered voters by state (data/ng2023/registration).
 * TODO-VERIFY: minor-candidate share by state uses the national figure.
 * Issue priorities are placeholders. Party platforms are empty until sourced.
 *
 * Runoff (section 134(3)): the leader meets the remaining candidate who won the
 * most states, ties broken by votes.
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
 * 2023 presidential votes by state for APC, PDP, LP and NNPP: published
 * INEC-declared figures (EC8D not individually verified), reconciled exactly to
 * INEC's national totals with two documented corrections
 * (data/ng2023/results/output/corrections_log.csv).
 */
const RESULTS = new Map(NG_RESULTS_2023.map((r) => [r.id, r]));

/** Votes for the 14 other candidates, nationally; their share by state is not available. */
const OTHER_SHARE = 1 - (NG_NATIONAL_2023.apc + NG_NATIONAL_2023.pdp + NG_NATIONAL_2023.lp + NG_NATIONAL_2023.nnpp) / NG_NATIONAL_2023.valid; // about 2.70%

/** INEC registered voters by state (snapshot 5 February 2023), from data/ng2023/registration. */
const REGISTERED = new Map(NG_REGISTRATION_2023.map((r) => [r.id, r.registered]));

function baseline2023(id: string) {
  const v = RESULTS.get(id);
  if (!v) throw new Error(`No 2023 results for ${id}`);
  const registered = REGISTERED.get(id);
  if (!registered) throw new Error(`No INEC registration for ${id}`);
  const top4 = v.apc + v.pdp + v.lp + v.nnpp;
  // Four-party votes are real; the minor-candidate share uses the national figure (TODO-VERIFY by state).
  const k = (1 - OTHER_SHARE) / top4;
  const shares = { apc: v.apc * k, pdp: v.pdp * k, lp: v.lp * k, nnpp: v.nnpp * k, adc: 0, other: OTHER_SHARE };
  const valid = top4 / (1 - OTHER_SHARE);
  const turnout = Math.min(0.6, Math.max(0.1, valid / registered));
  return { shares, registered, turnout };
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
  registeredVoters: baseline2023(id).registered,
  landmark: place,
}));

export const ngPack: CountryPack = {
  id: 'ng',
  version: '0.2.0',
  contentReviewedOn: null,
  placeholderData: true,
  dataNotes: [
    'Starting support: 2023 presidential votes by state for APC, PDP, LP and NNPP, as declared by INEC. They add up exactly to INEC\'s national totals (two transcription corrections, documented); the state collation forms (EC8D) have not been individually checked. Everything that happens in play is fictional.',
    'Registered voters by state: INEC figures as at 5 February 2023 (93,469,008 in total). The 14 minor candidates\' share uses the national figure (2.7%) in every state.',
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
    runoffPairing: 'mostUnitsWon',
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
  // 2023 starting position (see header).
  baselines: STATES.map(([id]) => ({ regionId: id, shares: baseline2023(id).shares, turnout: baseline2023(id).turnout })),
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
  civicRecord: {
    title: '2023 voter registration (INEC)',
    asOf: '5 February 2023',
    source: 'INEC, Registered Voters and PVCs Collected (inecnigeria.org)',
    status: 'Historical record for reference, not a prediction. Checked against national totals; to be verified against the original INEC PDF.',
    collectedLabel: 'PVCs collected',
    rows: NG_REGISTRATION_2023.map((r) => ({ regionId: r.id, registered: r.registered, collected: r.pvcsCollected })),
  },
  sources: [
    { id: 'inec-registration-2023', title: 'INEC, Registered Voters and PVCs Collected for the 2023 General Election (as at 5 February 2023)', url: 'https://www.inecnigeria.org/wp-content/uploads/2023/02/PVCs-Collected-Registered-Voters.pdf', note: 'Registered voters by state. QA: data/ng2023/registration/output/qa_report.md.' },
    { id: 'constitution-134', title: 'Constitution of the Federal Republic of Nigeria 1999 (as amended), section 134', note: 'Presidential election win requirements and second election.' },
    { id: 'sc-2023-fct', title: 'Supreme Court of Nigeria, judgment of 26 October 2023 (Atiku Abubakar and Peter Obi appeals)', url: 'https://www.icirnigeria.org/supreme-court-upholds-pepc-ruling-on-25-votes-in-fct/', note: 'Upheld that 25% in the FCT is not separately required.' },
    { id: 'inec-2023-totals', title: 'INEC declaration of the 2023 presidential election result, 1 March 2023', note: 'National totals used to check state figures. State figures pending INEC Form EC8D.' },
  ],
};
