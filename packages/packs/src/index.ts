import type { CountryPack } from '@electionverse/engine';
import { usPack } from './us';

export { WORLD } from './world';
export type { WorldCountry } from './world';
export { usPack };

/** Playable packs by country id. */
export const PACKS: Record<string, CountryPack> = {
  us: usPack,
};

export function getPack(id: string): CountryPack | undefined {
  return PACKS[id];
}
