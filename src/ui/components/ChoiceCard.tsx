/**
 * Carte de choix narratif.
 * États : disponible, appuyé, sélectionné (confirmé, transition en cours),
 * verrouillé (avec raisons connues), et choix à risque (jet, coûts).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChoiceView } from '../../engine/narrative';
import { STAT_LABELS } from '../../engine/rules';
import { CHOICE_ICONS, Icon } from '../icons';
import { colors, fonts, radius, space, TOUCH, type } from '../theme';

export type ChoiceVisualState = 'idle' | 'selected' | 'dimmed';

function chanceColor(p: number): string {
  if (p >= 0.75) return colors.mossBright;
  if (p >= 0.45) return colors.amber;
  return colors.rustBright;
}

export function ChoiceCard({
  view,
  onPress,
  state = 'idle',
  textScale = 1,
}: {
  view: ChoiceView;
  onPress?: () => void;
  state?: ChoiceVisualState;
  textScale?: number;
}) {
  const { choice, available } = view;
  const locked = !available;
  const selected = state === 'selected';
  const iconName = locked ? 'lock' : CHOICE_ICONS[choice.kind] ?? 'move';
  const a11y = [
    view.text,
    locked ? `Verrouillé. ${view.lockedReasons.join('. ') || 'Condition inconnue.'}` : '',
    view.successChance !== null ? `Chances de réussite : ${Math.round(view.successChance * 100)} %` : '',
    view.costs.length ? `Coûts : ${view.costs.join(', ')}` : '',
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
      style={({ pressed }) => [
        styles.card,
        locked && styles.locked,
        pressed && !locked && styles.pressed,
        selected && styles.selected,
        state === 'dimmed' && { opacity: 0.35 },
      ]}
    >
      <View style={[styles.iconWell, selected && { backgroundColor: colors.rust }, locked && { backgroundColor: colors.bgDeep }]}>
        <Icon name={selected ? 'check' : iconName} size={18} color={selected ? colors.paper : locked ? colors.textFaint : colors.paperDim} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.text, { fontSize: 16 * textScale, lineHeight: 22 * textScale }, locked && { color: colors.textFaint }]}>{view.text}</Text>
        {(view.successChance !== null || view.costs.length > 0 || choice.warning || locked) && (
          <View style={styles.meta}>
            {view.successChance !== null && choice.check && !locked && (
              <View style={[styles.tag, { borderColor: chanceColor(view.successChance) }]}>
                <Icon name="dice" size={12} color={chanceColor(view.successChance)} />
                <Text style={[styles.tagText, { color: chanceColor(view.successChance) }]}>
                  {STAT_LABELS[choice.check.stat]} · {Math.round(view.successChance * 100)} %
                </Text>
              </View>
            )}
            {view.costs.map((c) => (
              <View key={c} style={[styles.tag, { borderColor: colors.rust }]}>
                <Text style={[styles.tagText, { color: colors.rustBright }]}>{c}</Text>
              </View>
            ))}
            {choice.warning && !locked && (
              <View style={styles.warning}>
                <Icon name="warning" size={13} color={colors.amber} />
                <Text style={[styles.tagText, { color: colors.amber, textTransform: 'none', letterSpacing: 0.2 }]}>{choice.warning}</Text>
              </View>
            )}
            {locked && (
              <Text style={styles.lockedReason}>
                {view.lockedReasons.length ? view.lockedReasons.join(' · ') : 'Vous ne savez pas encore comment faire.'}
              </Text>
            )}
          </View>
        )}
      </View>
      {!locked && !selected && <Icon name="chevron" size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH + 8,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panelRaised,
  },
  pressed: { backgroundColor: colors.panelPressed, borderColor: colors.rust },
  selected: { borderColor: colors.rustBright, backgroundColor: '#2A1B15' },
  locked: { backgroundColor: colors.panel, borderColor: colors.line, borderStyle: 'dashed' },
  iconWell: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelPressed },
  text: { fontFamily: fonts.bodyBold, color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockedReason: { ...type.uiSmall, color: colors.textFaint, fontStyle: 'italic' },
});
