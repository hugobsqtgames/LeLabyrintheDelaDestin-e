/**
 * Combat : intentions ennemies annoncées, ciblage, actions (dont la seconde
 * compétence au niveau 4), usure des armes et journal.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  attackStaminaCost,
  canPerform,
  critChance,
  describeIntent,
  dodgeChance,
  equippedWeapon,
  fleeChance,
  hitChance,
  livingEnemies,
  performAction,
  statusLabel,
  weaponDamageRange,
  weaponDurability,
} from '../../engine/combat';
import { resolveCombat } from '../../engine/narrative';
import { COMBAT } from '../../engine/rules';
import type { CombatAction, CombatEnemy, GameState, ItemDef } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { EnemyArt } from '../../ui/art/Figures';
import { ItemIcon } from '../../ui/art/ItemIcon';
import { Glass } from '../../ui/components/Glass';
import { useChrome } from '../../ui/components/Hud';
import { Sheet } from '../../ui/components/Sheet';
import { Badge, Bar, Button, FadeIn, Label } from '../../ui/components/primitives';
import { Icon, type IconName } from '../../ui/icons';
import { colors, CONTINUOUS, fonts, MAX_SCALE_UI, radius, space, TOUCH, type, NATIVE_DRIVER } from '../../ui/theme';
import { ContextHint } from '../../ui/components/ContextHint';

const INTENT_ICON: Record<string, IconName> = {
  attack: 'sword',
  heavy: 'warning',
  grab: 'hand',
  bite: 'skull',
  scream: 'chat',
  guard: 'shield',
  spit: 'biohazard',
  stunned: 'star',
};

const LOG_COLORS: Record<string, string> = {
  player: colors.text,
  enemy: colors.rustBright,
  ally: colors.ice,
  system: colors.textDim,
  crit: colors.amber,
  danger: colors.blood,
};

function EnemyCard({ enemy, selected, onPress, compact }: { enemy: CombatEnemy; selected: boolean; onPress: () => void; compact: boolean }) {
  const { content, reduceMotion } = useStore();
  const t = useT();
  const def = content.enemies[enemy.def];
  const intent = describeIntent(content, enemy);
  const dead = enemy.hp <= 0;
  const [flash] = useState(() => new Animated.Value(0));
  const prevHp = useRef(enemy.hp);
  useEffect(() => {
    if (enemy.hp < prevHp.current && !reduceMotion) {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 420, useNativeDriver: NATIVE_DRIVER }).start();
    }
    prevHp.current = enemy.hp;
  }, [enemy.hp, flash, reduceMotion]);
  const danger = intent && (intent.kind === 'heavy' || intent.kind === 'bite' || intent.kind === 'scream');
  return (
    <Pressable
      onPress={onPress}
      disabled={dead}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: dead }}
      accessibilityLabel={t('combat.enemyA11y', { name: def.name, hp: enemy.hp, max: enemy.maxHp, intent: intent ? intent.text : '' })}
      style={[{ flexGrow: 1, flexBasis: compact ? '46%' : '100%' }, dead && { opacity: 0.3 }]}
    >
      <Glass radius={radius.lg} tone={danger && !dead ? 'danger' : 'default'} style={[styles.enemy, selected && styles.enemySelected]}>
        <View style={{ flexDirection: compact ? 'column' : 'row', gap: space.sm }}>
          <View style={[styles.enemyArt, compact && { alignSelf: 'stretch' }]}>
            <EnemyArt id={def.art} width={compact ? 64 : 84} />
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.blood, opacity: flash, borderRadius: radius.md }]} />
          </View>
          <View style={{ flex: compact ? undefined : 1, gap: 5 }}>
            <Text style={styles.enemyName} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE_UI}>
              {def.name}
            </Text>
            {def.boss && <Badge label={enemy.phase > 0 ? t('combat.bossPhase', { n: enemy.phase + 1 }) : t('combat.boss')} color={colors.amber} />}
            <Bar value={enemy.hp} max={enemy.maxHp} color={colors.blood} height={5} />
            <Text style={styles.hp}>
              {enemy.hp}/{enemy.maxHp}
            </Text>
          </View>
        </View>
        {enemy.statuses.length > 0 && (
          <View style={styles.statusRow}>
            {enemy.statuses.map((s) => (
              <Badge key={s.kind} label={`${statusLabel(content, s.kind)} ${s.turns}`} color={colors.ice} />
            ))}
          </View>
        )}
        {!dead && intent && (
          <View style={[styles.intent, danger && { backgroundColor: 'rgba(255,84,104,0.16)' }]}>
            <Icon name={INTENT_ICON[intent.kind] ?? 'sword'} size={13} color={danger ? colors.blood : colors.textDim} strokeWidth={2} />
            <Text style={[styles.intentText, danger && { color: colors.text }]}>{intent.text}</Text>
          </View>
        )}
      </Glass>
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  detail,
  onPress,
  disabled,
  reason,
  accent,
  wear,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
  reason?: string;
  accent?: string;
  /** Solidité de l'arme utilisée (0 à 1). */
  wear?: number | null;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${disabled ? reason ?? '' : detail ?? ''}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, accent && !disabled && { backgroundColor: 'rgba(255,106,61,0.14)' }, pressed && { transform: [{ scale: 0.96 }], backgroundColor: 'rgba(255,248,240,0.12)' }, disabled && { opacity: 0.4 }]}
    >
      <View style={[styles.actionIcon, accent && !disabled && { backgroundColor: accent }]}>
        <Icon name={icon} size={17} color={accent && !disabled ? '#1A0904' : colors.text} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel} numberOfLines={1} maxFontSizeMultiplier={1.25}>
          {label}
        </Text>
        <Text style={styles.actionDetail} numberOfLines={2} maxFontSizeMultiplier={1.25}>
          {disabled ? reason : detail}
        </Text>
        {wear !== undefined && wear !== null && (
          <View style={styles.wearTrack}>
            <View style={[styles.wearFill, { width: `${wear * 100}%`, backgroundColor: wear <= 0 ? colors.blood : wear < 0.3 ? colors.amber : colors.textDim }]} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function wearRatio(game: GameState, def: ItemDef | null, durability: (id: string) => { current: number; max: number } | null) {
  if (!def) return null;
  const d = durability(def.id);
  return d ? d.current / d.max : null;
}

export function CombatView({ game }: { game: GameState }) {
  const { content, update, feedback } = useStore();
  const t = useT();
  const chrome = useChrome();
  const combat = game.combat!;
  const scene = content.scenes[combat.sceneId];
  const living = livingEnemies(combat);
  const [targetUid, setTarget] = useState<string | null>(null);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [dockH, setDockH] = useState(260);
  const target = living.find((e) => e.uid === targetUid) ?? living[0];
  const lastLog = useRef(combat.logCounter);

  useEffect(() => {
    if (combat.logCounter !== lastLog.current) {
      const fresh = combat.log.filter((l) => l.id > lastLog.current);
      if (fresh.some((l) => l.tone === 'enemy' || l.tone === 'danger')) feedback('heavy');
      lastLog.current = combat.logCounter;
    }
  }, [combat.logCounter, combat.log, feedback]);

  const act = (action: CombatAction) => {
    const turn = combat.turn;
    update((g) => (g.combat && g.combat.turn === turn ? performAction(content, g, { ...action, target: target?.uid }) : g));
  };

  const ongoing = combat.outcome === 'ongoing';
  const ranged = equippedWeapon(content, game, 'ranged');
  const melee = equippedWeapon(content, game, 'melee');
  const profile = content.profiles[game.player.profile];
  const check = (a: CombatAction) => canPerform(content, game, { ...a, target: target?.uid });
  const combatItems = Object.entries(game.inventory).filter(([id]) => content.items[id]?.use?.inCombat);
  const pct = (p: number) => `${Math.round(p * 100)} %`;
  const meleeRange = weaponDamageRange(content, game, 'melee');
  const rangedRange = weaponDamageRange(content, game, 'ranged');
  const weaknesses = living.flatMap((e) => (content.enemies[e.def].weaknesses ?? []).map((w) => w.hint)).filter((v, i, a) => a.indexOf(v) === i);
  const recent = combat.log.slice(-6);
  const dur = (id: string) => weaponDurability(content, game, id);
  const skill2Locked = game.player.level < profile.skill2.level;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top + space.sm, paddingBottom: dockH + chrome.bottom }}>
        <ContextHint id="combat" style={{ marginBottom: space.md }} />
        <Label color={colors.blood}>{t('combat.turn', { n: combat.turn })}</Label>
        <Text style={[type.h1, { marginTop: 4, marginBottom: space.md }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
          {scene?.title}
        </Text>
        <View style={styles.enemies}>
          {combat.enemies.map((e) => (
            <EnemyCard key={e.uid} enemy={e} compact={combat.enemies.length > 1} selected={target?.uid === e.uid && living.length > 1} onPress={() => setTarget(e.uid)} />
          ))}
        </View>
        {weaknesses.length > 0 && (
          <View style={styles.hint}>
            <Icon name="eye" size={14} color={colors.amber} />
            <Text style={[type.uiSmall, { color: colors.amber, flex: 1 }]}>{weaknesses.join(' ')}</Text>
          </View>
        )}

        <View style={styles.logBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
            <Label style={{ flex: 1 }}>{t('combat.log')}</Label>
            {combat.playerStatuses.map((s) => (
              <Badge key={s.kind} label={`${statusLabel(content, s.kind)} ${s.turns}`} color={colors.rustBright} />
            ))}
          </View>
          {recent.map((l, i) => (
            <FadeIn key={l.id} from={4}>
              <Text style={[styles.log, { color: LOG_COLORS[l.tone], opacity: 0.45 + (0.55 * (i + 1)) / recent.length }]}>{l.text}</Text>
            </FadeIn>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.dockWrap, { bottom: chrome.bottom - space.sm }]} onLayout={(e) => setDockH(e.nativeEvent.layout.height)}>
        <Glass radius={radius.xl} tone="strong" blur={50} style={styles.dock}>
          {ongoing ? (
            <View style={styles.grid}>
              <ActionButton
                icon="sword"
                label={melee ? t('combat.strikeWith', { w: melee.name }) : t('combat.strikeBare')}
                detail={`${meleeRange[0]}–${meleeRange[1]} · ${target ? pct(hitChance(content, game, target, 'melee')) : ''} · −${attackStaminaCost(content, game, 'melee')} ${t('combat.st')}`}
                accent={colors.rust}
                wear={wearRatio(game, melee, dur)}
                disabled={!check({ type: 'attack', weapon: 'melee' }).ok}
                reason={check({ type: 'attack', weapon: 'melee' }).reason}
                onPress={() => act({ type: 'attack', weapon: 'melee' })}
              />
              <ActionButton
                icon="target"
                label={ranged ? `${t('combat.shoot')} (${ranged.ammo ? game.inventory[ranged.ammo] ?? 0 : '∞'})` : t('combat.shoot')}
                detail={ranged ? `${rangedRange[0]}–${rangedRange[1]} · ${target ? pct(hitChance(content, game, target, 'ranged')) : ''}${ranged.loud ? ` · ${t('combat.loud')}` : ''}` : ''}
                accent={colors.rust}
                wear={wearRatio(game, ranged, dur)}
                disabled={!check({ type: 'attack', weapon: 'ranged' }).ok}
                reason={check({ type: 'attack', weapon: 'ranged' }).reason}
                onPress={() => act({ type: 'attack', weapon: 'ranged' })}
              />
              <ActionButton icon="shield" label={t('combat.defend')} detail={t('combat.defendDetail', { n: COMBAT.defendStaminaGain })} onPress={() => act({ type: 'defend' })} />
              <ActionButton
                icon="run"
                label={t('combat.dodge')}
                detail={`${pct(dodgeChance(content, game))} · −${COMBAT.dodgeStamina} ${t('combat.st')}${game.player.profile === 'eclaireur' ? ` · ${t('combat.riposte')}` : ''}`}
                disabled={!check({ type: 'dodge' }).ok}
                reason={check({ type: 'dodge' }).reason}
                onPress={() => act({ type: 'dodge' })}
              />
              <ActionButton
                icon="star"
                label={profile.skill.name}
                detail={`−${profile.skill.staminaCost} ${t('combat.st')} · crit. ${pct(critChance(content, game))}`}
                disabled={!check({ type: 'skill' }).ok}
                reason={check({ type: 'skill' }).reason}
                onPress={() => act({ type: 'skill' })}
              />
              <ActionButton
                icon={skill2Locked ? 'lock' : 'sparkle'}
                label={profile.skill2.name}
                detail={`−${profile.skill2.staminaCost} ${t('combat.st')} · ${profile.skill2.description}`}
                disabled={!check({ type: 'skill2' }).ok}
                reason={check({ type: 'skill2' }).reason}
                onPress={() => act({ type: 'skill2' })}
              />
              <ActionButton
                icon="bag"
                label={t('combat.item')}
                detail={combatItems.length ? t('combat.usable', { n: combatItems.length }) : ''}
                disabled={combatItems.length === 0}
                reason={t('combat.noItem')}
                onPress={() => setItemsOpen(true)}
              />
              {scene?.encounter?.canFlee && (
                <ActionButton
                  icon="move"
                  label={t('combat.flee')}
                  detail={`${pct(fleeChance(content, game))} · −${COMBAT.fleeStamina} ${t('combat.st')}`}
                  disabled={!check({ type: 'flee' }).ok}
                  reason={check({ type: 'flee' }).reason}
                  onPress={() => act({ type: 'flee' })}
                />
              )}
            </View>
          ) : (
            <FadeIn>
              <View style={{ alignItems: 'center', gap: space.sm, padding: space.sm }}>
                <Text style={[type.display, { color: combat.outcome === 'victory' ? colors.mossBright : combat.outcome === 'fled' ? colors.amber : colors.blood }]}>
                  {t(`combat.${combat.outcome}`)}
                </Text>
                {combat.outcome === 'victory' && combat.xpEarned > 0 && <Badge label={`+${combat.xpEarned} XP`} color={colors.violet} />}
                <Button
                  label={t('common.continue')}
                  icon="chevron"
                  style={{ alignSelf: 'stretch', marginTop: space.sm }}
                  onPress={() => update((g) => (g.combat && g.combat.outcome !== 'ongoing' ? resolveCombat(content, g) : g))}
                />
              </View>
            </FadeIn>
          )}
        </Glass>
      </View>

      <Sheet visible={itemsOpen} onClose={() => setItemsOpen(false)} title={t('combat.useItem')}>
        {combatItems.length === 0 && <Text style={type.bodySmall}>{t('combat.noItem')}</Text>}
        {combatItems.map(([id, qty]) => {
          const def = content.items[id];
          const ok = canPerform(content, game, { type: 'item', item: id, target: target?.uid });
          return (
            <Pressable
              key={id}
              disabled={!ok.ok}
              accessibilityRole="button"
              accessibilityLabel={`${def.name}, ×${qty}. ${def.description}`}
              onPress={() => {
                setItemsOpen(false);
                act({ type: 'item', item: id });
              }}
              style={({ pressed }) => [styles.itemRow, pressed && { backgroundColor: 'rgba(255,248,240,0.06)' }]}
            >
              <ItemIcon icon={def.icon} category={def.category} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={type.ui}>
                  {def.name} <Text style={{ color: colors.textDim }}>×{qty}</Text>
                </Text>
                <Text style={type.uiSmall} numberOfLines={2}>
                  {def.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  enemies: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  enemy: { padding: space.md, gap: space.sm },
  enemySelected: { borderWidth: 1.5, borderColor: colors.rust },
  enemyArt: { borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 4, overflow: 'hidden', ...CONTINUOUS },
  enemyName: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  hp: { fontFamily: fonts.mono, fontSize: 11, color: colors.textDim },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  intent: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: radius.sm, padding: 8, backgroundColor: 'rgba(255,248,240,0.05)' },
  intentText: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 17, color: colors.textDim, flex: 1 },
  hint: { flexDirection: 'row', gap: 6, marginTop: space.sm, alignItems: 'flex-start' },
  logBox: { marginTop: space.lg, paddingHorizontal: 2 },
  log: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 19, marginBottom: 3 },
  dockWrap: { position: 'absolute', left: space.sm, right: space.sm },
  dock: { padding: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  action: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH + 4,
    paddingHorizontal: space.sm,
    paddingVertical: 7,
    borderRadius: radius.md + 2,
    backgroundColor: 'rgba(255,248,240,0.05)',
    ...CONTINUOUS,
  },
  actionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,240,0.08)' },
  actionLabel: { fontFamily: fonts.uiBold, fontSize: 14.5, color: colors.text, letterSpacing: -0.2 },
  actionDetail: { fontFamily: fonts.ui, fontSize: 11.5, lineHeight: 15, color: colors.textDim },
  wearTrack: { height: 2, borderRadius: 1, backgroundColor: 'rgba(255,248,240,0.08)', marginTop: 4, overflow: 'hidden' },
  wearFill: { height: '100%' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: 4, borderRadius: radius.md },
});
