import type { CountryPack } from '@electionverse/engine';
import { ngPack } from './ng';
import { ukPack } from './uk';
import { usPack } from './us';

export { WORLD } from './world';
export type { WorldCountry } from './world';
export { ngPack, ukPack, usPack };

/** Playable packs by country id. */
export const PACKS: Record<string, CountryPack> = {
  us: usPack,
  ng: ngPack,
  uk: ukPack,
};

export function getPack(id: string): CountryPack | undefined {
  return PACKS[id];
}
