/**
 * Le récit : image d'en-tête (ou illustration plein cadre aux moments clés),
 * narration, dialogues avec portraits, jet de dés, conséquences et choix.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { checkBreakdown } from '../../engine/character';
import { choiceViews, choose, type ChoiceView, visibleText } from '../../engine/narrative';
import { checkProbability } from '../../engine/rules';
import type { GameState, TextBlock } from '../../engine/types';
import { type T, useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Illustration, isIllustration } from '../../ui/art/Illustrations';
import { PlayerPortrait, Portrait, PORTRAITS } from '../../ui/art/Portraits';
import { SceneryBanner } from '../../ui/art/Scenery';
import { chanceColor, ChoiceCard } from '../../ui/components/ChoiceCard';
import { Glass } from '../../ui/components/Glass';
import { useChrome } from '../../ui/components/Hud';
import { NoticeList } from '../../ui/components/Notices';
import { Layer, Sheet } from '../../ui/components/Sheet';
import { Button, FadeIn, IconButton, Label, Panel, withAlpha } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_READING, MAX_SCALE_UI, radius, space, type } from '../../ui/theme';
import { ContextHint } from '../../ui/components/ContextHint';
import { consume, countdownKey, forget, remainingMs, TICK_MS } from '../../ui/countdown';
import { useStoryBlocked } from '../../ui/interaction';

function DialogueLine({ block, game, scale, paper }: { block: TextBlock; game: GameState; scale: number; paper?: boolean }) {
  const { content } = useStore();
  const isMe = block.speaker === 'moi' || (!!game.hero && block.speaker === game.hero);
  const ch = !isMe && block.speaker ? content.characters[block.speaker] : null;
  const name = isMe ? game.player.name : ch?.name ?? '';
  const color = isMe ? colors.paperDim : ch?.color ?? colors.textDim;
  return (
    <View style={[styles.dialogue, isMe && styles.dialogueMe]}>
      {!isMe && (block.speaker && PORTRAITS[block.speaker] ? <Portrait id={block.speaker} size={36} /> : <View style={[styles.initials, { backgroundColor: color }]} />)}
      <View style={{ flex: 1, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <Text style={[type.label, { color: paper ? colors.paperInk : color, marginBottom: 5 }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
          {name}
        </Text>
        {paper ? (
          <View style={[styles.bubble, styles.bubblePaper, isMe ? styles.bubbleMe : styles.bubbleThem, { borderLeftColor: isMe ? 'transparent' : color }]}>
            <Text style={[styles.dialogueText, { color: colors.paperInk, fontSize: 17 * scale, lineHeight: 26 * scale }]} maxFontSizeMultiplier={MAX_SCALE_READING}>
              {block.text}
            </Text>
          </View>
        ) : (
          <Glass radius={radius.lg} tone={isMe ? 'clear' : 'default'} style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, { borderLeftColor: isMe ? 'transparent' : color }]}>
            <Text style={[styles.dialogueText, { fontSize: 17 * scale, lineHeight: 26 * scale }]} maxFontSizeMultiplier={MAX_SCALE_READING}>
              {block.text}
            </Text>
          </Glass>
        )}
      </View>
      {isMe && <PlayerPortrait profile={game.player.profile} size={36} />}
    </View>
  );
}

function CheckResult({ game }: { game: GameState }) {
  const { content } = useStore();
  const t = useT();
  const c = game.lastCheck;
  if (!c) return null;
  const color = c.success ? colors.mossBright : colors.rustBright;
  const statName = content.statLabels[c.stat];
  return (
    <FadeIn>
      <Glass
        radius={radius.lg}
        style={styles.check}
        tone={c.success ? 'default' : 'danger'}
      >
        <View
          style={styles.checkRow}
          accessible
          accessibilityLabel={t('check.a11y', { stat: statName, total: c.total, diff: c.difficulty, result: t(c.success ? 'check.success' : 'check.failure') })}
        >
          <View style={styles.dice}>
            {c.roll.map((d, i) => (
              <View key={i} style={[styles.die, { backgroundColor: withAlpha(color, 0.14) }]}>
                <Text style={[styles.dieText, { color }]}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.checkTitle, { color }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
              {t(c.success ? 'check.success' : 'check.failure')}
            </Text>
            <Text style={[type.uiSmall, { fontFamily: fonts.mono, fontSize: 12 }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
              {statName} · {c.roll[0]}+{c.roll[1]}+{c.total - c.roll[0] - c.roll[1]} = {c.total} / {c.difficulty}
            </Text>
          </View>
        </View>
      </Glass>
    </FadeIn>
  );
}

/** Détail des chances d'un jet : bonus et distribution des 2d6. */
export function RollDetail({ view, game, t }: { view: ChoiceView; game: GameState; t: T }) {
  const { content } = useStore();
  const check = view.choice.check!;
  const b = checkBreakdown(content, game, check.stat);
  const bg = content.backgrounds[game.player.background];
  const statName = content.statLabels[check.stat];
  const rows: [string, number][] = [
    [statName, b.base],
    [t('roll.equipment'), b.equipment],
    [t('roll.cap'), b.cap],
    [t('roll.perk'), b.perk],
    [bg?.name ?? t('roll.background'), b.background],
  ];
  const need = check.difficulty - b.total;
  // Distribution 2d6 : nombre de façons d'obtenir chaque total.
  const sums = Array.from({ length: 11 }, (_, i) => i + 2);
  const ways = (s: number) => 6 - Math.abs(s - 7);
  const pct = Math.round(checkProbability(b.total, check.difficulty) * 100);
  return (
    <View style={{ gap: space.md }}>
      <Text style={type.bodySmall}>{t('roll.intro', { stat: statName, diff: check.difficulty })}</Text>
      <Glass radius={radius.md} style={{ padding: space.md, gap: 6 }}>
        {rows
          .filter(([, v], i) => i === 0 || v !== 0)
          .map(([label, v]) => (
            <View key={label} style={styles.rollRow}>
              <Text style={[type.ui, { flex: 1 }]}>{label}</Text>
              <Text style={[type.number, { color: v < 0 ? colors.rustBright : colors.text }]}>{v >= 0 ? `+${v}` : v}</Text>
            </View>
          ))}
        <View style={[styles.rollRow, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 6 }]}>
          <Text style={[type.ui, { flex: 1, fontFamily: fonts.uiBold }]}>{t('roll.bonus')}</Text>
          <Text style={[type.number, { fontFamily: fonts.mono }]}>+{b.total}</Text>
        </View>
      </Glass>
      <Text style={type.uiSmall}>{need <= 2 ? t('roll.auto') : need > 12 ? t('roll.impossible') : t('roll.need', { n: need })}</Text>
      <View style={styles.histo} accessible accessibilityLabel={t('roll.histoA11y', { pct })}>
        {sums.map((s) => {
          const ok = s + b.total >= check.difficulty;
          return (
            <View key={s} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ height: ways(s) * 12, width: '78%', borderRadius: 4, backgroundColor: ok ? chanceColor(pct / 100) : 'rgba(255,248,240,0.12)' }} />
              <Text style={[styles.histoLabel, ok && { color: colors.text }]}>{s}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.rollPct, { color: chanceColor(pct / 100) }]}>{pct} %</Text>
    </View>
  );
}

