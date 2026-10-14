import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { WORLD, getPack } from '@electionverse/packs';
import { Button, Card, Screen } from '@/components/ui';
import { useGame } from '@/store/game';
import { colors, space, type } from '@/theme';

const OUTCOME_WORDS = { won: 'Won', coalition: 'Coalition', minority: 'Minority government', opposition: 'Opposition', lost: 'Lost' } as const;

export default function Passport() {
  const passport = useGame((s) => s.passport);
  const wins = passport.filter((p) => p.outcome === 'won' || p.outcome === 'coalition' || p.outcome === 'minority').length;
  const countries = new Set(passport.map((p) => p.packId)).size;
  const parties = new Set(passport.map((p) => `${p.packId}:${p.partyId}`)).size;

  return (
    <Screen>
      <Button label="‹ World" kind="ghost" onPress={() => router.back()} />
      <Text style={type.display}>Career Passport</Text>
      <Card accent style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {[
          ['Campaigns', passport.length],
          ['Wins', wins],
          ['Countries', countries],
          ['Parties', parties],
        ].map(([l, v]) => (
          <View key={String(l)} style={{ alignItems: 'center' }}>
            <Text style={[type.title, { color: colors.goldText }]}>{v}</Text>
            <Text style={type.label}>{l}</Text>
          </View>
        ))}
      </Card>
      {passport.length === 0 ? <Text style={[type.small, { marginTop: space(1) }]}>Finish a campaign to stamp your passport.</Text> : null}
      {passport.map((p, i) => {
        const pack = getPack(p.packId);
        const party = pack?.parties.find((x) => x.id === p.partyId);
        const flag = WORLD.find((w) => w.id === p.packId)?.flag;
        return (
          <Card key={i}>
            <Text style={type.heading}>
              {flag} {p.nominee} · {party?.shortName}
            </Text>
            <Text style={[type.small, { color: p.outcome === 'lost' || p.outcome === 'opposition' ? colors.bad : colors.good }]}>{OUTCOME_WORDS[p.outcome]}</Text>
            <Text style={type.small}>{p.headline}</Text>
          </Card>
        );
      })}
    </Screen>
  );
}
