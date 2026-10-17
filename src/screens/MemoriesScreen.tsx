/**
 * Mémoires : ce qui reste d'une partie à l'autre. Succès, personnages
 * rencontrés, codex des Muets et pillards, chapitres (arbre des choix et
 * « Rejouer un chapitre », ouverts après une première partie terminée).
 * Tout provient de vraies parties jouées sur cet appareil.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { chapterProgress, choiceExplored, choiceTargets, memoriesUnlocked } from '../engine/meta';
import type { ChapterId } from '../engine/types';
import { useT } from '../i18n';
import { useStore } from '../store/GameStore';
import { EnemyArt } from '../ui/art/Figures';
import { Portrait, PORTRAITS } from '../ui/art/Portraits';
import { Badge, Bar, Button, IconButton, Label, Panel, Screen, Segmented } from '../ui/components/primitives';
import { Sheet } from '../ui/components/Sheet';
import { Icon } from '../ui/icons';
import { colors, fonts, MAX_SCALE_UI, radius, space, type } from '../ui/theme';

type Pane = 'achievements' | 'people' | 'codex' | 'chapters';

export function MemoriesScreen() {
  const { model, back } = useStore();
  const t = useT();
  const [pane, setPane] = useState<Pane>('achievements');
  return (
    <Screen aura="neutral">
      <View style={styles.header}>
        <IconButton icon="back" label={t('common.back')} onPress={back} />
        <Text style={[type.h1, { flex: 1 }]} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
          {t('memories.title')}
        </Text>
      </View>
      <Text style={[type.bodySmall, { marginBottom: space.md }]}>{t('memories.intro', { runs: model.meta.runs })}</Text>
      <Segmented<Pane>
        value={pane}
        onChange={setPane}
        options={[
          { id: 'achievements', label: t('memories.achievements') },
          { id: 'people', label: t('memories.people') },
          { id: 'codex', label: t('memories.codex') },
          { id: 'chapters', label: t('memories.chapters') },
        ]}
      />
      <ScrollView contentContainerStyle={{ paddingVertical: space.lg, gap: space.sm }} showsVerticalScrollIndicator={false}>
        {pane === 'achievements' && <Achievements />}
        {pane === 'people' && <People />}
        {pane === 'codex' && <Codex />}
        {pane === 'chapters' && <Chapters />}
      </ScrollView>
    </Screen>
  );
}

function Achievements() {
  const { model, content } = useStore();
  const t = useT();
  const list = content.achievements;
  const done = list.filter((a) => model.meta.achievements[a.id]).length;
  return (
    <>
      <Label>{t('memories.achievementsCount', { n: done, total: list.length })}</Label>
      <Bar value={done} max={list.length} color={colors.amber} />
      {list.map((a) => {
        const at = model.meta.achievements[a.id];
        const hidden = !at && a.secret;
        return (
          <Panel key={a.id} style={[styles.row, !at && { opacity: 0.55 }]}>
            <View style={[styles.medal, !!at && { backgroundColor: 'rgba(255,190,90,0.18)', borderColor: colors.amber }]}>
              <Icon name={at ? 'star' : 'lock'} size={18} color={at ? colors.amber : colors.textFaint} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{hidden ? t('memories.secret') : a.title}</Text>
              <Text style={type.uiSmall}>{hidden ? t('memories.secretHint') : a.description}</Text>
            </View>
          </Panel>
        );
      })}
    </>
  );
}

function People() {
  const { model, content } = useStore();
  const t = useT();
  const all = Object.values(content.characters);
  const met = all.filter((c) => model.meta.met.includes(c.id));
  return (
    <>
      <Label>{t('memories.peopleCount', { n: met.length, total: all.length })}</Label>
      <View style={styles.grid}>
        {all.map((c) => {
          const known = model.meta.met.includes(c.id);
          return (
            <Panel key={c.id} style={styles.person}>
              <View style={!known && { opacity: 0.15 }}>{PORTRAITS[c.id] ? <Portrait id={c.id} size={64} shape="squircle" /> : <View style={styles.blank} />}</View>
              <Text style={[type.ui, { fontFamily: fonts.uiBold, textAlign: 'center' }]} numberOfLines={2}>
                {known ? c.name : '???'}
              </Text>
              {known && <Text style={[type.uiSmall, { textAlign: 'center' }]}>{c.role}</Text>}
              {known && (
                <Text style={[type.uiSmall, { fontSize: 12, color: colors.textDim }]} numberOfLines={6}>
                  {c.description}
                </Text>
              )}
            </Panel>
          );
        })}
      </View>
    </>
  );
}

function Codex() {
  const { model, content } = useStore();
  const t = useT();
  const all = Object.values(content.enemies);
  const seen = all.filter((e) => model.meta.enemies.includes(e.id));
  return (
    <>
      <Label>{t('memories.codexCount', { n: seen.length, total: all.length })}</Label>
      {all.map((e) => {
        const known = model.meta.enemies.includes(e.id);
        if (!known)
          return (
            <Panel key={e.id} style={[styles.row, { opacity: 0.45 }]}>
              <Icon name="lock" size={16} color={colors.textFaint} />
              <Text style={type.uiSmall}>{t('memories.unknownEnemy')}</Text>
            </Panel>
          );
        return (
          <Panel key={e.id} style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <EnemyArt id={e.art} width={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{e.name}</Text>
                  {e.boss && <Badge label={t('memories.boss')} color={colors.blood} />}
                  {e.human && <Badge label={t('memories.human')} color={colors.steel} />}
                </View>
                <Text style={type.uiSmall}>{e.description}</Text>
                <Text style={[type.label, { fontSize: 10 }]}>{t('memories.enemyStats', { hp: e.maxHp, def: e.defense })}</Text>
              </View>
            </View>
            {(e.weaknesses?.length ?? 0) > 0 && (
              <View style={{ gap: 2 }}>
                {e.weaknesses!.map((w, i) => (
                  <Text key={i} style={[type.uiSmall, { color: colors.mossBright }]}>
                    ◆ {w.hint}
                  </Text>
                ))}
              </View>
            )}
            {e.meleePenalty && <Text style={[type.uiSmall, { color: colors.amber }]}>◆ {e.meleePenalty.text}</Text>}
            <Text style={[type.uiSmall, { fontSize: 12, color: colors.textDim }]}>{e.moves.map((m) => m.name).join(' · ')}</Text>
          </Panel>
        );
      })}
    </>
  );
}

function Chapters() {
  const { model, content, saves, setPendingChapter, openSaves } = useStore();
  const t = useT();
  const unlocked = memoriesUnlocked(model.meta);
  const [starts, setStarts] = useState<string[]>([]);
  const [open, setOpen] = useState<ChapterId | null>(null);
  useEffect(() => {
    if (!saves) return;
    let alive = true;
    saves.chapterStarts(content.chapters.map((c) => c.id)).then((s) => alive && setStarts(s));
    return () => {
      alive = false;
    };
  }, [saves, content]);
  return (
    <>
      {!unlocked && (
        <Panel tone="raised">
          <Text style={type.bodySmall}>{t('memories.chaptersLocked')}</Text>
        </Panel>
      )}
      {content.chapters.map((ch) => {
        const reached = model.meta.chapters.includes(ch.id);
        const prog = chapterProgress(content, model.meta, ch.id);
        return (
          <Panel key={ch.id} style={{ gap: space.sm, opacity: reached ? 1 : 0.45 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Text style={styles.chapterNumber}>{String(ch.number).padStart(2, '0')}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{reached ? ch.title : '???'}</Text>
                {reached && <Text style={type.uiSmall}>{t('memories.explored', { n: prog.seen, total: prog.total })}</Text>}
              </View>
            </View>
            {reached && <Bar value={prog.seen} max={prog.total} color={colors.mossBright} />}
            {reached && unlocked && (
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button label={t('memories.tree')} compact variant="secondary" icon="map" style={{ flex: 1 }} onPress={() => setOpen(ch.id)} />
                {starts.includes(ch.id) && (
                  <Button
                    label={t('memories.replay')}
                    compact
                    variant="secondary"
                    icon="back"
                    style={{ flex: 1 }}
                    onPress={() => {
                      setPendingChapter(ch.id);
                      openSaves('new');
                    }}
                  />
                )}
              </View>
            )}
          </Panel>
        );
      })}
      <ChoiceTree chapter={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** Arbre des choix d'un chapitre : scènes vues, choix explorés ou non (sans révéler l'inconnu). */
