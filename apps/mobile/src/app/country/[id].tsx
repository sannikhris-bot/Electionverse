import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getPack, WORLD } from '@electionverse/packs';
import { Button, Card, Screen } from '@/components/ui';
import { colors, space, type } from '@/theme';

const DIFFICULTY_WORDS = ['', 'Easy', 'Fair', 'Even', 'Uphill', 'Long shot'];

export default function CountryLobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const country = WORLD.find((c) => c.id === id);
  const pack = getPack(id ?? '');
  const [party, setParty] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);

  if (!country) {
    return (
      <Screen>
        <Text style={type.title}>Country not found</Text>
        <Button label="Back to the world" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Button label="‹ World" kind="ghost" onPress={() => router.back()} />
      <Text style={{ fontSize: 44 }}>{country.flag}</Text>
      <Text style={type.display}>{country.name}</Text>
      <Text style={[type.label, { color: colors.gold, marginVertical: 6 }]}>{country.system}</Text>
      <Card>
        <Text style={type.body}>{pack?.systemSummary ?? country.explainer}</Text>
        {pack ? (
          <Text style={[type.small, { marginTop: space(1) }]}>
            {pack.calendar.days}-day campaign · {pack.calendar.debateDays.length} debates · {pack.regions.length} regions · {pack.electionNight.targetLabel}
          </Text>
        ) : null}
      </Card>

      {!pack ? (
        <Card>
          <Text style={type.heading}>{country.status === 'inDevelopment' ? 'In development' : 'Coming later'}</Text>
          <Text style={[type.small, { marginVertical: space(1) }]}>
            This country is not playable yet. Its pack must pass fact, balance and legal review before it opens.
          </Text>
          <Button label={wishlisted ? 'On your wishlist ✓' : 'Add to wishlist'} kind="secondary" onPress={() => setWishlisted(true)} />
        </Card>
      ) : (
        <>
          {pack.placeholderData ? (
            <Card style={{ borderColor: colors.warn }}>
              <Text style={[type.label, { color: colors.warn }]}>Playtest build</Text>
              {(pack.dataNotes ?? ['Some figures in this pack are placeholders for testing.']).map((note) => (
                <Text key={note} style={[type.small, { marginTop: 4 }]}>
                  • {note}
                </Text>
              ))}
            </Card>
          ) : null}
          <Text style={[type.title, { marginTop: space(2), marginBottom: space(1) }]}>Choose your party</Text>
          {pack.parties
            .filter((p) => p.playable)
            .map((p) => {
              const sel = party === p.id;
              return (
                <Pressable key={p.id} onPress={() => setParty(p.id)} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={`${p.name.en}. Difficulty ${DIFFICULTY_WORDS[p.difficulty]}.`}>
                  <Card style={[{ flexDirection: 'row', alignItems: 'center' }, sel && { borderColor: colors.gold }]}>
                    <View style={{ width: 10, alignSelf: 'stretch', borderRadius: 5, backgroundColor: p.colour, marginRight: space(1.5) }} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.heading}>{p.name.en}</Text>
                      <Text style={type.small}>
                        Funds {p.resources.funds}k · Volunteers {p.resources.volunteers} · {DIFFICULTY_WORDS[p.difficulty]}
                      </Text>
                      <Text style={[type.small, { color: colors.textFaint, marginTop: 2 }]}>
                        {p.platform.length ? p.platform.map((x) => x.summary).join(' · ') : 'Platform summary pending source review.'}
                      </Text>
                    </View>
                    <Text style={{ color: sel ? colors.gold : colors.textFaint, fontSize: 20 }}>{sel ? '●' : '○'}</Text>
                  </Card>
                </Pressable>
              );
            })}
          <Button
            label="Create your nominee"
            disabled={!party}
            onPress={() => party && router.push({ pathname: '/new/[id]', params: { id: pack.id, party } })}
          />
        </>
      )}
    </Screen>
  );
}
