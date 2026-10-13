/**
 * Journal des quêtes : principales et secondaires, étapes franchies.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GameState, QuestDef, QuestState } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Badge, Panel, SectionTitle } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, space, type } from '../../ui/theme';
import { useChrome } from '../../ui/components/Hud';

const STATUS_COLOR: Record<QuestState['status'], string> = {
  inactive: colors.textFaint,
  active: colors.amber,
  completed: colors.mossBright,
  failed: colors.blood,
};

function QuestCard({ def, q }: { def: QuestDef; q: QuestState }) {
  const t = useT();
  const stepIndex = def.steps.findIndex((s) => s.id === q.step);
  const done = def.steps.filter((s, i) => q.completedSteps.includes(s.id) || (q.status === 'completed' && i <= stepIndex)).length;
  return (
    <Panel tone={q.status === 'active' && def.kind === 'main' ? 'raised' : 'default'} style={[{ gap: space.sm }, q.status !== 'active' && { opacity: 0.72 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text style={[type.h2, { flex: 1, fontSize: 23, lineHeight: 27 }]}>{def.title}</Text>
        <Badge label={t(`quest.${q.status}`)} color={STATUS_COLOR[q.status]} />
      </View>
      <Text style={type.bodySmall}>{def.summary}</Text>
      <View style={styles.progress}>
        {def.steps.map((s, i) => (
          <View key={s.id} style={[styles.seg, i < done && { backgroundColor: STATUS_COLOR[q.status] }]} />
        ))}
      </View>
      <View style={{ gap: 8, marginTop: 2 }}>
        {def.steps.map((s, i) => {
          const isDone = q.completedSteps.includes(s.id) || (q.status === 'completed' && i <= stepIndex);
          const current = q.status === 'active' && s.id === q.step;
          if (!isDone && !current) return null;
          return (
            <View key={s.id} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: isDone ? 'rgba(147,221,169,0.15)' : 'rgba(255,196,107,0.15)' }]}>
                <Icon name={isDone ? 'check' : 'chevron'} size={11} color={isDone ? colors.mossBright : colors.amber} strokeWidth={2.4} />
              </View>
              <Text style={[type.uiSmall, { flex: 1, color: current ? colors.text : colors.textDim }, isDone && { textDecorationLine: 'line-through' }]}>{s.text}</Text>
            </View>
          );
        })}
      </View>
    </Panel>
  );
}

export function QuestsView({ game }: { game: GameState }) {
  const { content } = useStore();
  const t = useT();
  const chrome = useChrome();
  const entries = Object.entries(game.quests)
    .map(([id, q]) => ({ def: content.quests[id], q }))
    .filter((e) => e.def && e.q.status !== 'inactive');
  const order = { active: 0, completed: 1, failed: 2, inactive: 3 };
  const sorted = (kind: 'main' | 'side') => entries.filter((e) => e.def.kind === kind).sort((a, b) => order[a.q.status] - order[b.q.status]);
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top, paddingBottom: chrome.bottom }}>
      <SectionTitle>{t('quests.main')}</SectionTitle>
      <View style={{ gap: space.sm }}>
        {sorted('main').map((e) => (
          <QuestCard key={e.def.id} def={e.def} q={e.q} />
        ))}
      </View>
      <SectionTitle>{t('quests.side')}</SectionTitle>
      {sorted('side').length === 0 && <Text style={type.bodySmall}>{t('quests.noSide')}</Text>}
      <View style={{ gap: space.sm }}>
        {sorted('side').map((e) => (
          <QuestCard key={e.def.id} def={e.def} q={e.q} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  stepIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  progress: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,248,240,0.1)' },
});
