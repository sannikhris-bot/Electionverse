/**
 * ElectionVerse engine types.
 *
 * The engine never knows which country it is running. Everything
 * country-specific arrives through a CountryPack (data only).
 */

export type Localized<T> = { en: T } & Partial<Record<string, T>>;

export interface SourceRef {
  id: string;
  title: string;
  url?: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Country pack
// ---------------------------------------------------------------------------

export interface CountryPack {
  id: string;
  version: string;
  /** ISO date of the last fact and legal review; null while content is unreviewed. */
  contentReviewedOn: string | null;
  /** True while any figure in the pack is a placeholder that must be verified. */
  placeholderData: boolean;
  /** Plain-language notes on what in the pack is real and what is placeholder, shown in the lobby. */
  dataNotes?: string[];
  /**
   * How far a campaign can move this electorate from the last result (default 1).
   * Scales the undecided pool and every activity's effect, equally for all parties.
   * Higher for party systems with heavy realignment between elections.
   */
  volatility?: number;
  /**
   * Share of a local activity's effect that also reaches the other regions in the
   * same group (zone), as coverage of big events spreads (default 0).
   */
  zoneSpillover?: number;
  /**
   * Pre-election alliance talks (a party stands down and endorses the player).
   * Absent for countries where this is not part of campaign politics.
   */
  /**
   * Regions where a party fields no candidates (e.g. Great Britain's parties in
   * Northern Ireland). The party cannot gain support or win votes there.
   */
  notStanding?: Record<string, string[]>;
  allianceTalks?: { fromDay: number; toDay: number; /** Share of the partner's support that follows the endorsement. */ transfer: number };
  /**
   * Historical civic statistics shown for reference in the lobby (e.g. registered
   * voters). Never used as a prediction; separate from the fictional game.
   */
  civicRecord?: {
    title: string;
    asOf: string;
    source: string;
    status: string;
    collectedLabel?: string;
    rows: { regionId: string; registered: number; collected?: number }[];
  };
  names: Localized<string>;
  status: 'playable' | 'preview';
  continent: string;
  flag: string;
  systemSummary: string;
  calendar: CampaignCalendar;
  office: OfficeConfig;
  winRule: WinRuleConfig;
  regions: Region[];
  parties: Party[];
  baselines: RegionalBaseline[];
  issues: Issue[];
  issueProfiles: IssueProfile[];
  activities: ActivityConfig[];
  events: EventDef[];
  mediaOutlets: FictionalOutlet[];
  pollsters: FictionalPollster[];
  rivalArchetypes: RivalArchetype[];
  rivalNominees: FictionalPerson[];
  electionNight: ResultsPresentationConfig;
  sources: SourceRef[];
}

export interface CampaignCalendar {
  /** Number of playable campaign days before polling day. */
  days: number;
  /** Days (1-based) on which a debate set piece happens. */
  debateDays: number[];
  /** Hours before polls open in which campaigning is legally banned (0 if none). */
  blackoutHours: number;
  /** The final N days unlock get-out-the-vote activity bonuses. */
  gotvDays: number;
  /** Hours available for travel and activities in a campaign day. */
  hoursPerDay: number;
}

export interface OfficeConfig {
  title: Localized<string>;
  hasRunningMate: boolean;
  runningMateTitle?: Localized<string>;
}

export type WinRuleConfig =
  | ElectoralCollegeConfig
  | FirstPastThePostConfig
  | ProportionalListConfig
  | PresidentialSpreadConfig;

export interface ElectoralCollegeConfig {
  type: 'electoralCollege';
  totalVotes: number;
  toWin: number;
}

export interface FirstPastThePostConfig {
  type: 'firstPastThePost';
  totalSeats: number;
  majority: number;
  /** Standard deviation of the seat-level swing inside a region cluster (share points, 0-1). */
  seatSpread: number;
  coalition: boolean;
}

export interface ProportionalListConfig {
  type: 'proportionalList';
  totalSeats: number;
  majority: number;
  /** Minimum national share to receive seats (0 for none). */
  threshold: number;
  coalition: boolean;
}

export interface PresidentialSpreadConfig {
  type: 'presidentialSpread';
  /** Minimum share required in a unit, e.g. 0.25. */
  minShare: number;
  /** Number of units in which minShare must be reached. */
  requiredUnits: number;
  /** Region ids that count as units for the spread rule. */
  unitRegionIds: string[];
  /** Region ids where minShare is also required (empty when not applied). */
  alsoRequired: string[];
  runoff: boolean;
  /**
   * Who meets the leader in a runoff: the runner-up by votes ('topTwo', default), or the
   * remaining candidate who won the most units, ties broken by votes ('mostUnitsWon',
   * as in section 134(3) of Nigeria's Constitution).
   */
  runoffPairing?: 'topTwo' | 'mostUnitsWon';
}

export interface Region {
  id: string;
  name: string;
  /** Grouping shown on the map (zone, nation, province). */
  group?: string;
  /** Tile-grid position for the cartogram map. */
  x: number;
  y: number;
  /** Electoral votes (electoral college) or seats (FPTP cluster). */
  stake: number;
  registeredVoters: number;
  /** Short local flavour used in street scenes. */
  landmark?: string;
}

export interface Party {
  id: string;
  name: Localized<string>;
  shortName: string;
  /** Commonly associated colour. Never an official logo. */
  colour: string;
  platform: PlatformPosition[];
  manifestoSource: SourceRef | null;
  resources: { funds: number; volunteers: number };
  /** 1 (easiest) to 5. Derived from baselines, not editorial choice. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  playable: boolean;
}

export interface PlatformPosition {
  issueId: string;
  summary: string;
  sourceId: string | null;
}

export interface RegionalBaseline {
  regionId: string;
  /** Vote share by party id at the last real election (0-1, may exclude minor parties). */
  shares: Record<string, number>;
  /** Turnout as share of registered voters (0-1). */
  turnout: number;
}

export interface Issue {
  id: string;
  name: string;
}

export interface IssueProfile {
  regionId: string;
  /** Relative weight per issue id. */
  priorities: Record<string, number>;
}

export type ActivityKind =
  | 'canvass'
  | 'market'
  | 'rally'
  | 'roadshow'
  | 'visit'
  | 'interview'
  | 'leaders'
  | 'posters'
  | 'fundraiser'
  | 'gotv'
  | 'rest';

export interface ActivityConfig {
  id: string;
  kind: ActivityKind;
  name: string;
  description: string;
  hours: number;
  energy: number;
  funds: number;
  volunteers?: number;
  /** Base support effect (share points, 0-1) before multipliers. */
  base: number;
  /** 'local' affects the region; 'media' spreads a smaller effect nationally. */
  reach: 'local' | 'media';
  /** Fraction of the gain taken from rivals (rest from undecided). */
  persuasion: number;
  /** Probability that this activity triggers an incident roll. */
  risk: number;
  /** Funds raised (fundraiser). */
  raises?: number;
  /** Energy restored (rest). */
  restores?: number;
  /** Turnout boost for the party in the region (gotv). */
  gotv?: number;
  recognition: number;
  /** Local flavour lines used in news and scenes. */
  flavour: string[];
}

export type MeterId = 'momentum' | 'funds' | 'energy' | 'unity' | 'credibility' | 'volunteers';

export type Effect =
  | { type: 'meter'; meter: MeterId; delta: number }
  | { type: 'support'; scope: 'here' | 'national'; delta: number }
  | { type: 'rivalSupport'; scope: 'here' | 'national'; delta: number }
  | { type: 'recognition'; scope: 'here' | 'national'; delta: number };

export interface EventChoice {
  id: string;
  label: string;
  effects: Effect[];
  /** Short line shown after the choice. */
  outcome: string;
  delayed?: { afterDays: number; eventId: string };
}

export interface EventDef {
  id: string;
  title: string;
  body: string;
  tags: string[];
  weight: number;
  /** Days before this event can be drawn again. */
  cooldown: number;
  /** Follow-up events are never drawn randomly. */
  followUpOnly?: boolean;
  conditions?: {
    minDay?: number;
    maxDay?: number;
    activityKinds?: ActivityKind[];
    maxEnergy?: number;
    minMomentum?: number;
    maxMomentum?: number;
    maxFunds?: number;
  };
  choices: EventChoice[];
}

export interface FictionalOutlet {
  id: string;
  name: string;
  kind: 'tv' | 'paper' | 'radio' | 'social';
}

export interface FictionalPollster {
  id: string;
  name: string;
  sampleSize: number;
}

export interface RivalArchetype {
  id: string;
  name: string;
  description: string;
  /** Preference weight per activity kind. */
  weights: Partial<Record<ActivityKind, number>>;
  /** 0-1: how strongly the rival chases close regions versus defending its base. */
  aggression: number;
}

export interface FictionalPerson {
  id: string;
  name: string;
  /** Short persona line. Must describe a fictional person only. */
  bio: string;
}

export interface ResultsPresentationConfig {
  targetLabel: string;
  unitLabel: string;
  anchors: FictionalPerson[];
  revealOrder: 'byStake' | 'byGroup' | 'random';
  /**
   * A broadcasters' exit poll shown when polls close, before any results.
   * `seatError` is the relative error on each party's projected seats (e.g. 0.06).
   */
  exitPoll?: { label: string; seatError: number };
}

// ---------------------------------------------------------------------------
// Campaign state
// ---------------------------------------------------------------------------

export type CandidateBackground =
  | 'teacher'
  | 'business'
  | 'doctor'
  | 'organiser'
  | 'veteran'
  | 'lawyer'
  | 'pastor'
  | 'farmer';

export type Trait =
  | 'orator'
  | 'fundraiser'
  | 'organiser'
  | 'policy'
  | 'charismatic'
  | 'localHero';

export interface NomineeSetup {
  name: string;
  background: CandidateBackground;
  traits: [Trait, Trait];
  homeRegionId: string;
  runningMateName?: string;
}

export interface NewCampaignOptions {
  seed: number;
  partyId: string;
  nominee: NomineeSetup;
  difficulty?: 'guided' | 'normal' | 'hard';
}

export interface Meters {
  momentum: number; // -20..20
  funds: number; // currency units (abstract, thousands)
  energy: number; // 0..100
  unity: number; // 0..100
  credibility: number; // 0..100
  volunteers: number;
}

export interface RegionState {
  /** Support share per party id; together with `undecided` sums to 1. */
  shares: Record<string, number>;
  undecided: number;
  baseTurnout: number;
  /** Turnout boost per party id from get-out-the-vote work. */
  gotv: Record<string, number>;
  /** Recent visits per party id (decays daily). */
  visits: Record<string, number>;
  recognition: number; // player's name recognition 0..1
}

export interface RivalState {
  partyId: string;
  nominee: FictionalPerson;
  archetypeId: string;
  location: string;
  funds: number;
  energy: number;
  momentum: number;
  lastStops: string[];
}

export interface Stop {
  regionId: string;
  activityId: string;
  focusIssueId?: string;
  travel?: 'road' | 'air';
}

export interface StopResult {
  regionId: string;
  activityId: string;
  tier: 'great' | 'normal' | 'poor' | 'incident' | 'skipped';
  supportDelta: number;
  travelHours: number;
  note: string;
}

export interface NewsItem {
  day: number;
  outletId: string;
  headline: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface PollResult {
  day: number;
  pollsterId: string;
  national: Record<string, number>;
  undecided: number;
  marginOfError: number;
}

export interface DayReport {
  day: number;
  stops: StopResult[];
  rivalStops: { partyId: string; regionId: string; activityId: string }[];
  event?: { eventId: string; choiceId: string; outcome: string };
  debate?: DebateResult;
  /** Change in player's national share during the day (share points). */
  nationalDelta: number;
  /** Player share change per region during the day. */
  regionDeltas: Record<string, number>;
  /** Internal: player shares at the start of the day (removed when the day ends). */
  start?: { national: number; shares: Record<string, number> };
}

export type DebateStyle = 'attack' | 'policy' | 'record';
export type DebateResponse = 'counter' | 'pivot' | 'humour' | 'message';

export interface DebateRound {
  topic: string;
  style: DebateStyle;
  tell: string;
}

export interface DebateResult {
  rounds: { style: DebateStyle; response: DebateResponse; score: number }[];
  /** Player's total score. */
  score: number;
  /** Rival's performance on the night (seeded, shaped by difficulty and archetype). */
  rivalScore: number;
  /** score - rivalScore: what actually moves the race. */
  net: number;
  verdict: 'won' | 'draw' | 'lost';
}

export type CampaignPhase = 'campaign' | 'awaitingEvent' | 'awaitingDebate' | 'pollingDay' | 'coalition' | 'finished';

export interface PendingEvent {
  eventId: string;
  regionId: string;
}

export interface CampaignState {
  engineVersion: number;
  packId: string;
  packVersion: string;
  seed: number;
  rng: number;
  day: number;
  phase: CampaignPhase;
  difficulty: 'guided' | 'normal' | 'hard';
  playerPartyId: string;
  nominee: NomineeSetup;
  meters: Meters;
  location: string;
  regions: Record<string, RegionState>;
  rivals: RivalState[];
  pollsterBias: Record<string, Record<string, number>>;
  pending?: PendingEvent;
  pendingDayReport?: DayReport;
  /** Debate held at the start of today, attached to today's report. */
  pendingDebate?: DebateResult;
  /** Alliance talks, once per campaign. */
  alliance?: { partnerId: string; day: number; chance: number; success: boolean };
  delayed: { day: number; eventId: string }[];
  eventCooldowns: Record<string, number>;
  news: NewsItem[];
  polls: PollResult[];
  reports: DayReport[];
  result?: ElectionResult;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface RegionResult {
  regionId: string;
  votes: Record<string, number>;
  turnout: number;
  winnerPartyId: string;
  /** Winner's margin over runner-up as share of votes. */
  margin: number;
  /** Seats/electoral votes awarded by party in this region. */
  awarded: Record<string, number>;
  /** For the spread rule: parties reaching the minimum share here. */
  reachedMinShare?: string[];
}

export interface WinRuleOutcome {
  /** Electoral votes or seats per party (national vote shares for spread rule). */
  tally: Record<string, number>;
  /** Party that won outright, if any. */
  winnerPartyId: string | null;
  /** True when a majority/threshold was reached outright. */
  decisive: boolean;
  regionResults: RegionResult[];
  nationalVotes: Record<string, number>;
  status: 'won' | 'hung' | 'runoff' | 'tie';
  /** Spread rule: units where each party reached the minimum share. */
  spread?: Record<string, number>;
  runoff?: { partyIds: [string, string]; votes: Record<string, number>; winnerPartyId: string };
  notes: string[];
}

export interface CoalitionOption {
  partners: string[];
  seats: number;
  /** 0-1 chance the deal holds, shown to the player. */
  chance: number;
}

export interface ElectionResult {
  outcome: WinRuleOutcome;
  playerOutcome: 'won' | 'lost' | 'coalition' | 'minority' | 'opposition';
  headline: string;
  coalitionOptions?: CoalitionOption[];
  coalition?: { partners: string[]; formed: boolean };
  explanation: Explanation;
  /** Projected seats from the exit poll (seat-based win rules with electionNight.exitPoll). */
  exitPoll?: Record<string, number>;
}

export interface Explanation {
  decisiveRegions: { regionId: string; margin: number; stake: number; playerWon: boolean }[];
  keyDays: { day: number; summary: string; delta: number }[];
  summary: string[];
}
