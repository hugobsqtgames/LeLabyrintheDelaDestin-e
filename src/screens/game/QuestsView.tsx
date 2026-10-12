/**
 * Journal des quêtes : principales et secondaires, étapes franchies.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GameState, QuestDef, QuestState } from '../../engine/types';
import { useStore } from '../../store/GameStore';
import { Badge, Panel, SectionTitle } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, space, type } from '../../ui/theme';

const STATUS: Record<QuestState['status'], { label: string; color: string }> = {
  inactive: { label: '—', color: colors.textFaint },
  active: { label: 'En cours', color: colors.amber },
  completed: { label: 'Accomplie', color: colors.mossBright },
  failed: { label: 'Échouée', color: colors.blood },
};

function QuestCard({ def, q }: { def: QuestDef; q: QuestState }) {
  const st = STATUS[q.status];
  const stepIndex = def.steps.findIndex((s) => s.id === q.step);
  return (
    <Panel style={[{ gap: space.sm }, q.status !== 'active' && { opacity: 0.75 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text style={[type.h2, { flex: 1, fontSize: 18 }]}>{def.title}</Text>
        <Badge label={st.label} color={st.color} />
      </View>
      <Text style={type.bodySmall}>{def.summary}</Text>
      <View style={{ gap: 6, marginTop: 4 }}>
        {def.steps.map((s, i) => {
          const done = q.completedSteps.includes(s.id) || (q.status === 'completed' && i <= stepIndex);
          const current = q.status === 'active' && s.id === q.step;
          if (!done && !current) return null;
          return (
            <View key={s.id} style={styles.step}>
              <Icon name={done ? 'check' : 'chevron'} size={14} color={done ? colors.mossBright : colors.amber} />
              <Text style={[type.uiSmall, { flex: 1, color: current ? colors.text : colors.textDim }, done && { textDecorationLine: 'line-through' }]}>{s.text}</Text>
            </View>
          );
        })}
      </View>
    </Panel>
  );
}

export function QuestsView({ game }: { game: GameState }) {
  const { content } = useStore();
  const entries = Object.entries(game.quests)
    .map(([id, q]) => ({ def: content.quests[id], q }))
    .filter((e) => e.def && e.q.status !== 'inactive');
  const order = { active: 0, completed: 1, failed: 2, inactive: 3 };
  const sorted = (kind: 'main' | 'side') => entries.filter((e) => e.def.kind === kind).sort((a, b) => order[a.q.status] - order[b.q.status]);
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
      <SectionTitle>Quêtes principales</SectionTitle>
      <View style={{ gap: space.sm }}>
        {sorted('main').map((e) => (
          <QuestCard key={e.def.id} def={e.def} q={e.q} />
        ))}
      </View>
      <SectionTitle>Quêtes secondaires</SectionTitle>
      {sorted('side').length === 0 && <Text style={type.bodySmall}>Aucune pour l’instant. Les quêtes secondaires se découvrent en explorant et en parlant aux gens.</Text>}
      <View style={{ gap: space.sm }}>
        {sorted('side').map((e) => (
          <QuestCard key={e.def.id} def={e.def} q={e.q} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
});
