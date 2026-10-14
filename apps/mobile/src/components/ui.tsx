import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { ThemeContext, paletteFor, radius, space, useColors, useType } from '@/theme';

/**
 * Applies a country's palette to everything inside it. Pass the country id
 * (pack id); unknown or missing ids keep the global ElectionVerse look.
 */
export function CountryTheme({ countryId, children }: { countryId?: string | null; children: ReactNode }) {
  return <ThemeContext.Provider value={paletteFor(countryId)}>{children}</ThemeContext.Provider>;
}

/** The Union Flag (decoration only; not interactive). */
export function UnionFlag({ width = 30 }: { width?: number }) {
  const h = width / 2;
  return (
    <Svg width={width} height={h} viewBox="0 0 60 30" accessible={false}>
      <Defs>
        <ClipPath id="uf-s">
          <Path d="M0,0 v30 h60 v-30 z" />
        </ClipPath>
        <ClipPath id="uf-t">
          <Path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#uf-s)">
        <Rect x={0} y={0} width={60} height={30} fill="#012169" />
        <Path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth={6} />
        <Path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uf-t)" stroke="#C8102E" strokeWidth={4} />
        <Path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth={10} />
        <Path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth={6} />
      </G>
    </Svg>
  );
}

/** Flag band shown at the top of country screens (green-white-green for Nigeria; the Union Flag and its red cross arm for the UK). */
export function FlagBand() {
  const c = useColors();
  if (!c.band) return null;
  const dir = c.bandDirection ?? 'row';
  const bar = (
    <View style={{ flex: 1, flexDirection: dir, height: dir === 'column' ? 5 : 6, borderRadius: 3, overflow: 'hidden' }}>
      {c.band.map((col, i) => (
        <View key={i} style={{ flex: c.bandWeights?.[i] ?? 1, backgroundColor: col }} />
      ))}
    </View>
  );
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Flag colours"
      style={{ flexDirection: 'row', alignItems: 'center', gap: space(1), marginTop: space(1), marginBottom: space(0.5) }}
    >
      {c.flagMark === 'union' ? (
        <View style={{ borderRadius: 2, overflow: 'hidden' }}>
          <UnionFlag width={28} />
        </View>
      ) : null}
      {bar}
    </View>
  );
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const c = useColors();
  const column: ViewStyle = { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: space(2), paddingTop: space(1) };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: space(6) }} showsVerticalScrollIndicator={false} style={{ backgroundColor: c.bg }}>
          <View style={column}>
            <FlagBand />
            {children}
          </View>
        </ScrollView>
      ) : (
        <View style={[column, { flex: 1 }]}>
          <FlagBand />
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  const c = useColors();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space(2), marginBottom: space(1.5) },
        accent && { borderColor: c.gold, backgroundColor: c.surfaceRaised },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityHint,
  testID,
}: {
  testID?: string;
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space(2.5), alignItems: 'center', justifyContent: 'center', marginVertical: space(0.5) },
        kind === 'primary' && { backgroundColor: c.gold },
        kind === 'secondary' && { backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
        kind === 'ghost' && { backgroundColor: 'transparent' },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: kind === 'primary' ? c.onGold : c.text }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, colour }: { label: string; selected?: boolean; onPress?: () => void; colour?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        { borderRadius: 999, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
        selected && { borderColor: colour ?? c.cyan, backgroundColor: c.cyanSoft },
      ]}
    >
      <Text style={{ color: selected ? c.text : c.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Meter({ label, value, max = 100, colour, display }: { label: string; value: number; max?: number; colour?: string; display?: string }) {
  const c = useColors();
  const t = useType();
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ flex: 1, minWidth: 70 }} accessible accessibilityLabel={`${label} ${display ?? Math.round(value)}`}>
      <Text style={t.label}>{label}</Text>
      <Text style={[t.heading, { marginVertical: 2 }]}>{display ?? Math.round(value)}</Text>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceRaised, overflow: 'hidden' }}>
        <View style={{ height: 6, borderRadius: 3, width: `${pct * 100}%`, backgroundColor: colour ?? c.cyan }} />
      </View>
    </View>
  );
}

export function SimLabel() {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, padding: 8, marginVertical: space(1) }}>
      <Text style={{ color: c.textFaint, fontSize: 12, textAlign: 'center' }}>Simulated result, not a prediction. Fictional nominees.</Text>
    </View>
  );
}
