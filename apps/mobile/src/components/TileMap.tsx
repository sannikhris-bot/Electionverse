import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { CountryPack } from '@electionverse/engine';
import { colors, fade } from '@/theme';

export interface TileInfo {
  /** Leading party id and its margin over the runner-up (0-1). */
  leader?: string;
  margin?: number;
  /** Optional ring colour (e.g. a planned stop). */
  ring?: string;
  /** Small badge text drawn in the tile corner (e.g. stop number). */
  badge?: string;
  /** Hidden until revealed (Election Night). */
  hidden?: boolean;
}

/**
 * Tile-grid cartogram: every region is one equal tile placed on its pack
 * coordinates. Colour = leading party; strength = margin. Built from plain
 * views (not SVG) so tiles are tappable and readable by screen readers on
 * iOS, Android and web alike. The tile label and accessibility text always
 * carry the leader, so colour is never the only signal.
 */
function TileMapImpl({
  pack,
  tiles,
  selected,
  onSelect,
  width,
}: {
  pack: CountryPack;
  tiles: Record<string, TileInfo>;
  selected?: string | null;
  onSelect?: (regionId: string) => void;
  width: number;
}) {
  const { cols, rows } = useMemo(() => {
    const xs = pack.regions.map((r) => r.x);
    const ys = pack.regions.map((r) => r.y);
    return { cols: Math.max(...xs) + 1, rows: Math.max(...ys) + 1 };
  }, [pack]);
  const gap = 3;
  const size = Math.floor((width - gap * (cols - 1)) / cols);
  const height = rows * size + (rows - 1) * gap;
  const colourOf = (id?: string) => pack.parties.find((p) => p.id === id)?.colour ?? colors.surfaceRaised;
  const nameOf = (id?: string) => pack.parties.find((p) => p.id === id)?.shortName ?? 'no leader yet';

  return (
    <View style={{ width: cols * size + (cols - 1) * gap, height, alignSelf: 'center' }}>
      {pack.regions.map((r) => {
        const t = tiles[r.id] ?? {};
        const strength = t.hidden ? 1 : Math.max(0, 0.72 - Math.min(1, (t.margin ?? 0) * 6) * 0.72);
        const bg = t.hidden ? colors.surface : t.leader ? fade(colourOf(t.leader), strength) : colors.surfaceRaised;
        const isSel = selected === r.id;
        const label = `${r.name}. ${t.hidden ? 'Not yet called' : t.leader ? `${nameOf(t.leader)} ahead` : 'No leader yet'}. ${r.stake} ${pack.electionNight.unitLabel}.`;
        return (
          <Pressable
            key={r.id}
            disabled={!onSelect}
            onPress={onSelect ? () => onSelect(r.id) : undefined}
            accessibilityRole={onSelect ? 'button' : 'text'}
            accessibilityLabel={label}
            accessibilityState={{ selected: isSel }}
            style={{
              position: 'absolute',
              left: r.x * (size + gap),
              top: r.y * (size + gap),
              width: size,
              height: size,
              borderRadius: size * 0.16,
              backgroundColor: bg,
              borderWidth: isSel ? 2.5 : t.ring ? 2 : 1,
              borderColor: isSel ? colors.gold : t.ring ?? colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: Math.max(8, size * 0.3) }} numberOfLines={1}>
              {r.id.toUpperCase()}
            </Text>
            <Text style={{ color: t.hidden ? colors.textFaint : 'rgba(238,242,250,0.75)', fontSize: Math.max(7, size * 0.22) }}>{r.stake}</Text>
            {t.badge ? (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: size * 0.42,
                  height: size * 0.42,
                  borderRadius: size * 0.21,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.bg, fontWeight: '900', fontSize: Math.max(8, size * 0.26) }}>{t.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const TileMap = memo(TileMapImpl);
