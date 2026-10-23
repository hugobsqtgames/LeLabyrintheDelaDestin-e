/**
 * Carte de choix narratif.
 * États : disponible, appuyé, sélectionné (transition en cours), estompé,
 * verrouillé (avec raisons connues). Les chances de réussite sont une
 * pastille que l'on peut toucher pour voir le détail du jet.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChoiceView } from '../../engine/narrative';
import { useT } from '../../i18n';
import { CHOICE_ICONS, Icon } from '../icons';
import { colors, CONTINUOUS, fonts, MAX_SCALE_READING, radius, space, TOUCH } from '../theme';
import { Glass } from './Glass';
import { withAlpha } from './primitives';

export type ChoiceVisualState = 'idle' | 'selected' | 'dimmed';

export function chanceColor(p: number): string {
  if (p >= 0.75) return colors.mossBright;
  if (p >= 0.45) return colors.amber;
  return colors.rustBright;
}

export function ChoiceCard({
  view,
  index,
  onPress,
  onChanceInfo,
  state = 'idle',
  textScale = 1,
  statLabel,
  highlight,
}: {
  view: ChoiceView;
  index?: number;
  onPress?: () => void;
  onChanceInfo?: () => void;
  state?: ChoiceVisualState;
  textScale?: number;
  statLabel?: string;
  /** Choix de repli d'une scène chronométrée. */
  highlight?: boolean;
}) {
  const t = useT();
  const { choice, available } = view;
  const locked = !available;
  const selected = state === 'selected';
  const iconName = locked ? 'lock' : CHOICE_ICONS[choice.kind] ?? 'move';
  const pct = view.successChance !== null ? Math.round(view.successChance * 100) : null;
  const a11y = [
    view.text,
    locked ? `${t('choice.locked')}. ${view.lockedReasons.join('. ') || t('choice.lockedUnknown')}` : '',
    pct !== null ? t('choice.chanceA11y', { pct }) : '',
    view.costs.length ? `${t('choice.costs')} : ${view.costs.join(', ')}` : '',
    choice.warning ?? '',
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: locked || state !== 'idle', selected }}
      disabled={locked || state !== 'idle'}
      onPress={onPress}
      style={({ pressed }) => [state === 'dimmed' && { opacity: 0.3 }, pressed && !locked && { transform: [{ scale: 0.985 }] }]}
    >
      <Glass
        radius={radius.lg}
        tone={selected ? 'accent' : locked ? 'clear' : 'default'}
        style={[styles.card, selected && styles.selected, locked && styles.locked, highlight && !selected && styles.highlight]}
      >
        <View style={styles.row}>
          <View style={[styles.index, selected && { backgroundColor: colors.rust }, locked && { backgroundColor: 'transparent' }]}>
            {selected || locked || index === undefined ? (
              <Icon name={selected ? 'check' : iconName} size={15} color={selected ? '#1A0904' : locked ? colors.textFaint : colors.text} strokeWidth={2} />
            ) : (
              <Text style={styles.indexText} maxFontSizeMultiplier={1.2}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text
              style={[styles.text, { fontSize: 16.5 * textScale, lineHeight: 22.5 * textScale }, locked && { color: colors.textFaint }]}
              maxFontSizeMultiplier={MAX_SCALE_READING}
            >
              {view.text}
            </Text>
            {(pct !== null || view.costs.length > 0 || choice.warning || locked) && (
              <View style={styles.meta}>
                {pct !== null && choice.check && !locked && (
                  <Pressable
                    onPress={onChanceInfo}
                    disabled={!onChanceInfo || state !== 'idle'}
                    accessibilityRole="button"
                    accessibilityLabel={t('choice.chanceInfo', { pct })}
                    hitSlop={8}
                    style={({ pressed }) => [styles.chip, { backgroundColor: withAlpha(chanceColor(view.successChance!), 0.14) }, pressed && { opacity: 0.6 }]}
                  >
                    <Icon name="dice" size={12} color={chanceColor(view.successChance!)} strokeWidth={2} />
                    <Text style={[styles.chipText, { color: chanceColor(view.successChance!) }]} maxFontSizeMultiplier={1.3}>
                      {statLabel} {pct} %
                    </Text>
                    {onChanceInfo && <Icon name="info" size={11} color={chanceColor(view.successChance!)} strokeWidth={2} />}
                  </Pressable>
                )}
                {choice.time !== undefined && choice.time >= 1 && !locked && (
                  <View style={[styles.chip, { backgroundColor: 'rgba(255,248,240,0.06)' }]}>
                    <Icon name="clock" size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={[styles.chipText, { color: colors.textDim }]} maxFontSizeMultiplier={1.3}>
                      {t('choice.hours', { h: choice.time })}
                    </Text>
                  </View>
                )}
                {view.costs.map((c) => (
                  <View key={c} style={[styles.chip, { backgroundColor: 'rgba(255,106,61,0.12)' }]}>
                    <Text style={[styles.chipText, { color: colors.rustBright }]} maxFontSizeMultiplier={1.3}>
                      {c}
                    </Text>
                  </View>
                ))}
                {choice.warning && !locked && (
                  <View style={styles.warning}>
                    <Icon name="warning" size={13} color={colors.amber} />
                    <Text style={[styles.chipText, { color: colors.amber }]} maxFontSizeMultiplier={1.3}>
                      {choice.warning}
                    </Text>
                  </View>
                )}
                {locked && (
                  <Text style={styles.lockedReason} maxFontSizeMultiplier={1.4}>
                    {view.lockedReasons.length ? view.lockedReasons.join(' · ') : t('choice.lockedUnknown')}
                  </Text>
                )}
              </View>
            )}
          </View>
          {!locked && !selected && (
            <View style={styles.go}>
              <Icon name={iconName} size={15} color={colors.textDim} />
            </View>
          )}
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: TOUCH + 12, paddingVertical: space.md + 2, paddingHorizontal: space.md + 2, ...CONTINUOUS },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  selected: { borderWidth: 1, borderColor: colors.rust },
  locked: { opacity: 0.75 },
  highlight: { borderWidth: 1, borderColor: 'rgba(255,106,61,0.5)' },
  index: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,240,0.08)', marginTop: -2 },
  indexText: { fontFamily: fonts.mono, fontSize: 11.5, color: colors.text },
  text: { fontFamily: fonts.uiBold, color: colors.text, letterSpacing: -0.2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontFamily: fonts.uiBold, fontSize: 12.5 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  lockedReason: { fontFamily: fonts.ui, fontSize: 13.5, color: colors.textFaint },
  go: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
