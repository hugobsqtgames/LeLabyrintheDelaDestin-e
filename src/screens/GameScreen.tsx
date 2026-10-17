/**
 * Écran de jeu : contenu de l'onglet actif sous un bandeau et une barre
 * d'onglets flottants, menu pause, résumé de reprise et transitions de
 * chapitre. Consulter la fiche, le sac ou la carte ne modifie jamais la
 * position dans l'histoire.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { recap } from '../engine/summary';
import type { ChapterDef, GameState } from '../engine/types';
import { useT } from '../i18n';
import { type Tab, useGame, useStore } from '../store/GameStore';
import { Backdrop, Glass } from '../ui/components/Glass';
import { ChromeContext, ClockChip, TabBar, TopBar, useChrome } from '../ui/components/Hud';
import { ConfirmDialog, Layer, Sheet } from '../ui/components/Sheet';
import { Tutorial } from '../ui/components/Tutorial';
import { Button, FadeIn, Label, Screen, Segmented } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { type AuraName, colors, fonts, MAX_SCALE_UI, NATIVE_DRIVER, radius, space, type } from '../ui/theme';
import { ArchivesView } from './game/ArchivesView';
import { CharacterView } from './game/CharacterView';
import { ChronicleView } from './game/ChronicleView';
import { CombatView } from './game/CombatView';
import { EndingView } from './game/EndingView';
import { InventoryView } from './game/InventoryView';
import { MapView } from './game/MapView';
import { QuestsView } from './game/QuestsView';
import { StoryView } from './game/StoryView';

const CHAPTER_AURAS = ['c1', 'c2', 'c3', 'c4'];

/** Ambiance lumineuse d'un chapitre : la sienne, ou celle qu'il emprunte (`aura`). */
function chapterAura(chapter: ChapterDef | undefined): AuraName {
  const id = chapter?.aura ?? chapter?.id ?? '';
  return (CHAPTER_AURAS.includes(id) ? id : 'neutral') as AuraName;
}

function auraFor(game: GameState, chapters: ChapterDef[]): AuraName {
  if (game.ending) return 'ending';
  if (game.combat) return 'combat';
  return chapterAura(chapters.find((c) => c.id === game.chapter));
}

/** « Précédemment » : les faits marquants du chapitre précédent (chronique), au plus trois. */
function previouslyFor(game: GameState, chapter: string, chapters: ChapterDef[]): string[] {
  const i = chapters.findIndex((c) => c.id === chapter);
  if (i <= 0) return [];
  const prev = chapters[i - 1].id;
  return game.chronicle
    .filter((e) => e.major && e.chapter === prev)
    .slice(-3)
    .map((e) => e.text);
}

/** Parties dont le carton d'ouverture a déjà été montré pendant cette session. */
const introduced = new Set<string>();

