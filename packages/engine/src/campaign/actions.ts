import type { CampaignState, CountryPack, DebateResponse, NewCampaignOptions, Stop } from '../types';
import { proposeAlliance } from './alliance';
import { planDay, resolveEvent } from './day';
import { runDebate } from './debate';
import { formCoalition, holdElection } from './election';
import { newCampaign } from './setup';

export type CampaignAction =
  | { type: 'planDay'; stops: Stop[] }
  | { type: 'resolveEvent'; choiceId: string }
  | { type: 'debate'; responses: DebateResponse[] }
  | { type: 'holdElection' }
  | { type: 'coalition'; choice: string[] | 'minority' | 'concede' }
  | { type: 'proposeAlliance'; partnerId: string };

/** Pure reducer: (pack, state, action) -> next state. Throws on invalid actions. */
export function applyAction(pack: CountryPack, state: CampaignState, action: CampaignAction): CampaignState {
  switch (action.type) {
    case 'planDay':
      return planDay(pack, state, action.stops);
    case 'resolveEvent':
      return resolveEvent(pack, state, action.choiceId);
    case 'debate':
      return runDebate(pack, state, action.responses);
    case 'holdElection':
      return holdElection(pack, state);
    case 'coalition':
      return formCoalition(pack, state, action.choice);
    case 'proposeAlliance':
      return proposeAlliance(pack, state, action.partnerId);
  }
}

/** Rebuild a campaign exactly from its seed and action log. */
export function replay(pack: CountryPack, opts: NewCampaignOptions, actions: CampaignAction[]): CampaignState {
  let state = newCampaign(pack, opts);
  for (const a of actions) state = applyAction(pack, state, a);
  return state;
}
