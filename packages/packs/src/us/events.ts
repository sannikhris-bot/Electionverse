import type { EventDef } from '@electionverse/engine';

/** US-flavoured campaign events. Fictional people and outlets only. */
export const US_EVENTS: EventDef[] = [
  {
    id: 'us-running-mate-clip', title: 'Your running mate goes off script', body: 'At a fundraiser, your running mate jokes about a swing state in a way locals find insulting. The clip is everywhere.', tags: ['scandal'], weight: 2, cooldown: 8, conditions: { minDay: 4 },
    choices: [
      { id: 'joint', label: 'Appear together and apologise', outcome: 'United front. The story fades in two days.', effects: [{ type: 'meter', meter: 'momentum', delta: -1 }, { type: 'meter', meter: 'unity', delta: 3 }] },
      { id: 'distance', label: 'Distance yourself', outcome: 'You look decisive; the ticket looks divided.', effects: [{ type: 'meter', meter: 'unity', delta: -6 }, { type: 'meter', meter: 'credibility', delta: 2 }] },
    ],
  },
  {
    id: 'us-hurricane', title: 'Hurricane warning on the coast', body: 'A major storm is heading for a coastal state you planned to visit. Officials ask campaigns to stay away from rescue routes.', tags: ['weather'], weight: 1, cooldown: 12,
    choices: [
      { id: 'pause', label: 'Pause ads and raise relief funds', outcome: 'Widely praised as the right call.', effects: [{ type: 'meter', meter: 'credibility', delta: 5 }, { type: 'meter', meter: 'momentum', delta: 1 }, { type: 'meter', meter: 'funds', delta: -30 }] },
      { id: 'visit', label: 'Visit the shelters with cameras', outcome: 'Some call it compassionate, others a photo op.', effects: [{ type: 'recognition', scope: 'national', delta: 0.03 }, { type: 'meter', meter: 'credibility', delta: -2 }] },
    ],
  },
  {
    id: 'us-super-pac', title: 'An outside group offers ad support', body: 'An independent (fictional) outside group wants to run attack ads in swing states on your behalf. You cannot control their content.', tags: ['money'], weight: 2, cooldown: 9, conditions: { minDay: 5 },
    choices: [
      { id: 'welcome', label: 'Say nothing and let them run', outcome: 'The ads hurt your rival, and a few go too far.', effects: [{ type: 'rivalSupport', scope: 'national', delta: -0.003 }, { type: 'meter', meter: 'credibility', delta: -3 }] },
      { id: 'disavow', label: 'Publicly ask them to stay positive', outcome: 'Fewer ads, a cleaner reputation.', effects: [{ type: 'meter', meter: 'credibility', delta: 3 }] },
    ],
  },
  {
    id: 'us-farm-forum', title: 'Farm forum invitation', body: 'A regional farm bureau invites both nominees to a forum on crop prices and trade. Your rival has already accepted.', tags: ['rural'], weight: 2, cooldown: 8,
    choices: [
      { id: 'attend', label: 'Attend and take questions', outcome: 'You hold your own on unfamiliar ground.', effects: [{ type: 'support', scope: 'here', delta: 0.005 }, { type: 'meter', meter: 'energy', delta: -8 }] },
      { id: 'skip', label: 'Send a video message', outcome: 'The empty chair is the photo of the day.', effects: [{ type: 'meter', meter: 'momentum', delta: -1.5 }] },
    ],
  },
  {
    id: 'us-early-vote', title: 'Early voting opens', body: 'Early voting has started in several states. Your field team wants to shift volunteers from persuasion to turnout now.', tags: ['field'], weight: 3, cooldown: 99, conditions: { minDay: 10 },
    choices: [
      { id: 'shift', label: 'Shift to turnout now', outcome: 'You bank votes early.', effects: [{ type: 'meter', meter: 'volunteers', delta: 150 }, { type: 'support', scope: 'here', delta: 0.002 }] },
      { id: 'persuade', label: 'Keep persuading until the end', outcome: 'You keep working the undecided.', effects: [{ type: 'support', scope: 'national', delta: 0.0015 }] },
    ],
  },
];
