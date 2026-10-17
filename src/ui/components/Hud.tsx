/**
 * Bandeau supérieur flottant (portrait, vitalité, horloge, pause) et barre
 * d'onglets en pilule de verre, posée au-dessus du contenu.
 */
import React, { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { maxHp, maxStamina } from '../../engine/character';
import { clockParts, hoursLeft, lateness } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import { useT } from '../../i18n';
import { type Tab, useStore } from '../../store/GameStore';
import { PlayerPortrait } from '../art/Portraits';
import { Icon, type IconName } from '../icons';
import { colors, CONTINUOUS, fonts, MAX_SCALE_UI, radius, space } from '../theme';
import { Glass } from './Glass';
import { IconButton } from './primitives';

/** Espace occupé par les barres flottantes, pour décaler le contenu défilant. */
export const ChromeContext = createContext({ top: 0, bottom: 0 });
export function useChrome() {
  return useContext(ChromeContext);
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.miniTrack}>
      <View style={[styles.miniFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

/**
 * Horloge des sept jours. `pace` : retard sur la route (« un peu juste »,
 * « en retard »), calculé par le moteur d'après le chapitre en cours.
 */
export function ClockChip({ clock, compact, pace = 'ok' }: { clock: number; compact?: boolean; pace?: 'ok' | 'tight' | 'late' }) {
  const t = useT();
  const { day, hour } = clockParts(clock);
  const left = hoursLeft(clock);
  const urgent = left <= 24 || pace !== 'ok';
  const color = left < 0 || pace === 'late' ? colors.blood : urgent ? colors.rust : colors.textDim;
  const paceText = pace === 'ok' ? '' : ` · ${t(pace === 'late' ? 'hud.late' : 'hud.tight')}`;
  return (
    <View
      style={[styles.clock, urgent && { backgroundColor: pace === 'late' ? 'rgba(255,84,104,0.16)' : 'rgba(255,106,61,0.14)' }]}
      accessible
      accessibilityLabel={t('hud.clockA11y', { day, hour, left: Math.max(0, Math.round(left)) }) + (pace === 'ok' ? '' : ` ${t(pace === 'late' ? 'hud.lateA11y' : 'hud.tightA11y')}`)}
    >
      <Icon name={pace === 'ok' ? 'clock' : 'warning'} size={12} color={color} strokeWidth={2} />
      <Text style={[styles.clockText, { color }]} maxFontSizeMultiplier={MAX_SCALE_UI} numberOfLines={1}>
        {t('hud.day', { day })} · {String(hour).padStart(2, '0')}h{!compact && left > 0 && pace === 'ok' ? ` · ${t('hud.left', { h: Math.round(left) })}` : ''}
        {!compact && paceText}
      </Text>
    </View>
  );
}

export function TopBar({ game, onPause }: { game: GameState; onPause: () => void }) {
  const { content } = useStore();
  const t = useT();
  const chapter = content.chapters.find((c) => c.id === game.chapter);
  const hp = game.player.hp;
  const hpMax = maxHp(content, game);
  const st = game.player.stamina;
  const stMax = maxStamina(content, game);
  const low = hp / hpMax < 0.3;
  return (
    <View style={styles.topWrap}>
      <Glass radius={radius.xl} style={styles.top}>
        <View style={styles.topRow}>
          <PlayerPortrait profile={game.player.profile} size={42} ring={low ? colors.blood : undefined} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE_UI}>
                {game.player.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE_UI}>
                {t('hud.level', { n: game.player.level })}
                {chapter ? ` · ${t('hud.chapter', { n: chapter.number })}` : ''}
              </Text>
              {game.player.infection > 0 && <Icon name="biohazard" size={13} color={colors.mossBright} />}
            </View>
            <View style={styles.bars}>
              <View style={styles.barCell} accessible accessibilityLabel={`${t('stat.hp')} ${hp} / ${hpMax}`}>
                <Icon name="heart" size={11} color={low ? colors.blood : colors.rust} strokeWidth={2.4} />
                <MiniBar value={hp} max={hpMax} color={low ? colors.blood : colors.rust} />
                <Text style={styles.num} maxFontSizeMultiplier={MAX_SCALE_UI}>
                  {hp}
                </Text>
              </View>
              <View style={styles.barCell} accessible accessibilityLabel={`${t('stat.stamina')} ${st} / ${stMax}`}>
                <Icon name="bolt" size={11} color={colors.amber} strokeWidth={2.4} />
                <MiniBar value={st} max={stMax} color={colors.amber} />
                <Text style={styles.num} maxFontSizeMultiplier={MAX_SCALE_UI}>
                  {st}
                </Text>
              </View>
            </View>
          </View>
          <IconButton icon="pause" label={t('common.pause')} onPress={onPause} size={18} />
        </View>
        <View style={styles.clockRow}>
          <ClockChip clock={game.clock} pace={game.ending ? 'ok' : lateness(content, game).level} />
        </View>
      </Glass>
    </View>
  );
}

/** Onglets de premier niveau ; « journal » regroupe quêtes, chronique et archives. */
export const JOURNAL_TABS: Tab[] = ['quests', 'chronicle', 'archives'];

const TABS: { id: Tab; key: string; icon: IconName }[] = [
  { id: 'story', key: 'tab.story', icon: 'book' },
  { id: 'character', key: 'tab.character', icon: 'person' },
  { id: 'inventory', key: 'tab.inventory', icon: 'bag' },
  { id: 'map', key: 'tab.map', icon: 'map' },
  { id: 'quests', key: 'tab.journal', icon: 'journal' },
];

export function TabBar({ tab, onChange, badges }: { tab: Tab; onChange: (t: Tab) => void; badges: Partial<Record<Tab, boolean>> }) {
  const t = useT();
  const current = JOURNAL_TABS.includes(tab) ? 'quests' : tab;
  return (
    <Glass radius={radius.pill} style={styles.tabs} interactive>
      <View style={styles.tabRow} accessibilityRole="tablist">
        {TABS.map((x) => {
          const active = current === x.id;
          const label = t(x.key);
          return (
            <Pressable
              key={x.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              onPress={() => onChange(x.id === 'quests' && JOURNAL_TABS.includes(tab) ? tab : x.id)}
              style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <Icon name={x.icon} size={20} color={active ? colors.bg : colors.textDim} strokeWidth={active ? 2.1 : 1.8} />
              <Text style={[styles.tabText, active && { color: colors.bg }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {label}
              </Text>
              {badges[x.id] && <View style={styles.badge} />}
            </Pressable>
          );
        })}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  topWrap: { paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: space.xs },
  top: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.text, flexShrink: 1, letterSpacing: -0.2 },
  meta: { fontFamily: fonts.mono, fontSize: 11, color: colors.textDim, letterSpacing: 0.4, flex: 1 },
  bars: { flexDirection: 'row', gap: space.md },
  barCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,248,240,0.09)', overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3 },
  num: { fontFamily: fonts.mono, fontSize: 11.5, color: colors.text, minWidth: 18, textAlign: 'right' },
  clockRow: { flexDirection: 'row', paddingLeft: 54 },
  clock: { flexDirection: 'row', flexShrink: 1, alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,248,240,0.05)' },
  clockText: { flexShrink: 1, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.3 },
  tabs: { marginHorizontal: space.lg, ...CONTINUOUS },
  tabRow: { flexDirection: 'row', padding: 5, gap: 2 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, gap: 2, minHeight: 52, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.text },
  tabText: { fontFamily: fonts.uiBold, fontSize: 10.5, color: colors.textDim, letterSpacing: 0 },
  badge: { position: 'absolute', top: 6, right: '24%', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.rust },
});
