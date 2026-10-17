/**
 * Carte locale : les lieux se révèlent à mesure qu'on les découvre, reliés
 * par les chemins réellement praticables. Un chemin vers un lieu encore
 * inconnu apparaît en pointillé qui s'efface. Les changements du monde
 * (cache fouillée, refuge brûlé…) restent notés.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { GameState, LocationDef } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Glass } from '../../ui/components/Glass';
import { useChrome } from '../../ui/components/Hud';
import { Badge, Label, Panel, PressableCard } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_UI, NATIVE_DRIVER, radius, space, type } from '../../ui/theme';

const DANGER_COLOR = ['', colors.mossBright, colors.amber, colors.blood];

/** Couleur du chemin parcouru : la lueur chaude d'une lampe-tempête. */
const ROUTE_COLOR = colors.amber;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

type Pt = { x: number; y: number };
type Seg = { p1: Pt; c1: Pt; c2: Pt; p2: Pt };

function bezierAt(s: Seg, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * s.p1.x + b * s.c1.x + c * s.c2.x + d * s.p2.x, y: a * s.p1.y + b * s.c1.y + c * s.c2.y + d * s.p2.y };
}

/**
 * Courbe lissée (Catmull-Rom → Bézier) passant par chaque étape, avec sa
 * longueur (pour l'animation du tracé) et une flèche au milieu des segments
 * assez longs pour la porter.
 */
function buildRoute(points: Pt[]) {
  const segs: Seg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    segs.push({ p1, p2, c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 } });
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  const d = segs.length
    ? `M${r(segs[0].p1.x)} ${r(segs[0].p1.y)}` + segs.map((s) => ` C${r(s.c1.x)} ${r(s.c1.y)} ${r(s.c2.x)} ${r(s.c2.y)} ${r(s.p2.x)} ${r(s.p2.y)}`).join('')
    : '';
  let length = 0;
  const arrows: { x: number; y: number; angle: number; at: number }[] = [];
  for (const s of segs) {
    let prev = s.p1;
    let segLen = 0;
    for (let k = 1; k <= 16; k++) {
      const q = bezierAt(s, k / 16);
      segLen += Math.hypot(q.x - prev.x, q.y - prev.y);
      prev = q;
    }
    const m = bezierAt(s, 0.5);
    // Allers-retours : une seule flèche par endroit, pour rester lisible.
    if (segLen > 12 && !arrows.some((a) => Math.hypot(a.x - m.x, a.y - m.y) < 6)) {
      const a = bezierAt(s, 0.46);
      const b = bezierAt(s, 0.54);
      arrows.push({ x: m.x, y: m.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, at: length + segLen / 2 });
    }
    length += segLen;
  }
  return { d, length: Math.max(1, length), arrows };
}

