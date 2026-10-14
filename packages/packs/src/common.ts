import type { ActivityConfig, ActivityKind, EventDef, RivalArchetype } from '@electionverse/engine';

/** Rival archetypes shared by every country. */
export const RIVAL_ARCHETYPES: RivalArchetype[] = [
  { id: 'machine', name: 'The Machine', description: 'Relentless ground game and turnout operation.', weights: { canvass: 3, gotv: 4, leaders: 1.5, rally: 1, fundraiser: 1 }, aggression: 0.6 },
  { id: 'firebrand', name: 'The Firebrand', description: 'Big rallies, sharp attacks, high risk.', weights: { rally: 4, roadshow: 2, market: 1.5, interview: 1, fundraiser: 0.8 }, aggression: 0.85 },
  { id: 'technocrat', name: 'The Technocrat', description: 'Interviews, policy visits, steady and careful.', weights: { interview: 3.5, visit: 3, leaders: 1.5, canvass: 1, fundraiser: 1 }, aggression: 0.5 },
  { id: 'insider', name: 'The Insider', description: 'Endorsements, donors and media buys.', weights: { leaders: 3.5, fundraiser: 2.5, posters: 2, rally: 1, interview: 1 }, aggression: 0.7 },
];

type Flavour = Partial<Record<ActivityKind, { name?: string; description?: string; flavour: string[] }>>;

/** Build the standard activity set with country-specific names and flavour. */
export function buildActivities(f: Flavour): ActivityConfig[] {
  const base: ActivityConfig[] = [
    { id: 'canvass', kind: 'canvass', name: 'Door-to-door canvass', description: 'Slow, personal and durable. Finds undecided voters.', hours: 4, energy: 15, funds: 10, volunteers: 40, base: 0.007, reach: 'local', persuasion: 0.15, risk: 0.03, recognition: 0.03, flavour: [] },
    { id: 'market', kind: 'market', name: 'Market walkabout', description: 'Local buzz and photo moments. Crowds can turn.', hours: 3, energy: 15, funds: 5, base: 0.0065, reach: 'local', persuasion: 0.25, risk: 0.07, recognition: 0.06, flavour: [] },
    { id: 'rally', kind: 'rally', name: 'Rally', description: 'Big momentum if the venue fills. Expensive.', hours: 3, energy: 22, funds: 70, base: 0.01, reach: 'local', persuasion: 0.3, risk: 0.07, recognition: 0.08, flavour: [] },
    { id: 'roadshow', kind: 'roadshow', name: 'Roadshow', description: 'Cover several towns in one go. Tiring.', hours: 6, energy: 25, funds: 40, base: 0.0085, reach: 'local', persuasion: 0.2, risk: 0.06, recognition: 0.07, flavour: [] },
    { id: 'visit', kind: 'visit', name: 'Campus or workplace visit', description: 'Wins specific groups on specific issues.', hours: 2, energy: 10, funds: 10, base: 0.0055, reach: 'local', persuasion: 0.25, risk: 0.05, recognition: 0.04, flavour: [] },
    { id: 'interview', kind: 'interview', name: 'Media interview', description: 'Reaches the whole country a little. Tough questions.', hours: 2, energy: 10, funds: 0, base: 0.004, reach: 'media', persuasion: 0.3, risk: 0.06, recognition: 0.05, flavour: [] },
    { id: 'leaders', kind: 'leaders', name: 'Meet local leaders', description: 'Endorsements from community, union and business figures.', hours: 2, energy: 8, funds: 15, base: 0.005, reach: 'local', persuasion: 0.35, risk: 0.02, recognition: 0.03, flavour: [] },
    { id: 'posters', kind: 'posters', name: 'Posters and billboards', description: 'Steady name recognition. Costly.', hours: 1, energy: 3, funds: 90, base: 0.003, reach: 'local', persuasion: 0.1, risk: 0.02, recognition: 0.12, flavour: [] },
    { id: 'fundraiser', kind: 'fundraiser', name: 'Fundraiser', description: 'Raise money for the final stretch.', hours: 3, energy: 10, funds: 0, base: 0, reach: 'local', persuasion: 0, risk: 0, raises: 160, recognition: 0, flavour: [] },
    { id: 'gotv', kind: 'gotv', name: 'Get out the vote', description: 'Turns support into votes. Strongest in the final days.', hours: 4, energy: 15, funds: 25, volunteers: 80, base: 0.002, reach: 'local', persuasion: 0, risk: 0.01, gotv: 0.03, recognition: 0.01, flavour: [] },
    { id: 'rest', kind: 'rest', name: 'Rest and prepare', description: 'Recover energy and prepare.', hours: 4, energy: 0, funds: 0, base: 0, reach: 'local', persuasion: 0, risk: 0, restores: 30, recognition: 0, flavour: [] },
  ];
  return base.map((a) => {
    const o = f[a.kind];
    return o ? { ...a, name: o.name ?? a.name, description: o.description ?? a.description, flavour: o.flavour } : { ...a, flavour: a.flavour.length ? a.flavour : [a.name] };
  });
}

