/**
 * Conséquences de la dernière action (objets, relations, quêtes), en pastilles
 * empilées dans le récit : jamais bloquant.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Notice } from '../../engine/types';
import { Icon, type IconName } from '../icons';
import { colors, fonts, MAX_SCALE_READING, radius, space } from '../theme';
import { FadeIn, withAlpha } from './primitives';

const TONES: Record<Notice['tone'], { color: string; icon: IconName }> = {
  good: { color: colors.mossBright, icon: 'plus' },
  bad: { color: colors.rustBright, icon: 'minus' },
  info: { color: colors.ice, icon: 'sparkle' },
  level: { color: colors.violet, icon: 'star' },
};

export function NoticeList({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      {notices.map((n, i) => {
        const tone = TONES[n.tone];
        return (
          <FadeIn key={n.id} delay={i * 60}>
            <View style={[styles.row, { backgroundColor: withAlpha(tone.color, 0.09) }]}>
              <View style={[styles.icon, { backgroundColor: withAlpha(tone.color, 0.18) }]}>
                <Icon name={tone.icon} size={11} color={tone.color} strokeWidth={2.4} />
              </View>
              <Text style={[styles.text, { color: tone.color }]} maxFontSizeMultiplier={MAX_SCALE_READING}>
                {n.text}
              </Text>
            </View>
          </FadeIn>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.md },
  icon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.ui, fontSize: 14.5, lineHeight: 19, flex: 1 },
});
