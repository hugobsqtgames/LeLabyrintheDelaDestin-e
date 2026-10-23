/**
 * Paramètres : langue, ambiance sonore, confort (animations, vibrations,
 * choix chronométrés) et lecture (taille du texte du récit, en plus de la
 * taille de texte du système, toujours respectée).
 */
import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useT } from '../i18n';
import { cancelReminders, enableReminders, REMINDER_DELAY_HOURS, remindersSupported } from '../notifications/reminders';
import { deviceLanguage } from '../i18n/lang';
import { type LanguageSetting, useStore } from '../store/GameStore';
import { TEXT_SCALES } from '../store/settings';
import { Body, Button, IconButton, Label, Panel, Screen, SectionTitle, Segmented } from '../ui/components/primitives';
import { ConfirmDialog, Sheet } from '../ui/components/Sheet';
import { CONTACT_EMAIL, PRIVACY, PRIVACY_URL, SUPPORT_URL } from '../legal/privacy';
import { Icon } from '../ui/icons';
import { colors, fonts, MAX_SCALE_READING, MAX_SCALE_UI, radius, space, TOUCH, type } from '../ui/theme';

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
  const { model, setSettings, back, resetAll, feedback, lang } = useStore();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const policy = PRIVACY[lang];
  const t = useT();
  const s = model.settings;
  const [tutorialQueued, setTutorialQueued] = useState(false);
  const [reminderError, setReminderError] = useState(false);
  // Tout effacer : deux confirmations successives, l'action est définitive.
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const confirmReset = async () => {
    if (resetting) return;
    setResetting(true);
    const res = await resetAll();
    setResetting(false);
    setResetStep(0);
    if (res.ok) feedback('success');
    else setResetError(t('settings.resetFailed'));
  };
  const replayTutorial = () => {
    setSettings({ tutorialDone: false, hintsSeen: [] });
    // En pleine partie, on y retourne tout de suite ; sinon il s'ouvrira à la prochaine.
    if (model.game) back();
    else setTutorialQueued(true);
  };
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
          <View
            style={styles.volume}
            // Un seul élément réglable pour VoiceOver : balayer vers le haut ou le bas change le volume.
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t('settings.ambience')}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(s.volume * 100), text: s.volume === 0 ? t('settings.mute') : `${Math.round(s.volume * 100)} %` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              const i = VOLUMES.findIndex((v) => v >= s.volume);
              const at = i < 0 ? VOLUMES.length - 1 : i;
              const next = e.nativeEvent.actionName === 'increment' ? Math.min(VOLUMES.length - 1, at + 1) : Math.max(0, at - 1);
              setSettings({ volume: VOLUMES[next] });
            }}
          >
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
          {TEXT_SCALES.map((v) => (
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
        <Panel style={{ marginTop: space.md, paddingVertical: space.xs }}>
          <Toggle label={t('settings.paper')} detail={t('settings.paperHint')} value={s.paperReading} onChange={(v) => setSettings({ paperReading: v })} />
        </Panel>
        <View style={[styles.sample, s.paperReading && { backgroundColor: colors.paper }]}>
          <Body style={{ fontSize: 18 * s.textScale, lineHeight: 29 * s.textScale, color: s.paperReading ? colors.paperInk : colors.text }}>{t('settings.sample')}</Body>
        </View>
        <Text style={[type.uiSmall, { marginTop: space.sm }]}>{t('settings.dynamicType', { n: MAX_SCALE_READING })}</Text>

        <SectionTitle>{t('settings.notifications')}</SectionTitle>
        <Panel style={{ paddingVertical: space.xs }}>
          <Toggle
            label={t('settings.reminders')}
            detail={!remindersSupported ? t('settings.remindersWeb') : reminderError ? t('settings.remindersDenied') : t('settings.remindersHint', { h: REMINDER_DELAY_HOURS })}
            value={s.reminders}
            disabled={!remindersSupported}
            onChange={async (v) => {
              setReminderError(false);
              if (!v) {
                setSettings({ reminders: false });
                cancelReminders();
                return;
              }
              const ok = await enableReminders(t('settings.reminders'));
              if (ok) setSettings({ reminders: true });
              else setReminderError(true);
            }}
          />
          {reminderError && remindersSupported && (
            <Button label={t('settings.openSystemSettings')} variant="ghost" onPress={() => Linking.openSettings().catch(() => undefined)} />
          )}
        </Panel>

        <SectionTitle>{t('settings.help')}</SectionTitle>
        <Panel style={{ gap: space.sm }}>
          <Text style={type.bodySmall}>{t('settings.tutorialHint')}</Text>
          <Button label={t('settings.tutorial')} icon="book" variant="secondary" onPress={replayTutorial} />
          {(tutorialQueued || (!s.tutorialDone && !model.game)) && <Text style={[type.uiSmall, { color: colors.mossBright }]}>{t('settings.tutorialQueued')}</Text>}
        </Panel>

        <SectionTitle>{t('settings.reset')}</SectionTitle>
        <Panel style={{ gap: space.sm }}>
          <Text style={type.bodySmall}>{t('settings.resetHint')}</Text>
          <Button label={t('settings.resetButton')} icon="trash" variant="danger" onPress={() => { setResetError(null); setResetStep(1); }} />
          {resetError && <Text style={[type.uiSmall, { color: colors.blood }]}>{resetError}</Text>}
        </Panel>

        <SectionTitle>{t('settings.about')}</SectionTitle>
        <Panel style={{ gap: space.sm }}>
          <Label>Valombre</Label>
          <Text style={type.bodySmall}>{t('settings.privacy')}</Text>
          <Text style={type.bodySmall}>{t('settings.credits')}</Text>
          <Button label={t('settings.privacyPolicy')} icon="book" variant="secondary" onPress={() => setPrivacyOpen(true)} />
          <Button label={t('settings.support')} variant="ghost" onPress={() => Linking.openURL(SUPPORT_URL).catch(() => undefined)} />
          <Text style={type.uiSmall} selectable>
            {t('settings.contact', { email: CONTACT_EMAIL })}
          </Text>
        </Panel>
      </ScrollView>
      <Sheet
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title={t('settings.privacyPolicy')}
        footer={<Button label={t('settings.privacyOnline')} variant="ghost" onPress={() => Linking.openURL(PRIVACY_URL[lang]).catch(() => undefined)} />}
      >
        <View style={{ gap: space.sm }}>
          <Text style={type.uiSmall}>{policy.updated}</Text>
          <Text style={[type.bodySmall, { color: colors.text, fontFamily: fonts.uiBold }]}>{policy.summary}</Text>
          {policy.sections.map((section) => (
            <View key={section.title} style={{ gap: 6, marginTop: space.sm }}>
              <Text style={[type.ui, { fontFamily: fonts.uiBold }]} accessibilityRole="header">
                {section.title}
              </Text>
              {section.paragraphs.map((para) => (
                <Text key={para.slice(0, 40)} style={type.bodySmall}>
                  {para}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Sheet>
      <ConfirmDialog
        visible={resetStep === 1}
        danger
        title={t('settings.resetConfirm1')}
        message={t('settings.resetConfirm1Text')}
        confirmLabel={t('settings.resetContinue')}
        onConfirm={() => setResetStep(2)}
        onCancel={() => setResetStep(0)}
      />
      <ConfirmDialog
        visible={resetStep === 2}
        danger
        title={t('settings.resetConfirm2')}
        message={t('settings.resetConfirm2Text')}
        confirmLabel={t('settings.resetFinal')}
        onConfirm={confirmReset}
        onCancel={() => setResetStep(0)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sample: { marginTop: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: 'rgba(255,248,240,0.05)' },
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
