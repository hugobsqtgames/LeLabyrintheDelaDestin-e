/**
 * Carte locale stylisée : les lieux se révèlent à mesure qu'on les découvre
 * et conservent les changements du monde (cache fouillée, refuge brûlé…).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { GameState, LocationDef } from '../../engine/types';
import { REGIONS } from '../../content/world';
import { useStore } from '../../store/GameStore';
import { Badge, Label, Panel } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, radius, space, type } from '../../ui/theme';

const DANGER = ['', 'Calme', 'Risqué', 'Mortel'];
const DANGER_COLOR = ['', colors.mossBright, colors.amber, colors.blood];

function RegionDecor({ region }: { region: string }) {
  switch (region) {
    case 'Port fluvial':
    case 'Écluse de Morvan':
      return <Path d="M0 82 C 25 70, 45 92, 70 80 S 100 70, 100 74 L100 100 L0 100 Z" fill="#1A2A2E" />;
    case 'Les Carrières':
      return (
        <G stroke={colors.lineStrong} strokeWidth={0.4} fill="none">
          <Path d="M5 10 Q30 30 20 60 T40 95" />
          <Path d="M95 15 Q70 40 80 70" />
        </G>
      );
    default:
      return (
        <G stroke={colors.line} strokeWidth={0.8}>
          <Line x1={0} y1={45} x2={100} y2={40} />
          <Line x1={50} y1={0} x2={44} y2={100} />
          <Line x1={0} y1={75} x2={100} y2={68} />
        </G>
      );
  }
}

export function MapView({ game }: { game: GameState }) {
  const { content } = useStore();
  const current = content.scenes[game.currentScene]?.location;
  const currentRegion = current ? content.locations[current]?.region : REGIONS[0];
  const knownRegions = REGIONS.filter((r) => game.discovered.some((l) => content.locations[l]?.region === r));
  const [region, setRegion] = useState(currentRegion ?? REGIONS[0]);
  const [selected, setSelected] = useState<string | null>(current ?? null);
  const locations = useMemo(
    () => Object.values(content.locations).filter((l) => l.region === region && game.discovered.includes(l.id)),
    [content, region, game.discovered],
  );
  const total = Object.values(content.locations).filter((l) => l.region === region).length;
  const sel: LocationDef | null = selected && game.discovered.includes(selected) ? content.locations[selected] : null;
  const notes = sel ? (game.world[sel.id] ?? []).map((k) => sel.changes?.[k]).filter(Boolean) : [];

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, marginBottom: space.md }}>
        {REGIONS.map((r) => {
          const known = knownRegions.includes(r);
          const active = region === r;
          return (
            <Pressable
              key={r}
              disabled={!known}
              onPress={() => setRegion(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !known }}
              style={[styles.chip, active && styles.chipActive, !known && { opacity: 0.35 }]}
            >
              <Text style={[styles.chipText, active && { color: colors.paper }]}>{known ? r : '???'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.mapFrame}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Rect x={0} y={0} width={100} height={100} fill={colors.panel} />
          {Array.from({ length: 9 }).map((_, i) => (
            <G key={i}>
              <Line x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={100} stroke={colors.bg} strokeWidth={0.3} />
              <Line x1={0} y1={(i + 1) * 10} x2={100} y2={(i + 1) * 10} stroke={colors.bg} strokeWidth={0.3} />
            </G>
          ))}
          <RegionDecor region={region} />
          {locations.slice(1).map((l, i) => (
            <Line key={l.id} x1={locations[i].x} y1={locations[i].y} x2={l.x} y2={l.y} stroke={colors.lineStrong} strokeWidth={0.6} strokeDasharray="1.5 1.5" />
          ))}
          {locations.map((l) => {
            const here = l.id === current;
            const isSel = l.id === selected;
            return (
              <G key={l.id} onPress={() => setSelected(l.id)}>
                {here && <Circle cx={l.x} cy={l.y} r={6} fill={colors.rust} opacity={0.25} />}
                <Circle cx={l.x} cy={l.y} r={isSel ? 3.4 : 2.6} fill={here ? colors.rustBright : colors.paper} stroke={isSel ? colors.amber : colors.bg} strokeWidth={0.8} />
                <SvgText
                  x={l.x < 22 ? l.x - 3 : l.x > 78 ? l.x + 3 : l.x}
                  y={l.y + 7}
                  fontSize={3.6}
                  fill={colors.textDim}
                  textAnchor={l.x < 22 ? 'start' : l.x > 78 ? 'end' : 'middle'}
                  fontFamily={fonts.ui}
                >
                  {l.name.length > 22 ? `${l.name.slice(0, 21)}…` : l.name}
                </SvgText>
              </G>
            );
          })}
          <Rect x={0.5} y={0.5} width={99} height={99} fill="none" stroke={colors.lineStrong} strokeWidth={0.6} />
          <SvgText x={96} y={8} fontSize={4} fill={colors.textFaint} textAnchor="end" fontFamily={fonts.title}>
            N ↑
          </SvgText>
        </Svg>
      </View>
      <Text style={[type.uiSmall, { marginTop: 6 }]}>
        {locations.length}/{total} lieux découverts dans cette région.
      </Text>

      <View style={{ gap: space.xs, marginTop: space.md }}>
        {locations.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => setSelected(l.id)}
            accessibilityRole="button"
            style={[styles.locRow, selected === l.id && { borderColor: colors.amber }]}
          >
            <Icon name={l.id === current ? 'target' : 'map'} size={16} color={l.id === current ? colors.rustBright : colors.textDim} />
            <Text style={[type.ui, { flex: 1 }]}>{l.name}</Text>
            {(game.world[l.id]?.length ?? 0) > 0 && <Icon name="quest" size={14} color={colors.amber} />}
            <Badge label={DANGER[l.danger]} color={DANGER_COLOR[l.danger]} />
          </Pressable>
        ))}
      </View>

      {sel && (
        <Panel tone="paper" taped style={{ marginTop: space.lg }}>
          <Text style={[type.h2, { color: colors.paperInk }]}>{sel.name}</Text>
          <Label color={colors.rustDeep}>
            {sel.region} · {DANGER[sel.danger]}
            {sel.id === current ? ' · vous êtes ici' : ''}
          </Label>
          <Text style={[type.bodySmall, { color: colors.paperInk, marginTop: space.sm }]}>{sel.description}</Text>
          {notes.map((n) => (
            <Text key={n} style={[type.bodySmall, { color: colors.rustDeep, fontFamily: fonts.bodyItalic }]}>
              ✎ {n}
            </Text>
          ))}
        </Panel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mapFrame: { aspectRatio: 1, width: '100%', borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.lineStrong },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.rustDeep, borderColor: colors.rust },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
});
