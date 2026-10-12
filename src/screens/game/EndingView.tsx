/**
 * Fin de partie : conclusion ou mort définitive, avec récapitulatif.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { visibleText } from '../../engine/narrative';
import { formatPlaytime, summarize } from '../../engine/summary';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store/GameStore';
import { Emblem } from '../../ui/art/Logo';
import { Badge, Button, FadeIn, Label, Panel, SectionTitle } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, space, type } from '../../ui/theme';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  companion: { label: 'À vos côtés', color: colors.mossBright },
  met: { label: 'Croisé·e', color: colors.textDim },
  away: { label: 'Séparés', color: colors.steel },
  captured: { label: 'Prisonnier·e', color: colors.amber },
  dead: { label: 'Mort·e', color: colors.blood },
};

export function EndingView({ game }: { game: GameState }) {
  const { content, openSaves, closeGame, setTab } = useStore();
  const summary = summarize(content, game);
  const death = game.ending?.kind === 'death';
  const scene = content.scenes[game.currentScene];
  const blocks = scene && (scene.kind === 'ending' || scene.kind === 'death') ? visibleText(content, game, scene) : [];
  const accent = death ? colors.blood : colors.amber;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
      <FadeIn>
        <View style={{ alignItems: 'center', marginTop: space.lg, gap: space.sm }}>
          {death ? <Icon name="skull" size={64} color={colors.blood} strokeWidth={1.4} /> : <Emblem size={110} />}
          <Label color={accent}>{death ? 'Mort définitive' : 'Fin de la campagne'}</Label>
          <Text style={[type.display, { textAlign: 'center' }]} accessibilityRole="header">
            {summary.ending?.title ?? 'Fin'}
          </Text>
          {summary.ending && <Text style={[styles.epitaph, { color: accent }]}>« {summary.ending.epitaph} »</Text>}
          {death && summary.cause && <Text style={type.uiSmall}>Cause : {summary.cause}</Text>}
        </View>
      </FadeIn>

      {blocks.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          {blocks.map((b, i) => (
            <FadeIn key={i} delay={200 + i * 120}>
              <Text style={[type.body, { marginBottom: space.md }]}>{b.text}</Text>
            </FadeIn>
          ))}
        </View>
      )}

      <SectionTitle>Ce que vous avez fait</SectionTitle>
      <View style={{ gap: 6 }}>
        {summary.lines.map((l) => (
          <View key={l.text} style={styles.line}>
            <Icon name={l.tone === 'good' ? 'check' : l.tone === 'bad' ? 'close' : 'chevron'} size={14} color={l.tone === 'good' ? colors.mossBright : l.tone === 'bad' ? colors.rustBright : colors.textDim} />
            <Text style={[type.bodySmall, { flex: 1, color: colors.text }]}>{l.text}</Text>
          </View>
        ))}
        {summary.lines.length === 0 && <Text style={type.bodySmall}>Votre route a été courte.</Text>}
      </View>

      {summary.allies.length > 0 && (
        <>
          <SectionTitle>Ceux qui ont croisé votre route</SectionTitle>
          <View style={{ gap: 6 }}>
            {summary.allies.map((a) => {
              const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.met;
              return (
                <View key={a.id} style={styles.ally}>
                  <Text style={[type.ui, { flex: 1 }]}>{a.name}</Text>
                  <Badge label={st.label} color={st.color} />
                </View>
              );
            })}
          </View>
        </>
      )}

      <SectionTitle>Bilan</SectionTitle>
      <Panel style={styles.stats}>
        {[
          { label: 'Décisions', value: String(summary.decisions) },
          { label: 'Niveau', value: String(summary.level) },
          { label: 'Quêtes', value: `${summary.questsCompleted.length} ✓ · ${summary.questsFailed.length} ✗` },
          { label: 'Temps', value: formatPlaytime(summary.playtimeMs) },
        ].map((s) => (
          <View key={s.label} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={type.label}>{s.label}</Text>
          </View>
        ))}
      </Panel>

      {summary.majorEvents.length > 0 && (
        <>
          <SectionTitle>Moments marquants</SectionTitle>
          {summary.majorEvents.slice(-10).map((e, i) => (
            <Text key={i} style={[type.bodySmall, { marginBottom: 4 }]}>
              — {e}
            </Text>
          ))}
        </>
      )}

      <View style={{ gap: space.sm, marginTop: space.xxl }}>
        <Button label="Nouvelle partie" icon="plus" onPress={() => openSaves('new')} />
        <Button label="Charger une sauvegarde" icon="save" variant="secondary" onPress={() => openSaves('load')} />
        <Button label="Relire la chronique" icon="grid" variant="secondary" onPress={() => setTab('chronicle')} />
        <Button label="Menu principal" variant="ghost" onPress={() => closeGame()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  epitaph: { fontFamily: fonts.bodyItalic, fontSize: 17, textAlign: 'center' },
  line: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  ally: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  stats: { flexDirection: 'row', paddingVertical: space.md },
  statValue: { fontFamily: fonts.title, fontSize: 18, color: colors.paper },
});
