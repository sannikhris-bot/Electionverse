import { createContext, useContext } from 'react';

/**
 * Colour roles. Screens read these through useColors(), so each country can
 * carry its own identity (Nigeria: green-white-green) while the global
 * ElectionVerse look stays midnight navy, gold and cyan.
 */
export interface Palette {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  /** Main accent: primary buttons, highlights, selected items. */
  gold: string;
  goldSoft: string;
  /** Text drawn on top of the main accent (button labels). */
  onGold: string;
  /** The main accent when used as text on the background (lighter where needed for contrast). */
  goldText: string;
  /** Secondary accent: chips, meters, links. */
  cyan: string;
  cyanSoft: string;
  text: string;
  textMuted: string;
  textFaint: string;
  good: string;
  bad: string;
  warn: string;
  /** Optional flag band shown at the top of country screens (top to bottom or left to right). */
  band?: string[];
}

export const BASE_PALETTE: Palette = {
  bg: '#070D1F',
  surface: '#0E1A36',
  surfaceRaised: '#15254A',
  border: '#22355F',
  gold: '#D9B45A',
  goldSoft: 'rgba(217, 180, 90, 0.16)',
  onGold: '#070D1F',
  goldText: '#D9B45A',
  cyan: '#38C6F4',
  cyanSoft: 'rgba(56, 198, 244, 0.14)',
  text: '#EEF2FA',
  textMuted: '#9AA8C7',
  textFaint: '#66779E',
  good: '#3DD68C',
  bad: '#FF6B6B',
  warn: '#F5B841',
};

/** Nigeria: the flag's green (#008751) and white, on deep green surfaces. */
export const NIGERIA_PALETTE: Palette = {
  bg: '#03140D',
  surface: '#072218',
  surfaceRaised: '#0C3324',
  border: '#175A3F',
  gold: '#008751',
  goldSoft: 'rgba(0, 135, 81, 0.22)',
  onGold: '#FFFFFF',
  goldText: '#1DB46E',
  cyan: '#FFFFFF',
  cyanSoft: 'rgba(255, 255, 255, 0.12)',
  text: '#F4FBF7',
  textMuted: '#A9C9B9',
  textFaint: '#6E9784',
  good: '#4ADE80',
  bad: '#FF7A7A',
  warn: '#F5C451',
  band: ['#008751', '#FFFFFF', '#008751'],
};

const PALETTES: Record<string, Palette> = {
  ng: NIGERIA_PALETTE,
};

export function paletteFor(countryId?: string | null): Palette {
  return (countryId && PALETTES[countryId]) || BASE_PALETTE;
}

export const ThemeContext = createContext<Palette>(BASE_PALETTE);

export function useColors(): Palette {
  return useContext(ThemeContext);
}

/** Static default palette, for code outside components. Prefer useColors() in components. */
export const colors = BASE_PALETTE;

export const space = (n: number) => n * 8;

export const radius = { sm: 8, md: 12, lg: 18 };

/** Text styles. Colour is applied by the caller from the active palette. */
export function typeFor(c: Palette) {
  return {
    display: { fontSize: 30, fontWeight: '800' as const, color: c.text, letterSpacing: -0.5 },
    title: { fontSize: 22, fontWeight: '700' as const, color: c.text },
    heading: { fontSize: 17, fontWeight: '700' as const, color: c.text },
    body: { fontSize: 15, color: c.text, lineHeight: 21 },
    small: { fontSize: 13, color: c.textMuted, lineHeight: 18 },
    label: { fontSize: 11, fontWeight: '700' as const, color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  };
}

export const type = typeFor(BASE_PALETTE);

export function useType() {
  return typeFor(useColors());
}

/** Mix a hex colour toward a background colour by `amount` (0 = colour, 1 = background). */
export function fade(hex: string, amount: number, toward = BASE_PALETTE.surfaceRaised): string {
  const parse = (h: string) => {
    const x = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  };
  const a = parse(hex);
  const b = parse(toward);
  const mix = (i: number) => Math.round(a[i]! * (1 - amount) + b[i]! * amount);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}
