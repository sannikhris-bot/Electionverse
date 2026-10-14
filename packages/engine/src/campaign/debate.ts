import { Rng, hashString } from '../rng';
import type { CampaignState, CountryPack, DebateResponse, DebateResult, DebateRound, DebateStyle } from '../types';
import { clamp, round } from '../util';
import { applyEffects, clone } from './day';

export const DEBATE_ROUNDS = 3;

const TELLS: Record<DebateStyle, string[]> = {
  attack: ['leans in, ready to make it personal', 'smirks at the camera', 'has been sharpening a one-liner all week'],
  policy: ['is shuffling through a thick briefing binder', 'quotes figures before you finish speaking', 'looks eager to go deep on detail'],
  record: ['keeps glancing at your past statements', 'brought a folder of your old promises', 'wants to talk about what you said last week'],
};

/** Best response for each attack style; Stay on Message is always safe. */
const SCORE: Record<DebateStyle, Record<DebateResponse, number>> = {
  attack: { humour: 2, counter: 1, message: 0.5, pivot: -1 },
  policy: { counter: 2, pivot: 0, message: 0.5, humour: -1 },
  record: { pivot: 2, counter: 0, message: 0.5, humour: -1 },
};

export const RESPONSE_LABELS: Record<DebateResponse, { name: string; hint: string }> = {
  counter: { name: 'Counter', hint: 'Answer head-on with facts.' },
  pivot: { name: 'Pivot', hint: 'Move to your own ground.' },
  humour: { name: 'Humour', hint: 'Defuse it with a line.' },
  message: { name: 'Stay on message', hint: 'Safe, never spectacular.' },
};

/** Deterministic debate prompts for the current day. Tells are right about 75% of the time. */
export function debateRounds(pack: CountryPack, state: CampaignState): DebateRound[] {
  const rng = new Rng(state.seed ^ hashString(`debate:${state.day}`));
  const styles: DebateStyle[] = ['attack', 'policy', 'record'];
  const rounds: DebateRound[] = [];
  for (let i = 0; i < DEBATE_ROUNDS; i++) {
    const style = rng.pick(styles);
    const shown = rng.chance(0.75) ? style : rng.pick(styles);
    rounds.push({ topic: rng.pick(pack.issues).name, style, tell: rng.pick(TELLS[shown]) });
  }
  return rounds;
}

export function scoreDebate(state: CampaignState, rounds: DebateRound[], responses: DebateResponse[]): DebateResult {
  const orator = state.nominee.traits.includes('orator');
  const lawyer = state.nominee.background === 'lawyer';
  const scored = rounds.map((r, i) => {
    const response = responses[i] ?? 'message';
    let s = SCORE[r.style][response];
    if (s > 0 && orator) s *= 1.25;
    if (lawyer) s += 0.25;
    if (response === 'counter' && state.meters.credibility < 40) s -= 0.5;
    return { style: r.style, response, score: round(s, 2) };
  });
  const score = round(scored.reduce((a, b) => a + b.score, 0), 2);
  return { rounds: scored, score, verdict: score >= 3 ? 'won' : score <= 0.5 ? 'lost' : 'draw' };
}

export function runDebate(pack: CountryPack, prev: CampaignState, responses: DebateResponse[]): CampaignState {
  if (prev.phase !== 'awaitingDebate') throw new Error('No debate is scheduled now.');
  if (responses.length !== DEBATE_ROUNDS) throw new Error(`A debate needs ${DEBATE_ROUNDS} responses.`);
  const state = clone(prev);
  const result = scoreDebate(state, debateRounds(pack, state), responses);
  const nationalDelta = (result.score - 1.5) * 0.004;
  applyEffects(pack, state, [
    { type: 'meter', meter: 'momentum', delta: (result.score - 1.5) * 1.6 },
    { type: 'support', scope: 'national', delta: Math.max(0, nationalDelta) },
    { type: 'recognition', scope: 'national', delta: 0.05 },
  ], state.location);
  if (nationalDelta < 0) applyEffects(pack, state, [{ type: 'rivalSupport', scope: 'national', delta: -nationalDelta * 0.6 }], state.location);
  for (const r of state.rivals) r.momentum = clamp(r.momentum - (result.score - 1.5) * 0.8, -20, 20);
  state.meters.credibility = clamp(state.meters.credibility + (result.verdict === 'won' ? 4 : result.verdict === 'lost' ? -4 : 0), 0, 100);
  const rival = state.rivals[0];
  const outlet = pack.mediaOutlets[0]?.id ?? 'news';
  state.news.push({
    day: state.day,
    outletId: outlet,
    headline:
      result.verdict === 'won'
        ? `Debate verdict: ${state.nominee.name} wins the night`
        : result.verdict === 'lost'
          ? `Debate verdict: ${rival?.nominee.name ?? 'the rival'} gets the better of ${state.nominee.name}`
          : 'Debate verdict: no knockout blow',
    tone: result.verdict === 'won' ? 'good' : result.verdict === 'lost' ? 'bad' : 'neutral',
  });
  state.pendingDebate = result;
  state.phase = 'campaign';
  return state;
}
