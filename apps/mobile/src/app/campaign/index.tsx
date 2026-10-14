import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  allianceOptions,
  MAX_STOPS,
  previewDay,
  regionEstimate,
  travelCost,
  travelHours,
  type CampaignState,
  type CountryPack,
  type DayReport,
  type Stop,
} from '@electionverse/engine';
import { TileMap, type TileInfo } from '@/components/TileMap';
import { CountryTheme, Button, Card, Chip, Meter, Screen } from '@/components/ui';
import { useGame } from '@/store/game';
import { radius, space, useColors, useType } from '@/theme';

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function leaderOf(shares: Record<string, number>): { leader?: string; margin: number } {
  const ranked = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  const [a, b] = ranked;
  return { leader: a?.[0], margin: a && b ? a[1] - b[1] : 0 };
}

/** Spread rule: units where the party's estimated vote share (undecided excluded) reaches the minimum. */
function spreadEstimate(pack: CountryPack, state: CampaignState, partyId: string): number | null {
  const rule = pack.winRule;
  if (rule.type !== 'presidentialSpread') return null;
  let n = 0;
  for (const id of rule.unitRegionIds) {
    const est = regionEstimate(state, id);
    const total = Object.values(est).reduce((a, b) => a + b, 0) || 1;
    if ((est[partyId] ?? 0) / total >= rule.minShare) n++;
  }
  return n;
}

function projection(pack: CountryPack, state: CampaignState) {
  const tally: Record<string, number> = {};
  for (const r of pack.regions) {
    const { leader } = leaderOf(regionEstimate(state, r.id));
    if (leader) tally[leader] = (tally[leader] ?? 0) + r.stake;
  }
  return tally;
}

