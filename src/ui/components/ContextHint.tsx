/**
 * Astuce contextuelle : un court rappel affiché la première fois qu'une
 * mécanique apparaît (combat, choix chronométré, atelier…). Une fois fermée,
 * elle ne revient plus ; « Revoir le tutoriel » les réaffiche toutes.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Icon } from '../icons';
import { colors, fonts, MAX_SCALE_UI, space, type } from '../theme';
import { Glass } from './Glass';
import { FadeIn } from './primitives';

export function ContextHint({ id, style }: { id: string; style?: object }) {
  const { model, setSettings, feedback } = useStore();
  const t = useT();
  const s = model.settings;
  // Pas pendant la visite guidée, et une seule fois par astuce.
  if (!s.tutorialDone || s.hintsSeen.includes(id)) return null;
  const close = () => {
    feedback('light');
    setSettings({ hintsSeen: [...s.hintsSeen, id] });
  };
  return (
    <FadeIn style={style}>
      <Glass radius={18} tone="accent" style={styles.card}>
        <View style={styles.icon}>
          <Icon name="info" size={16} color={colors.amber} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.ui, { fontFamily: fonts.uiBold, fontSize: 14.5 }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
            {t(`hint.${id}.title`)}
          </Text>
          <Text style={[type.uiSmall, { color: colors.text }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
            {t(`hint.${id}.body`)}
          </Text>
        </View>
        <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('hint.close')}>
          <Icon name="close" size={16} color={colors.textDim} />
        </Pressable>
      </Glass>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,196,107,0.14)' },
});
