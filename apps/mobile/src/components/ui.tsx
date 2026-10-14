import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '@/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.column}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.column, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  return <View style={[styles.card, accent && styles.cardAccent, style]}>{children}</View>;
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
        styles.button,
        kind === 'primary' && styles.buttonPrimary,
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'ghost' && styles.buttonGhost,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.buttonText, kind === 'primary' && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, colour }: { label: string; selected?: boolean; onPress?: () => void; colour?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { borderColor: colour ?? colors.cyan, backgroundColor: colors.cyanSoft }]}
    >
      <Text style={[styles.chipText, selected && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Meter({ label, value, max = 100, colour = colors.cyan, display }: { label: string; value: number; max?: number; colour?: string; display?: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ flex: 1, minWidth: 70 }} accessible accessibilityLabel={`${label} ${display ?? Math.round(value)}`}>
      <Text style={type.label}>{label}</Text>
      <Text style={[type.heading, { marginVertical: 2 }]}>{display ?? Math.round(value)}</Text>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${pct * 100}%`, backgroundColor: colour }]} />
      </View>
    </View>
  );
}

export function SimLabel() {
  return (
    <View style={styles.simLabel}>
      <Text style={styles.simText}>Simulated result, not a prediction. Fictional nominees.</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: space(6) },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: space(2), paddingTop: space(1) },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space(2), marginBottom: space(1.5) },
  cardAccent: { borderColor: colors.gold, backgroundColor: '#14203F' },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space(2.5), alignItems: 'center', justifyContent: 'center', marginVertical: space(0.5) },
  buttonPrimary: { backgroundColor: colors.gold },
  buttonSecondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.text },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  meterTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3 },
  simLabel: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8, marginVertical: space(1) },
  simText: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
});