function RegionDecor({ index }: { index: number }) {
  switch (index) {
    case 2:
      // Faubourgs : faisceau de voies ferrées.
      return (
        <G stroke="rgba(255,248,240,0.07)" strokeWidth={1.5}>
          <Line x1={0} y1={62} x2={100} y2={52} />
          <Line x1={0} y1={66} x2={100} y2={56} />
          <Line x1={0} y1={78} x2={100} y2={64} />
          <Line x1={0} y1={82} x2={100} y2={68} />
        </G>
      );
    case 3:
    case 4:
    case 5:
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

function labelProps(l: LocationDef) {
  return {
    x: l.x < 22 ? l.x - 3 : l.x > 78 ? l.x + 3 : l.x,
    y: l.y + 7.5,
    fontSize: 3.4,
    textAnchor: (l.x < 22 ? 'start' : l.x > 78 ? 'end' : 'middle') as 'start' | 'end' | 'middle',
    fontFamily: fonts.uiBold,
  };
}

function labelText(l: LocationDef) {
  return l.name.length > 22 ? `${l.name.slice(0, 21)}…` : l.name;
}

export function MapView({ game }: { game: GameState }) {
  const { content, reduceMotion } = useStore();
  const t = useT();
  const chrome = useChrome();
  const regions = content.regions;
  const current = content.scenes[game.currentScene]?.location;
  const currentRegion = current ? content.locations[current]?.region : regions[0];
  const knownRegions = regions.filter((r) => game.discovered.some((l) => content.locations[l]?.region === r));
  const [picked, setRegion] = useState(currentRegion ?? regions[0]);
  // La région choisie peut devenir caduque (contenu rechargé dans une autre langue) : on retombe sur celle du lieu actuel.
  const region = regions.includes(picked) ? picked : (currentRegion ?? regions[0]);
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
  // Chemin réellement parcouru : lieux des scènes visitées, dans l'ordre, sans doublon consécutif.
  const routeIds = useMemo(() => {
    const ids: string[] = [];
    const push = (id: string | undefined) => {
      if (id && known.has(id) && content.locations[id]?.region === region && ids[ids.length - 1] !== id) ids.push(id);
    };
    for (const sceneId of game.visitedScenes) push(content.scenes[sceneId]?.location);
    push(current);
    return ids;
  }, [game.visitedScenes, content, region, known, current]);
  const route = useMemo(() => buildRoute(routeIds.map((id) => content.locations[id])), [routeIds, content]);
  const routeKey = `${region}|${routeIds.join('>')}`;
  const [draw] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      draw.setValue(1);
      return;
    }
    draw.setValue(0);
    const a = Animated.timing(draw, { toValue: 1, duration: Math.min(2200, 700 + route.length * 6), delay: 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [routeKey, reduceMotion, draw, route.length]);
  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [route.length, 0] });
  const hereLoc = current && known.has(current) && content.locations[current]?.region === region ? content.locations[current] : null;
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
              accessibilityLabel={isKnown ? r : t('map.regionLocked')}
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
          {routeIds.length > 1 && (
            <G pointerEvents="none">
              <AnimatedPath d={route.d} fill="none" stroke={ROUTE_COLOR} strokeOpacity={0.16} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${route.length} ${route.length}`} strokeDashoffset={dashOffset} />
              <AnimatedPath d={route.d} fill="none" stroke={ROUTE_COLOR} strokeOpacity={0.3} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${route.length} ${route.length}`} strokeDashoffset={dashOffset} />
              <AnimatedPath d={route.d} fill="none" stroke={ROUTE_COLOR} strokeWidth={0.75} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${route.length} ${route.length}`} strokeDashoffset={dashOffset} />
              {route.arrows.map((a, i) => (
                <AnimatedG key={i} opacity={draw.interpolate({ inputRange: [0, Math.min(0.99, a.at / route.length), Math.min(1, a.at / route.length + 0.01)], outputRange: [0, 0, 1] })}>
                  <G transform={`translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${a.angle.toFixed(1)})`}>
                    <Path d="M-1.1 -1.3 L0.9 0 L-1.1 1.3" fill="none" stroke={colors.bg} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M-1.1 -1.3 L0.9 0 L-1.1 1.3" fill="none" stroke={ROUTE_COLOR} strokeWidth={0.7} strokeLinecap="round" strokeLinejoin="round" />
                  </G>
                </AnimatedG>
              ))}
            </G>
          )}
          {locations.map((l) => {
            const here = l.id === current;
            const isSel = l.id === selected;
            return (
              <G key={l.id} onPress={() => setSelected(l.id)}>
                {here && <Circle cx={l.x} cy={l.y} r={9} fill="url(#here)" />}
                {isSel && <Circle cx={l.x} cy={l.y} r={4.6} fill="none" stroke={colors.text} strokeWidth={0.5} />}
                <Circle cx={l.x} cy={l.y} r={2.6} fill={here ? colors.rust : colors.text} />
                <Circle cx={l.x} cy={l.y} r={1} fill={colors.bg} opacity={here ? 0 : 0.8} />
              </G>
            );
          })}
          {/* Étiquettes au-dessus des lieux et du chemin, sur un halo sombre qui les garde lisibles. */}
          {locations.map((l) => (
            <G key={`label-${l.id}`} onPress={() => setSelected(l.id)}>
              <SvgText {...labelProps(l)} stroke={colors.bg} strokeWidth={1.1} strokeOpacity={0.85} strokeLinejoin="round" fill={colors.bg}>
                {labelText(l)}
              </SvgText>
              <SvgText {...labelProps(l)} fill={l.id === selected || l.id === current ? colors.text : colors.textDim}>
                {labelText(l)}
              </SvgText>
            </G>
          ))}
          <SvgText x={95} y={8} fontSize={3.4} fill={colors.textFaint} textAnchor="end" fontFamily={fonts.mono}>
            N ↑
          </SvgText>
          <Rect x={0} y={0} width={0} height={0} />
        </Svg>
        {hereLoc && <HerePulse x={hereLoc.x} y={hereLoc.y} still={reduceMotion} />}
      </Glass>
      <View style={styles.legend}>
        <Text style={type.label}>{t('map.discovered', { n: locations.length, total })}</Text>
        {routeIds.length > 1 && (
          <View style={styles.legendItem} accessible accessibilityLabel={`${t('map.route')}. ${routeIds.map((id) => content.locations[id]?.name).join(', ')}`}>
            <View style={styles.legendSwatch} />
            <Text style={[type.label, { color: ROUTE_COLOR }]}>{t('map.route')}</Text>
          </View>
        )}
      </View>

      {sel && (
        <Panel tone="paper" taped style={{ marginTop: space.lg }}>
          <Label color="rgba(27,23,20,0.72)">
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

/** Halo qui bat doucement sur le lieu actuel (fixe si les mouvements sont réduits). */
function HerePulse({ x, y, still }: { x: number; y: number; still: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) {
      v.setValue(0.35);
      return;
    }
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }));
    loop.start();
    return () => loop.stop();
  }, [still, v]);
  return (
    <View pointerEvents="none" style={[styles.pulseAnchor, { left: `${x}%`, top: `${y}%` }]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.6] }) }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pulseAnchor: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.rustBright },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 18, height: 3, borderRadius: 2, backgroundColor: ROUTE_COLOR, shadowColor: ROUTE_COLOR, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  mapFrame: { aspectRatio: 1, width: '100%' },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.md + 2, paddingVertical: 8, minHeight: 44, justifyContent: 'center', backgroundColor: 'rgba(255,248,240,0.06)' },
  chipActive: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13.5, color: colors.textDim },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
});
