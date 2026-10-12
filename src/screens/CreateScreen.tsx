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
import { CAPACITY_BASE, CREATION_CAP, HP_BASE, NAME_MAX, STAMINA_BASE, STAT_DESCRIPTIONS, STAT_IDS, STAT_LABELS } from '../engine/rules';
import type { BackgroundId, CharacterDraft, ProfileId } from '../engine/types';
import { useStore } from '../store/GameStore';
import { EMBLEMS, EmblemBadge } from '../ui/art/Emblems';
import { ProfileArt } from '../ui/art/Figures';
import { Badge, Button, IconButton, Label, Panel, Screen } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { colors, fonts, radius, space, TOUCH, type } from '../ui/theme';

const STEPS = ['Identité', 'Profil', 'Passé', 'Aptitudes', 'Départ'];

export function CreateScreen({ initialDraft, initialStep = 0 }: { initialDraft?: CharacterDraft; initialStep?: number }) {
  const { content, startNewGame, model, back, feedback } = useStore();
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
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" label={step === 0 ? 'Retour' : 'Étape précédente'} onPress={() => (step === 0 ? back() : setStep(step - 1))} />
        <View style={{ flex: 1 }}>
          <Label color={colors.rustBright}>
            Nouveau survivant · {step + 1}/{STEPS.length}
          </Label>
          <Text style={type.h2}>{STEPS[step]}</Text>
        </View>
      </View>
      <View style={styles.progress}>
        {STEPS.map((label, i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`Étape ${i + 1} : ${label}`}
            disabled={i > step && !stepValid.slice(0, i).every(Boolean)}
            onPress={() => setStep(i)}
            style={[styles.progressBar, i <= step && { backgroundColor: colors.rust }, stepValid[i] && i !== step && { backgroundColor: colors.moss }]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl, gap: space.md }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={type.bodySmall}>Comment s’appelle celui ou celle qui monte la garde sur le toit de la pharmacie Saint-Clair ?</Text>
            <TextInput
              value={draft.name}
              onChangeText={(t) => setDraft({ ...draft, name: t.slice(0, NAME_MAX + 4) })}
              placeholder="Votre nom"
              placeholderTextColor={colors.textFaint}
              maxLength={NAME_MAX + 4}
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Nom du personnage"
              style={styles.input}
            />
            <Text style={type.uiSmall}>
              {name.length}/{NAME_MAX} caractères
            </Text>
            <Label style={{ marginTop: space.md }}>Emblème</Label>
            <View style={styles.emblems}>
              {EMBLEMS.map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: draft.emblem === e.id }}
                  accessibilityLabel={e.label}
                  onPress={() => setDraft({ ...draft, emblem: e.id })}
                  style={styles.emblemCell}
                >
                  <EmblemBadge id={e.id} size={72} selected={draft.emblem === e.id} />
                  <Text style={[type.uiSmall, draft.emblem === e.id && { color: colors.paper }]}>{e.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 1 &&
          (Object.keys(content.profiles) as ProfileId[]).map((id) => {
            const pdef = content.profiles[id];
            const sel = draft.profile === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                onPress={() => setDraft(setDraftProfile(content, draft, id))}
                style={[styles.option, sel && styles.optionSel]}
              >
                <ProfileArt id={pdef.art} width={86} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={type.h2}>{pdef.name}</Text>
                  <Text style={[type.uiSmall, { color: colors.rustBright }]}>{pdef.tagline}</Text>
                  <Text style={[type.bodySmall, { fontSize: 14, lineHeight: 20 }]}>{pdef.description}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(pdef.bonuses).map(([st, v]) => (
                      <Badge key={st} label={`${STAT_LABELS[st as keyof typeof STAT_LABELS]} +${v}`} color={colors.mossBright} />
                    ))}
                  </View>
                  <Text style={[type.uiSmall, { color: colors.amber }]}>
                    {pdef.skill.name} : {pdef.skill.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}

        {step === 2 &&
          (Object.keys(content.backgrounds) as BackgroundId[]).map((id) => {
            const b = content.backgrounds[id];
            const sel = draft.background === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                onPress={() => setDraft({ ...draft, background: id })}
                style={[styles.option, { flexDirection: 'column', alignItems: 'stretch' }, sel && styles.optionSel]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Icon name={sel ? 'check' : 'book'} size={18} color={sel ? colors.rustBright : colors.textDim} />
                  <Text style={[type.h2, { fontSize: 19 }]}>{b.name}</Text>
                </View>
                <Text style={[type.bodySmall, { fontSize: 14 }]}>{b.description}</Text>
                <Text style={[type.uiSmall, { color: colors.mossBright }]}>+ {b.advantage}</Text>
                <Text style={[type.uiSmall, { color: colors.rustBright }]}>− {b.drawback}</Text>
              </Pressable>
            );
          })}

        {step === 3 && (
          <>
            <Panel tone="raised" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Text style={styles.points}>{remaining}</Text>
              <Text style={[type.bodySmall, { flex: 1, color: colors.text }]}>
                point{remaining > 1 ? 's' : ''} à répartir. Plafond de {CREATION_CAP} par caractéristique à la création (bonus de profil compris).
              </Text>
            </Panel>
            {STAT_IDS.map((st) => (
              <View key={st} style={styles.statRow}>
                <View style={{ flex: 1 }}>
                  <Text style={type.ui}>{STAT_LABELS[st]}</Text>
                  <Text style={[type.uiSmall, { fontSize: 13 }]}>{STAT_DESCRIPTIONS[st]}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer un point de ${STAT_LABELS[st]}`}
                  disabled={!canDecrement(draft, st)}
                  onPress={() => setDraft(adjustDraftStat(content, draft, st, -1))}
                  style={[styles.step, !canDecrement(draft, st) && { opacity: 0.3 }]}
                >
                  <Icon name="minus" size={18} />
                </Pressable>
                <Text style={styles.statValue} accessibilityLabel={`${STAT_LABELS[st]} : ${draftStat(content, draft, st)}`}>
                  {draftStat(content, draft, st)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter un point à ${STAT_LABELS[st]}`}
                  disabled={!canIncrement(content, draft, st)}
                  onPress={() => setDraft(adjustDraftStat(content, draft, st, 1))}
                  style={[styles.step, { backgroundColor: colors.rust }, !canIncrement(content, draft, st) && { opacity: 0.3 }]}
                >
                  <Icon name="plus" size={18} color={colors.paper} />
                </Pressable>
              </View>
            ))}
            <View style={styles.previewRow}>
              {[
                { l: 'Santé', v: preview.hp, i: 'heart' as const, c: colors.rustBright },
                { l: 'Endurance', v: preview.stamina, i: 'bolt' as const, c: colors.amber },
                { l: 'Charge', v: `${preview.capacity} kg`, i: 'weight' as const, c: colors.ice },
              ].map((x) => (
                <View key={x.l} style={styles.preview}>
                  <Icon name={x.i} size={16} color={x.c} />
                  <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{x.v}</Text>
                  <Text style={type.label}>{x.l}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Panel tone="paper" taped style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                {draft.emblem && <EmblemBadge id={draft.emblem} size={56} selected />}
                <View style={{ flex: 1 }}>
                  <Text style={[type.h1, { color: colors.paperInk }]}>{name || '—'}</Text>
                  <Text style={[type.ui, { color: colors.rustDeep }]}>
                    {draft.profile ? content.profiles[draft.profile].name : '—'} · {bg?.name ?? '—'}
                  </Text>
                </View>
              </View>
              <Text style={[type.uiSmall, { color: colors.paperInk }]}>
                {STAT_IDS.map((st) => `${STAT_LABELS[st]} ${draftStat(content, draft, st)}`).join(' · ')}
              </Text>
              <Text style={[type.uiSmall, { color: colors.paperInk }]}>
                Santé {preview.hp} · Endurance {preview.stamina} · Charge {preview.capacity} kg
              </Text>
            </Panel>
            {validation.errors.map((e) => (
              <View key={e} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Icon name="warning" size={14} color={colors.amber} />
                <Text style={[type.uiSmall, { color: colors.amber }]}>{e}</Text>
              </View>
            ))}
            <Text style={type.bodySmall}>
              {model.pendingSlot !== null
                ? `La partie sera sauvegardée automatiquement dans l’emplacement ${model.pendingSlot}.`
                : 'Aucun emplacement choisi : la partie ne sera pas sauvegardée.'}{' '}
              La mort est définitive, mais vous pouvez toujours revenir aux étapes précédentes avant de commencer.
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < STEPS.length - 1 ? (
          <Button label="Continuer" icon="chevron" disabled={!stepValid[step]} onPress={() => setStep(step + 1)} />
        ) : (
          <Button label="Prendre la garde" icon="check" disabled={!validation.valid} onPress={start} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm },
  progress: { flexDirection: 'row', gap: 4, marginVertical: space.md },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  input: {
    minHeight: TOUCH + 4,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    color: colors.text,
    fontFamily: fonts.title,
    fontSize: 22,
    paddingHorizontal: space.md,
  },
  emblems: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
  emblemCell: { width: '31%', alignItems: 'center', paddingVertical: space.sm, gap: 4 },
  option: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'flex-start' },
  optionSel: { borderColor: colors.rustBright, backgroundColor: '#24180F' },
  points: { fontFamily: fonts.title, fontSize: 40, color: colors.amber },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  step: { width: TOUCH, height: TOUCH, borderRadius: radius.md, backgroundColor: colors.panelRaised, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.title, fontSize: 26, color: colors.paper, width: 30, textAlign: 'center' },
  previewRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  preview: { flex: 1, alignItems: 'center', gap: 2, padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  footer: { paddingVertical: space.md },
});
