/**
 * Le récit : narration, dialogues, jet de dés, conséquences et choix.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { choiceViews, choose, visibleText } from '../../engine/narrative';
import { STAT_LABELS } from '../../engine/rules';
import type { GameState, TextBlock } from '../../engine/types';
import { useStore } from '../../store/GameStore';
import { SceneryBanner } from '../../ui/art/Scenery';
import { ChoiceCard } from '../../ui/components/ChoiceCard';
import { NoticeList } from '../../ui/components/Notices';
import { Badge, Button, FadeIn, Label, Panel } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, radius, space, type } from '../../ui/theme';

function DialogueLine({ block, game, scale }: { block: TextBlock; game: GameState; scale: number }) {
  const { content } = useStore();
  const isMe = block.speaker === 'moi';
  const ch = !isMe && block.speaker ? content.characters[block.speaker] : null;
  const name = isMe ? game.player.name : ch?.name ?? '';
  const color = isMe ? colors.paperDim : ch?.color ?? colors.textDim;
  return (
    <View style={[styles.dialogue, isMe && styles.dialogueMe, { borderLeftColor: color }]}>
      <View style={styles.speakerRow}>
        <View style={[styles.initials, { backgroundColor: color }]}>
          <Text style={styles.initialsText}>{isMe ? 'VOUS' : ch?.initials ?? '?'}</Text>
        </View>
        <Text style={[type.label, { color }]}>{name}</Text>
      </View>
      <Text style={[styles.dialogueText, { fontSize: 17 * scale, lineHeight: 27 * scale }]}>{block.text}</Text>
    </View>
  );
}

function CheckResult({ game }: { game: GameState }) {
  const c = game.lastCheck;
  if (!c) return null;
  const color = c.success ? colors.mossBright : colors.rustBright;
  return (
    <FadeIn>
      <View style={[styles.check, { borderColor: color }]} accessible accessibilityLabel={`Jet de ${STAT_LABELS[c.stat]} : ${c.total} contre ${c.difficulty}, ${c.success ? 'réussite' : 'échec'}`}>
        <View style={styles.dice}>
          {c.roll.map((d, i) => (
            <View key={i} style={[styles.die, { borderColor: color }]}>
              <Text style={[styles.dieText, { color }]}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.label, { color }]}>{c.success ? 'Réussite' : 'Échec'}</Text>
          <Text style={type.uiSmall}>
            {STAT_LABELS[c.stat]} : {c.roll[0]} + {c.roll[1]} + bonus = {c.total} (seuil {c.difficulty})
          </Text>
        </View>
      </View>
    </FadeIn>
  );
}

export function StoryView({ game }: { game: GameState }) {
  const { content, update, model, feedback, reduceMotion, setTab } = useStore();
  const scene = content.scenes[game.currentScene];
  const scale = model.settings.textScale;
  const blocks = useMemo(() => (scene ? visibleText(content, game, scene) : []), [content, game, scene]);
  const views = useMemo(() => choiceViews(content, game), [content, game]);
  // Le choix sélectionné n'est valable que pour le tour où il a été fait.
  const [selection, setSelection] = useState<{ id: string; turn: number; scene: string } | null>(null);
  const selected = selection && selection.turn === game.turn && selection.scene === game.currentScene ? selection.id : null;
  const scroll = useRef<ScrollView>(null);
  const location = scene ? content.locations[scene.location] : null;
  const chapter = content.chapters.find((c) => c.id === scene?.chapter);
  const groundItems = Object.entries(game.ground);

  // Nouvelle scène : on remonte en haut.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [game.currentScene, game.turn]);

  if (!scene) {
    return (
      <View style={{ padding: space.lg }}>
        <Text style={type.body}>Scène introuvable.</Text>
      </View>
    );
  }

  const onChoose = (choiceId: string) => {
    if (selected) return; // Double appui ignoré (le moteur refuse aussi tout choix périmé).
    setSelection({ id: choiceId, turn: game.turn, scene: game.currentScene });
    feedback('light');
    const sceneId = game.currentScene;
    const apply = () => {
      update((g) => {
        const res = choose(content, g, sceneId, choiceId);
        return res.ok ? res.state : g;
      });
      // Si le choix a été refusé (état changé entre-temps), les choix redeviennent actifs.
      setSelection(null);
    };
    if (reduceMotion) apply();
    else setTimeout(apply, 220);
  };

  const isChapterEnd = scene.kind === 'chapterEnd';
  const chapterEvents = isChapterEnd ? game.chronicle.filter((c) => c.chapter === scene.chapter && c.major) : [];

  return (
    <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
      {location && <SceneryBanner location={location.id} region={location.region} height={130} />}
      <View style={styles.content}>
        <FadeIn key={`h-${scene.id}`}>
          <Label color={colors.rustBright}>
            {chapter ? `Chapitre ${chapter.number} · ` : ''}
            {location?.name}
          </Label>
          <Text style={[type.h1, { marginTop: 4, marginBottom: space.lg }]} accessibilityRole="header">
            {scene.title}
          </Text>
        </FadeIn>

        <CheckResult game={game} />
        <NoticeList notices={game.notices} />

        {game.player.unspentStatPoints + game.player.unspentPerks > 0 && (
          <Panel tone="raised" style={styles.inline}>
            <Icon name="star" size={18} color={colors.amber} />
            <Text style={[type.ui, { flex: 1 }]}>Progression disponible : attribuez vos points.</Text>
            <Button label="Fiche" compact variant="secondary" onPress={() => setTab('character')} />
          </Panel>
        )}

        {isChapterEnd && (
          <Panel tone="paper" taped style={{ marginBottom: space.xl }}>
            <Text style={[type.h2, { color: colors.paperInk }]}>Fin du chapitre {chapter?.number}</Text>
            <Text style={[type.bodySmall, { color: colors.paperInk, marginBottom: space.sm }]}>{chapter?.title}</Text>
            {chapterEvents.length === 0 ? (
              <Text style={[type.bodySmall, { color: colors.paperInk }]}>Un chapitre sans éclat. Vous êtes en vie.</Text>
            ) : (
              chapterEvents.map((e) => (
                <Text key={e.id} style={[type.bodySmall, { color: colors.paperInk }]}>
                  — {e.text}
                </Text>
              ))
            )}
          </Panel>
        )}

        {blocks.map((b, i) => (
          <FadeIn key={`${scene.id}-${i}`} delay={Math.min(i, 6) * 70}>
            {b.speaker ? (
              <DialogueLine block={b} game={game} scale={scale} />
            ) : (
              <Text style={[styles.paragraph, { fontSize: 17 * scale, lineHeight: 28 * scale }]}>{b.text}</Text>
            )}
          </FadeIn>
        ))}

        {groundItems.length > 0 && (
          <Panel tone="danger" style={[styles.inline, { marginTop: space.md }]}>
            <Icon name="weight" size={18} color={colors.amber} />
            <Text style={[type.ui, { flex: 1 }]}>
              Au sol : {groundItems.map(([id, q]) => `${content.items[id]?.name ?? id}${q > 1 ? ` ×${q}` : ''}`).join(', ')}. Ils seront perdus si vous partez.
            </Text>
            <Button label="Sac" compact variant="secondary" onPress={() => setTab('inventory')} />
          </Panel>
        )}

        <View style={styles.choicesHeader}>
          <View style={styles.rule} />
          <Badge label="Que faites-vous ?" color={colors.textFaint} />
          <View style={styles.rule} />
        </View>
        <View style={{ gap: space.sm }}>
          {views.map((v, i) => (
            <FadeIn key={`${scene.id}-${v.choice.id}`} delay={120 + Math.min(i, 6) * 50}>
              <ChoiceCard
                view={v}
                textScale={scale}
                state={selected === null ? 'idle' : selected === v.choice.id ? 'selected' : 'dimmed'}
                onPress={() => onChoose(v.choice.id)}
              />
            </FadeIn>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, marginTop: -space.xl },
  paragraph: { ...type.body, marginBottom: space.md, color: colors.text },
  dialogue: {
    borderLeftWidth: 3,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.md,
  },
  dialogueMe: { backgroundColor: 'transparent', marginLeft: space.xl },
  speakerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 4 },
  initials: { minWidth: 26, height: 20, borderRadius: 3, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontFamily: fonts.uiBold, fontSize: 11, color: colors.bgDeep, letterSpacing: 0.5 },
  dialogueText: { fontFamily: fonts.bodyItalic, color: colors.text },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.md, padding: space.md, marginBottom: space.md, backgroundColor: colors.panel },
  dice: { flexDirection: 'row', gap: 6 },
  die: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dieText: { fontFamily: fonts.uiBold, fontSize: 17 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, marginBottom: space.md },
  choicesHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, marginBottom: space.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
});
