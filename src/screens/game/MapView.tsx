/**
 * Carte locale : les lieux se révèlent à mesure qu'on les découvre, reliés
 * par les chemins réellement praticables. Un chemin vers un lieu encore
 * inconnu apparaît en pointillé qui s'efface. Les changements du monde
 * (cache fouillée, refuge brûlé…) restent notés.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { GameState, LocationDef } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Glass } from '../../ui/components/Glass';
import { useChrome } from '../../ui/components/Hud';
import { Badge, Label, Panel, PressableCard } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_UI, radius, space, type } from '../../ui/theme';

const DANGER_COLOR = ['', colors.mossBright, colors.amber, colors.blood];

function RegionDecor({ index }: { index: number }) {
  switch (index) {
    case 2:
    case 3:
      return <Path d="M0 82 C 25 70, 45 92, 70 80 S 100 70, 100 74 L100 100 L0 100 Z" fill="rgba(156,203,255,0.08)" />;
    case 1:
      return (
        <G stroke="rgba(255,248,240,0.08)" strokeWidth={6} fill="none" strokeLinecap="round">
          <Path d="M5 10 Q30 30 20 60 T40 95" />
          <Path d="M95 15 Q70 40 80 70" />
        </G>
      );
    default:
      return (
        <G stroke="rgba(255,248,240,0.06)" strokeWidth={3}>
          <Line x1={0} y1={45} x2={100} y2={40} />
          <Line x1={50} y1={0} x2={44} y2={100} />
          <Line x1={0} y1={75} x2={100} y2={68} />
        </G>
      );
  }
}

export function MapView({ game }: { game: GameState }) {
  const { content } = useStore();
  const t = useT();
  const chrome = useChrome();
  const regions = content.regions;
  const current = content.scenes[game.currentScene]?.location;
  const currentRegion = current ? content.locations[current]?.region : regions[0];
  const knownRegions = regions.filter((r) => game.discovered.some((l) => content.locations[l]?.region === r));
  const [region, setRegion] = useState(currentRegion ?? regions[0]);
  const [selected, setSelected] = useState<string | null>(current ?? null);
  const known = useMemo(() => new Set(game.discovered), [game.discovered]);
  const locations = useMemo(() => Object.values(content.locations).filter((l) => l.region === region && known.has(l.id)), [content, region, known]);
  const links = useMemo(
    () =>
      content.mapLinks
        .filter(([a, b]) => content.locations[a]?.region === region && (known.has(a) || known.has(b)))
        .map(([a, b]) => ({ a: content.locations[a], b: content.locations[b], open: known.has(a) && known.has(b) })),
    [content, region, known],
  );
  const total = Object.values(content.locations).filter((l) => l.region === region).length;
  const sel: LocationDef | null = selected && known.has(selected) ? content.locations[selected] : null;
  const notes = sel ? (game.world[sel.id] ?? []).map((k) => sel.changes?.[k]).filter(Boolean) : [];
  const neighbours = sel ? content.mapLinks.filter(([a, b]) => a === sel.id || b === sel.id).map(([a, b]) => (a === sel.id ? b : a)) : [];

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top + space.xs, paddingBottom: chrome.bottom }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: space.md }}>
        {regions.map((r) => {
          const isKnown = knownRegions.includes(r);
          const active = region === r;
          return (
            <Pressable
              key={r}
              disabled={!isKnown}
              onPress={() => setRegion(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !isKnown }}
              style={[styles.chip, active && styles.chipActive, !isKnown && { opacity: 0.35 }]}
            >
              <Text style={[styles.chipText, active && { color: colors.bg }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
                {isKnown ? r : '• • •'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Glass radius={radius.xl} style={styles.mapFrame}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="here" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.rust} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.rust} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id="fadeLink" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.text} stopOpacity={0.5} />
              <Stop offset="1" stopColor={colors.text} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {Array.from({ length: 19 }).map((_, i) =>
            Array.from({ length: 19 }).map((__, j) => <Circle key={`${i}-${j}`} cx={(i + 1) * 5} cy={(j + 1) * 5} r={0.22} fill="rgba(255,248,240,0.13)" />),
          )}
          <RegionDecor index={regions.indexOf(region)} />
          {links.map(({ a, b, open }) => {
            if (open) return <Line key={`${a.id}-${b.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,248,240,0.45)" strokeWidth={0.7} strokeLinecap="round" />;
            // Lien vers un lieu inconnu : un départ de chemin qui s'efface.
            const from = known.has(a.id) ? a : b;
            const to = from === a ? b : a;
            const mx = from.x + (to.x - from.x) * 0.45;
            const my = from.y + (to.y - from.y) * 0.45;
            return <Line key={`${a.id}-${b.id}`} x1={from.x} y1={from.y} x2={mx} y2={my} stroke="rgba(255,248,240,0.35)" strokeWidth={0.6} strokeDasharray="1 1.4" strokeLinecap="round" />;
          })}
          {locations.map((l) => {
            const here = l.id === current;
            const isSel = l.id === selected;
            return (
              <G key={l.id} onPress={() => setSelected(l.id)}>
                {here && <Circle cx={l.x} cy={l.y} r={9} fill="url(#here)" />}
                {isSel && <Circle cx={l.x} cy={l.y} r={4.6} fill="none" stroke={colors.text} strokeWidth={0.5} />}
                <Circle cx={l.x} cy={l.y} r={2.6} fill={here ? colors.rust : colors.text} />
                <Circle cx={l.x} cy={l.y} r={1} fill={colors.bg} opacity={here ? 0 : 0.8} />
                <SvgText
                  x={l.x < 22 ? l.x - 3 : l.x > 78 ? l.x + 3 : l.x}
                  y={l.y + 7.5}
                  fontSize={3.4}
                  fill={isSel || here ? colors.text : colors.textDim}
                  textAnchor={l.x < 22 ? 'start' : l.x > 78 ? 'end' : 'middle'}
                  fontFamily={fonts.uiBold}
                >
                  {l.name.length > 22 ? `${l.name.slice(0, 21)}…` : l.name}
                </SvgText>
              </G>
            );
          })}
          <SvgText x={95} y={8} fontSize={3.4} fill={colors.textFaint} textAnchor="end" fontFamily={fonts.mono}>
            N ↑
          </SvgText>
          <Rect x={0} y={0} width={0} height={0} />
        </Svg>
      </Glass>
      <Text style={[type.label, { marginTop: space.sm }]}>{t('map.discovered', { n: locations.length, total })}</Text>

      {sel && (
        <Panel tone="paper" taped style={{ marginTop: space.lg }}>
          <Label color="rgba(27,23,20,0.6)">
            {sel.region} · {t(`danger.${sel.danger}`)}
            {sel.id === current ? ` · ${t('map.here')}` : ''}
          </Label>
          <Text style={[type.h2, { color: colors.paperInk, marginTop: 2 }]}>{sel.name}</Text>
          <Text style={[type.bodySmall, { color: colors.paperInk, marginTop: space.sm }]}>{sel.description}</Text>
          {notes.map((n) => (
            <Text key={n} style={[type.bodySmall, { color: '#8A3A1E', fontFamily: fonts.bodyItalic }]}>
              ✎ {n}
            </Text>
          ))}
          {neighbours.length > 0 && (
            <Text style={[type.uiSmall, { color: 'rgba(27,23,20,0.7)', marginTop: space.sm }]}>
              {t('map.leadsTo', { places: neighbours.map((id) => (known.has(id) ? content.locations[id]?.name : t('map.unknown'))).join(', ') })}
            </Text>
          )}
        </Panel>
      )}

      <View style={{ gap: 6, marginTop: space.md }}>
        {locations.map((l) => (
          <PressableCard key={l.id} onPress={() => setSelected(l.id)} accessibilityRole="button" style={[styles.locRow, selected === l.id && { borderWidth: 1, borderColor: colors.text }]}>
            <Icon name={l.id === current ? 'target' : 'map'} size={16} color={l.id === current ? colors.rust : colors.textDim} />
            <Text style={[type.ui, { flex: 1 }]}>{l.name}</Text>
            {(game.world[l.id]?.length ?? 0) > 0 && <Icon name="quest" size={14} color={colors.amber} />}
            <Badge label={t(`danger.${l.danger}`)} color={DANGER_COLOR[l.danger]} />
          </PressableCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mapFrame: { aspectRatio: 1, width: '100%' },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.md + 2, paddingVertical: 8, backgroundColor: 'rgba(255,248,240,0.06)' },
  chipActive: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13.5, color: colors.textDim },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
});
