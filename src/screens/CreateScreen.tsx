/**
 * Création du personnage en cinq étapes : identité, profil, passé,
 * caractéristiques, récapitulatif. Les règles viennent du moteur.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  adjustDraftStat,
  canDecrement,
  canIncrement,
  draftStat,
  emptyDraft,
  normalizeName,
  remainingPoints,
  setDraftProfile,
  validateDraft,
} from '../engine/character';
import { CAPACITY_BASE, CREATION_CAP, HP_BASE, NAME_MAX, STAMINA_BASE, STAT_IDS } from '../engine/rules';
import type { BackgroundId, CharacterDraft, ProfileId } from '../engine/types';
import { useT } from '../i18n';
import { useStore } from '../store/GameStore';
import { EMBLEMS, EmblemBadge } from '../ui/art/Emblems';
import { PlayerPortrait } from '../ui/art/Portraits';
import { Glass } from '../ui/components/Glass';
import { Badge, Button, IconButton, Label, Panel, Screen, Tile } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { colors, CONTINUOUS, fonts, MAX_SCALE_UI, radius, space, TOUCH, type } from '../ui/theme';

const STEPS = ['identity', 'profile', 'background', 'stats', 'start'];

export function CreateScreen({ initialDraft, initialStep = 0 }: { initialDraft?: CharacterDraft; initialStep?: number }) {
  const { content, startNewGame, model, back, feedback } = useStore();
  const t = useT();
  const [draft, setDraft] = useState<CharacterDraft>(initialDraft ?? emptyDraft());
  const [step, setStep] = useState(initialStep);
  const validation = useMemo(() => validateDraft(content, draft), [content, draft]);
  const remaining = remainingPoints(draft);
  const name = normalizeName(draft.name);

  const stepValid = [
    name.length >= 2 && !!draft.emblem && !/[<>{}\[\]\\]/.test(name),
    !!draft.profile,
    !!draft.background,
    remaining === 0,
    validation.valid,
  ];

  const bg = draft.background ? content.backgrounds[draft.background] : null;
  const s = (id: (typeof STAT_IDS)[number]) => draftStat(content, draft, id);
  const preview = {
    hp: HP_BASE + s('force') + s('survie') * 2 + (bg?.bonusMaxHp ?? 0),
    stamina: STAMINA_BASE + s('survie') + s('discretion'),
    capacity: CAPACITY_BASE + s('force') * 2 + (bg?.capacityModifier ?? 0),
  };

  const start = () => {
    if (!validation.valid) return;
    feedback('success');
    startNewGame(draft, model.pendingSlot);
  };

  return (
    <Screen aura="c1">
      <View style={styles.header}>
        <IconButton icon="back" label={step === 0 ? t('common.back') : t('create.prev')} onPress={() => (step === 0 ? back() : setStep(step - 1))} />
        <View style={{ flex: 1 }}>
          <Label color={colors.rustBright}>{t('create.kicker', { n: step + 1, total: STEPS.length })}</Label>
          <Text style={[type.h1, { fontSize: 32 }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
            {t(`create.step.${STEPS[step]}`)}
          </Text>
        </View>
      </View>
      <View style={styles.progress}>
        {STEPS.map((key, i) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={t('create.stepA11y', { n: i + 1, label: t(`create.step.${key}`) })}
            disabled={i > step && !stepValid.slice(0, i).every(Boolean)}
            onPress={() => setStep(i)}
            hitSlop={{ top: 12, bottom: 12 }}
            style={[styles.progressBar, i <= step && { backgroundColor: colors.text }, stepValid[i] && i !== step && { backgroundColor: colors.mossBright }]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl, gap: space.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Text style={type.bodySmall}>{t('create.nameIntro')}</Text>
            <Glass radius={radius.lg} style={styles.inputWrap}>
              <TextInput
                value={draft.name}
                onChangeText={(v) => setDraft({ ...draft, name: v.slice(0, NAME_MAX + 4) })}
                placeholder={t('create.namePlaceholder')}
                placeholderTextColor={colors.textFaint}
                maxLength={NAME_MAX + 4}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel={t('create.nameA11y')}
                style={styles.input}
              />
            </Glass>
            <Text style={[type.label, { textAlign: 'right' }]}>
              {name.length}/{NAME_MAX}
            </Text>
            <Label style={{ marginTop: space.sm }}>{t('create.emblem')}</Label>
            <View style={styles.emblems}>
              {EMBLEMS.map((e) => {
                const sel = draft.emblem === e.id;
                return (
                  <Pressable
                    key={e.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sel }}
                    accessibilityLabel={t(`emblem.${e.id}`)}
                    onPress={() => setDraft({ ...draft, emblem: e.id })}
                    style={styles.emblemCell}
                  >
                    <Glass radius={radius.lg} tone={sel ? 'accent' : 'default'} style={[styles.emblemCard, sel && { borderWidth: 1.5, borderColor: colors.rust }]}>
                      <EmblemBadge id={e.id} size={62} selected={sel} />
                      <Text style={[type.uiSmall, { fontSize: 12.5, textAlign: 'center' }, sel && { color: colors.text }]} numberOfLines={1}>
                        {t(`emblem.${e.id}`)}
                      </Text>
                    </Glass>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 1 &&
          (Object.keys(content.profiles) as ProfileId[]).filter((id) => !content.profiles[id].hidden).map((id) => {
            const pdef = content.profiles[id];
            const sel = draft.profile === id;
            return (
              <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={`${pdef.name}. ${pdef.tagline}`} onPress={() => setDraft(setDraftProfile(content, draft, id))}>
                <Glass radius={radius.xl} tone={sel ? 'accent' : 'default'} style={[styles.option, sel && styles.optionSel]}>
                  <PlayerPortrait profile={id} size={92} shape="tall" />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={[type.h2, { fontSize: 28 }]}>{pdef.name}</Text>
                    <Text style={[type.uiSmall, { color: colors.rustBright, fontFamily: fonts.uiBold }]}>{pdef.tagline}</Text>
                    <Text style={[type.bodySmall, { fontSize: 14.5, lineHeight: 20 }]}>{pdef.description}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(pdef.bonuses).map(([st, v]) => (
                        <Badge key={st} label={`${content.statLabels[st as keyof typeof content.statLabels]} +${v}`} color={colors.mossBright} />
                      ))}
                    </View>
                    <Text style={[type.uiSmall, { color: colors.amber, fontSize: 12.5 }]}>
                      ★ {pdef.skill.name} · {pdef.skill.description}
                    </Text>
                    <Text style={[type.uiSmall, { color: colors.violet, fontSize: 12.5 }]}>
                      ✦ {t('char.unlockAt', { n: pdef.skill2.level })} · {pdef.skill2.name}
                    </Text>
                  </View>
                </Glass>
              </Pressable>
            );
          })}

        {step === 2 &&
          (Object.keys(content.backgrounds) as BackgroundId[]).filter((id) => !content.backgrounds[id].hidden).map((id) => {
            const b = content.backgrounds[id];
            const sel = draft.background === id;
            return (
              <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={b.name} onPress={() => setDraft({ ...draft, background: id })}>
                <Glass radius={radius.xl} tone={sel ? 'accent' : 'default'} style={[styles.bgOption, sel && styles.optionSel]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <View style={[styles.radio, sel && { backgroundColor: colors.rust, borderColor: colors.rust }]}>{sel && <Icon name="check" size={12} color="#1A0904" strokeWidth={3} />}</View>
                    <Text style={[type.h2, { fontSize: 24, flex: 1 }]}>{b.name}</Text>
                  </View>
                  <Text style={[type.bodySmall, { fontSize: 14.5 }]}>{b.description}</Text>
                  <Text style={[type.uiSmall, { color: colors.mossBright }]}>+ {b.advantage}</Text>
                  <Text style={[type.uiSmall, { color: colors.rustBright }]}>− {b.drawback}</Text>
                </Glass>
              </Pressable>
            );
          })}

        {step === 3 && (
          <>
            <Panel tone="accent" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Text style={styles.points}>{remaining}</Text>
              <Text style={[type.uiSmall, { flex: 1, color: colors.text }]}>{t('create.points', { n: remaining, cap: CREATION_CAP })}</Text>
            </Panel>
            {STAT_IDS.map((st) => (
              <Glass key={st} radius={radius.lg} style={styles.statRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{content.statLabels[st]}</Text>
                  <Text style={[type.uiSmall, { fontSize: 12.5, lineHeight: 17 }]}>{content.statDescriptions[st]}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('create.minus', { stat: content.statLabels[st] })}
                  disabled={!canDecrement(draft, st)}
                  onPress={() => setDraft(adjustDraftStat(content, draft, st, -1))}
                  style={[styles.step, !canDecrement(draft, st) && { opacity: 0.3 }]}
                >
                  <Icon name="minus" size={18} />
                </Pressable>
                <Text style={styles.statValue} accessibilityLabel={`${content.statLabels[st]} : ${draftStat(content, draft, st)}`}>
                  {draftStat(content, draft, st)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('create.plus', { stat: content.statLabels[st] })}
                  disabled={!canIncrement(content, draft, st)}
                  onPress={() => setDraft(adjustDraftStat(content, draft, st, 1))}
                  style={[styles.step, { backgroundColor: colors.text }, !canIncrement(content, draft, st) && { opacity: 0.3 }]}
                >
                  <Icon name="plus" size={18} color={colors.bg} strokeWidth={2.4} />
                </Pressable>
              </Glass>
            ))}
            <View style={styles.previewRow}>
              <Tile style={{ flex: 1 }} label={t('stat.hp')} value={preview.hp} icon="heart" color={colors.rust} />
              <Tile style={{ flex: 1 }} label={t('stat.stamina')} value={preview.stamina} icon="bolt" color={colors.amber} />
              <Tile style={{ flex: 1 }} label={t('bag.load')} value={preview.capacity} sub="kg" icon="weight" color={colors.ice} />
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Glass radius={radius.xl} style={styles.summary}>
              {draft.profile && <PlayerPortrait profile={draft.profile} size={120} shape="tall" />}
              <View style={{ flex: 1, gap: 4 }}>
                {draft.emblem && <EmblemBadge id={draft.emblem} size={34} selected />}
                <Text style={[type.h1, { fontSize: 36 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {name || '—'}
                </Text>
                <Text style={[type.ui, { color: colors.rustBright, fontFamily: fonts.uiBold }]}>{draft.profile ? content.profiles[draft.profile].name : '—'}</Text>
                <Text style={type.uiSmall}>{bg?.name ?? '—'}</Text>
              </View>
            </Glass>
            <View style={styles.previewRow}>
              {STAT_IDS.map((st) => (
                <Tile key={st} style={{ flex: 1, minHeight: 80 }} label={content.statLabels[st].slice(0, 4)} value={draftStat(content, draft, st)} />
              ))}
            </View>
            {validation.errors.map((e) => (
              <View key={e} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Icon name="warning" size={14} color={colors.amber} />
                <Text style={[type.uiSmall, { color: colors.amber }]}>{e}</Text>
              </View>
            ))}
            <Text style={type.bodySmall}>
              {model.pendingSlot !== null ? t('create.slot', { slot: model.pendingSlot }) : t('create.noSlot')} {t('create.permadeath')}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < STEPS.length - 1 ? (
          <Button label={t('common.continue')} icon="chevron" disabled={!stepValid[step]} onPress={() => setStep(step + 1)} />
        ) : (
          <Button label={t('create.go')} icon="check" variant="accent" disabled={!validation.valid} onPress={start} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm },
  progress: { flexDirection: 'row', gap: 5, marginVertical: space.lg },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,248,240,0.12)' },
  inputWrap: { paddingHorizontal: space.lg },
  input: { minHeight: TOUCH + 16, color: colors.text, fontFamily: fonts.title, fontSize: 30 },
  emblems: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  emblemCell: { width: '33.33%', padding: 4 },
  emblemCard: { alignItems: 'center', paddingVertical: space.md, paddingHorizontal: 4, gap: 6 },
  option: { flexDirection: 'row', gap: space.md, padding: space.md, alignItems: 'flex-start', ...CONTINUOUS },
  bgOption: { padding: space.lg, gap: 6 },
  optionSel: { borderWidth: 1.5, borderColor: colors.rust },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  points: { fontFamily: fonts.title, fontSize: 52, lineHeight: 54, color: colors.amber },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  step: { width: TOUCH - 4, height: TOUCH - 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,248,240,0.1)', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.title, fontSize: 34, color: colors.text, width: 34, textAlign: 'center' },
  previewRow: { flexDirection: 'row', gap: space.sm },
  summary: { flexDirection: 'row', gap: space.lg, alignItems: 'center', padding: space.md },
  footer: { paddingVertical: space.md },
});