/**
 * Universal campaign events. They only ever involve the player's own
 * fictional campaign, fictional rivals or fictional local figures, never a
 * real party's leadership or record.
 */
export const COMMON_EVENTS: EventDef[] = [
  {
    id: 'rain-rally', title: 'Storm over the venue', body: 'A heavy storm is forecast for your next outdoor event. Your advance team says turnout could halve.', tags: ['weather'], weight: 3, cooldown: 4,
    conditions: { activityKinds: ['rally', 'market', 'roadshow'] },
    choices: [
      { id: 'brave', label: 'Speak in the rain', outcome: 'A soaked but defiant speech plays well on the evening news.', effects: [{ type: 'meter', meter: 'energy', delta: -12 }, { type: 'meter', meter: 'momentum', delta: 2 }, { type: 'support', scope: 'here', delta: 0.004 }] },
      { id: 'indoors', label: 'Move it indoors', outcome: 'A smaller, warmer crowd. No harm done.', effects: [{ type: 'meter', meter: 'funds', delta: -30 }, { type: 'support', scope: 'here', delta: 0.002 }] },
      { id: 'cancel', label: 'Cancel and do calls', outcome: 'You stay dry, but rivals mock the no-show.', effects: [{ type: 'meter', meter: 'momentum', delta: -1.5 }, { type: 'meter', meter: 'energy', delta: 10 }] },
    ],
  },
  {
    id: 'heckler', title: 'A heckler interrupts', body: 'Mid-speech, a man shouts that you have never set foot in this town before today. Phones go up.', tags: ['street'], weight: 3, cooldown: 3,
    conditions: { activityKinds: ['rally', 'market', 'roadshow', 'visit'] },
    choices: [
      { id: 'engage', label: 'Invite him on stage', outcome: 'A tense exchange turns into a handshake. The clip spreads.', effects: [{ type: 'meter', meter: 'momentum', delta: 2.5 }, { type: 'recognition', scope: 'national', delta: 0.03 }] },
      { id: 'joke', label: 'Laugh it off', outcome: 'The crowd laughs with you. Small win.', effects: [{ type: 'meter', meter: 'momentum', delta: 1 }] },
      { id: 'security', label: 'Ask security to remove him', outcome: 'The removal footage looks heavy-handed.', effects: [{ type: 'meter', meter: 'momentum', delta: -2 }, { type: 'meter', meter: 'credibility', delta: -3 }] },
    ],
  },
  {
    id: 'viral-moment', title: 'You go viral', body: 'A volunteer\'s video of you helping a stall owner pack up in the rain has millions of views overnight.', tags: ['media'], weight: 2, cooldown: 6,
    conditions: { activityKinds: ['market', 'canvass', 'roadshow'] },
    choices: [
      { id: 'lean-in', label: 'Lean in: post more', outcome: 'Your feed explodes; some call it staged.', effects: [{ type: 'recognition', scope: 'national', delta: 0.06 }, { type: 'meter', meter: 'momentum', delta: 2 }, { type: 'meter', meter: 'credibility', delta: -2 }] },
      { id: 'humble', label: 'Stay humble, credit the volunteer', outcome: 'Reporters note your modesty.', effects: [{ type: 'recognition', scope: 'national', delta: 0.03 }, { type: 'meter', meter: 'credibility', delta: 3 }] },
    ],
  },
  {
    id: 'staff-gaffe', title: 'Staffer\'s careless post', body: 'A junior staffer posted a mocking comment about voters in a region you need. It is trending.', tags: ['scandal'], weight: 2, cooldown: 8, conditions: { minDay: 3 },
    choices: [
      { id: 'fire', label: 'Let them go today', outcome: 'Swift action limits the damage; staff morale dips.', effects: [{ type: 'meter', meter: 'unity', delta: -4 }, { type: 'meter', meter: 'momentum', delta: -0.5 }] },
      { id: 'apologise', label: 'Apologise personally', outcome: 'You take the hit, and some respect your candour.', effects: [{ type: 'meter', meter: 'momentum', delta: -1.5 }, { type: 'meter', meter: 'credibility', delta: 2 }], delayed: { afterDays: 3, eventId: 'gaffe-return' } },
      { id: 'ignore', label: 'Ride it out', outcome: 'The story runs for two more days.', effects: [{ type: 'meter', meter: 'momentum', delta: -3 }, { type: 'support', scope: 'national', delta: -0.002 }] },
    ],
  },
  {
    id: 'gaffe-return', title: 'Back to the town you apologised to', body: 'Local voters invite you back to see whether you meant it.', tags: ['followup'], weight: 1, cooldown: 99, followUpOnly: true,
    choices: [
      { id: 'go-back', label: 'Go back with no cameras', outcome: 'Word gets around that you showed up.', effects: [{ type: 'support', scope: 'here', delta: 0.006 }, { type: 'meter', meter: 'energy', delta: -10 }] },
      { id: 'send-letter', label: 'Send a letter', outcome: 'Polite, forgettable.', effects: [{ type: 'support', scope: 'here', delta: 0.001 }] },
    ],
  },
  {
    id: 'plant-closure', title: 'A major employer announces layoffs', body: 'A large local plant says it will cut hundreds of jobs. Workers are gathering at the gates.', tags: ['economy'], weight: 2, cooldown: 7,
    choices: [
      { id: 'gates', label: 'Go to the gates now', outcome: 'You listen for an hour. Workers remember who came.', effects: [{ type: 'support', scope: 'here', delta: 0.007 }, { type: 'meter', meter: 'energy', delta: -12 }] },
      { id: 'promise', label: 'Promise to save the jobs', outcome: 'Cheers today; opponents ask how.', effects: [{ type: 'support', scope: 'here', delta: 0.01 }, { type: 'meter', meter: 'credibility', delta: -5 }], delayed: { afterDays: 4, eventId: 'promise-tested' } },
      { id: 'statement', label: 'Issue a careful statement', outcome: 'Measured, but it reads as distant.', effects: [{ type: 'meter', meter: 'credibility', delta: 1 }] },
    ],
  },
  {
    id: 'promise-tested', title: 'Your jobs promise is tested', body: 'An interviewer asks exactly how you will save the jobs you promised to save.', tags: ['followup'], weight: 1, cooldown: 99, followUpOnly: true,
    choices: [
      { id: 'plan', label: 'Lay out a concrete plan', outcome: 'Wonky, but credible.', effects: [{ type: 'meter', meter: 'credibility', delta: 4 }, { type: 'meter', meter: 'energy', delta: -8 }] },
      { id: 'dodge', label: 'Dodge the question', outcome: 'The clip of you dodging runs all evening.', effects: [{ type: 'meter', meter: 'credibility', delta: -6 }, { type: 'meter', meter: 'momentum', delta: -2 }] },
    ],
  },
  {
    id: 'endorsement', title: 'An influential local figure calls', body: 'A respected (fictional) community leader offers an endorsement, but wants you to commit to a local project.', tags: ['endorsement'], weight: 2, cooldown: 5,
    choices: [
      { id: 'accept', label: 'Commit to the project', outcome: 'The endorsement lands well locally.', effects: [{ type: 'support', scope: 'here', delta: 0.008 }, { type: 'meter', meter: 'credibility', delta: -1 }] },
      { id: 'decline', label: 'Thank them, no commitments', outcome: 'You keep your hands free.', effects: [{ type: 'meter', meter: 'credibility', delta: 1 }] },
    ],
  },
  {
    id: 'exhaustion', title: 'You are running on empty', body: 'Your voice is going and you nearly fell asleep in the car. Your doctor says slow down.', tags: ['fatigue'], weight: 4, cooldown: 4, conditions: { maxEnergy: 35 },
    choices: [
      { id: 'rest', label: 'Take the morning off', outcome: 'You come back sharper.', effects: [{ type: 'meter', meter: 'energy', delta: 25 }, { type: 'meter', meter: 'momentum', delta: -0.5 }] },
      { id: 'push', label: 'Push through', outcome: 'You make every stop, but look worn on camera.', effects: [{ type: 'meter', meter: 'energy', delta: -5 }, { type: 'meter', meter: 'credibility', delta: -2 }] },
    ],
  },
  {
    id: 'donor-strings', title: 'A big donor with conditions', body: 'A wealthy (fictional) donor offers a large cheque if you soften a position your base cares about.', tags: ['money'], weight: 2, cooldown: 6,
    choices: [
      { id: 'take', label: 'Take the money', outcome: 'Your war chest grows; your party grumbles.', effects: [{ type: 'meter', meter: 'funds', delta: 220 }, { type: 'meter', meter: 'unity', delta: -8 }] },
      { id: 'refuse', label: 'Refuse publicly', outcome: 'Small donors respond to the story.', effects: [{ type: 'meter', meter: 'funds', delta: 60 }, { type: 'meter', meter: 'unity', delta: 4 }, { type: 'meter', meter: 'credibility', delta: 3 }] },
    ],
  },
  {
    id: 'volunteer-surge', title: 'Volunteer surge', body: 'After a strong week, hundreds of new volunteers sign up. Your field director needs a decision.', tags: ['field'], weight: 2, cooldown: 6, conditions: { minMomentum: 2 },
    choices: [
      { id: 'train', label: 'Invest in training them', outcome: 'A stronger ground game for the final days.', effects: [{ type: 'meter', meter: 'volunteers', delta: 300 }, { type: 'meter', meter: 'funds', delta: -40 }] },
      { id: 'deploy', label: 'Send them straight out', outcome: 'Quick, messy, effective.', effects: [{ type: 'meter', meter: 'volunteers', delta: 200 }, { type: 'support', scope: 'here', delta: 0.003 }] },
    ],
  },
  {
    id: 'rumour', title: 'A false rumour spreads', body: 'A fabricated story about your past is circulating in group chats. It is untrue, but people are asking.', tags: ['media'], weight: 2, cooldown: 7, conditions: { minDay: 4 },
    choices: [
      { id: 'facts', label: 'Publish the facts calmly', outcome: 'Fact-checkers back you up; the story fades.', effects: [{ type: 'meter', meter: 'credibility', delta: 3 }, { type: 'meter', meter: 'momentum', delta: -0.5 }] },
      { id: 'attack', label: 'Blame your rival loudly', outcome: 'Without proof, it backfires.', effects: [{ type: 'meter', meter: 'credibility', delta: -4 }, { type: 'meter', meter: 'momentum', delta: -1 }] },
      { id: 'ignore', label: 'Ignore it', outcome: 'It lingers in some regions.', effects: [{ type: 'support', scope: 'national', delta: -0.002 }] },
    ],
  },
  {
    id: 'tough-reporter', title: 'A tough local reporter', body: 'A respected local journalist asks for a one-on-one interview with no topics off the table.', tags: ['media'], weight: 2, cooldown: 5, conditions: { activityKinds: ['interview', 'visit', 'leaders'] },
    choices: [
      { id: 'yes', label: 'Say yes', outcome: 'A hard hour, but a fair piece.', effects: [{ type: 'meter', meter: 'credibility', delta: 4 }, { type: 'support', scope: 'here', delta: 0.003 }] },
      { id: 'no', label: 'Decline politely', outcome: '"Candidate declined to comment" runs in the paper.', effects: [{ type: 'meter', meter: 'credibility', delta: -2 }] },
    ],
  },
  {
    id: 'party-pressure', title: 'Your party wants you on message', body: 'Party elders say you have drifted from the platform in your speeches and want a reset.', tags: ['party'], weight: 2, cooldown: 7, conditions: { minDay: 5 },
    choices: [
      { id: 'comply', label: 'Return to the platform', outcome: 'The party is pleased; some swing voters are not.', effects: [{ type: 'meter', meter: 'unity', delta: 8 }, { type: 'meter', meter: 'momentum', delta: -0.5 }] },
      { id: 'own-path', label: 'Keep your own voice', outcome: 'Independent-minded voters like it; the party sulks.', effects: [{ type: 'meter', meter: 'unity', delta: -8 }, { type: 'support', scope: 'national', delta: 0.002 }] },
    ],
  },
  {
    id: 'slump', title: 'A bad polling week', body: 'Your internal numbers have slipped and staff morale is low.', tags: ['polls'], weight: 3, cooldown: 6, conditions: { maxMomentum: -2 },
    choices: [
      { id: 'reset', label: 'Hold a campaign reset speech', outcome: 'A clear reset message steadies things.', effects: [{ type: 'meter', meter: 'momentum', delta: 3 }, { type: 'meter', meter: 'funds', delta: -40 }] },
      { id: 'shakeup', label: 'Shake up senior staff', outcome: 'Fresh energy, but headlines about chaos.', effects: [{ type: 'meter', meter: 'momentum', delta: 1 }, { type: 'meter', meter: 'unity', delta: -6 }] },
    ],
  },
  {
    id: 'broke', title: 'The money is running low', body: 'Your finance chief warns you cannot afford the final week as planned.', tags: ['money'], weight: 4, cooldown: 5, conditions: { maxFunds: 120 },
    choices: [
      { id: 'appeal', label: 'Launch a small-donor appeal', outcome: 'Thousands chip in.', effects: [{ type: 'meter', meter: 'funds', delta: 140 }, { type: 'meter', meter: 'energy', delta: -5 }] },
      { id: 'cut', label: 'Cut the advertising budget', outcome: 'You save money and lose some visibility.', effects: [{ type: 'meter', meter: 'funds', delta: 80 }, { type: 'recognition', scope: 'national', delta: -0.03 }] },
    ],
  },
  {
    id: 'town-hall', title: 'A mother asks about costs', body: 'At a town hall, a mother of three asks how she is supposed to afford rent and groceries. The room goes quiet.', tags: ['street'], weight: 3, cooldown: 5, conditions: { activityKinds: ['canvass', 'visit', 'market', 'leaders'] },
    choices: [
      { id: 'listen', label: 'Listen, then answer plainly', outcome: 'An honest, human moment.', effects: [{ type: 'support', scope: 'here', delta: 0.006 }, { type: 'meter', meter: 'credibility', delta: 2 }] },
      { id: 'stats', label: 'Answer with statistics', outcome: 'Accurate, but it lands cold.', effects: [{ type: 'support', scope: 'here', delta: 0.001 }] },
      { id: 'promise', label: 'Promise relief within 100 days', outcome: 'Big applause; reporters circle the promise.', effects: [{ type: 'support', scope: 'here', delta: 0.008 }, { type: 'meter', meter: 'credibility', delta: -3 }] },
    ],
  },
];
