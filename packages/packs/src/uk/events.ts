import type { EventDef } from '@electionverse/engine';

/**
 * United Kingdom campaign events. Fictional people only. Events never
 * attribute wrongdoing to a real party or politician.
 */
export const UK_EVENTS: EventDef[] = [
  {
    id: 'uk-egg', title: 'An egg on the high street', body: 'Halfway down the high street, someone lobs an egg. It misses you and hits your press officer. Every camera turns to see what you do next.', tags: ['street'], weight: 2, cooldown: 6,
    conditions: { activityKinds: ['market', 'roadshow', 'rally'] },
    choices: [
      { id: 'joke', label: 'Make a joke and carry on', outcome: '"Free-range, I hope." The line leads the evening bulletins.', effects: [{ type: 'meter', meter: 'momentum', delta: 2.5 }, { type: 'recognition', scope: 'national', delta: 0.03 }] },
      { id: 'leave', label: 'Cut the walkabout short', outcome: 'Sensible, but the pictures of you hurrying away run all day.', effects: [{ type: 'meter', meter: 'momentum', delta: -1.5 }, { type: 'meter', meter: 'energy', delta: 5 }] },
      { id: 'talk', label: 'Walk over and talk to him', outcome: 'A frank, calm exchange. Some praise you; your security team does not.', effects: [{ type: 'support', scope: 'here', delta: 0.004 }, { type: 'meter', meter: 'credibility', delta: 2 }] },
    ],
  },
  {
    id: 'uk-hot-mic', title: 'Caught on a hot mic', body: 'After a tense meeting, you mutter about a voter being "impossible". A radio microphone was still live.', tags: ['media'], weight: 2, cooldown: 10, conditions: { minDay: 3 },
    choices: [
      { id: 'call', label: 'Phone the voter and apologise', outcome: 'She accepts, on camera. The story turns.', effects: [{ type: 'meter', meter: 'momentum', delta: -1 }, { type: 'meter', meter: 'credibility', delta: 2 }], delayed: { afterDays: 2, eventId: 'uk-hot-mic-visit' } },
      { id: 'statement', label: 'Issue a written statement', outcome: 'It reads as lawyered. The clip keeps playing.', effects: [{ type: 'meter', meter: 'momentum', delta: -3 }] },
    ],
  },
  {
    id: 'uk-hot-mic-visit', title: 'Tea with the voter', body: 'The woman from the hot-mic clip invites you round for a cup of tea. A local paper asks to come too.', tags: ['followup'], weight: 1, cooldown: 99, followUpOnly: true,
    choices: [
      { id: 'go', label: 'Go, with the paper', outcome: 'Biscuits, a long chat about her care bills, and a warm front page.', effects: [{ type: 'support', scope: 'here', delta: 0.006 }, { type: 'meter', meter: 'momentum', delta: 1.5 }] },
      { id: 'private', label: 'Go, but keep it private', outcome: 'She tells her friends anyway. Quietly well received.', effects: [{ type: 'support', scope: 'here', delta: 0.003 }, { type: 'meter', meter: 'credibility', delta: 2 }] },
    ],
  },
  {
    id: 'uk-hustings', title: 'Packed church-hall hustings', body: 'Two hundred residents, five candidates and one very strict chair. The first question is on social care.', tags: ['local'], weight: 3, cooldown: 4,
    conditions: { activityKinds: ['visit', 'leaders', 'canvass'] },
    choices: [
      { id: 'detail', label: 'Answer with a costed plan', outcome: 'Dry, but people take notes.', effects: [{ type: 'meter', meter: 'credibility', delta: 3 }, { type: 'support', scope: 'here', delta: 0.003 }] },
      { id: 'story', label: 'Tell the story of a carer you met', outcome: 'The hall goes quiet, then applauds.', effects: [{ type: 'support', scope: 'here', delta: 0.005 }, { type: 'meter', meter: 'momentum', delta: 1 }] },
      { id: 'attack', label: 'Go after the other candidates', outcome: 'The chair cuts you off. Groans from the back.', effects: [{ type: 'meter', meter: 'momentum', delta: -1 }, { type: 'rivalSupport', scope: 'here', delta: -0.002 }] },
    ],
  },
  {
    id: 'uk-battle-bus', title: 'The battle bus breaks down', body: 'Smoke from the engine on a motorway hard shoulder. Your next stop is ninety minutes away and a TV crew is filming from the verge.', tags: ['logistics'], weight: 2, cooldown: 8,
    conditions: { activityKinds: ['roadshow'] },
    choices: [
      { id: 'train', label: 'Take the train with the press pack', outcome: 'You chat with commuters all the way. Good pictures.', effects: [{ type: 'meter', meter: 'funds', delta: -20 }, { type: 'meter', meter: 'momentum', delta: 1.5 }] },
      { id: 'wait', label: 'Wait for the recovery truck', outcome: 'Three hours on a verge. You miss the stop.', effects: [{ type: 'meter', meter: 'energy', delta: -10 }, { type: 'support', scope: 'here', delta: -0.002 }] },
    ],
  },
  {
    id: 'uk-ward', title: 'Confronted on a hospital visit', body: 'A nurse stops you on the ward and asks, in front of the cameras, why her shifts keep getting longer.', tags: ['health'], weight: 2, cooldown: 7,
    conditions: { activityKinds: ['visit'] },
    choices: [
      { id: 'listen', label: 'Stop, listen and promise to come back', outcome: 'You stay twenty minutes. The clip is uncomfortable but fair.', effects: [{ type: 'meter', meter: 'credibility', delta: 3 }, { type: 'meter', meter: 'momentum', delta: -0.5 }] },
      { id: 'pledge', label: 'Make a pledge on staffing on the spot', outcome: 'A headline-grabbing promise. Reporters will want the numbers.', effects: [{ type: 'meter', meter: 'momentum', delta: 2 }, { type: 'meter', meter: 'credibility', delta: -2 }], delayed: { afterDays: 3, eventId: 'uk-costings' } },
      { id: 'move', label: 'Thank her and move on', outcome: '"Walked off" is the caption.', effects: [{ type: 'meter', meter: 'momentum', delta: -2.5 }] },
    ],
  },
  {
    id: 'uk-costings', title: 'Where is the money coming from?', body: 'An independent think tank says your staffing pledge is not costed. The morning shows want you.', tags: ['followup'], weight: 1, cooldown: 99, followUpOnly: true,
    choices: [
      { id: 'publish', label: 'Publish the full costings', outcome: 'Your policy team works through the night. It holds up.', effects: [{ type: 'meter', meter: 'credibility', delta: 4 }, { type: 'meter', meter: 'energy', delta: -10 }] },
      { id: 'dodge', label: 'Say the details will follow', outcome: 'The interviewer asks the same question five times.', effects: [{ type: 'meter', meter: 'momentum', delta: -2.5 }, { type: 'meter', meter: 'credibility', delta: -2 }] },
    ],
  },
  {
    id: 'uk-pub', title: 'A pint in the local', body: 'Your team has lined up a photo at the bar of a village pub. The regulars look unimpressed.', tags: ['street'], weight: 2, cooldown: 6,
    conditions: { activityKinds: ['canvass', 'market', 'roadshow'] },
    choices: [
      { id: 'buy-round', label: 'Sit down and ask about the bus service', outcome: 'An hour on rural buses, the pub closing and the price of heating oil. They warm to you.', effects: [{ type: 'support', scope: 'here', delta: 0.005 }, { type: 'meter', meter: 'energy', delta: -5 }] },
      { id: 'photo', label: 'Get the photo and go', outcome: 'You hold the pint like a stranger. The picture becomes a meme.', effects: [{ type: 'recognition', scope: 'national', delta: 0.03 }, { type: 'meter', meter: 'momentum', delta: -1 }] },
    ],
  },
  {
    id: 'uk-leaflet', title: 'Leaflet misprint', body: 'Forty thousand leaflets have gone out with the wrong polling date. Opponents are sharing photos of them.', tags: ['logistics'], weight: 2, cooldown: 10, conditions: { minDay: 4 },
    choices: [
      { id: 'reprint', label: 'Reprint and deliver overnight', outcome: 'Expensive, and volunteers are shattered, but it is fixed.', effects: [{ type: 'meter', meter: 'funds', delta: -60 }, { type: 'meter', meter: 'volunteers', delta: -40 }, { type: 'meter', meter: 'credibility', delta: 1 }] },
      { id: 'own-it', label: 'Own it with a self-deprecating video', outcome: 'It gets more views than the leaflet ever would.', effects: [{ type: 'meter', meter: 'momentum', delta: 1.5 }, { type: 'meter', meter: 'credibility', delta: -1 }] },
    ],
  },
  {
    id: 'uk-tactical', title: 'A tactical-voting campaign', body: 'A volunteer-run website starts recommending which candidate to back in each seat to keep another party out. Your name comes up in some seats and not others.', tags: ['national'], weight: 2, cooldown: 12, conditions: { minDay: 6 },
    choices: [
      { id: 'welcome', label: 'Welcome it where it helps you', outcome: 'Some gains in marginal seats; your activists elsewhere are furious.', effects: [{ type: 'support', scope: 'national', delta: 0.002 }, { type: 'meter', meter: 'unity', delta: -6 }] },
      { id: 'reject', label: 'Tell voters to back you everywhere', outcome: 'Your base cheers. The website ignores you.', effects: [{ type: 'meter', meter: 'unity', delta: 4 }, { type: 'meter', meter: 'momentum', delta: 0.5 }] },
    ],
  },
  {
    id: 'uk-old-posts', title: 'A candidate\'s old posts', body: 'A journalist has found offensive posts from ten years ago by one of your candidates in a target seat. Nominations have closed, so the name stays on the ballot.', tags: ['scandal'], weight: 2, cooldown: 12, conditions: { minDay: 5 },
    choices: [
      { id: 'suspend', label: 'Withdraw your support for the candidate', outcome: 'Decisive. The seat is now much harder, but the story dies.', effects: [{ type: 'support', scope: 'here', delta: -0.006 }, { type: 'meter', meter: 'credibility', delta: 3 }] },
      { id: 'defend', label: 'Accept the apology and stand by them', outcome: 'Three days of questions at every press conference.', effects: [{ type: 'meter', meter: 'momentum', delta: -3 }, { type: 'meter', meter: 'unity', delta: 3 }] },
    ],
  },
  {
    id: 'uk-seagull', title: 'A seagull steals your chips', body: 'Fish and chips on the seafront for the cameras, until a gull swoops in and takes the lot.', tags: ['street'], weight: 1, cooldown: 99,
    conditions: { activityKinds: ['market', 'roadshow'] },
    choices: [
      { id: 'laugh', label: 'Laugh and buy another portion', outcome: 'The most-shared clip of the campaign. Harmless and human.', effects: [{ type: 'recognition', scope: 'national', delta: 0.05 }, { type: 'meter', meter: 'momentum', delta: 1.5 }] },
      { id: 'cross', label: 'Look visibly cross', outcome: '"Even the seagulls have had enough" runs on a front page.', effects: [{ type: 'meter', meter: 'momentum', delta: -1.5 }] },
    ],
  },
];
