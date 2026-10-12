/**
 * Écran titre et menu principal.
 */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatPlaytime } from '../engine/summary';
import type { SlotInfo } from '../persistence/saves';
import { useStore } from '../store/GameStore';
import { Emblem, Wordmark } from '../ui/art/Logo';
import { Button, FadeIn, Panel, Screen } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { colors, fonts, space, type, NATIVE_DRIVER } from '../ui/theme';

export function TitleScreen() {
  const { saves, model, loadGame, openSaves, go, reduceMotion } = useStore();
  const [slots, setSlots] = useState<SlotInfo[] | null>(saves ? null : []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let alive = true;
    saves?.listSlots().then((s) => alive && setSlots(s)).catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [saves]);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }));
    loop.start();
    return () => loop.stop();
  }, [spin, reduceMotion]);

  const playable = (slots ?? []).filter((s) => s.status === 'ok' && !s.summary?.ended);
  const last = playable.find((s) => s.slot === model.settings.lastSlot) ?? [...playable].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];

  const onContinue = async () => {
    if (!last) return;
    setLoading(true);
    const res = await loadGame(last.slot);
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Chargement impossible.');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <FadeIn from={0}>
          <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
            <Emblem size={176} />
          </Animated.View>
        </FadeIn>
        <FadeIn delay={200}>
          <Text style={styles.pre}>Le Labyrinthe</Text>
          <Text style={styles.title} accessibilityRole="header">
            de la Destinée
          </Text>
          <View style={{ alignItems: 'center', marginVertical: space.md }}>
            <Wordmark width={240} />
          </View>
          <Text style={styles.tag}>Valombre, quatorze mois après la Grande Fièvre.{'\n'}Sept jours pour atteindre la barge.</Text>
        </FadeIn>

        <FadeIn delay={420} style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.xl }}>
          {last && last.summary && (
            <Panel tone="raised" style={{ padding: space.md, marginBottom: space.xs }}>
              <Text style={[type.label, { color: colors.rustBright }]}>Dernière partie · emplacement {last.slot}</Text>
              <Text style={type.ui}>
                {last.summary.name} · {last.summary.profile} · niv. {last.summary.level}
              </Text>
              <Text style={type.uiSmall}>
                {last.summary.chapterTitle} — {last.summary.sceneTitle} · {formatPlaytime(last.summary.playtimeMs)}
              </Text>
            </Panel>
          )}
          {last && <Button label="Continuer" icon="chevron" onPress={onContinue} loading={loading} />}
          <Button label="Nouvelle partie" icon="plus" variant={last ? 'secondary' : 'primary'} onPress={() => openSaves('new')} />
          <Button label="Charger une partie" icon="save" variant="secondary" onPress={() => openSaves('load')} disabled={!slots?.some((s) => s.status !== 'empty')} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Paramètres" icon="gear" variant="ghost" style={{ flex: 1 }} onPress={() => go('settings')} />
            <Button label="Maquettes" icon="grid" variant="ghost" style={{ flex: 1 }} onPress={() => go('gallery')} />
          </View>
          {error && <Text style={[type.uiSmall, { color: colors.rustBright, textAlign: 'center' }]}>{error}</Text>}
        </FadeIn>

        <View style={styles.footer}>
          <Icon name="lock" size={12} color={colors.textFaint} />
          <Text style={styles.footerText}>Hors ligne · sans compte · aucune donnée collectée</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxl },
  pre: { fontFamily: fonts.uiBold, fontSize: 16, letterSpacing: 6, textTransform: 'uppercase', color: colors.textDim, textAlign: 'center', marginTop: space.lg },
  title: { fontFamily: fonts.title, fontSize: 38, lineHeight: 44, color: colors.paper, textAlign: 'center' },
  tag: { fontFamily: fonts.bodyItalic, fontSize: 16, lineHeight: 23, color: colors.textDim, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xl },
  footerText: { fontFamily: fonts.ui, fontSize: 12, color: colors.textFaint, letterSpacing: 0.5 },
});
