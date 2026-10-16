/**
 * Tutoriel d'accueil : une visite guidée en surimpression, étape par étape,
 * qui ouvre chaque onglet pendant qu'elle l'explique. Il ne modifie jamais
 * l'état de la partie (seul l'onglet affiché change). Rejouable depuis les
 * paramètres.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../i18n';
import { type Tab, useStore } from '../../store/GameStore';
import { type IconName, Icon } from '../icons';
import { colors, fonts, MAX_SCALE_UI, radius, space, type } from '../theme';
import { Glass } from './Glass';
import { Button } from './primitives';

type Target = 'none' | 'top' | 'content' | { tab: number };

interface Step {
  key: string;
  icon: IconName;
  tab?: Tab;
  target: Target;
}

export const TUTORIAL_STEPS: Step[] = [
  { key: 'welcome', icon: 'book', tab: 'story', target: 'none' },
  { key: 'story', icon: 'book', tab: 'story', target: 'content' },
  { key: 'choices', icon: 'chevron', tab: 'story', target: 'content' },
  { key: 'hud', icon: 'heart', tab: 'story', target: 'top' },
  { key: 'clock', icon: 'clock', tab: 'story', target: 'top' },
  { key: 'tabStory', icon: 'book', tab: 'story', target: { tab: 0 } },
  { key: 'tabCharacter', icon: 'person', tab: 'character', target: { tab: 1 } },
  { key: 'tabInventory', icon: 'bag', tab: 'inventory', target: { tab: 2 } },
  { key: 'tabMap', icon: 'map', tab: 'map', target: { tab: 3 } },
  { key: 'tabJournal', icon: 'journal', tab: 'quests', target: { tab: 4 } },
  { key: 'combat', icon: 'skull', tab: 'story', target: 'none' },
  { key: 'relay', icon: 'person', tab: 'story', target: 'none' },
  { key: 'end', icon: 'check', tab: 'story', target: 'none' },
];

const TAB_COUNT = 5;

export function Tutorial({ topHeight, onDone, initialStep = 0 }: { topHeight: number; onDone: () => void; initialStep?: number }) {
  const { setTab, feedback } = useStore();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialStep), TUTORIAL_STEPS.length - 1));
  const step = TUTORIAL_STEPS[index];
  const last = index === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (step.tab) setTab(step.tab);
  }, [step.tab, setTab]);

  const finish = () => {
    setTab('story');
    onDone();
  };

  // Cadre lumineux autour de la zone expliquée (géométrie du bandeau et de la barre d'onglets).
  const barHeight = 62;
  const barBottom = insets.bottom + space.sm;
  let ring: { top: number; left: number; width: number; height: number } | null = null;
  if (step.target === 'top') ring = { top: insets.top, left: space.sm, width: width - space.sm * 2, height: Math.max(60, topHeight - insets.top) };
  else if (step.target === 'content') ring = { top: topHeight + space.sm, left: space.md, width: width - space.md * 2, height: Math.max(120, height - topHeight - barHeight - barBottom - space.xl * 2) };
  else if (typeof step.target === 'object') {
    const inner = width - space.lg * 2 - 10;
    const cell = inner / TAB_COUNT;
    ring = { top: height - barBottom - barHeight, left: space.lg + 5 + cell * step.target.tab - 2, width: cell + 4, height: barHeight };
  }
  // La carte se place à l'opposé de la zone éclairée : en haut pour les onglets, en bas sinon.
  const cardPos = typeof step.target === 'object' ? { top: topHeight + space.lg } : { bottom: barBottom + barHeight + space.lg };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      {ring && <View pointerEvents="none" style={[styles.ring, ring]} />}
      <View style={[styles.cardWrap, cardPos]}>
        <Glass tone="strong" radius={radius.lg} style={styles.card}>
          <View style={styles.head}>
            <View style={styles.iconWrap}>
              <Icon name={step.icon} size={18} color={colors.rustBright} />
            </View>
            <Text style={styles.counter}>{t('tutorial.step', { n: index + 1, total: TUTORIAL_STEPS.length })}</Text>
          </View>
          <Text style={type.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
            {t(`tutorial.${step.key}.title`)}
          </Text>
          <Text style={[type.bodySmall, { color: colors.text }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
            {t(`tutorial.${step.key}.body`)}
          </Text>
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {TUTORIAL_STEPS.map((s, i) => (
              <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          <View style={styles.actions}>
            {index > 0 ? (
              <Button compact variant="ghost" label={t('tutorial.prev')} onPress={() => setIndex(index - 1)} />
            ) : (
              <Button compact variant="ghost" label={t('tutorial.skip')} onPress={finish} />
            )}
            <Button
              compact
              label={last ? t('tutorial.done') : t('tutorial.next')}
              icon={last ? 'check' : 'chevron'}
              onPress={() => {
                feedback('light');
                if (last) finish();
                else setIndex(index + 1);
              }}
            />
          </View>
          {index > 0 && !last && (
            <Pressable onPress={finish} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={[type.uiSmall, { color: colors.textDim }]}>{t('tutorial.skip')}</Text>
            </Pressable>
          )}
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(8,6,5,0.62)' },
  ring: { position: 'absolute', borderRadius: 22, borderWidth: 2, borderColor: colors.rustBright, backgroundColor: 'rgba(255,106,61,0.08)' },
  cardWrap: { position: 'absolute', left: space.lg, right: space.lg },
  card: { padding: space.lg, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,106,61,0.14)' },
  counter: { fontFamily: fonts.mono, fontSize: 11, color: colors.textDim, letterSpacing: 0.6 },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: space.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { width: 16, backgroundColor: colors.rustBright },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, marginTop: space.xs },
});
