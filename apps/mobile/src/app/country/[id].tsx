import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getPack, WORLD } from '@electionverse/packs';
import { CountryTheme, Button, Card, Screen } from '@/components/ui';
import { space, useColors, useType } from '@/theme';

const DIFFICULTY_WORDS = ['', 'Easy', 'Fair', 'Even', 'Uphill', 'Long shot'];

function CountryLobbyInner() {
  const colors = useColors();
  const type = useType();
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
      <Text style={[type.label, { color: colors.goldText, marginVertical: 6 }]}>{country.system}</Text>
      <Card>
        <Text style={type.body}>{pack?.systemSummary ?? country.explainer}</Text>
        {pack ? (
          <Text style={[type.small, { marginTop: space(1) }]}>
            {pack.calendar.days}-day campaign · {pack.calendar.debateDays.length} debate{pack.calendar.debateDays.length === 1 ? '' : 's'} · {pack.regions.length} regions · {pack.electionNight.targetLabel}
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
          {pack.civicRecord ? <CivicRecordCard pack={pack} /> : null}
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

export default function CountryLobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CountryTheme countryId={id}>
      <CountryLobbyInner />
    </CountryTheme>
  );
}

function CivicRecordCard({ pack }: { pack: NonNullable<ReturnType<typeof getPack>> }) {
  const colors = useColors();
  const type = useType();
  const [open, setOpen] = useState(false);
  const rec = pack.civicRecord!;
  const reg = rec.rows.reduce((a, r) => a + r.registered, 0);
  const col = rec.rows.reduce((a, r) => a + (r.collected ?? 0), 0);
  const fmt = (n: number) => n.toLocaleString('en-US');
  const rows = [...rec.rows].sort((a, b) => b.registered - a.registered);
  const name = (id: string) => pack.regions.find((r) => r.id === id)?.name ?? id;
  return (
    <Card>
      <Text style={[type.label, { color: colors.goldText }]}>Civic record · {rec.asOf}</Text>
      <Text style={[type.heading, { marginVertical: 4 }]}>{rec.title}</Text>
      <View style={{ flexDirection: 'row', gap: space(2), marginVertical: space(1) }}>
        <View style={{ flex: 1 }}>
          <Text style={type.small}>Registered voters</Text>
          <Text style={type.title}>{fmt(reg)}</Text>
        </View>
        {col ? (
          <View style={{ flex: 1 }}>
            <Text style={type.small}>{rec.collectedLabel ?? 'Collected'}</Text>
            <Text style={type.title}>
              {fmt(col)} <Text style={type.small}>({((100 * col) / reg).toFixed(1)}%)</Text>
            </Text>
          </View>
        ) : null}
      </View>
      {open ? (
        <View accessibilityRole="list" style={{ marginTop: space(1) }}>
          <View style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={[type.label, { flex: 1.4 }]}>State</Text>
            <Text style={[type.label, { flex: 1, textAlign: 'right' }]}>Registered</Text>
            {col ? <Text style={[type.label, { flex: 0.8, textAlign: 'right' }]}>PVC %</Text> : null}
          </View>
          {rows.map((r) => (
            <View key={r.regionId} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[type.body, { flex: 1.4 }]}>{name(r.regionId)}</Text>
              <Text style={[type.body, { flex: 1, textAlign: 'right' }]}>{fmt(r.registered)}</Text>
              {r.collected !== undefined ? <Text style={[type.small, { flex: 0.8, textAlign: 'right' }]}>{((100 * r.collected) / r.registered).toFixed(1)}%</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
      <Button label={open ? 'Hide states' : `Show all ${rec.rows.length} states`} kind="secondary" onPress={() => setOpen(!open)} />
      <Text style={[type.small, { marginTop: 4 }]}>
        {rec.status} Source: {rec.source}.
      </Text>
    </Card>
  );
}
