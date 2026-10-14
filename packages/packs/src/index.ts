import type { CountryPack } from '@electionverse/engine';
import { ngPack } from './ng';
import { usPack } from './us';

export { WORLD } from './world';
export type { WorldCountry } from './world';
export { ngPack, usPack };

/** Playable packs by country id. */
export const PACKS: Record<string, CountryPack> = {
  us: usPack,
  ng: ngPack,
};

export function getPack(id: string): CountryPack | undefined {
  return PACKS[id];
}
