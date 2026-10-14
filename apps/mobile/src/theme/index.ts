/** ElectionVerse visual identity: midnight navy, metallic gold, cyan interface. */
export const colors = {
  bg: '#070D1F',
  surface: '#0E1A36',
  surfaceRaised: '#15254A',
  border: '#22355F',
  gold: '#D9B45A',
  goldSoft: 'rgba(217, 180, 90, 0.16)',
  cyan: '#38C6F4',
  cyanSoft: 'rgba(56, 198, 244, 0.14)',
  text: '#EEF2FA',
  textMuted: '#9AA8C7',
  textFaint: '#66779E',
  good: '#3DD68C',
  bad: '#FF6B6B',
  warn: '#F5B841',
};

export const space = (n: number) => n * 8;

export const radius = { sm: 8, md: 12, lg: 18 };

export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700' as const, color: colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

/** Mix a hex colour toward the background by `amount` (0 = colour, 1 = background). */
export function fade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const bg = [0x15, 0x25, 0x4a];
  const mix = (c: number, i: number) => Math.round(c * (1 - amount) + bg[i]! * amount);
  return `rgb(${mix(r!, 0)}, ${mix(g!, 1)}, ${mix(b!, 2)})`;
}