function CampaignHQInner() {
  const colors = useColors();
  const type = useType();
  const { width } = useWindowDimensions();
  const { pack, state, dispatch, error, clearError, abandon } = useGame();
  const [stops, setStops] = useState<Stop[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | undefined>(undefined);
  const [travel, setTravel] = useState<'road' | 'air'>('road');
  const [report, setReport] = useState<DayReport | null>(null);
  const seenReports = useRef(state?.reports.length ?? 0);

  // Show the day report whenever a new day has been completed.
  useEffect(() => {
    if (!state) return;
    if (state.reports.length > seenReports.current) {
      setReport(state.reports[state.reports.length - 1]!);
      seenReports.current = state.reports.length;
    }
  }, [state]);

  const tiles = useMemo(() => {
    const out: Record<string, TileInfo> = {};
    if (!pack || !state) return out;
    for (const r of pack.regions) {
      const est = regionEstimate(state, r.id);
      const { leader, margin } = leaderOf(est);
      out[r.id] = { leader, margin };
    }
    stops.forEach((s, i) => {
      out[s.regionId] = { ...out[s.regionId], badge: String(i + 1), ring: colors.gold };
    });
    return out;
  }, [pack, state, stops]);

  if (!pack || !state) {
    return (
      <Screen>
        <Text style={type.title}>No campaign in progress.</Text>
        <Button label="Go to the world map" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const me = pack.parties.find((p) => p.id === state.playerPartyId)!;
  const mapWidth = Math.min(width, 720) - space(4) - 2;
  const poll = state.polls[state.polls.length - 1];
  const pollster = pack.pollsters.find((p) => p.id === poll?.pollsterId);
  const proj = projection(pack, state);
  const preview = previewDay(pack, state, stops.length ? stops : [{ regionId: state.location, activityId: 'rest' }]);
  const region = selected ? pack.regions.find((r) => r.id === selected) : null;
  const regionEst = selected ? regionEstimate(state, selected) : {};
  const profile = selected ? pack.issueProfiles.find((p) => p.regionId === selected) : undefined;
  const topIssues = profile ? Object.entries(profile.priorities).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k) : [];
  const lastLoc = stops.length ? stops[stops.length - 1]!.regionId : state.location;
  const rivalsHere = selected ? state.rivals.filter((r) => r.lastStops.includes(selected)) : [];
  const pending = state.pending ? pack.events.find((e) => e.id === state.pending!.eventId) : undefined;
  const late = state.day > pack.calendar.days - pack.calendar.gotvDays;
  const partyName = (id: string) => pack.parties.find((p) => p.id === id)?.shortName ?? id;

  const addStop = (activityId: string) => {
    if (!selected) return;
    const next = [...stops, { regionId: selected, activityId, focusIssueId: focus, travel }];
    setStops(next.slice(0, MAX_STOPS));
  };

  const runDay = () => {
    if (dispatch({ type: 'planDay', stops })) {
      setStops([]);
      setSelected(null);
      setFocus(undefined);
    }
  };

  return (
    <Screen>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space(1) }}>
        <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="World map">
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>‹ World</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Text style={[type.label, { color: me.colour }]}>{me.shortName}</Text>
      </View>
      <Text style={type.display}>{state.nominee.name}</Text>
      <Text style={[type.small, { marginBottom: space(1.5) }]}>
        {state.phase === 'pollingDay' || state.phase === 'finished' || state.phase === 'coalition'
          ? 'The campaign is over.'
          : `Day ${state.day} of ${pack.calendar.days} · ${pack.calendar.days - state.day + 1} days to polling day${late ? ' · Final push' : ''}`}
      </Text>

      {/* Meters */}
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
        <Meter label="Momentum" value={state.meters.momentum + 20} max={40} display={`${state.meters.momentum >= 0 ? '+' : ''}${state.meters.momentum.toFixed(1)}`} colour={state.meters.momentum >= 0 ? colors.good : colors.bad} />
        <Meter label="Funds" value={state.meters.funds} max={1500} display={`${state.meters.funds}k`} colour={colors.gold} />
        <Meter label="Energy" value={state.meters.energy} colour={state.meters.energy < 35 ? colors.bad : colors.cyan} />
        <Meter label="Unity" value={state.meters.unity} colour={colors.cyan} />
        <Meter label="Credibility" value={state.meters.credibility} colour={colors.cyan} />
      </Card>

      {/* Phase banners */}
      {state.phase === 'awaitingDebate' ? (
        <Card accent>
          <Text style={[type.label, { color: colors.goldText }]}>Tonight</Text>
          <Text style={[type.title, { marginVertical: 4 }]}>Televised debate</Text>
          <Text style={type.small}>The whole country is watching. Read your rival, pick your answers.</Text>
          <Button label="Walk on stage" onPress={() => router.push('/campaign/debate')} />
        </Card>
      ) : null}
      {state.phase === 'pollingDay' || state.phase === 'coalition' || state.phase === 'finished' ? (
        <Card accent>
          <Text style={[type.label, { color: colors.goldText }]}>{state.phase === 'pollingDay' ? 'Polling day' : 'Results'}</Text>
          <Text style={[type.title, { marginVertical: 4 }]}>{state.phase === 'pollingDay' ? 'The polls are open' : state.result?.headline}</Text>
          <Button label={state.phase === 'pollingDay' ? 'Go to Election Night' : 'See the results'} onPress={() => router.push('/campaign/results')} />
        </Card>
      ) : null}

      {/* Alliance talks */}
      {state.phase === 'campaign' && allianceOptions(pack, state).length ? (
        <Card accent>
          <Text style={[type.label, { color: colors.goldText }]}>Alliance talks · until day {pack.allianceTalks?.toDay}</Text>
          <Text style={[type.title, { marginVertical: 4 }]}>Unite the opposition?</Text>
          <Text style={[type.small, { marginBottom: space(1) }]}>
            Ask one party to stand down and endorse you. If talks succeed, about {Math.round((pack.allianceTalks?.transfer ?? 0) * 100)}% of its supporters follow you and it stops campaigning. If they fail, your party's unity and momentum suffer. You only get one attempt.
          </Text>
          {allianceOptions(pack, state).map((o) => (
            <Button
              key={o.partyId}
              kind="secondary"
              label={`Talk to ${partyName(o.partyId)} (${(o.partnerShare * 100).toFixed(1)}%) · ${Math.round(o.chance * 100)}% chance`}
              onPress={() => dispatch({ type: 'proposeAlliance', partnerId: o.partyId })}
            />
          ))}
        </Card>
      ) : null}
      {state.alliance && state.alliance.day === state.day ? (
        <Card style={{ borderColor: state.alliance.success ? colors.good : colors.bad }}>
          <Text style={type.heading}>
            {state.alliance.success ? `The ${partyName(state.alliance.partnerId)} has endorsed you` : `Talks with the ${partyName(state.alliance.partnerId)} collapsed`}
          </Text>
        </Card>
      ) : null}

      {/* Polls */}
      {poll ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={type.label}>Latest national poll</Text>
            <Text style={type.small}>±{(poll.marginOfError * 100).toFixed(1)} pts</Text>
          </View>
          <Text style={[type.small, { marginBottom: space(1) }]}>{pollster?.name} (fictional pollster), day {poll.day}</Text>
          {Object.entries(poll.national)
            .filter(([, v]) => v >= 0.01)
            .sort((a, b) => b[1] - a[1])
            .map(([p, v]) => {
              const party = pack.parties.find((x) => x.id === p);
              return (
                <View key={p} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 3 }}>
                  <Text style={[type.small, { width: 92, color: p === state.playerPartyId ? colors.text : colors.textMuted }]}>{party?.shortName}</Text>
                  <View style={{ flex: 1, height: 10, backgroundColor: colors.surfaceRaised, borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ width: `${v * 100}%`, height: 10, backgroundColor: party?.colour ?? colors.textFaint }} />
                  </View>
                  <Text style={[type.small, { width: 54, textAlign: 'right', color: colors.text }]}>{pct(v)}</Text>
                </View>
              );
            })}
          <Text style={[type.small, { marginTop: 4 }]}>Undecided {pct(poll.undecided)}</Text>
        </Card>
      ) : null}

      {/* Map */}
      <Card style={{ padding: space(1) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: space(1) }}>
          <Text style={type.label}>{pack.winRule.type === 'presidentialSpread' ? 'States led (internal)' : 'Internal projection'}</Text>
          <Text style={type.small}>
            {Object.entries(proj)
              .sort((a, b) => b[1] - a[1])
              .map(([p, v]) => `${partyName(p)} ${v}`)
              .join(' · ')}{' '}
            · {pack.electionNight.targetLabel}
          </Text>
        </View>
        <TileMap pack={pack} tiles={tiles} selected={selected} onSelect={state.phase === 'campaign' ? setSelected : undefined} width={mapWidth} />
        {pack.winRule.type === 'presidentialSpread' ? (
          <Text style={[type.small, { marginTop: space(1), paddingHorizontal: 4, color: colors.text }]}>
            Your estimated {Math.round(pack.winRule.minShare * 100)}% states: {spreadEstimate(pack, state, state.playerPartyId)} of {pack.winRule.requiredUnits} needed
            {' · '}
            {state.rivals
              .slice(0, 2)
              .map((r) => `${partyName(r.partyId)} ${spreadEstimate(pack, state, r.partyId)}`)
              .join(' · ')}
          </Text>
        ) : null}
        <Text style={[type.small, { marginTop: space(1), paddingHorizontal: 4 }]}>
          Bright tiles are safe leads; muted tiles are close races. You are in {pack.regions.find((r) => r.id === state.location)?.name}.
          {state.phase === 'campaign' ? ' Tap a region to plan a stop.' : ''}
        </Text>
      </Card>

      {/* Region panel / activity picker */}
      {region && state.phase === 'campaign' ? (
        <Card accent>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={type.title}>{region.name}</Text>
            <Text style={[type.heading, { color: colors.goldText }]}>{region.stake}</Text>
          </View>
          <Text style={type.small}>
            {Object.entries(regionEst)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([p, v]) => `${partyName(p)} ${pct(v)}`)
              .join(' · ')}
            {' · '}Name recognition {Math.round(state.regions[region.id]!.recognition * 100)}%
          </Text>
          {rivalsHere.length ? (
            <Text style={[type.small, { color: colors.warn }]}>
              {rivalsHere.map((r) => r.nominee.name).join(', ')} campaigned here yesterday.
            </Text>
          ) : null}

          <Text style={[type.label, { marginTop: space(1.5) }]}>Talk about (top local issues first)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {[...topIssues, ...pack.issues.map((i) => i.id).filter((i) => !topIssues.includes(i))].slice(0, 6).map((iid) => (
              <Chip key={iid} label={`${topIssues.includes(iid) ? '★ ' : ''}${pack.issues.find((i) => i.id === iid)?.name}`} selected={focus === iid} onPress={() => setFocus(focus === iid ? undefined : iid)} />
            ))}
          </View>

          <Text style={[type.label, { marginTop: space(1) }]}>Travel from {pack.regions.find((r) => r.id === lastLoc)?.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {(['road', 'air'] as const).map((m) => (
              <Chip
                key={m}
                label={`${m === 'road' ? 'Road' : 'Fly'} · ${travelHours(pack, lastLoc, region.id, m).toFixed(1)}h · ${Math.round(travelCost(pack, lastLoc, region.id, m))}k`}
                selected={travel === m}
                onPress={() => setTravel(m)}
              />
            ))}
          </View>

          <Text style={[type.label, { marginTop: space(1), marginBottom: 6 }]}>Choose an activity</Text>
          {pack.activities.map((a) => {
            const disabled = stops.length >= MAX_STOPS;
            return (
              <Pressable
                key={a.id}
                disabled={disabled}
                onPress={() => addStop(a.id)}
                accessibilityRole="button"
                accessibilityLabel={`${a.name}. ${a.hours} hours, ${a.energy} energy, ${a.funds}k.`}
                style={({ pressed }) => ({
                  padding: 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                  marginBottom: 6,
                  opacity: disabled ? 0.4 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.body, { fontWeight: '700' }]}>{a.name}</Text>
                  <Text style={type.small}>
                    {a.hours}h · {a.energy}⚡ · {a.funds}k{a.volunteers ? ` · ${a.volunteers} vol.` : ''}
                  </Text>
                </View>
                <Text style={type.small}>
                  {a.description}
                  {a.kind === 'gotv' && !late ? ' (Only 30% effective before the final push.)' : ''}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      {/* Day plan */}
      {state.phase === 'campaign' ? (
        <Card>
          <Text style={type.label}>Today's plan ({stops.length}/{MAX_STOPS} stops)</Text>
          {stops.length === 0 ? <Text style={[type.small, { marginVertical: 6 }]}>No stops yet. Tap a region on the map.</Text> : null}
          {stops.map((s, i) => {
            const a = pack.activities.find((x) => x.id === s.activityId);
            const r = pack.regions.find((x) => x.id === s.regionId);
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={[type.heading, { color: colors.goldText, width: 24 }]}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>
                    {a?.name} · {r?.name}
                  </Text>
                  <Text style={type.small}>
                    {s.travel === 'air' ? 'Fly' : 'Road'}
                    {s.focusIssueId ? ` · on ${pack.issues.find((x) => x.id === s.focusIssueId)?.name}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => setStops(stops.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Remove stop ${i + 1}`}>
                  <Text style={{ color: colors.textMuted, fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
                </Pressable>
              </View>
            );
          })}
          {stops.length ? (
            <Text style={[type.small, { marginTop: 4, color: preview.valid ? colors.textMuted : colors.bad }]}>
              {preview.hours}h of {pack.calendar.hoursPerDay}h · {preview.funds}k funds · {preview.energy} energy
              {preview.valid ? '' : ` · ${preview.problems.join(' ')}`}
            </Text>
          ) : null}
          <Button label="Run the day" disabled={!stops.length || !preview.valid} onPress={runDay} />
        </Card>
      ) : null}

      {/* News */}
      {state.news.length ? (
        <Card>
          <Text style={[type.label, { marginBottom: 6 }]}>Headlines</Text>
          {state.news
            .slice(-6)
            .reverse()
            .map((n, i) => (
              <View key={i} style={{ paddingVertical: 6, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: colors.border }}>
                <Text style={[type.body, { color: n.tone === 'good' ? colors.good : n.tone === 'bad' ? colors.bad : colors.text }]}>{n.headline}</Text>
                <Text style={type.small}>
                  {pack.mediaOutlets.find((o) => o.id === n.outletId)?.name} · day {n.day}
                </Text>
              </View>
            ))}
        </Card>
      ) : null}

      <Button
        label="Abandon campaign"
        kind="ghost"
        onPress={() => {
          abandon();
          router.replace('/');
        }}
      />

      {/* Event decision */}
      <Modal visible={state.phase === 'awaitingEvent' && !!pending} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(3,6,15,0.85)', justifyContent: 'center', padding: space(2) }}>
          <View style={{ maxWidth: 560, width: '100%', alignSelf: 'center' }}>
            <Card accent>
              <Text style={[type.label, { color: colors.goldText }]}>Decision · {pack.regions.find((r) => r.id === state.pending?.regionId)?.name}</Text>
              <Text style={[type.title, { marginVertical: 6 }]}>{pending?.title}</Text>
              <Text style={[type.body, { marginBottom: space(1.5) }]}>{pending?.body}</Text>
              {pending?.choices.map((c) => (
                <Button key={c.id} testID="event-choice" label={c.label} kind="secondary" onPress={() => dispatch({ type: 'resolveEvent', choiceId: c.id })} />
              ))}
            </Card>
          </View>
        </View>
      </Modal>

      {/* Day report */}
      <Modal visible={!!report && state.phase !== 'awaitingEvent'} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(3,6,15,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center', maxHeight: '85%' }}>
            <Card style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }}>
              <ScrollView>
                <Text style={[type.label, { color: colors.goldText }]}>Evening news · day {report?.day}</Text>
                <Text style={[type.title, { marginVertical: 6 }]}>
                  {report && report.nationalDelta >= 0 ? 'A good day on the trail' : 'A tough day on the trail'}
                </Text>
                <Text style={[type.small, { marginBottom: space(1) }]}>
                  National support {report && report.nationalDelta >= 0 ? '+' : ''}
                  {report ? (report.nationalDelta * 100).toFixed(2) : 0} pts
                </Text>
                {report?.debate ? <Text style={type.body}>Debate: you {report.debate.verdict === 'draw' ? 'drew' : report.debate.verdict}.</Text> : null}
                {report?.stops.map((s, i) => {
                  const a = pack.activities.find((x) => x.id === s.activityId);
                  const label = { great: 'Huge success', normal: 'Went well', poor: 'Flat', incident: 'Went wrong', skipped: 'Skipped' }[s.tier];
                  return (
                    <View key={i} style={{ marginVertical: 6 }}>
                      <Text style={[type.body, { fontWeight: '700' }]}>
                        {a?.name} · {pack.regions.find((r) => r.id === s.regionId)?.name}
                      </Text>
                      <Text style={[type.small, { color: s.tier === 'great' ? colors.good : s.tier === 'incident' || s.tier === 'skipped' ? colors.bad : colors.textMuted }]}>
                        {label} · {s.note} · {s.supportDelta >= 0 ? '+' : ''}
                        {(s.supportDelta * 100).toFixed(2)} pts locally
                      </Text>
                    </View>
                  );
                })}
                {report?.event ? <Text style={[type.small, { marginTop: 6 }]}>Decision: {report.event.outcome}</Text> : null}
                {report?.rivalStops.length ? (
                  <Text style={[type.small, { marginTop: space(1) }]}>
                    Rivals:{' '}
                    {report.rivalStops
                      .map((r) => `${state.rivals.find((x) => x.partyId === r.partyId)?.nominee.name} (${partyName(r.partyId)}) in ${pack.regions.find((x) => x.id === r.regionId)?.name}`)
                      .join('; ')}
                  </Text>
                ) : null}
                <Button label="Next day" onPress={() => setReport(null)} />
              </ScrollView>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Errors */}
      <Modal visible={!!error} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(3,6,15,0.8)', justifyContent: 'center', padding: space(2) }}>
          <Card style={{ maxWidth: 480, alignSelf: 'center' }}>
            <Text style={type.heading}>That plan will not work</Text>
            <Text style={[type.body, { marginVertical: space(1) }]}>{error}</Text>
            <Button label="OK" onPress={clearError} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

export default function CampaignHQ() {
  const packId = useGame((s) => s.pack?.id);
  return (
    <CountryTheme countryId={packId}>
      <CampaignHQInner />
    </CountryTheme>
  );
}
