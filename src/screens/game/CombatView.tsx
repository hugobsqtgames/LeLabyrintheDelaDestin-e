/**
 * Combat : intentions ennemies annoncées, ciblage, actions et journal.
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
  STATUS_LABELS,
  weaponDamageRange,
} from '../../engine/combat';
import { resolveCombat } from '../../engine/narrative';
import { COMBAT } from '../../engine/rules';
import type { CombatAction, CombatEnemy, GameState } from '../../engine/types';
import { useStore } from '../../store/GameStore';
import { EnemyArt } from '../../ui/art/Figures';
import { ItemIcon } from '../../ui/art/ItemIcon';
import { Sheet } from '../../ui/components/Sheet';
import { Badge, Bar, Button, FadeIn, Label, Panel } from '../../ui/components/primitives';
import { Icon, type IconName } from '../../ui/icons';
import { colors, fonts, radius, space, TOUCH, type, NATIVE_DRIVER } from '../../ui/theme';

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
  const def = content.enemies[enemy.def];
  const intent = describeIntent(content, enemy);
  const dead = enemy.hp <= 0;
  const [flash] = useState(() => new Animated.Value(0));
  const prevHp = useRef(enemy.hp);
  useEffect(() => {
    if (enemy.hp < prevHp.current && !reduceMotion) {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: NATIVE_DRIVER }).start();
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
      accessibilityLabel={`${def.name}, ${enemy.hp} points de vie sur ${enemy.maxHp}. ${intent ? `Intention : ${intent.text}` : ''}`}
      style={[styles.enemy, selected && styles.enemySelected, dead && { opacity: 0.35 }, compact && { flexBasis: '48%' }]}
    >
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View>
          <EnemyArt id={def.art} width={compact ? 54 : 72} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.blood, opacity: flash, borderRadius: 6 }]} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[type.ui, { fontFamily: fonts.uiBold }]} numberOfLines={2}>
            {def.name}
          </Text>
          {def.boss && <Badge label={enemy.phase > 0 ? `Boss · phase ${enemy.phase + 1}` : 'Boss'} color={colors.amber} />}
          <Bar value={enemy.hp} max={enemy.maxHp} color={colors.blood} height={6} />
          <Text style={[type.uiSmall, { fontSize: 12 }]}>
            {enemy.hp}/{enemy.maxHp} PV
          </Text>
        </View>
      </View>
      {enemy.statuses.length > 0 && (
        <View style={styles.statusRow}>
          {enemy.statuses.map((s) => (
            <Badge key={s.kind} label={`${STATUS_LABELS[s.kind]} ${s.turns}`} color={colors.ice} />
          ))}
        </View>
      )}
      {!dead && intent && (
        <View style={[styles.intent, danger && { borderColor: colors.rust, backgroundColor: '#2A1712' }]}>
          <Icon name={INTENT_ICON[intent.kind] ?? 'sword'} size={14} color={danger ? colors.rustBright : colors.textDim} />
          <Text style={[styles.intentText, danger && { color: colors.paper }]}>{intent.text}</Text>
        </View>
      )}
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
  accent = colors.lineStrong,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
  reason?: string;
  accent?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${disabled ? reason ?? 'Indisponible' : detail ?? ''}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { borderColor: disabled ? colors.line : accent }, pressed && { backgroundColor: colors.panelPressed }, disabled && { opacity: 0.45 }]}
    >
      <Icon name={icon} size={20} color={disabled ? colors.textFaint : colors.paper} />
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDetail} numberOfLines={2}>
          {disabled ? reason : detail}
        </Text>
      </View>
    </Pressable>
  );
}

export function CombatView({ game }: { game: GameState }) {
  const { content, update, feedback } = useStore();
  const combat = game.combat!;
  const scene = content.scenes[combat.sceneId];
  const living = livingEnemies(combat);
  const [targetUid, setTarget] = useState<string | null>(null);
  const [itemsOpen, setItemsOpen] = useState(false);
  const target = living.find((e) => e.uid === targetUid) ?? living[0];
  const turnRef = useRef(combat.turn);
  const lastLog = useRef(combat.logCounter);

  useEffect(() => {
    if (combat.logCounter !== lastLog.current) {
      const fresh = combat.log.filter((l) => l.id > lastLog.current);
      if (fresh.some((l) => l.tone === 'enemy' || l.tone === 'danger')) feedback('heavy');
      lastLog.current = combat.logCounter;
    }
    turnRef.current = combat.turn;
  }, [combat.logCounter, combat.log, combat.turn, feedback]);

  const act = (action: CombatAction) => {
    const turn = combat.turn;
    update((g) => (g.combat && g.combat.turn === turn ? performAction(content, g, { ...action, target: target?.uid }) : g));
  };

  const ongoing = combat.outcome === 'ongoing';
  const ranged = equippedWeapon(content, game, 'ranged');
  const melee = equippedWeapon(content, game, 'melee');
  const skill = content.profiles[game.player.profile].skill;
  const check = (a: CombatAction) => canPerform(content, game, { ...a, target: target?.uid });
  const combatItems = Object.entries(game.inventory).filter(([id]) => content.items[id]?.use?.inCombat);
  const pct = (p: number) => `${Math.round(p * 100)} %`;
  const meleeRange = weaponDamageRange(content, game, 'melee');
  const rangedRange = weaponDamageRange(content, game, 'ranged');
  const weaknesses = living.flatMap((e) => (content.enemies[e.def].weaknesses ?? []).map((w) => w.hint)).filter((v, i, a) => a.indexOf(v) === i);
  const recent = combat.log.slice(-7);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl }}>
        <Label color={colors.rustBright}>Combat · tour {combat.turn}</Label>
        <Text style={[type.h1, { marginBottom: space.md }]}>{scene?.title}</Text>
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

        <Panel style={{ marginTop: space.md, padding: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
            <Label style={{ flex: 1 }}>Journal</Label>
            {combat.playerStatuses.map((s) => (
              <Badge key={s.kind} label={`${STATUS_LABELS[s.kind]} ${s.turns}`} color={colors.rustBright} />
            ))}
          </View>
          {recent.map((l, i) => (
            <FadeIn key={l.id} from={4}>
              <Text style={[styles.log, { color: LOG_COLORS[l.tone], opacity: 0.55 + (0.45 * (i + 1)) / recent.length }]}>{l.text}</Text>
            </FadeIn>
          ))}
        </Panel>
      </ScrollView>

      <View style={styles.dock}>
        {ongoing ? (
          <View style={styles.grid}>
            <ActionButton
              icon="sword"
              label={melee ? `Frapper (${melee.name})` : 'Frapper à mains nues'}
              detail={`${meleeRange[0]}–${meleeRange[1]} dégâts · ${target ? pct(hitChance(content, game, target, 'melee')) : ''} · −${attackStaminaCost(content, game, 'melee')} end.`}
              accent={colors.rust}
              disabled={!check({ type: 'attack', weapon: 'melee' }).ok}
              reason={check({ type: 'attack', weapon: 'melee' }).reason}
              onPress={() => act({ type: 'attack', weapon: 'melee' })}
            />
            <ActionButton
              icon="target"
              label={ranged ? `Tirer (${ranged.ammo ? game.inventory[ranged.ammo] ?? 0 : '∞'})` : 'Tirer'}
              detail={ranged ? `${rangedRange[0]}–${rangedRange[1]} dégâts · ${target ? pct(hitChance(content, game, target, 'ranged')) : ''}${ranged.loud ? ' · bruyant' : ''}` : ''}
              accent={colors.rust}
              disabled={!check({ type: 'attack', weapon: 'ranged' }).ok}
              reason={check({ type: 'attack', weapon: 'ranged' }).reason}
              onPress={() => act({ type: 'attack', weapon: 'ranged' })}
            />
            <ActionButton
              icon="shield"
              label="Se défendre"
              detail={`Dégâts ÷2 · +${COMBAT.defendStaminaGain} end. · brise les étreintes`}
              onPress={() => act({ type: 'defend' })}
            />
            <ActionButton
              icon="run"
              label="Esquiver"
              detail={`${pct(dodgeChance(content, game))} d’éviter le coup · −${COMBAT.dodgeStamina} end.${game.player.profile === 'eclaireur' ? ' · riposte' : ''}`}
              disabled={!check({ type: 'dodge' }).ok}
              reason={check({ type: 'dodge' }).reason}
              onPress={() => act({ type: 'dodge' })}
            />
            <ActionButton
              icon="star"
              label={skill.name}
              detail={`−${skill.staminaCost} end. · crit. ${pct(critChance(content, game))}`}
              accent={colors.amber}
              disabled={!check({ type: 'skill' }).ok}
              reason={check({ type: 'skill' }).reason}
              onPress={() => act({ type: 'skill' })}
            />
            <ActionButton
              icon="bag"
              label="Objet"
              detail={combatItems.length ? `${combatItems.length} utilisable${combatItems.length > 1 ? 's' : ''}` : ''}
              disabled={combatItems.length === 0}
              reason="Aucun objet utilisable"
              onPress={() => setItemsOpen(true)}
            />
            {scene?.encounter?.canFlee && (
              <ActionButton
                icon="move"
                label="Fuir"
                detail={`${pct(fleeChance(content, game))} · −${COMBAT.fleeStamina} end.`}
                disabled={!check({ type: 'flee' }).ok}
                reason={check({ type: 'flee' }).reason}
                onPress={() => act({ type: 'flee' })}
              />
            )}
          </View>
        ) : (
          <FadeIn>
            <View style={{ alignItems: 'center', gap: space.sm }}>
              <Text style={[type.h1, { color: combat.outcome === 'victory' ? colors.mossBright : combat.outcome === 'fled' ? colors.amber : colors.blood }]}>
                {combat.outcome === 'victory' ? 'Victoire' : combat.outcome === 'fled' ? 'Vous avez fui' : 'Défaite'}
              </Text>
              {combat.outcome === 'victory' && combat.xpEarned > 0 && <Text style={type.uiSmall}>+{combat.xpEarned} XP</Text>}
              <Button
                label="Continuer"
                icon="chevron"
                style={{ alignSelf: 'stretch' }}
                onPress={() => update((g) => (g.combat && g.combat.outcome !== 'ongoing' ? resolveCombat(content, g) : g))}
              />
            </View>
          </FadeIn>
        )}
      </View>

      <Sheet visible={itemsOpen} onClose={() => setItemsOpen(false)} title="Utiliser un objet">
        {combatItems.length === 0 && <Text style={type.bodySmall}>Votre sac ne contient rien d’utile en combat.</Text>}
        {combatItems.map(([id, qty]) => {
          const def = content.items[id];
          const ok = canPerform(content, game, { type: 'item', item: id, target: target?.uid });
          return (
            <Pressable
              key={id}
              disabled={!ok.ok}
              accessibilityRole="button"
              accessibilityLabel={`${def.name}, ${qty} restant${qty > 1 ? 's' : ''}. ${def.description}`}
              onPress={() => {
                setItemsOpen(false);
                act({ type: 'item', item: id });
              }}
              style={({ pressed }) => [styles.itemRow, pressed && { backgroundColor: colors.panelPressed }]}
            >
              <ItemIcon icon={def.icon} category={def.category} size={40} />
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
  enemy: { flexGrow: 1, flexBasis: '100%', backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.sm, gap: space.sm },
  enemySelected: { borderColor: colors.rustBright },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  intent: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 6 },
  intentText: { fontFamily: fonts.ui, fontSize: 13, color: colors.textDim, flex: 1 },
  hint: { flexDirection: 'row', gap: 6, marginTop: space.sm, alignItems: 'flex-start' },
  log: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 19, marginBottom: 2 },
  dock: { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, padding: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  action: {
    flexBasis: '49%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.panelRaised,
  },
  actionLabel: { fontFamily: fonts.uiBold, fontSize: 15, color: colors.paper, letterSpacing: 0.4 },
  actionDetail: { fontFamily: fonts.ui, fontSize: 12, color: colors.textDim },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderRadius: radius.md },
});
