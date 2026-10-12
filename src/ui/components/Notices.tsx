/**
 * Journal des conséquences de la dernière action (objets, relations, quêtes).
 * Affiché en ligne dans le récit : jamais bloquant.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Notice } from '../../engine/types';
import { Icon, type IconName } from '../icons';
import { colors, fonts, radius, space } from '../theme';
import { FadeIn } from './primitives';

const TONES: Record<Notice['tone'], { color: string; icon: IconName }> = {
  good: { color: colors.mossBright, icon: 'plus' },
  bad: { color: colors.rustBright, icon: 'minus' },
  info: { color: colors.ice, icon: 'quest' },
  level: { color: colors.amber, icon: 'star' },
};

export function NoticeList({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      {notices.map((n, i) => {
        const tone = TONES[n.tone];
        return (
          <FadeIn key={n.id} delay={i * 60}>
            <View style={[styles.row, { borderLeftColor: tone.color }]}>
              <Icon name={tone.icon} size={14} color={tone.color} />
              <Text style={[styles.text, { color: tone.color }]}>{n.text}</Text>
            </View>
          </FadeIn>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginBottom: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 2,
    paddingLeft: space.sm,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: radius.sm,
  },
  text: { fontFamily: fonts.ui, fontSize: 15, flex: 1 },
});
