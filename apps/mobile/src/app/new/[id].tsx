import { useState } from 'react';
import { Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BACKGROUNDS, TRAITS, type CandidateBackground, type Trait } from '@electionverse/engine';
import { getPack } from '@electionverse/packs';
import { TileMap } from '@/components/TileMap';
import { Button, Card, Chip, Screen } from '@/components/ui';
import { newSeed, useGame } from '@/store/game';
import { colors, space, type } from '@/theme';

const inputStyle = {
  backgroundColor: colors.surfaceRaised,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 12,
  color: colors.text,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  marginTop: 6,
};

export default function NomineeCreator() {
  const { id, party } = useLocalSearchParams<{ id: string; party: string }>();
  const pack = getPack(id ?? '');
  const start = useGame((s) => s.start);
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [mate, setMate] = useState('');
  const [background, setBackground] = useState<CandidateBackground>('teacher');
  const [traits, setTraits] = useState<Trait[]>([]);
  const [home, setHome] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'guided' | 'normal' | 'hard'>('guided');

  if (!pack || !party) {
    return (
      <Screen>
        <Text style={type.title}>This campaign cannot start.</Text>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }
  const partyInfo = pack.parties.find((p) => p.id === party);
  const toggleTrait = (t: Trait) =>
    setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < 2 ? [...cur, t] : [cur[1]!, t]));
  const ready = name.trim().length >= 2 && traits.length === 2 && home;
  const homeRegion = pack.regions.find((r) => r.id === home);

  return (
    <Screen>
      <Button label="‹ Parties" kind="ghost" onPress={() => router.back()} />
      <Text style={[type.label, { color: partyInfo?.colour }]}>{partyInfo?.name.en}</Text>
      <Text style={type.display}>Create your nominee</Text>
      <Text style={[type.small, { marginBottom: space(2) }]}>Your nominee is fictional. Do not use the name of a real person.</Text>

      <Card>
        <Text style={type.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Jordan Ellis" placeholderTextColor={colors.textFaint} style={inputStyle} maxLength={32} accessibilityLabel="Nominee name" />
        {pack.office.hasRunningMate ? (
          <>
            <Text style={[type.label, { marginTop: space(2) }]}>{pack.office.runningMateTitle?.en ?? 'Running mate'} (optional)</Text>
            <TextInput value={mate} onChangeText={setMate} placeholder="A fictional name" placeholderTextColor={colors.textFaint} style={inputStyle} maxLength={32} accessibilityLabel="Running mate name" />
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={type.label}>Background</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {(Object.keys(BACKGROUNDS) as CandidateBackground[]).map((b) => (
            <Chip key={b} label={BACKGROUNDS[b].name} selected={background === b} onPress={() => setBackground(b)} />
          ))}
        </View>
        <Text style={type.small}>{BACKGROUNDS[background].description}</Text>
      </Card>

      <Card>
        <Text style={type.label}>Two traits ({traits.length}/2)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {(Object.keys(TRAITS) as Trait[]).map((t) => (
            <Chip key={t} label={TRAITS[t].name} selected={traits.includes(t)} onPress={() => toggleTrait(t)} colour={colors.gold} />
          ))}
        </View>
        {traits.map((t) => (
          <Text key={t} style={type.small}>
            • {TRAITS[t].name}: {TRAITS[t].description}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={type.label}>Home region</Text>
        <Text style={[type.small, { marginBottom: space(1) }]}>
          {homeRegion ? `${homeRegion.name}: you start with strong name recognition here.` : 'Tap the map to choose where you are from.'}
        </Text>
        <TileMap pack={pack} tiles={{}} selected={home} onSelect={setHome} width={Math.min(width, 720) - space(8) - 2} />
      </Card>

      <Card>
        <Text style={type.label}>Difficulty</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          <Chip label="Guided" selected={difficulty === 'guided'} onPress={() => setDifficulty('guided')} />
          <Chip label="Normal" selected={difficulty === 'normal'} onPress={() => setDifficulty('normal')} />
          <Chip label="Hard" selected={difficulty === 'hard'} onPress={() => setDifficulty('hard')} />
        </View>
        <Text style={type.small}>
          {difficulty === 'guided' ? 'More undecided voters and a less sharp rival. Best for a first campaign.' : difficulty === 'normal' ? 'A fair fight.' : 'A ruthless rival and fewer undecided voters.'}
        </Text>
      </Card>

      <Button
        label="Launch the campaign"
        disabled={!ready}
        onPress={() => {
          if (!ready || !home) return;
          start(pack.id, {
            seed: newSeed(),
            partyId: party,
            difficulty,
            nominee: { name: name.trim(), background, traits: [traits[0]!, traits[1]!], homeRegionId: home, runningMateName: mate.trim() || undefined },
          });
          router.replace('/campaign');
        }}
      />
    </Screen>
  );
}
