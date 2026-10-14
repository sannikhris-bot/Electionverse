import type { ActivityConfig, CountryPack, WinRuleConfig } from '../src';

/** A small fictional country used only for engine tests. */
export const activities: ActivityConfig[] = [
  { id: 'canvass', kind: 'canvass', name: 'Canvass', description: '', hours: 4, energy: 15, funds: 10, volunteers: 20, base: 0.006, reach: 'local', persuasion: 0.2, risk: 0.03, recognition: 0.02, flavour: ['Door to door near {place}'] },
  { id: 'rally', kind: 'rally', name: 'Rally', description: '', hours: 3, energy: 20, funds: 60, base: 0.009, reach: 'local', persuasion: 0.3, risk: 0.06, recognition: 0.06, flavour: ['A rally at {place}'] },
  { id: 'interview', kind: 'interview', name: 'Interview', description: '', hours: 2, energy: 10, funds: 0, base: 0.004, reach: 'media', persuasion: 0.3, risk: 0.05, recognition: 0.04, flavour: ['A studio interview'] },
  { id: 'fundraiser', kind: 'fundraiser', name: 'Fundraiser', description: '', hours: 3, energy: 10, funds: 0, base: 0, reach: 'local', persuasion: 0, risk: 0, raises: 150, recognition: 0, flavour: ['A donor dinner'] },
  { id: 'gotv', kind: 'gotv', name: 'Get out the vote', description: '', hours: 4, energy: 15, funds: 20, volunteers: 40, base: 0.002, reach: 'local', persuasion: 0, risk: 0.01, gotv: 0.03, recognition: 0.01, flavour: ['Volunteers knock doors'] },
  { id: 'rest', kind: 'rest', name: 'Rest', description: '', hours: 4, energy: 0, funds: 0, base: 0, reach: 'local', persuasion: 0, risk: 0, restores: 30, recognition: 0, flavour: ['A quiet morning'] },
];

export function testPack(winRule?: WinRuleConfig): CountryPack {
  const regions = Array.from({ length: 6 }, (_, i) => ({
    id: `r${i + 1}`,
    name: `Region ${i + 1}`,
    group: i < 3 ? 'north' : 'south',
    x: i % 3,
    y: Math.floor(i / 3),
    stake: [10, 8, 6, 5, 4, 3][i]!,
    registeredVoters: 1_000_000 + i * 100_000,
  }));
  const leanA = [0.55, 0.5, 0.46, 0.44, 0.52, 0.4];
  return {
    id: 'testland',
    version: '0.0.1',
    contentReviewedOn: null,
    placeholderData: true,
    names: { en: 'Testland' },
    status: 'playable',
    continent: 'Nowhere',
    flag: 'T',
    systemSummary: 'Test',
    calendar: { days: 8, debateDays: [4], blackoutHours: 0, gotvDays: 2, hoursPerDay: 14 },
    office: { title: { en: 'President' }, hasRunningMate: false },
    winRule: winRule ?? { type: 'electoralCollege', totalVotes: 36, toWin: 19 },
    regions,
    parties: [
      { id: 'a', name: { en: 'Alpha Party' }, shortName: 'Alpha', colour: '#3366ff', platform: [], manifestoSource: null, resources: { funds: 500, volunteers: 400 }, difficulty: 2, playable: true },
      { id: 'b', name: { en: 'Beta Party' }, shortName: 'Beta', colour: '#ff3333', platform: [], manifestoSource: null, resources: { funds: 500, volunteers: 400 }, difficulty: 2, playable: true },
      { id: 'other', name: { en: 'Others' }, shortName: 'Other', colour: '#999999', platform: [], manifestoSource: null, resources: { funds: 0, volunteers: 0 }, difficulty: 5, playable: false },
    ],
    baselines: regions.map((r, i) => ({ regionId: r.id, shares: { a: leanA[i]!, b: 0.96 - leanA[i]!, other: 0.04 }, turnout: 0.6 })),
    issues: [
      { id: 'jobs', name: 'Jobs' },
      { id: 'health', name: 'Health' },
    ],
    issueProfiles: regions.map((r, i) => ({ regionId: r.id, priorities: { jobs: i % 2 ? 3 : 1, health: i % 2 ? 1 : 3 } })),
    activities,
    events: [
      {
        id: 'storm', title: 'Storm warning', body: 'Heavy rain is forecast.', tags: ['weather'], weight: 1, cooldown: 3,
        choices: [
          { id: 'go', label: 'Go ahead', outcome: 'You went ahead.', effects: [{ type: 'meter', meter: 'energy', delta: -10 }, { type: 'support', scope: 'here', delta: 0.003 }], delayed: { afterDays: 2, eventId: 'storm-follow' } },
          { id: 'cancel', label: 'Cancel', outcome: 'You cancelled.', effects: [{ type: 'meter', meter: 'momentum', delta: -1 }] },
        ],
      },
      {
        id: 'storm-follow', title: 'Storm follow-up', body: 'Voters remember.', tags: [], weight: 1, cooldown: 99, followUpOnly: true,
        choices: [
          { id: 'thank', label: 'Thank them', outcome: 'Thanks given.', effects: [{ type: 'meter', meter: 'momentum', delta: 2 }] },
          { id: 'ignore', label: 'Move on', outcome: 'Moved on.', effects: [] },
        ],
      },
    ],
    mediaOutlets: [{ id: 'tv1', name: 'Test News', kind: 'tv' }],
    pollsters: [{ id: 'p1', name: 'Poll One', sampleSize: 1000 }, { id: 'p2', name: 'Poll Two', sampleSize: 800 }],
    rivalArchetypes: [{ id: 'machine', name: 'The Machine', description: '', weights: { canvass: 3, gotv: 3, rally: 1 }, aggression: 0.7 }],
    rivalNominees: [{ id: 'n1', name: 'Pat Example', bio: 'Fictional.' }],
    electionNight: { targetLabel: '19 to win', unitLabel: 'votes', anchors: [], revealOrder: 'byStake' },
    sources: [],
  };
}
