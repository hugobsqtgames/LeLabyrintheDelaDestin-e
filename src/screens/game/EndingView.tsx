/**
 * Fin de partie : conclusion ou mort définitive, avec récapitulatif,
 * portraits des compagnons et bilan en tuiles.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { visibleText } from '../../engine/narrative';
import { formatPlaytime, summarize } from '../../engine/summary';
import type { GameState } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Emblem } from '../../ui/art/Logo';
import { Portrait, PORTRAITS } from '../../ui/art/Portraits';
import { useChrome } from '../../ui/components/Hud';
import { Badge, Button, FadeIn, Label, Panel, SectionTitle, Tile } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_READING, MAX_SCALE_UI, space, type } from '../../ui/theme';

const STATUS_COLOR: Record<string, string> = {
  companion: colors.mossBright,
  met: colors.textDim,
  away: colors.steel,
  captured: colors.amber,
  dead: colors.blood,
};

export function EndingView({ game }: { game: GameState }) {
  const { content, openSaves, closeGame, setTab } = useStore();
  const t = useT();
  const chrome = useChrome();
  const summary = summarize(content, game);
  const death = game.ending?.kind === 'death';
  const scene = content.scenes[game.currentScene];
  const blocks = scene && (scene.kind === 'ending' || scene.kind === 'death') ? visibleText(content, game, scene) : [];
  const accent = death ? colors.blood : colors.amber;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg + 4, paddingTop: chrome.top + space.lg, paddingBottom: chrome.bottom }}>
      <FadeIn>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          {death ? <Icon name="skull" size={64} color={colors.blood} strokeWidth={1.3} /> : <Emblem size={110} />}
          <Label color={accent}>{death ? t('end.death') : t('end.ending')}</Label>
          <Text style={[type.display, { textAlign: 'center', fontSize: 52, lineHeight: 54 }]} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
            {summary.ending?.title ?? t('end.fallback')}
          </Text>
          {summary.ending && <Text style={[styles.epitaph, { color: accent }]}>« {summary.ending.epitaph} »</Text>}
          {death && summary.cause && <Text style={type.uiSmall}>{t('end.cause', { cause: summary.cause })}</Text>}
        </View>
      </FadeIn>

      {blocks.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          {blocks.map((b, i) => (
            <FadeIn key={i} delay={200 + i * 120}>
              <Text style={[type.body, { marginBottom: space.lg }]} maxFontSizeMultiplier={MAX_SCALE_READING}>
                {b.text}
              </Text>
            </FadeIn>
          ))}
        </View>
      )}

      <SectionTitle>{t('end.stats')}</SectionTitle>
      <View style={styles.bento}>
        <Tile style={styles.tile} label={t('end.decisions')} value={summary.decisions} icon="chevron" />
        <Tile style={styles.tile} label={t('hud.levelLabel')} value={summary.level} icon="star" color={colors.violet} />
        <Tile style={styles.tile} label={t('tab.quests')} value={`${summary.questsCompleted.length}`} sub={summary.questsFailed.length ? t('end.failed', { n: summary.questsFailed.length }) : undefined} icon="quest" color={colors.mossBright} />
        <Tile style={styles.tile} label={t('end.time')} value={formatPlaytime(summary.playtimeMs)} icon="clock" />
      </View>

      <SectionTitle>{t('end.what')}</SectionTitle>
      <Panel style={{ gap: 8 }}>
        {summary.lines.map((l) => (
          <View key={l.text} style={styles.line}>
            <Icon name={l.tone === 'good' ? 'check' : l.tone === 'bad' ? 'close' : 'chevron'} size={14} color={l.tone === 'good' ? colors.mossBright : l.tone === 'bad' ? colors.rustBright : colors.textDim} strokeWidth={2.2} />
            <Text style={[type.bodySmall, { flex: 1, color: colors.text }]}>{l.text}</Text>
          </View>
        ))}
        {summary.lines.length === 0 && <Text style={type.bodySmall}>{t('end.short')}</Text>}
      </Panel>

      {summary.allies.length > 0 && (
        <>
          <SectionTitle>{t('end.allies')}</SectionTitle>
          <View style={styles.allies}>
            {summary.allies.map((a) => (
              <View key={a.id} style={styles.ally}>
                <View style={a.status === 'dead' ? { opacity: 0.4 } : undefined}>{PORTRAITS[a.id] ? <Portrait id={a.id} size={64} /> : <View style={styles.blank} />}</View>
                <Text style={styles.allyName} numberOfLines={2}>
                  {a.name}
                </Text>
                <Badge label={t(`status.${a.status}`)} color={STATUS_COLOR[a.status] ?? colors.textDim} />
              </View>
            ))}
          </View>
        </>
      )}

      {summary.majorEvents.length > 0 && (
        <>
          <SectionTitle>{t('chronicle.major')}</SectionTitle>
          {summary.majorEvents.slice(-10).map((e, i) => (
            <Text key={i} style={[type.bodySmall, { marginBottom: 6 }]}>
              — {e}
            </Text>
          ))}
        </>
      )}

      <View style={{ gap: space.sm, marginTop: space.xxl }}>
        <Button label={t('title.new')} icon="plus" onPress={() => openSaves('new')} />
        <Button label={t('end.load')} icon="save" variant="secondary" onPress={() => openSaves('load')} />
        <Button label={t('end.chronicle')} icon="journal" variant="secondary" onPress={() => setTab('chronicle')} />
        <Button label={t('end.menu')} variant="ghost" onPress={() => closeGame()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  epitaph: { fontFamily: fonts.titleItalic, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  line: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  bento: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  tile: { flexBasis: '46%', flexGrow: 1, margin: 4 },
  allies: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  ally: { width: 92, alignItems: 'center', gap: 6 },
  allyName: { fontFamily: fonts.uiBold, fontSize: 12.5, color: colors.text, textAlign: 'center' },
  blank: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.panelRaised },
});
