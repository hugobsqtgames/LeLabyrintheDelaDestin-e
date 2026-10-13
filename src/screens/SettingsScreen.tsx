/**
 * Paramètres : langue, ambiance sonore, confort (animations, vibrations,
 * choix chronométrés) et lecture (taille du texte du récit, en plus de la
 * taille de texte du système, toujours respectée).
 */
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useT } from '../i18n';
import { deviceLanguage } from '../i18n/lang';
import { type LanguageSetting, useStore } from '../store/GameStore';
import { Body, IconButton, Label, Panel, Screen, SectionTitle, Segmented } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { colors, fonts, MAX_SCALE_READING, MAX_SCALE_UI, radius, space, TOUCH, type } from '../ui/theme';

const SCALES = [0.9, 1, 1.15, 1.3];
const VOLUMES = [0, 0.25, 0.5, 0.75, 1];

function Toggle({ label, detail, value, onChange, disabled }: { label: string; detail: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{label}</Text>
        <Text style={type.uiSmall}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(255,248,240,0.15)', true: colors.rust }}
        thumbColor={colors.text}
        ios_backgroundColor="rgba(255,248,240,0.15)"
      />
    </View>
  );
}

export function SettingsScreen() {
  const { model, setSettings, back } = useStore();
  const t = useT();
  const s = model.settings;
  return (
    <Screen aura="neutral">
      <View style={styles.header}>
        <IconButton icon="back" label={t('common.back')} onPress={back} />
        <Text style={[type.h1, { flex: 1 }]} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
          {t('title.settings')}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }} showsVerticalScrollIndicator={false}>
        <SectionTitle>{t('settings.language')}</SectionTitle>
        <Segmented<LanguageSetting>
          value={s.language === 'fr' || s.language === 'en' ? s.language : 'auto'}
          onChange={(language) => setSettings({ language })}
          options={[
            { id: 'auto', label: t('settings.langAuto', { lang: deviceLanguage() === 'fr' ? 'FR' : 'EN' }) },
            { id: 'fr', label: 'Français' },
            { id: 'en', label: 'English' },
          ]}
        />
        <Text style={[type.uiSmall, { marginTop: space.sm }]}>{t('settings.langHint')}</Text>

        <SectionTitle>{t('settings.sound')}</SectionTitle>
        <Panel style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Icon name="volume" size={18} color={s.volume > 0 ? colors.text : colors.textFaint} />
            <Text style={[type.ui, { flex: 1, fontFamily: fonts.uiBold }]}>{t('settings.ambience')}</Text>
            <Text style={[type.number, { fontSize: 13, color: colors.textDim }]}>{s.volume === 0 ? t('settings.mute') : `${Math.round(s.volume * 100)} %`}</Text>
          </View>
          <View style={styles.volume} accessibilityRole="adjustable" accessibilityLabel={t('settings.ambience')} accessibilityValue={{ min: 0, max: 100, now: Math.round(s.volume * 100) }}>
            {VOLUMES.map((v) => {
              const on = s.volume >= v && s.volume > 0 && v > 0;
              return (
                <Pressable
                  key={v}
                  accessibilityRole="button"
                  accessibilityLabel={v === 0 ? t('settings.mute') : `${Math.round(v * 100)} %`}
                  onPress={() => setSettings({ volume: v })}
                  style={[styles.volStep, { height: 14 + v * 26 }, on && { backgroundColor: colors.text }, v === 0 && styles.volMute, v === 0 && s.volume === 0 && { backgroundColor: colors.rust }]}
                >
                  {v === 0 && <Icon name="close" size={12} color={s.volume === 0 ? colors.bg : colors.textDim} strokeWidth={2.4} />}
                </Pressable>
              );
            })}
          </View>
          <Text style={type.uiSmall}>{Platform.OS === 'web' ? t('settings.soundWeb') : t('settings.soundHint')}</Text>
        </Panel>

        <SectionTitle>{t('settings.comfort')}</SectionTitle>
        <Panel style={{ paddingVertical: space.xs }}>
          <Toggle
            label={t('settings.timed')}
            detail={t('settings.timedHint')}
            value={s.timedChoices}
            onChange={(v) => setSettings({ timedChoices: v })}
          />
          <View style={styles.sep} />
          <Toggle
            label={t('settings.motion')}
            detail={model.systemReduceMotion ? t('settings.motionSystem') : t('settings.motionHint')}
            value={s.reduceMotion || model.systemReduceMotion}
            disabled={model.systemReduceMotion}
            onChange={(v) => setSettings({ reduceMotion: v })}
          />
          <View style={styles.sep} />
          <Toggle
            label={t('settings.haptics')}
            detail={Platform.OS === 'web' ? t('settings.hapticsWeb') : t('settings.hapticsHint')}
            value={s.haptics}
            disabled={Platform.OS === 'web'}
            onChange={(v) => setSettings({ haptics: v })}
          />
        </Panel>

        <SectionTitle>{t('settings.reading')}</SectionTitle>
        <View style={styles.scales}>
          {SCALES.map((v) => (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ selected: s.textScale === v }}
              accessibilityLabel={t(`settings.scale.${v}`)}
              onPress={() => setSettings({ textScale: v })}
              style={[styles.scale, s.textScale === v && styles.scaleActive]}
            >
              <Text style={[styles.scaleText, { fontSize: 18 * v }, s.textScale === v && { color: colors.bg }]} maxFontSizeMultiplier={1.2}>
                Aa
              </Text>
            </Pressable>
          ))}
        </View>
        <Panel style={{ marginTop: space.md }}>
          <Body style={{ fontSize: 18 * s.textScale, lineHeight: 29 * s.textScale }}>{t('settings.sample')}</Body>
        </Panel>
        <Text style={[type.uiSmall, { marginTop: space.sm }]}>{t('settings.dynamicType', { n: MAX_SCALE_READING })}</Text>

        <SectionTitle>{t('settings.about')}</SectionTitle>
        <Panel style={{ gap: space.sm }}>
          <Label>Le Labyrinthe de la Destinée</Label>
          <Text style={type.bodySmall}>{t('settings.privacy')}</Text>
          <Text style={type.bodySmall}>{t('settings.credits')}</Text>
        </Panel>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH + 16, paddingVertical: space.sm },
  sep: { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.line },
  volume: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 44 },
  volStep: { flex: 1, borderRadius: 8, backgroundColor: 'rgba(255,248,240,0.12)', alignItems: 'center', justifyContent: 'center' },
  volMute: { height: 40, flex: 0.8 },
  scales: { flexDirection: 'row', gap: 6 },
  scale: { flex: 1, minHeight: TOUCH + 8, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,240,0.06)' },
  scaleActive: { backgroundColor: colors.text },
  scaleText: { fontFamily: fonts.title, color: colors.textDim },
});
