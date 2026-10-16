/**
 * Écran titre et menu principal : grande typographie éditoriale, emblème
 * qui tourne lentement dans un halo, carte « Continuer » en verre.
 */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatPlaytime } from '../engine/summary';
import { translateSaveMessage, useT } from '../i18n';
import type { SlotInfo } from '../persistence/saves';
import { useStore } from '../store/GameStore';
import { Emblem } from '../ui/art/Logo';
import { PlayerPortrait } from '../ui/art/Portraits';
import { Glass } from '../ui/components/Glass';
import { Button, FadeIn, Label, Screen } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { colors, fonts, MAX_SCALE_UI, radius, space, type, NATIVE_DRIVER } from '../ui/theme';

export function TitleScreen() {
  const { saves, model, loadGame, openSaves, go, reduceMotion, content, lang } = useStore();
  const t = useT();
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
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 90000, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }));
    loop.start();
    return () => loop.stop();
  }, [spin, reduceMotion]);

  const playable = (slots ?? []).filter((s) => s.status === 'ok' && (!s.summary?.ended || !!s.summary?.relay));
  const last = playable.find((s) => s.slot === model.settings.lastSlot) ?? [...playable].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];

  const onContinue = async () => {
    if (!last) return;
    setLoading(true);
    const res = await loadGame(last.slot);
    setLoading(false);
    if (!res.ok) setError(res.error ? translateSaveMessage(lang, res.error) : t('saves.loadFailed'));
  };

  return (
    <Screen aura="title">
      <View pointerEvents="none" style={styles.emblemWrap}>
        <Animated.View style={{ opacity: 0.9, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <Emblem size={340} />
        </Animated.View>
      </View>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <FadeIn from={0} delay={100} style={{ marginTop: 'auto' }}>
          <Label color={colors.rustBright}>{t('title.kicker')}</Label>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
            {t('title.line1')}
            {'\n'}
            <Text style={styles.titleItalic}>{t('title.line2')}</Text>
          </Text>
          <Text style={styles.tag} maxFontSizeMultiplier={MAX_SCALE_UI}>
            {t('title.tagline')}
          </Text>
        </FadeIn>

        <FadeIn delay={380} style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.xl }}>
          {last && last.summary && (
            <Pressable onPress={onContinue} accessibilityRole="button" accessibilityLabel={`${t('title.continue')} : ${last.summary.name}`} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
              <Glass radius={radius.xl} style={styles.continue} interactive>
                <PlayerPortrait profile={last.summary.profileId ?? 'guerrier'} size={58} shape="squircle" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.label, { color: colors.rustBright }]}>{t('title.lastGame', { slot: last.slot })}</Text>
                  <Text style={[type.ui, { fontFamily: fonts.uiBold, fontSize: 17 }]} numberOfLines={1}>
                    {last.summary.name} · {t('hud.level', { n: last.summary.level })}
                  </Text>
                  <Text style={[type.uiSmall, { fontSize: 12.5 }]} numberOfLines={1}>
                    {last.summary.sceneTitle} · {formatPlaytime(content, last.summary.playtimeMs)}
                  </Text>
                </View>
                <View style={styles.play}>
                  <Icon name="chevron" size={20} color={colors.bg} strokeWidth={2.6} />
                </View>
              </Glass>
            </Pressable>
          )}
          {last && <Button label={t('title.continue')} icon="chevron" onPress={onContinue} loading={loading} />}
          <Button label={t('title.new')} icon="plus" variant={last ? 'secondary' : 'primary'} onPress={() => openSaves('new')} />
          <Button label={t('title.load')} icon="save" variant="secondary" onPress={() => openSaves('load')} disabled={!slots?.some((s) => s.status !== 'empty')} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label={t('title.settings')} icon="gear" variant="ghost" style={{ flex: 1 }} onPress={() => go('settings')} />
            <Button label={t('title.mockups')} icon="grid" variant="ghost" style={{ flex: 1 }} onPress={() => go('gallery')} />
          </View>
          {error && <Text style={[type.uiSmall, { color: colors.rustBright, textAlign: 'center' }]}>{error}</Text>}
        </FadeIn>

        <View style={styles.footer}>
          <Icon name="lock" size={11} color={colors.textFaint} />
          <Text style={styles.footerText}>{t('title.offline')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emblemWrap: { position: 'absolute', top: 40, right: -110, opacity: 0.55 },
  wrap: { flexGrow: 1, paddingTop: space.xxxl, paddingBottom: space.lg },
  title: { fontFamily: fonts.title, fontSize: 64, lineHeight: 62, color: colors.text, letterSpacing: -1.5, marginTop: space.sm },
  titleItalic: { fontFamily: fonts.titleItalic, color: colors.rustBright },
  tag: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, color: colors.textDim, marginTop: space.md, maxWidth: 340 },
  continue: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.xl },
  footerText: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
});