/** Carton plein écran au début de chaque chapitre. */
function ChapterTransition({ chapter, previously = [], onDone }: { chapter: ChapterDef; previously?: string[]; onDone: () => void }) {
  const { reduceMotion } = useStore();
  const t = useT();
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const previouslyCount = useRef(previously.length);
  // Rappel stable : un nouveau rendu de l'écran ne doit pas relancer le carton.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  // Un double appui sur le choix qui ouvre le chapitre ne doit pas passer le carton aussitôt.
  const [skippable, setSkippable] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSkippable(true), 600);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    const seq = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: reduceMotion ? 0 : 900, useNativeDriver: NATIVE_DRIVER }),
      // Plus long quand le carton rappelle ce qui s'est passé.
      Animated.delay((reduceMotion ? 2600 : 2200) + (previouslyCount.current ? 2600 : 0)),
      Animated.timing(v, { toValue: 2, duration: reduceMotion ? 0 : 700, useNativeDriver: NATIVE_DRIVER }),
    ]);
    seq.start(({ finished }) => finished && done.current());
    return () => seq.stop();
  }, [v, reduceMotion]);
  const opacity = v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] });
  const lift = v.interpolate({ inputRange: [0, 1, 2], outputRange: [24, 0, -12] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 100 }]}>
      <Pressable style={{ flex: 1 }} onPress={() => skippable && onDone()} accessibilityRole="button" accessibilityLabel={t('transition.skip')}>
        <Backdrop aura={chapterAura(chapter)} intensity={1.6} />
        <Animated.View style={[styles.transition, { transform: [{ translateY: lift }] }]}>
          <Label color={colors.rustBright}>{t('story.chapter', { n: String(chapter.number).padStart(2, '0') })}</Label>
          <Text style={styles.transitionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
            {chapter.title}
          </Text>
          <Text style={styles.transitionSub} maxFontSizeMultiplier={MAX_SCALE_UI}>
            {chapter.subtitle}
          </Text>
          <View style={styles.transitionRule} />
          <Text style={[type.label, { textAlign: 'center' }]}>{chapter.region}</Text>
          {previously.length > 0 && (
            <View style={styles.previously}>
              <Label color={colors.textDim}>{t('transition.previously')}</Label>
              {previously.map((line, i) => (
                <Text key={i} style={styles.previouslyLine} maxFontSizeMultiplier={MAX_SCALE_UI}>
                  {line}
                </Text>
              ))}
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Bandeau discret quand un succès vient d'être débloqué. */
function AchievementToast({ title, onDone }: { title: string; onDone: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const id = setTimeout(() => done.current(), 3800);
    return () => clearTimeout(id);
  }, []);
  return (
    <View style={[styles.toastWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable onPress={onDone} accessibilityRole="alert" accessibilityLabel={`${t('achievement.unlocked')} : ${title}`}>
        <FadeIn>
          <Glass radius={radius.pill} tone="strong" style={styles.toast}>
            <Icon name="star" size={16} color={colors.amber} />
            <Text style={[type.label, { color: colors.amber }]}>{t('achievement.unlocked')}</Text>
            <Text style={[type.ui, { fontFamily: fonts.uiBold, flexShrink: 1 }]} numberOfLines={1}>
              {title}
            </Text>
          </Glass>
        </FadeIn>
      </Pressable>
    </View>
  );
}

function RecapSheet({ game, visible, onClose }: { game: GameState; visible: boolean; onClose: () => void }) {
  const { content } = useStore();
  const t = useT();
  const r = recap(content, game);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('recap.title')} footer={<Button label={t('recap.resume')} icon="chevron" onPress={onClose} style={{ marginTop: space.sm }} />}>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          {r.chapter && <Label color={colors.rustBright}>{t('story.chapter', { n: r.chapter.number })} · {r.chapter.title}</Label>}
          <ClockChip clock={r.clock} />
        </View>
        <Text style={type.h2}>
          {r.sceneTitle}
          {r.location && r.location !== r.sceneTitle ? <Text style={[type.h2, { color: colors.textDim, fontFamily: fonts.titleItalic }]}> — {r.location}</Text> : null}
        </Text>
        {r.objective && (
          <View style={styles.recapRow}>
            <Icon name="quest" size={16} color={colors.amber} />
            <Text style={[type.ui, { flex: 1 }]}>{r.objective}</Text>
          </View>
        )}
        {r.companions.length > 0 && (
          <View style={styles.recapRow}>
            <Icon name="person" size={16} color={colors.mossBright} />
            <Text style={[type.ui, { flex: 1 }]}>{t('recap.with', { names: r.companions.join(', ') })}</Text>
          </View>
        )}
        {r.recent.length > 0 && (
          <View style={{ gap: 6 }}>
            <Label>{t('recap.recent')}</Label>
            {r.recent.map((line, i) => (
              <Text key={i} style={type.bodySmall}>
                — {line}
              </Text>
            ))}
          </View>
        )}
        {r.lastDiary && (
          <View style={styles.recapDiary}>
            <Text style={[type.label, { color: 'rgba(27,23,20,0.72)' }]}>{t('archives.diary')}</Text>
            <Text style={styles.recapDiaryText} numberOfLines={5}>
              {r.lastDiary}
            </Text>
          </View>
        )}
      </View>
    </Sheet>
  );
}

function JournalView({ game, tab, setTab }: { game: GameState; tab: Tab; setTab: (t: Tab) => void }) {
  const t = useT();
  const chrome = useChrome();
  const docs = game.documents.length;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: chrome.top + space.xs, paddingHorizontal: space.lg, paddingBottom: space.xs }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: 'quests', label: t('tab.quests') },
            { id: 'chronicle', label: t('tab.chronicle') },
            { id: 'archives', label: t('tab.archives'), badge: docs || undefined },
          ]}
        />
      </View>
      <ChromeContext.Provider value={{ top: 0, bottom: chrome.bottom }}>
        {tab === 'quests' ? <QuestsView game={game} /> : tab === 'chronicle' ? <ChronicleView game={game} /> : <ArchivesView game={game} />}
      </ChromeContext.Provider>
    </View>
  );
}