/** Application au premier plan ? (iOS suspend les minuteries en arrière-plan.) */
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active' || AppState.currentState == null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => setActive(st === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/**
 * Compte à rebours d'une scène chronométrée, avec sa barre. Il ne compte que le
 * temps où le joueur peut réellement choisir (voir ui/countdown.ts) et ne
 * redessine que la barre, pas tout le récit.
 */
function TimedChoice({ active, seconds, timerKey, label, onExpire }: { active: boolean; seconds: number; timerKey: string; label: string; onExpire: () => void }) {
  const total = seconds * 1000;
  const [left, setLeft] = useState(() => ({ key: timerKey, ms: remainingMs(timerKey, total) }));
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    let fired = false;
    const id = setInterval(() => {
      const now = Date.now();
      const ms = consume(timerKey, total, now - last);
      last = now;
      setLeft({ key: timerKey, ms });
      if (ms === 0 && !fired) {
        fired = true;
        clearInterval(id);
        forget(timerKey);
        expire.current();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, total, timerKey]);
  // Sur une nouvelle scène, on repart du temps mémorisé pour celle-ci.
  const ms = left.key === timerKey ? left.ms : remainingMs(timerKey, total);
  return <TimerBar ms={ms} total={total} label={label} />;
}

function TimerBar({ ms, total, label }: { ms: number; total: number; label: string }) {
  const ratio = Math.max(0, Math.min(1, ms / total));
  const color = ratio < 0.3 ? colors.blood : colors.rust;
  return (
    <View style={styles.timer} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <View style={styles.timerHead}>
        <Icon name="clock" size={13} color={color} strokeWidth={2.2} />
        <Text style={[type.label, { color, flex: 1 }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
          {label}
        </Text>
        <Text style={[type.number, { color, fontSize: 13 }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
          {Math.ceil(ms / 1000)} s
        </Text>
      </View>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function StoryView({ game }: { game: GameState }) {
  const { content, update, model, feedback, reduceMotion, setTab } = useStore();
  const t = useT();
  const chrome = useChrome();
  const { width } = useWindowDimensions();
  const scene = content.scenes[game.currentScene];
  const scale = model.settings.textScale;
  const paper = model.settings.paperReading;
  const blocks = useMemo(() => (scene ? visibleText(content, game, scene) : []), [content, game, scene]);
  const views = useMemo(() => choiceViews(content, game), [content, game]);
  // Le choix sélectionné n'est valable que pour le tour où il a été fait.
  const [selection, setSelection] = useState<{ id: string; turn: number; scene: string } | null>(null);
  const selected = selection && selection.turn === game.turn && selection.scene === game.currentScene ? selection.id : null;
  const [info, setInfo] = useState<ChoiceView | null>(null);
  const [fullArt, setFullArt] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const location = scene ? content.locations[scene.location] : null;
  const chapter = content.chapters.find((c) => c.id === scene?.chapter);
  const groundItems = Object.entries(game.ground);
  const art = scene?.illustration && isIllustration(scene.illustration) ? scene.illustration : null;

  // Avec un lecteur d'écran, les choix ne sont jamais chronométrés.
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => alive && setScreenReader(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (v: boolean) => setScreenReader(v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  // Nouvelle scène : on remonte en haut.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [game.currentScene, game.turn]);

  const sceneId = game.currentScene;
  // Verrou immédiat : deux appuis dans la même image (ou appui + fin du compte à rebours)
  // ne peuvent pas jouer deux fois, même avant que l'état « choisi » soit affiché.
  const lock = useRef<string | null>(null);
  const onChoose = (choiceId: string) => {
    const turnKey = `${game.id}:${game.turn}:${sceneId}`;
    if (selected || lock.current === turnKey) return;
    lock.current = turnKey;
    setSelection({ id: choiceId, turn: game.turn, scene: sceneId });
    feedback('light');
    const apply = () => {
      update((g) => {
        const res = choose(content, g, sceneId, choiceId);
        return res.ok ? res.state : g;
      });
      // Si le choix a été refusé (état changé entre-temps), les choix redeviennent actifs.
      setSelection(null);
      lock.current = null;
    };
    if (reduceMotion) apply();
    else setTimeout(apply, 240);
  };

  const timed = scene?.timed && model.settings.timedChoices && !screenReader ? scene.timed : null;
  const blocked = useStoryBlocked();
  const appActive = useAppActive();
  const timerKey = countdownKey(game.id, sceneId, game.turn);
  const onTimeout = () => {
    if (timed) {
      feedback('error');
      onChoose(timed.fallback);
    }
  };

  if (!scene) {
    return (
      <View style={{ padding: space.lg }}>
        <Text style={type.body}>{t('story.missing')}</Text>
      </View>
    );
  }

  const isChapterEnd = scene.kind === 'chapterEnd';
  const chapterEvents = isChapterEnd ? game.chronicle.filter((c) => c.chapter === scene.chapter && c.major) : [];
  const heroH = (art ? Math.min(560, width * 1.15) : 250) + chrome.top * 0.6;

  return (
    <>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: chrome.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ height: heroH, marginBottom: -space.xxxl }}>
          {art ? (
            <Pressable style={{ flex: 1 }} onPress={() => setFullArt(true)} accessibilityRole="imagebutton" accessibilityLabel={t('story.expandArt')}>
              <Illustration id={art} />
            </Pressable>
          ) : (
            location && <SceneryBanner location={location.id} regionIndex={content.regions.indexOf(location.region)} height={heroH} width={width} />
          )}
          <LinearGradient pointerEvents="none" colors={['rgba(11,10,10,0)', 'rgba(11,10,10,0.55)', colors.bg]} locations={[0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />
          {art && (
            <View style={styles.expand}>
              <IconButton icon="expand" label={t('story.expandArt')} onPress={() => setFullArt(true)} size={16} />
            </View>
          )}
        </View>
        <View style={styles.content}>
          <FadeIn key={`h-${scene.id}`}>
            <Label color={colors.rustBright}>
              {chapter ? `${t('story.chapter', { n: chapter.number })} · ` : ''}
              {location?.name}
            </Label>
            <Text style={[type.h1, styles.title]} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
              {scene.title}
            </Text>
          </FadeIn>

          <CheckResult game={game} />
          <NoticeList notices={game.notices} />

          {game.player.unspentStatPoints + game.player.unspentPerks > 0 && (
            <Panel tone="accent" style={styles.inline}>
              <Icon name="star" size={18} color={colors.amber} />
              <Text style={[type.ui, { flex: 1 }]}>{t('story.progression')}</Text>
              <Button label={t('tab.character')} compact variant="primary" onPress={() => setTab('character')} />
            </Panel>
          )}

          {isChapterEnd && (
            <Panel tone="paper" taped style={{ marginBottom: space.xl }}>
              <Label color={colors.paperInk}>{t('story.chapterEnd', { n: chapter?.number ?? '' })}</Label>
              <Text style={[type.h2, { color: colors.paperInk, marginTop: 4, marginBottom: space.sm }]}>{chapter?.title}</Text>
              {chapterEvents.length === 0 ? (
                <Text style={[type.bodySmall, { color: colors.paperInk }]}>{t('story.quietChapter')}</Text>
              ) : (
                chapterEvents.map((e) => (
                  <Text key={e.id} style={[type.bodySmall, { color: colors.paperInk }]}>
                    — {e.text}
                  </Text>
                ))
              )}
            </Panel>
          )}

          <View style={paper ? styles.paperPage : undefined}>
            {blocks.map((b, i) => (
              <FadeIn key={`${scene.id}-${i}`} delay={Math.min(i, 6) * 80}>
                {b.speaker ? (
                  <DialogueLine block={b} game={game} scale={scale} paper={paper} />
                ) : (
                  <Text
                    style={[styles.paragraph, i === 0 && styles.lead, paper && { color: colors.paperInk }, { fontSize: (i === 0 ? 19.5 : 18) * scale, lineHeight: (i === 0 ? 31 : 29) * scale }]}
                    maxFontSizeMultiplier={MAX_SCALE_READING}
                  >
                    {b.text}
                  </Text>
                )}
              </FadeIn>
            ))}
          </View>

          {groundItems.length > 0 && (
            <Panel tone="danger" style={[styles.inline, { marginTop: space.md }]}>
              <Icon name="weight" size={18} color={colors.amber} />
              <Text style={[type.ui, { flex: 1 }]}>
                {t('story.ground', { items: groundItems.map(([id, q]) => `${content.items[id]?.name ?? id}${q > 1 ? ` ×${q}` : ''}`).join(', ') })}
              </Text>
              <Button label={t('tab.inventory')} compact variant="secondary" onPress={() => setTab('inventory')} />
            </Panel>
          )}

          <View style={styles.choicesHeader}>
            <Label>{t('story.whatNow')}</Label>
            <View style={styles.rule} />
          </View>
          {timed && !selected && <ContextHint id="timed" style={{ marginBottom: space.sm }} />}
          {timed && !selected && <TimedChoice active={!info && !blocked && appActive} seconds={timed.seconds} timerKey={timerKey} label={t('story.timed')} onExpire={onTimeout} />}
          <View style={{ gap: space.sm + 2 }}>
            {views.map((v, i) => (
              <FadeIn key={`${scene.id}-${v.choice.id}`} delay={140 + Math.min(i, 6) * 60}>
                <ChoiceCard
                  view={v}
                  index={i}
                  textScale={scale}
                  statLabel={v.choice.check ? content.statLabels[v.choice.check.stat] : undefined}
                  highlight={!!timed && v.choice.id === timed.fallback}
                  state={selected === null ? 'idle' : selected === v.choice.id ? 'selected' : 'dimmed'}
                  onPress={() => onChoose(v.choice.id)}
                  onChanceInfo={v.choice.check ? () => setInfo(v) : undefined}
                />
              </FadeIn>
            ))}
          </View>
          {timed && !selected && (
            <Text style={[type.uiSmall, { marginTop: space.sm, textAlign: 'center' }]}>
              {t('story.timedHint', { choice: views.find((v) => v.choice.id === timed.fallback)?.text ?? '' })}
            </Text>
          )}
        </View>
      </ScrollView>

      <Sheet visible={!!info} onClose={() => setInfo(null)} title={t('roll.title')}>
        {info && <RollDetail view={info} game={game} t={t} />}
      </Sheet>

      <Layer visible={fullArt && !!art} animation={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setFullArt(false)}>
        <Pressable style={styles.fullArt} onPress={() => setFullArt(false)} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          {art && <Illustration id={art} slice={false} />}
          <Text style={styles.fullCaption}>{scene.title}</Text>
        </Pressable>
      </Layer>
    </>
  );
}

const styles = StyleSheet.create({
  expand: { position: 'absolute', right: space.lg, bottom: space.xxxl + space.md },
  content: { paddingHorizontal: space.lg + 4 },
  title: { marginTop: 6, marginBottom: space.xl, fontSize: 38, lineHeight: 42 },
  paragraph: { ...type.body, marginBottom: space.lg, color: colors.text },
  lead: { color: colors.text },
  dialogue: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginBottom: space.lg },
  dialogueMe: { paddingLeft: space.xxl },
  initials: { width: 36, height: 36, borderRadius: 18 },
  bubble: { paddingVertical: space.md, paddingHorizontal: space.md + 2, borderLeftWidth: 2 },
  bubblePaper: { borderRadius: radius.lg, backgroundColor: 'rgba(27,23,20,0.06)' },
  paperPage: { backgroundColor: colors.paper, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs, marginBottom: space.md },
  bubbleThem: { borderBottomLeftRadius: 6 },
  bubbleMe: { borderBottomRightRadius: 6, borderLeftWidth: 0 },
  dialogueText: { fontFamily: fonts.bodyItalic, color: colors.text },
  check: { padding: space.md, marginBottom: space.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  checkTitle: { fontFamily: fonts.uiBold, fontSize: 15 },
  dice: { flexDirection: 'row', gap: 6 },
  die: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dieText: { fontFamily: fonts.mono, fontSize: 17 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, marginBottom: space.md },
  choicesHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl, marginBottom: space.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  timer: { marginBottom: space.md, gap: 8 },
  timerHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,248,240,0.08)', overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2 },
  rollRow: { flexDirection: 'row', alignItems: 'center' },
  histo: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 2 },
  histoLabel: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textFaint },
  rollPct: { fontFamily: fonts.title, fontSize: 44, textAlign: 'center' },
  fullArt: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fullCaption: { position: 'absolute', bottom: 48, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.titleItalic, fontSize: 26, color: colors.text },
});
