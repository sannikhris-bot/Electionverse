import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Svg, { Ellipse } from 'react-native-svg';
import { WORLD, type WorldCountry } from '@electionverse/packs';
import { Button, Card, Chip, Screen } from '@/components/ui';
import { useGame } from '@/store/game';
import { colors, space, type } from '@/theme';

const STATUS_LABEL: Record<WorldCountry['status'], string> = {
  playable: 'Playable',
  inDevelopment: 'In development',
  preview: 'Preview',
};

const STATUS_COLOUR: Record<WorldCountry['status'], string> = {
  playable: colors.gold,
  inDevelopment: colors.cyan,
  preview: colors.textFaint,
};

/**
 * Stylised world: soft continent shapes drawn in SVG (decoration only),
 * with country pins as ordinary pressable views on top so they work and
 * read correctly on every platform.
 */
function WorldMap({ width, onPick }: { width: number; onPick: (id: string) => void }) {
  const h = width * 0.55;
  const X = (x: number) => (x / 100) * width;
  const Y = (y: number) => (y / 100) * h;
  const land = 'rgba(56, 198, 244, 0.08)';
  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} pointerEvents="none">
        <Ellipse cx={X(21)} cy={Y(33)} rx={X(13)} ry={Y(17)} fill={land} />
        <Ellipse cx={X(31)} cy={Y(70)} rx={X(7)} ry={Y(17)} fill={land} />
        <Ellipse cx={X(50)} cy={Y(30)} rx={X(8)} ry={Y(10)} fill={land} />
        <Ellipse cx={X(53)} cy={Y(62)} rx={X(9)} ry={Y(20)} fill={land} />
        <Ellipse cx={X(72)} cy={Y(36)} rx={X(16)} ry={Y(18)} fill={land} />
        <Ellipse cx={X(84)} cy={Y(75)} rx={X(7)} ry={Y(8)} fill={land} />
      </Svg>
      {WORLD.map((c) => {
        const r = c.status === 'playable' ? 17 : 13;
        return (
          <Pressable
            key={c.id}
            onPress={() => onPick(c.id)}
            accessibilityRole="button"
            accessibilityLabel={`${c.name} on the map, ${STATUS_LABEL[c.status]}`}
            style={{
              position: 'absolute',
              left: X(c.x) - r,
              top: Y(c.y) - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              backgroundColor: colors.bg,
              borderWidth: c.status === 'playable' ? 2.5 : 1.5,
              borderColor: STATUS_COLOUR[c.status],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: c.status === 'playable' ? 16 : 12 }}>{c.flag}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function WorldScreen() {
  const { width } = useWindowDimensions();
  const mapWidth = Math.min(width, 720) - space(4) - 2;
  const { state, pack, loaded } = useGame();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | WorldCountry['status']>('all');
  const list = useMemo(
    () =>
      WORLD.filter((c) => (filter === 'all' || c.status === filter) && (c.name.toLowerCase().includes(query.toLowerCase()) || c.system.toLowerCase().includes(query.toLowerCase()))),
    [query, filter],
  );

  return (
    <Screen>
      <View style={{ marginTop: space(2), marginBottom: space(2) }}>
        <Text style={[type.label, { color: colors.gold }]}>ElectionVerse</Text>
        <Text style={type.display}>Choose your campaign</Text>
        <Text style={[type.small, { marginTop: 4 }]}>Real parties. Real maps. Fictional nominees. Every country plays differently.</Text>
      </View>

      {loaded && state && pack && state.phase !== 'finished' ? (
        <Card accent>
          <Text style={type.label}>Campaign in progress</Text>
          <Text style={[type.heading, { marginVertical: 4 }]}>
            {state.nominee.name} · {pack.parties.find((p) => p.id === state.playerPartyId)?.shortName} · {pack.names.en}
          </Text>
          <Text style={type.small}>
            {state.phase === 'pollingDay' ? 'Polling day has arrived.' : `Day ${Math.min(state.day, pack.calendar.days)} of ${pack.calendar.days}`}
          </Text>
          <Button label="Return to the trail" onPress={() => router.push('/campaign')} />
        </Card>
      ) : null}

      <Card style={{ padding: space(1) }}>
        <WorldMap width={mapWidth} onPick={(id) => router.push({ pathname: '/country/[id]', params: { id } })} />
      </Card>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search countries or systems"
        placeholderTextColor={colors.textFaint}
        accessibilityLabel="Search countries"
        style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: space(1) }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(['all', 'playable', 'inDevelopment', 'preview'] as const).map((f) => (
          <Chip key={f} label={f === 'all' ? 'All' : STATUS_LABEL[f]} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      {list.map((c) => (
        <Pressable key={c.id} onPress={() => router.push({ pathname: '/country/[id]', params: { id: c.id } })} accessibilityRole="button" accessibilityLabel={`${c.name}. ${c.system}. ${STATUS_LABEL[c.status]}.`}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 30, marginRight: space(1.5) }}>{c.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>{c.name}</Text>
              <Text style={type.small}>{c.system}</Text>
            </View>
            <Text style={[type.label, { color: STATUS_COLOUR[c.status] }]}>{STATUS_LABEL[c.status]}</Text>
          </Card>
        </Pressable>
      ))}
      {list.length === 0 ? <Text style={type.small}>No countries match.</Text> : null}

      <Button label="Career Passport" kind="secondary" onPress={() => router.push('/passport')} />
    </Screen>
  );
}