function ChoiceTree({ chapter, onClose }: { chapter: ChapterId | null; onClose: () => void }) {
  const { model, content } = useStore();
  const t = useT();
  const def = content.chapters.find((c) => c.id === chapter);
  const scenes = chapter ? Object.values(content.scenes).filter((s) => s.chapter === chapter) : [];
  const seen = new Set(model.meta.scenes);
  return (
    <Sheet visible={!!def} onClose={onClose} title={def ? t('memories.treeOf', { title: def.title }) : ''}>
      <View style={{ gap: space.sm }}>
        <Text style={type.uiSmall}>{t('memories.treeHint')}</Text>
        {scenes.map((s) => {
          if (!seen.has(s.id))
            return (
              <View key={s.id} style={[styles.treeScene, { opacity: 0.4 }]}>
                <Icon name="lock" size={12} color={colors.textFaint} />
                <Text style={type.uiSmall}>{t('memories.unseenScene')}</Text>
              </View>
            );
          const choices = choiceTargets(content, s.id).filter((c) => c.targets.length);
          return (
            <View key={s.id} style={styles.treeScene}>
              <Text style={[type.ui, { fontFamily: fonts.uiBold, fontSize: 14 }]}>{s.title}</Text>
              {choices.map((c) => {
                const done = choiceExplored(model.meta, s.id, c.targets);
                return (
                  <Pressable key={c.choice} style={styles.treeChoice} accessibilityLabel={`${c.text} — ${done ? t('memories.taken') : t('memories.notTaken')}`}>
                    <Icon name={done ? 'check' : 'chevron'} size={12} color={done ? colors.mossBright : colors.textFaint} />
                    <Text style={[type.uiSmall, { flex: 1, fontSize: 12.5, color: done ? colors.text : colors.textDim }]}>{c.text}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  medal: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  person: { width: '48%', flexGrow: 1, alignItems: 'center', gap: 6, padding: space.md },
  blank: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.panelRaised },
  chapterNumber: { fontFamily: fonts.mono, fontSize: 18, color: colors.rustBright, width: 30 },
  treeScene: { gap: 4, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  treeChoice: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingLeft: 6 },
});
