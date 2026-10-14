import { useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { majorityOf, type CountryPack } from '@electionverse/engine';
import { TileMap, type TileInfo } from '@/components/TileMap';
import { CountryTheme, Button, Card, Screen, SimLabel } from '@/components/ui';
import { useGame } from '@/store/game';
import { space, useColors, useType } from '@/theme';

const REVEAL_MS = 160;

function revealOrder(pack: CountryPack, regionIds: string[]): string[] {
  const reg = (id: string) => pack.regions.find((r) => r.id === id)!;
  if (pack.electionNight.revealOrder === 'byGroup') {
    // Zone by zone, as returns arrive at the national collation centre.
    const groups = [...new Set(pack.regions.map((r) => r.group ?? ''))];
    return [...regionIds].sort((a, b) => groups.indexOf(reg(a).group ?? '') - groups.indexOf(reg(b).group ?? '') || reg(a).name.localeCompare(reg(b).name));
  }
  // Smallest regions first, the biggest prizes last: suspense builds toward the end.
  return [...regionIds].sort((a, b) => reg(a).stake - reg(b).stake || a.localeCompare(b));
}

function ElectionNightInner() {
  const colors = useColors();
  const type = useType();
  const { width } = useWindowDimensions();
  const { pack, state, dispatch } = useGame();
  const [revealed, setRevealed] = useState(0);
  const result = state?.result;
  // With an exit poll, the night opens on the 10 p.m. projection before any seat is declared.
  const [counting, setCounting] = useState(false);
  const order = useMemo(() => (pack && result ? revealOrder(pack, result.outcome.regionResults.map((r) => r.regionId)) : []), [pack, result]);
  const total = order.length;
  const finishedReveal = revealed >= total && total > 0;

  useEffect(() => {
    if (!result || revealed >= total || (result.exitPoll && !counting)) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), revealed < total - 6 ? REVEAL_MS : REVEAL_MS * 6);
    return () => clearTimeout(t);
  }, [result, revealed, total, counting]);

  if (!pack || !state) {
    return (
      <Screen>
        <Text style={type.title}>No campaign.</Text>
        <Button label="World map" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (state.phase === 'pollingDay') {
    return (
      <Screen>
        <Text style={[type.label, { color: colors.goldText, marginTop: space(3) }]}>Polling day</Text>
        <Text style={type.display}>The campaign is over.</Text>
        <Text style={[type.body, { marginVertical: space(2) }]}>
          Millions of voters are heading to the polls. Everything you did over {pack.calendar.days} days now comes down to who turns out.
        </Text>
        <Button label="Close the polls" onPress={() => dispatch({ type: 'holdElection' })} />
      </Screen>
    );
  }
  if (!result) return null;

  const me = state.playerPartyId;
  const shown = new Set(order.slice(0, revealed));
  const tiles: Record<string, TileInfo> = {};
  const tally: Record<string, number> = {};
  for (const r of result.outcome.regionResults) {
    if (shown.has(r.regionId)) {
      tiles[r.regionId] = { leader: r.winnerPartyId, margin: r.margin };
      for (const [p, n] of Object.entries(r.awarded)) tally[p] = (tally[p] ?? 0) + n;
    } else tiles[r.regionId] = { hidden: true };
  }
  const isProportional = pack.winRule.type === 'proportionalList' || pack.winRule.type === 'presidentialSpread';
  const finalTally = finishedReveal ? (isProportional ? result.outcome.tally : tally) : tally;
  const target = majorityOf(pack);
  const totalStake = pack.winRule.type === 'electoralCollege' ? pack.winRule.totalVotes : pack.winRule.type === 'firstPastThePost' || pack.winRule.type === 'proportionalList' ? pack.winRule.totalSeats : 1;
  const name = (id: string) => pack.parties.find((p) => p.id === id)?.shortName ?? id;
  const fullName = (id: string) => pack.parties.find((p) => p.id === id)?.name.en ?? id;
  const colour = (id: string) => pack.parties.find((p) => p.id === id)?.colour ?? colors.textFaint;
  const anchor = pack.electionNight.anchors[0];
  const nationalTotal = Object.values(result.outcome.nationalVotes).reduce((a, b) => a + b, 0) || 1;

  if (result.exitPoll && !counting) {
    const ep = Object.entries(result.exitPoll).sort((a, b) => b[1] - a[1]);
    const [lead, leadSeats] = ep[0] ?? ['', 0];
    const short = target !== null ? target - leadSeats : 0;
    return (
      <Screen>
        <Text style={[type.label, { color: colors.goldText, marginTop: space(2) }]}>Election Night · {pack.names.en}</Text>
        <Text style={type.display}>{pack.electionNight.exitPoll?.label ?? 'Exit poll'}</Text>
        {anchor ? (
          <Text style={[type.small, { marginVertical: 4 }]}>
            {anchor.name}, {pack.mediaOutlets[0]?.name}: "Big Ben strikes ten, the polls have closed, and our exit poll suggests{' '}
            {short > 0 ? `a hung parliament, with the ${fullName(lead)} the largest party, ${short} short of a majority` : `the ${fullName(lead)} will win a majority`}."
          </Text>
        ) : null}
        <Card accent>
          <Text style={type.label}>Projected seats</Text>
          {ep
            .filter(([, v]) => v > 0)
            .map(([p, v]) => (
              <View key={p} style={{ marginVertical: 5 }} testID={`exit-${p}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.body, { fontWeight: p === me ? '800' : '500' }]}>
                    {name(p)}
                    {p === me ? ' (you)' : ''}
                  </Text>
                  <Text style={type.heading}>{v}</Text>
                </View>
                <View style={{ height: 10, backgroundColor: colors.surfaceRaised, borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{ width: `${(v / totalStake) * 100}%`, height: 10, backgroundColor: colour(p) }} />
                  {target !== null ? <View style={{ position: 'absolute', left: `${(target / totalStake) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: colors.cyan }} /> : null}
                </View>
              </View>
            ))}
          <Text style={[type.small, { marginTop: 6 }]}>A projection from interviews at polling stations. It can be wrong; the declarations decide.</Text>
        </Card>
        <SimLabel />
        <Button label="Start the count" onPress={() => setCounting(true)} testID="start-count" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[type.label, { color: colors.goldText, marginTop: space(2) }]}>Election Night · {pack.names.en}</Text>
      <Text style={type.display}>{finishedReveal ? result.headline : 'Results are coming in…'}</Text>
      {anchor ? (
        <Text style={[type.small, { marginVertical: 4 }]}>
          {anchor.name}, {pack.mediaOutlets[0]?.name}:{' '}
          {finishedReveal ? '"And that is the race."' : revealed > total - 6 ? '"We are down to the biggest prizes of the night."' : '"The early calls are in."'}
        </Text>
      ) : null}

      {/* Tally toward the target */}
      {target !== null && !isProportional ? (
        <Card>
          <Text style={type.label}>{pack.electionNight.targetLabel}</Text>
          {Object.entries(finalTally)
            .filter(([p]) => p !== 'other')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([p, v]) => (
              <View key={p} style={{ marginVertical: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.body, { fontWeight: p === me ? '800' : '500' }]}>
                    {name(p)}
                    {p === me ? ' (you)' : ''}
                  </Text>
                  <Text style={[type.heading]}>{v}</Text>
                </View>
                <View style={{ height: 12, backgroundColor: colors.surfaceRaised, borderRadius: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${(v / totalStake) * 100}%`, height: 12, backgroundColor: colour(p) }} />
                  <View style={{ position: 'absolute', left: `${(target / totalStake) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: colors.gold }} />
                </View>
              </View>
            ))}
        </Card>
      ) : null}

      {pack.winRule.type === 'presidentialSpread' ? (
        <Card>
          <Text style={type.label}>{pack.electionNight.targetLabel}</Text>
          {(() => {
            const rule = pack.winRule;
            const seen = result.outcome.regionResults.filter((r) => shown.has(r.regionId));
            const votes: Record<string, number> = {};
            const reached: Record<string, number> = {};
            for (const r of seen) {
              for (const [p, v] of Object.entries(r.votes)) votes[p] = (votes[p] ?? 0) + v;
              for (const p of r.reachedMinShare ?? []) if (rule.unitRegionIds.includes(r.regionId)) reached[p] = (reached[p] ?? 0) + 1;
            }
            const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
            return Object.entries(votes)
              .filter(([p]) => p !== 'other')
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([p, v]) => (
                <View key={p} style={{ marginVertical: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[type.body, { fontWeight: p === me ? '800' : '500' }]}>
                      {name(p)}
                      {p === me ? ' (you)' : ''} · {((v / total) * 100).toFixed(1)}%
                    </Text>
                    <Text style={[type.small, { color: (reached[p] ?? 0) >= rule.requiredUnits ? colors.good : colors.textMuted }]}>
                      {Math.round(rule.minShare * 100)}% in {reached[p] ?? 0} states · {rule.requiredUnits} needed
                    </Text>
                  </View>
                  <View style={{ height: 10, backgroundColor: colors.surfaceRaised, borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(1, (reached[p] ?? 0) / rule.unitRegionIds.length) * 100}%`, height: 10, backgroundColor: colour(p) }} />
                    <View style={{ position: 'absolute', left: `${(rule.requiredUnits / rule.unitRegionIds.length) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: colors.gold }} />
                  </View>
                </View>
              ));
          })()}
          <Text style={[type.small, { marginTop: 4 }]}>
            {revealed}/{total} states collated
          </Text>
        </Card>
      ) : null}

      <Card style={{ padding: space(1) }}>
        <TileMap pack={pack} tiles={tiles} width={Math.min(width, 720) - space(4) - 2} />
      </Card>

      {!finishedReveal ? <Button label="Skip to the result" kind="secondary" onPress={() => setRevealed(total)} /> : null}

      {finishedReveal ? (
        <>
          <Card>
            <Text style={[type.label, { marginBottom: 6 }]}>National vote</Text>
            {Object.entries(result.outcome.nationalVotes)
              .sort((a, b) => b[1] - a[1])
              .map(([p, v]) => (
                <Text key={p} style={type.body}>
                  {name(p)}: {((v / nationalTotal) * 100).toFixed(1)}%{isProportional && pack.winRule.type === 'proportionalList' ? ` · ${result.outcome.tally[p] ?? 0} seats` : ''}
                </Text>
              ))}
            {result.outcome.runoff ? (
              <Text style={[type.small, { marginTop: 6 }]}>
                Runoff: {name(result.outcome.runoff.partyIds[0])} vs {name(result.outcome.runoff.partyIds[1])}, won by {name(result.outcome.runoff.winnerPartyId)}.
              </Text>
            ) : null}
          </Card>

          {state.phase === 'coalition' ? (
            <Card accent>
              <Text style={[type.label, { color: colors.goldText }]}>Coalition talks</Text>
              <Text style={[type.body, { marginVertical: 6 }]}>Nobody has a majority. Who will you negotiate with?</Text>
              {result.coalitionOptions?.map((o) => (
                <Button
                  key={o.partners.join('+')}
                  kind="secondary"
                  label={`With ${o.partners.map(name).join(' + ')} · ${o.seats} seats · ${Math.round(o.chance * 100)}% chance`}
                  onPress={() => dispatch({ type: 'coalition', choice: o.partners })}
                />
              ))}
              <Button label="Govern as a minority" kind="secondary" onPress={() => dispatch({ type: 'coalition', choice: 'minority' })} />
              <Button label="Concede and go into opposition" kind="ghost" onPress={() => dispatch({ type: 'coalition', choice: 'concede' })} />
            </Card>
          ) : null}

          <Card>
            <Text style={[type.label, { marginBottom: 6 }]}>Why you {result.playerOutcome === 'won' || result.playerOutcome === 'coalition' || result.playerOutcome === 'minority' ? 'won' : 'lost'}</Text>
            {result.explanation.summary.map((s, i) => (
              <Text key={i} style={[type.body, { marginBottom: 4 }]}>
                • {s}
              </Text>
            ))}
            <Text style={[type.label, { marginTop: space(1.5), marginBottom: 6 }]}>Closest races</Text>
            {result.explanation.decisiveRegions.map((d) => (
              <Text key={d.regionId} style={type.body}>
                {pack.regions.find((r) => r.id === d.regionId)?.name} ({d.stake}): {d.playerWon ? 'won' : 'lost'} by {Math.abs(d.margin * 100).toFixed(1)} pts
              </Text>
            ))}
            <Text style={[type.label, { marginTop: space(1.5), marginBottom: 6 }]}>Days that moved the race</Text>
            {result.explanation.keyDays.map((k) => (
              <Text key={k.day} style={[type.body, { marginBottom: 4 }]}>
                Day {k.day} ({k.delta >= 0 ? '+' : ''}
                {(k.delta * 100).toFixed(2)} pts): {k.summary}
              </Text>
            ))}
          </Card>

          <SimLabel />
          {state.phase === 'finished' ? (
            <>
              <Button label="Run again" onPress={() => router.replace({ pathname: '/country/[id]', params: { id: pack.id } })} />
              <Button label="World map" kind="secondary" onPress={() => router.replace('/')} />
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

export default function ElectionNight() {
  const packId = useGame((s) => s.pack?.id);
  return (
    <CountryTheme countryId={packId}>
      <ElectionNightInner />
    </CountryTheme>
  );
}
