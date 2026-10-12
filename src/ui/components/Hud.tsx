/**
 * Bandeau supérieur (vitalité, chapitre, pause) et barre d'onglets du carnet.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { maxHp, maxStamina } from '../../engine/character';
import type { GameState } from '../../engine/types';
import { type Tab, useStore } from '../../store/GameStore';
import { EmblemBadge } from '../art/Emblems';
import { Icon, type IconName } from '../icons';
import { colors, fonts, space, type } from '../theme';
import { Bar, IconButton } from './primitives';

export function TopBar({ game, onPause }: { game: GameState; onPause: () => void }) {
  const { content } = useStore();
  const chapter = content.chapters.find((c) => c.id === game.chapter);
  const hp = game.player.hp;
  const hpMax = maxHp(content, game);
  const st = game.player.stamina;
  const stMax = maxStamina(content, game);
  const low = hp / hpMax < 0.3;
  return (
    <View style={styles.top}>
      <EmblemBadge id={game.player.emblem} size={40} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <Text style={[type.ui, { fontFamily: fonts.uiBold }]} numberOfLines={1}>
            {game.player.name}
          </Text>
          <Text style={[type.uiSmall, { flex: 1 }]} numberOfLines={1}>
            Niv. {game.player.level} · {chapter ? `Ch. ${chapter.number}` : ''}
          </Text>
          {game.player.infection > 0 && <Icon name="biohazard" size={14} color={colors.mossBright} />}
        </View>
        <View style={styles.bars}>
          <View style={styles.barCell}>
            <Icon name="heart" size={12} color={low ? colors.blood : colors.rustBright} />
            <View style={{ flex: 1 }}>
              <Bar value={hp} max={hpMax} color={low ? colors.blood : colors.rustBright} height={6} a11yLabel="Santé" />
            </View>
            <Text style={styles.num}>{hp}</Text>
          </View>
          <View style={styles.barCell}>
            <Icon name="bolt" size={12} color={colors.amber} />
            <View style={{ flex: 1 }}>
              <Bar value={st} max={stMax} color={colors.amber} height={6} a11yLabel="Endurance" />
            </View>
            <Text style={styles.num}>{st}</Text>
          </View>
        </View>
      </View>
      <IconButton icon="pause" label="Pause" onPress={onPause} />
    </View>
  );
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'story', label: 'Récit', icon: 'book' },
  { id: 'character', label: 'Fiche', icon: 'person' },
  { id: 'inventory', label: 'Sac', icon: 'bag' },
  { id: 'map', label: 'Carte', icon: 'map' },
  { id: 'quests', label: 'Quêtes', icon: 'quest' },
  { id: 'chronicle', label: 'Chronique', icon: 'grid' },
];

export function TabBar({ tab, onChange, badges }: { tab: Tab; onChange: (t: Tab) => void; badges: Partial<Record<Tab, boolean>> }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
            onPress={() => onChange(t.id)}
            style={({ pressed }) => [styles.tab, pressed && { backgroundColor: colors.panel }]}
          >
            <View style={[styles.tabMark, active && { backgroundColor: colors.rustBright }]} />
            <Icon name={t.icon} size={21} color={active ? colors.paper : colors.textFaint} />
            <Text style={[styles.tabText, active && { color: colors.paper }]}>{t.label}</Text>
            {badges[t.id] && <View style={styles.badge} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: 'rgba(13,17,16,0.92)',
  },
  bars: { flexDirection: 'row', gap: space.md },
  barCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  num: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.textDim, minWidth: 18, textAlign: 'right' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  tab: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 6, gap: 2, minHeight: 52 },
  tabMark: { position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, backgroundColor: 'transparent' },
  tabText: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 0.6, color: colors.textFaint, textTransform: 'uppercase' },
  badge: { position: 'absolute', top: 6, right: '28%', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.amber },
});
