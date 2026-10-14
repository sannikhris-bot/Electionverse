import type { EventDef } from '@electionverse/engine';

/**
 * Nigeria campaign events. Fictional people only. Events never attribute
 * wrongdoing to a real party, and the game never offers vote buying or
 * violence as a strategy.
 */
export const NG_EVENTS: EventDef[] = [
  {
    id: 'ng-fuel-queue', title: 'Fuel queues stall your convoy', body: 'Filling stations across the region are dry and queues stretch for kilometres. Your convoy is stuck and your next stop is waiting.', tags: ['logistics'], weight: 3, cooldown: 5,
    conditions: { activityKinds: ['roadshow', 'rally', 'market'] },
    choices: [
      { id: 'walk', label: 'Get out and walk the queue', outcome: 'Hours of handshakes with frustrated motorists. They remember it.', effects: [{ type: 'support', scope: 'here', delta: 0.006 }, { type: 'meter', meter: 'energy', delta: -12 }] },
      { id: 'pay', label: 'Pay for black-market fuel and push on', outcome: 'You make the next stop, but a photo of your jerrycans circulates.', effects: [{ type: 'meter', meter: 'funds', delta: -40 }, { type: 'meter', meter: 'credibility', delta: -3 }] },
      { id: 'policy', label: 'Announce a fuel supply plan on the spot', outcome: 'A strong soundbite; reporters will ask for details.', effects: [{ type: 'meter', meter: 'momentum', delta: 1.5 }, { type: 'meter', meter: 'credibility', delta: -1 }], delayed: { afterDays: 4, eventId: 'ng-fuel-plan-tested' } },
    ],
  },
  {
    id: 'ng-fuel-plan-tested', title: 'Your fuel plan under scrutiny', body: 'A radio host reads out your fuel promise and asks listeners to call in with questions.', tags: ['followup'], weight: 1, cooldown: 99, followUpOnly: true,
    choices: [
      { id: 'detail', label: 'Go live and explain the plan', outcome: 'Callers push hard, but you hold up.', effects: [{ type: 'meter', meter: 'credibility', delta: 4 }, { type: 'meter', meter: 'energy', delta: -6 }] },
      { id: 'avoid', label: 'Send a spokesperson', outcome: '"Where is the candidate?" trends for a day.', effects: [{ type: 'meter', meter: 'momentum', delta: -2 }] },
    ],
  },
  {
    id: 'ng-power-cut', title: 'Lights out at the rally', body: 'Minutes into your speech, the power goes and the sound system dies. Thousands are waiting in the dark.', tags: ['street'], weight: 3, cooldown: 4,
    conditions: { activityKinds: ['rally'] },
    choices: [
      { id: 'megaphone', label: 'Grab a megaphone and keep going', outcome: 'Phone torches light the crowd. The video is everywhere by morning.', effects: [{ type: 'meter', meter: 'momentum', delta: 2.5 }, { type: 'recognition', scope: 'national', delta: 0.03 }] },
      { id: 'generator', label: 'Wait for the generator', outcome: 'Forty minutes later, half the crowd has gone home.', effects: [{ type: 'support', scope: 'here', delta: -0.002 }] },
      { id: 'promise', label: 'Turn it into a speech about electricity', outcome: 'The crowd roars; your rivals call it a stunt.', effects: [{ type: 'support', scope: 'here', delta: 0.005 }, { type: 'meter', meter: 'credibility', delta: -1 }] },
    ],
  },
  {
    id: 'ng-flood', title: 'Floods cut the road', body: 'Heavy rain has flooded the highway and nearby communities are displaced. Your team asks whether to reroute.', tags: ['weather'], weight: 2, cooldown: 8,
    choices: [
      { id: 'relief', label: 'Pause campaigning and bring relief supplies', outcome: 'No speeches today, but local people notice who came.', effects: [{ type: 'meter', meter: 'funds', delta: -50 }, { type: 'support', scope: 'here', delta: 0.008 }, { type: 'meter', meter: 'credibility', delta: 3 }] },
      { id: 'reroute', label: 'Reroute and stay on schedule', outcome: 'You keep the schedule; nobody remarks on it.', effects: [{ type: 'meter', meter: 'energy', delta: -8 }] },
    ],
  },
  {
    id: 'ng-cash-crunch', title: 'Cash is scarce', body: 'Banks are rationing withdrawals and your field teams cannot pay drivers, printers or stage builders on time.', tags: ['money'], weight: 2, cooldown: 7, conditions: { minDay: 3 },
    choices: [
      { id: 'transfers', label: 'Switch everything to bank transfers', outcome: 'Slower, but transparent. Some vendors refuse.', effects: [{ type: 'meter', meter: 'volunteers', delta: -60 }, { type: 'meter', meter: 'credibility', delta: 2 }] },
      { id: 'delay', label: 'Delay events until cash arrives', outcome: 'You lose a day of momentum.', effects: [{ type: 'meter', meter: 'momentum', delta: -1.5 }] },
    ],
  },
  {
    id: 'ng-disruption', title: 'A group tries to disrupt your rally', body: 'A group of young men pushes toward the stage chanting a rival slogan. Your security lead wants a decision now.', tags: ['street'], weight: 2, cooldown: 6, conditions: { activityKinds: ['rally', 'roadshow'] },
    choices: [
      { id: 'calm', label: 'Call for calm and invite them to talk', outcome: 'Tension eases. Your appeal for peace is widely shared.', effects: [{ type: 'meter', meter: 'credibility', delta: 4 }, { type: 'meter', meter: 'momentum', delta: 1 }] },
      { id: 'end', label: 'End the event early for safety', outcome: 'Everyone gets home safely; rivals say you ran.', effects: [{ type: 'meter', meter: 'momentum', delta: -1 }, { type: 'support', scope: 'here', delta: -0.001 }] },
    ],
  },
  {
    id: 'ng-security-advisory', title: 'Security advisory on your route', body: 'Security agencies advise against road travel to parts of the region this week after attacks on travellers.', tags: ['security'], weight: 2, cooldown: 8, conditions: { activityKinds: ['roadshow', 'canvass', 'market'] },
    choices: [
      { id: 'heed', label: 'Follow the advice and hold a town hall in the capital', outcome: 'Safer, smaller, and you hear directly from affected families.', effects: [{ type: 'support', scope: 'here', delta: 0.003 }, { type: 'meter', meter: 'credibility', delta: 2 }] },
      { id: 'fly', label: 'Fly in with an escort', outcome: 'A strong show of presence, at real cost.', effects: [{ type: 'meter', meter: 'funds', delta: -60 }, { type: 'support', scope: 'here', delta: 0.006 }] },
    ],
  },
  {
    id: 'ng-zoning', title: 'The zoning argument', body: 'Party elders say your campaign is neglecting their geopolitical zone and want a public commitment on appointments.', tags: ['party'], weight: 2, cooldown: 8, conditions: { minDay: 4 },
    choices: [
      { id: 'commit', label: 'Promise a fair share of appointments', outcome: 'The elders are satisfied; other zones ask for the same.', effects: [{ type: 'meter', meter: 'unity', delta: 8 }, { type: 'meter', meter: 'credibility', delta: -2 }] },
      { id: 'merit', label: 'Say appointments will be on merit', outcome: 'Popular with young voters online; the elders go quiet.', effects: [{ type: 'meter', meter: 'unity', delta: -7 }, { type: 'support', scope: 'national', delta: 0.002 }] },
    ],
  },
  {
    id: 'ng-online-movement', title: 'A movement forms online', body: 'Young supporters have started a hashtag movement for your campaign. Its energy is huge and its tone is unpredictable.', tags: ['media'], weight: 2, cooldown: 9, conditions: { minMomentum: 1.5 },
    choices: [
      { id: 'embrace', label: 'Embrace it and appear at their meet-ups', outcome: 'Volunteers flood in; some posts go too far.', effects: [{ type: 'meter', meter: 'volunteers', delta: 300 }, { type: 'meter', meter: 'credibility', delta: -2 }] },
      { id: 'channel', label: 'Ask them to focus on voter registration checks and turnout', outcome: 'Less noise, more organisation.', effects: [{ type: 'meter', meter: 'volunteers', delta: 180 }, { type: 'meter', meter: 'unity', delta: 2 }] },
    ],
  },
  {
    id: 'ng-defection', title: 'A big name leaves your party', body: 'A popular (fictional) former governor from your party announces a defection to a rival, taking local organisers with him.', tags: ['party'], weight: 2, cooldown: 10, conditions: { minDay: 5 },
    choices: [
      { id: 'woo', label: 'Fly in to woo his organisers back', outcome: 'You keep some of the machine, at the cost of a day.', effects: [{ type: 'meter', meter: 'energy', delta: -10 }, { type: 'meter', meter: 'unity', delta: 4 }, { type: 'support', scope: 'here', delta: 0.003 }] },
      { id: 'shrug', label: '"The party is bigger than any one person"', outcome: 'A good line, but the local structure is weaker.', effects: [{ type: 'meter', meter: 'unity', delta: -5 }, { type: 'support', scope: 'here', delta: -0.004 }] },
    ],
  },
  {
    id: 'ng-strike', title: 'University lecturers on strike', body: 'Students have been home for months because of a lecturers\' strike. A student union asks you to come and answer questions.', tags: ['education'], weight: 2, cooldown: 9,
    choices: [
      { id: 'go', label: 'Go to the campus and listen', outcome: 'A long, honest session. Students share the video.', effects: [{ type: 'support', scope: 'here', delta: 0.005 }, { type: 'recognition', scope: 'national', delta: 0.02 }] },
      { id: 'promise', label: 'Promise to end strikes in your first 100 days', outcome: 'Cheers now; a promise you will be held to.', effects: [{ type: 'support', scope: 'national', delta: 0.002 }, { type: 'meter', meter: 'credibility', delta: -3 }] },
    ],
  },
  {
    id: 'ng-pidgin', title: 'Your Pidgin speech goes viral', body: 'A clip of you switching to Pidgin to answer a market woman has millions of views.', tags: ['media'], weight: 2, cooldown: 10, conditions: { activityKinds: ['market', 'canvass', 'interview'] },
    choices: [
      { id: 'more', label: 'Do more of it', outcome: 'Relatable, and the comment sections love it.', effects: [{ type: 'recognition', scope: 'national', delta: 0.05 }, { type: 'meter', meter: 'momentum', delta: 1.5 }] },
      { id: 'formal', label: 'Stay formal and presidential', outcome: 'Steady, if a little stiff.', effects: [{ type: 'meter', meter: 'credibility', delta: 2 }] },
    ],
  },
  {
    id: 'ng-pvc', title: 'Supporters without voter cards', body: 'Your organisers report many supporters here have not collected their permanent voter cards.', tags: ['field'], weight: 2, cooldown: 99, conditions: { maxDay: 10 },
    choices: [
      { id: 'drive', label: 'Fund a reminder and transport drive to collection centres', outcome: 'More of your supporters will be able to vote.', effects: [{ type: 'meter', meter: 'funds', delta: -50 }, { type: 'meter', meter: 'volunteers', delta: 100 }, { type: 'support', scope: 'here', delta: 0.004 }] },
      { id: 'later', label: 'Leave it to the party', outcome: 'Nothing changes.', effects: [] },
    ],
  },
];
