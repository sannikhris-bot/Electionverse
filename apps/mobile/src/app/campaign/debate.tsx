import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { RESPONSE_LABELS, debateRounds, type DebateResponse } from '@electionverse/engine';
import { CountryTheme, Button, Card, Screen } from '@/components/ui';
import { useGame } from '@/store/game';
import { space, useColors, useType } from '@/theme';

const STYLE_WORDS = { attack: 'a personal attack', policy: 'a policy challenge', record: 'your own record' } as const;

function DebateScreenInner() {
  const colors = useColors();
  const type = useType();
  const { pack, state, dispatch } = useGame();
  const rounds = useMemo(() => (pack && state && state.phase === 'awaitingDebate' ? debateRounds(pack, state) : []), [pack, state]);
  const [answers, setAnswers] = useState<DebateResponse[]>([]);
  const [done, setDone] = useState(false);

  if (!pack || !state) return null;
  const rival = state.rivals[0];

  if (done) {
    const report = state.pendingDebate;
    return (
      <Screen>
        <Text style={[type.label, { color: colors.goldText, marginTop: space(2) }]}>Debate verdict</Text>
        <Text style={type.display}>
          {report?.verdict === 'won' ? 'You won the night' : report?.verdict === 'lost' ? 'You lost the night' : 'No knockout blow'}
        </Text>
        <Card>
          <Text style={[type.heading, { marginBottom: 6 }]}>
            You scored {report?.score.toFixed(1)} · {rival?.nominee.name ?? 'Your rival'} scored {report?.rivalScore.toFixed(1)}
          </Text>
          {report?.rounds.map((r, i) => (
            <Text key={i} style={[type.body, { marginVertical: 4 }]}>
              Round {i + 1}: they went with {STYLE_WORDS[r.style]}; you chose {RESPONSE_LABELS[r.response].name}.{' '}
              <Text style={{ color: r.score >= 2 ? colors.good : r.score < 0 ? colors.bad : colors.textMuted }}>
                {r.score >= 2 ? 'Perfect answer.' : r.score > 0 ? 'Solid.' : r.score === 0 ? 'Missed the moment.' : 'Backfired.'}
              </Text>
            </Text>
          ))}
        </Card>
        <Text style={type.small}>Attacks are best met with humour, policy challenges with a direct counter, and attacks on your record with a pivot. Staying on message is always safe.</Text>
        <Button label="Back to campaign HQ" onPress={() => (router.canGoBack() ? router.back() : router.replace('/campaign'))} />
      </Screen>
    );
  }

  if (state.phase !== 'awaitingDebate' || rounds.length === 0) {
    return (
      <Screen>
        <Text style={type.title}>No debate tonight.</Text>
        <Button label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/campaign'))} />
      </Screen>
    );
  }

  const i = answers.length;
  const round = rounds[i]!;
  const choose = (r: DebateResponse) => {
    const next = [...answers, r];
    if (next.length === rounds.length) {
      if (dispatch({ type: 'debate', responses: next })) setDone(true);
    } else setAnswers(next);
  };

  return (
    <Screen>
      <Text style={[type.label, { color: colors.goldText, marginTop: space(2) }]}>
        Debate · round {i + 1} of {rounds.length}
      </Text>
      <Text style={type.display}>{round.topic}</Text>
      <Card accent>
        <Text style={type.small}>Your opponent</Text>
        <Text style={type.heading}>{rival?.nominee.name ?? 'Your rival'}</Text>
        <Text style={[type.body, { marginTop: space(1), fontStyle: 'italic' }]}>"{rival?.nominee.name ?? 'Your rival'} {round.tell}."</Text>
        <Text style={[type.small, { marginTop: space(1) }]}>Read the tell. It is usually right, but not always.</Text>
      </Card>
      <View>
        {(Object.keys(RESPONSE_LABELS) as DebateResponse[]).map((r) => (
          <Button key={r} kind="secondary" label={`${RESPONSE_LABELS[r].name}: ${RESPONSE_LABELS[r].hint}`} onPress={() => choose(r)} />
        ))}
      </View>
    </Screen>
  );
}

export default function DebateScreen() {
  const packId = useGame((s) => s.pack?.id);
  return (
    <CountryTheme countryId={packId}>
      <DebateScreenInner />
    </CountryTheme>
  );
}