export function GameScreen({
  initialPaused = false,
  intro,
  tutorialStep,
}: {
  initialPaused?: boolean;
  /** Forcer (ou masquer) le carton de chapitre à l'ouverture. */
  intro?: boolean;
  /** Étape initiale du tutoriel (maquettes). */
  tutorialStep?: number;
}) {
  const game = useGame();
  const { model, content, setTab, go, openSaves, closeGame, dismissRecap, setSettings, restoreBeforeRelay, dismissUnlocked } = useStore();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const t = useT();
  const [paused, setPaused] = useState(initialPaused);
  const [topH, setTopH] = useState(110);
  const [tutorialIndex, setTutorialIndex] = useState(tutorialStep ?? 0);
  const insets = useSafeAreaInsets();
  const tab = model.tab;

  // Transition de chapitre : à chaque changement de chapitre, et au tout début d'une partie.
  const [seenChapter, setSeenChapter] = useState<string | null>(() => {
    if (intro !== undefined) return intro ? null : game.chapter;
    // Retour des paramètres (l'écran est remonté) : le carton déjà vu ne se rejoue pas.
    if (introduced.has(game.id)) return game.chapter;
    return game.turn === 0 && !model.recap ? null : game.chapter;
  });
  const [transition, setTransition] = useState<string | null>(null);
  if (seenChapter !== game.chapter) {
    setSeenChapter(game.chapter);
    introduced.add(game.id);
    if (!game.ending) setTransition(game.chapter);
  }
  const transitionChapter = transition ? content.chapters.find((c) => c.id === transition) : null;

  // Retour matériel Android : onglet → récit → pause. Jamais de sortie silencieuse.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (paused) setPaused(false);
      else if (tab !== 'story') setTab('story');
      else setPaused(true);
      return true;
    });
    return () => sub.remove();
  }, [paused, tab, setTab]);

  const p = game.player;
  const badges = {
    character: p.unspentStatPoints + p.unspentPerks > 0,
    inventory: Object.keys(game.ground).length > 0,
  };

  let body: React.ReactNode;
  if (tab === 'story') {
    if (game.ending) body = <EndingView game={game} />;
    else if (game.combat) body = <CombatView game={game} />;
    else body = <StoryView game={game} />;
  } else if (tab === 'character') body = <CharacterView game={game} />;
  else if (tab === 'inventory') body = <InventoryView game={game} />;
  else if (tab === 'map') body = <MapView game={game} />;
  else body = <JournalView game={game} tab={tab} setTab={setTab} />;

  const chrome = { top: topH + space.sm, bottom: insets.bottom + 96 };

  return (
    <Screen padded={false} edges={[]} aura={auraFor(game, content.chapters)}>
      <ChromeContext.Provider value={chrome}>
        <View style={{ flex: 1 }}>{body}</View>
      </ChromeContext.Provider>

      <View style={[styles.topLayer, { paddingTop: insets.top }]} onLayout={(e) => setTopH(e.nativeEvent.layout.height)} pointerEvents="box-none">
        {/* Le texte qui défile ne passe pas sous l'heure et les icônes de la barre d'état. */}
        <LinearGradient
          colors={['rgba(11,10,10,0.94)', 'rgba(11,10,10,0.7)', 'rgba(11,10,10,0)']}
          locations={[0, 0.6, 1]}
          style={[styles.statusScrim, { height: insets.top + 28 }]}
          pointerEvents="none"
        />
        <TopBar game={game} onPause={() => setPaused(true)} />
        {model.saveError && (
          <View style={styles.saveError}>
            <Text style={[type.uiSmall, { color: colors.text }]}>{t('game.saveError', { error: model.saveError })}</Text>
          </View>
        )}
      </View>
      <View style={[styles.bottomLayer, { paddingBottom: insets.bottom + space.sm }]} pointerEvents="box-none">
        <TabBar tab={tab} onChange={setTab} badges={badges} />
      </View>

      <Sheet visible={paused} onClose={() => setPaused(false)} title={t('pause.title')}>
        <Text style={[type.bodySmall, { marginBottom: space.lg }]}>
          {model.slot !== null ? t('pause.autosave', { slot: model.slot }) : t('pause.demo')}
        </Text>
        <View style={{ gap: space.sm }}>
          <Button label={t('pause.resume')} icon="chevron" onPress={() => setPaused(false)} />
          {model.slot !== null && (
            <Button
              label={t('pause.copy')}
              icon="save"
              variant="secondary"
              onPress={() => {
                setPaused(false);
                openSaves('copy');
              }}
            />
          )}
          {model.slot !== null && game.fallen.length > 0 && (
            <Button
              label={t('pause.beforeRelay')}
              icon="back"
              variant="secondary"
              onPress={() => {
                setPaused(false);
                setConfirmRestore(true);
              }}
            />
          )}
          <Button
            label={t('title.settings')}
            icon="gear"
            variant="secondary"
            onPress={() => {
              setPaused(false);
              go('settings');
            }}
          />
          <Button
            label={t('pause.quit')}
            variant="ghost"
            onPress={() => {
              setPaused(false);
              closeGame();
            }}
          />
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmRestore}
        title={t('saves.confirmRestore')}
        message={t('saves.confirm.restore', { slot: model.slot ?? '' })}
        confirmLabel={t('saves.restore')}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => {
          setConfirmRestore(false);
          if (model.slot !== null) restoreBeforeRelay(model.slot).catch(() => undefined);
        }}
      />

      <RecapSheet game={game} visible={model.recap && !transitionChapter && !paused && model.settings.tutorialDone} onClose={dismissRecap} />

      {model.unlocked.length > 0 && !transitionChapter && <AchievementToast key={model.unlocked[0].id} title={model.unlocked[0].title} onDone={dismissUnlocked} />}

      {!model.settings.tutorialDone && !transitionChapter && !paused && (
        <Tutorial topHeight={topH} initialStep={tutorialIndex} onStep={setTutorialIndex} onDone={() => setSettings({ tutorialDone: true })} />
      )}

      {transitionChapter && (
        <Layer visible animation="none" onRequestClose={() => setTransition(null)}>
          <ChapterTransition chapter={transitionChapter} previously={previouslyFor(game, transitionChapter.id, content.chapters)} onDone={() => setTransition(null)} />
        </Layer>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  previously: { marginTop: space.xl, gap: 6, maxWidth: 340, alignItems: 'center' },
  previouslyLine: { fontFamily: fonts.bodyItalic, fontSize: 15, lineHeight: 21, color: colors.textDim, textAlign: 'center' },
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', zIndex: 50 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  topLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomLayer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  saveError: { backgroundColor: 'rgba(255,84,104,0.25)', marginHorizontal: space.md, borderRadius: 12, paddingHorizontal: space.md, paddingVertical: 6 },
  transition: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.xl, gap: space.sm },
  transitionTitle: { fontFamily: fonts.title, fontSize: 58, lineHeight: 60, color: colors.text, textAlign: 'center', letterSpacing: -1 },
  transitionSub: { fontFamily: fonts.titleItalic, fontSize: 22, lineHeight: 28, color: colors.textDim, textAlign: 'center' },
  transitionRule: { width: 40, height: 1, backgroundColor: colors.lineStrong, marginVertical: space.md },
  recapRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  recapDiary: { backgroundColor: colors.paper, borderRadius: 14, padding: space.md, gap: 4 },
  recapDiaryText: { fontFamily: fonts.bodyItalic, fontSize: 15.5, lineHeight: 23, color: colors.paperInk },
});
