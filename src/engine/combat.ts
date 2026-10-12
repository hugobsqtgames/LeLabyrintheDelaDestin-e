/**
 * Moteur de combat au tour par tour.
 *
 * Chaque ennemi annonce son intention avant le tour du joueur : la difficulté
 * vient de la lecture de la situation (se défendre contre une charge, esquiver
 * une morsure, briser une étreinte) plutôt que de dégâts arbitraires.
 *
 * Toutes les fonctions sont pures : elles renvoient un nouvel état.
 */
import { armorValue, effectiveStat, hasPerk, healingMultiplier, maxHp, maxStamina } from './character';
import { applyEffect } from './effects';
import { removeItem } from './inventory';
import { COMBAT } from './rules';
import { chance, nextInt, pickWeighted } from './rng';
import type {
  CombatAction,
  CombatEnemy,
  CombatLogEntry,
  CombatState,
  EncounterDef,
  EnemyDef,
  EnemyMove,
  GameContent,
  GameState,
  ItemDef,
  SceneId,
  StatusInstance,
  StatusKind,
} from './types';
import { clamp } from './util';

const MAX_LOG = 40;

export const STATUS_LABELS: Record<StatusKind, string> = {
  saignement: 'Saignement',
  sonne: 'Sonné',
  affaibli: 'Affaibli',
  agrippe: 'Agrippé',
  etourdi: 'Étourdi',
  brulure: 'Brûlure',
  distrait: 'Distrait',
  garde: 'En garde',
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function log(combat: CombatState, text: string, tone: CombatLogEntry['tone']): CombatState {
  const id = combat.logCounter + 1;
  return { ...combat, log: [...combat.log, { id, text, tone }].slice(-MAX_LOG), logCounter: id };
}

function hasStatus(list: StatusInstance[], kind: StatusKind): boolean {
  return list.some((s) => s.kind === kind && s.turns > 0);
}

function addStatus(list: StatusInstance[], kind: StatusKind, turns: number): StatusInstance[] {
  const existing = list.find((s) => s.kind === kind);
  if (existing) return list.map((s) => (s.kind === kind ? { kind, turns: Math.max(s.turns, turns) } : s));
  return [...list, { kind, turns }];
}

function removeStatus(list: StatusInstance[], kind: StatusKind): StatusInstance[] {
  return list.filter((s) => s.kind !== kind);
}

function tickStatuses(list: StatusInstance[]): StatusInstance[] {
  return list.map((s) => ({ ...s, turns: s.turns - 1 })).filter((s) => s.turns > 0);
}

export function enemyDef(content: GameContent, enemy: CombatEnemy): EnemyDef {
  const def = content.enemies[enemy.def];
  if (!def) throw new Error(`Ennemi inconnu : ${enemy.def}`);
  return def;
}

function currentMoves(def: EnemyDef, phase: number): EnemyMove[] {
  if (phase > 0 && def.phases && def.phases[phase - 1]) return def.phases[phase - 1].moves;
  return def.moves;
}

export function findMove(def: EnemyDef, phase: number, moveId: string | null): EnemyMove | null {
  if (!moveId) return null;
  return currentMoves(def, phase).find((m) => m.id === moveId) ?? def.moves.find((m) => m.id === moveId) ?? null;
}

export function livingEnemies(combat: CombatState): CombatEnemy[] {
  return combat.enemies.filter((e) => e.hp > 0);
}

function updateEnemy(combat: CombatState, uid: string, fn: (e: CombatEnemy) => CombatEnemy): CombatState {
  return { ...combat, enemies: combat.enemies.map((e) => (e.uid === uid ? fn(e) : e)) };
}

function withCombat(state: GameState, combat: CombatState): GameState {
  return { ...state, combat };
}

function makeEnemy(content: GameContent, defId: string, uid: string): CombatEnemy {
  const def = content.enemies[defId];
  if (!def) throw new Error(`Ennemi inconnu : ${defId}`);
  return { uid, def: defId, hp: def.maxHp, maxHp: def.maxHp, statuses: [], intent: null, phase: 0 };
}

function chooseIntents(content: GameContent, state: GameState): GameState {
  if (!state.combat) return state;
  let seed = state.rng;
  const enemies = state.combat.enemies.map((e) => {
    if (e.hp <= 0) return { ...e, intent: null };
    const def = enemyDef(content, e);
    const moves = currentMoves(def, e.phase).filter((m) => m.kind !== 'scream' || state.combat!.summons < COMBAT.maxSummons);
    const pick = pickWeighted(seed, moves.length ? moves : def.moves);
    seed = pick.seed;
    return { ...e, intent: pick.value.id };
  });
  return { ...state, rng: seed, combat: { ...state.combat, enemies } };
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

export function startCombat(content: GameContent, state: GameState, sceneId: SceneId, encounter: EncounterDef): GameState {
  const enemies = encounter.enemies.map((id, i) => makeEnemy(content, id, `e${i + 1}`));
  let combat: CombatState = {
    sceneId,
    enemies,
    turn: 1,
    playerStatuses: [],
    defending: false,
    dodging: false,
    skillCooldown: 0,
    ambushUsed: !encounter.ambush,
    log: [],
    logCounter: 0,
    outcome: 'ongoing',
    summons: 0,
    xpEarned: 0,
  };
  combat = log(combat, encounter.intro, 'system');
  if (encounter.ambush) combat = log(combat, 'Vous avez l’avantage de la surprise : votre première attaque sera dévastatrice.', 'system');
  return chooseIntents(content, withCombat(state, combat));
}

// ---------------------------------------------------------------------------
// Calculs exposés à l'interface
// ---------------------------------------------------------------------------

export function equippedWeapon(content: GameContent, state: GameState, kind: 'melee' | 'ranged'): ItemDef | null {
  const id = state.equipment[kind];
  return id ? content.items[id] ?? null : null;
}

/** Caractéristique utilisée par une arme : Force (mêlée), Astuce (distance), Discrétion possible (finesse). */
export function weaponStat(content: GameContent, state: GameState, kind: 'melee' | 'ranged'): number {
  if (kind === 'ranged') return effectiveStat(content, state, 'astuce');
  const weapon = equippedWeapon(content, state, 'melee');
  const force = effectiveStat(content, state, 'force');
  return weapon?.finesse ? Math.max(force, effectiveStat(content, state, 'discretion')) : force;
}

export function hitChance(content: GameContent, state: GameState, target: CombatEnemy, kind: 'melee' | 'ranged'): number {
  const def = enemyDef(content, target);
  const weapon = equippedWeapon(content, state, kind);
  const stat = weaponStat(content, state, kind);
  let p = COMBAT.baseHit + stat * COMBAT.hitPerStat + (weapon?.accuracy ?? 0) - def.evasion * COMBAT.evasionPenalty;
  if (kind === 'ranged' && hasPerk(state, 'oeil_de_lynx')) p += 0.1;
  if (state.combat && hasStatus(state.combat.playerStatuses, 'sonne')) p -= 0.2;
  if (hasStatus(target.statuses, 'etourdi') || hasStatus(target.statuses, 'distrait')) p += 0.15;
  return clamp(p, COMBAT.minHit, COMBAT.maxHit);
}

export function critChance(content: GameContent, state: GameState): number {
  return clamp(COMBAT.critBase + effectiveStat(content, state, 'discretion') * COMBAT.critPerDiscretion, 0, 0.5);
}

export function dodgeChance(content: GameContent, state: GameState): number {
  let p = COMBAT.dodgeBase + effectiveStat(content, state, 'discretion') * COMBAT.dodgePerDiscretion;
  if (hasPerk(state, 'pas_de_loup')) p += 0.1;
  return clamp(p, 0, COMBAT.dodgeMax);
}

export function fleeChance(content: GameContent, state: GameState): number {
  let p = COMBAT.fleeBase + effectiveStat(content, state, 'discretion') * COMBAT.fleePerDiscretion;
  if (hasPerk(state, 'pas_de_loup')) p += 0.1;
  if (state.combat && livingEnemies(state.combat).some((e) => enemyDef(content, e).boss)) p -= 0.2;
  return clamp(p, 0.05, COMBAT.fleeMax);
}

export function weaponDamageRange(content: GameContent, state: GameState, kind: 'melee' | 'ranged'): [number, number] {
  const weapon = equippedWeapon(content, state, kind);
  const base = weapon?.damage ?? COMBAT.unarmedDamage;
  const stat = weaponStat(content, state, kind);
  let bonus = Math.floor(stat / 2);
  if (kind === 'melee' && hasPerk(state, 'main_lourde')) bonus += 2;
  return [base[0] + bonus, base[1] + bonus];
}

export function attackStaminaCost(content: GameContent, state: GameState, kind: 'melee' | 'ranged'): number {
  const weapon = equippedWeapon(content, state, kind);
  return weapon?.staminaCost ?? COMBAT.unarmedStamina;
}

export interface ActionAvailability {
  ok: boolean;
  reason?: string;
}

export function canPerform(content: GameContent, state: GameState, action: CombatAction): ActionAvailability {
  const c = state.combat;
  if (!c || c.outcome !== 'ongoing') return { ok: false, reason: 'Le combat est terminé.' };
  const grabbed = hasStatus(c.playerStatuses, 'agrippe');
  const stamina = state.player.stamina;
  const needsTarget = action.type === 'attack' || action.type === 'skill' || (action.type === 'item' && !!action.item);
  if (needsTarget && action.target) {
    const t = c.enemies.find((e) => e.uid === action.target);
    if (!t || t.hp <= 0) return { ok: false, reason: 'Cible invalide.' };
  }
  switch (action.type) {
    case 'attack': {
      const kind = action.weapon ?? 'melee';
      if (kind === 'ranged') {
        const w = equippedWeapon(content, state, 'ranged');
        if (!w) return { ok: false, reason: 'Aucune arme à distance équipée.' };
        if (grabbed) return { ok: false, reason: 'Impossible de viser en étant agrippé.' };
        if (w.ammo && (state.inventory[w.ammo] ?? 0) <= 0) return { ok: false, reason: `Plus de ${content.items[w.ammo]?.name ?? 'munitions'}.` };
      }
      const cost = attackStaminaCost(content, state, kind);
      if (stamina < cost) return { ok: false, reason: `Endurance insuffisante (${cost} requise).` };
      return { ok: true };
    }
    case 'defend':
      return { ok: true };
    case 'dodge':
      if (grabbed) return { ok: false, reason: 'Impossible d’esquiver en étant agrippé.' };
      if (stamina < COMBAT.dodgeStamina) return { ok: false, reason: `Endurance insuffisante (${COMBAT.dodgeStamina} requise).` };
      return { ok: true };
    case 'skill': {
      const skill = content.profiles[state.player.profile].skill;
      if (c.skillCooldown > 0) return { ok: false, reason: `Disponible dans ${c.skillCooldown} tour${c.skillCooldown > 1 ? 's' : ''}.` };
      if (stamina < skill.staminaCost) return { ok: false, reason: `Endurance insuffisante (${skill.staminaCost} requise).` };
      return { ok: true };
    }
    case 'item': {
      if (!action.item) return { ok: false, reason: 'Aucun objet choisi.' };
      const def = content.items[action.item];
      if (!def?.use?.inCombat) return { ok: false, reason: 'Inutilisable en combat.' };
      if ((state.inventory[action.item] ?? 0) <= 0) return { ok: false, reason: 'Vous n’en avez plus.' };
      return { ok: true };
    }
    case 'flee': {
      const scene = content.scenes[c.sceneId];
      if (!scene?.encounter?.canFlee) return { ok: false, reason: 'Impossible de fuir ici.' };
      if (grabbed) return { ok: false, reason: 'Libérez-vous d’abord de l’étreinte.' };
      if (stamina < COMBAT.fleeStamina) return { ok: false, reason: `Endurance insuffisante (${COMBAT.fleeStamina} requise).` };
      return { ok: true };
    }
    default:
      return { ok: false, reason: 'Action inconnue.' };
  }
}

// ---------------------------------------------------------------------------
// Dégâts infligés aux ennemis
// ---------------------------------------------------------------------------

function damageEnemy(
  content: GameContent,
  state: GameState,
  uid: string,
  rawDamage: number,
  source: string,
  tone: CombatLogEntry['tone'] = 'player',
  ignoreDefense = false,
): GameState {
  let combat = state.combat!;
  const target = combat.enemies.find((e) => e.uid === uid);
  if (!target || target.hp <= 0) return state;
  const def = enemyDef(content, target);
  let dmg = rawDamage;
  for (const w of def.weaknesses ?? []) {
    if (w.status && hasStatus(target.statuses, w.status)) dmg = Math.round(dmg * w.multiplier);
  }
  if (hasStatus(target.statuses, 'distrait')) dmg = Math.round(dmg * 1.3);
  const phaseDefense = target.phase > 0 ? def.phases?.[target.phase - 1]?.defenseBonus ?? 0 : 0;
  if (!ignoreDefense) dmg -= def.defense + phaseDefense;
  if (hasStatus(target.statuses, 'garde')) dmg = Math.floor(dmg / 2);
  dmg = Math.max(1, dmg);
  const hp = Math.max(0, target.hp - dmg);
  combat = updateEnemy(combat, uid, (e) => ({ ...e, hp }));
  combat = log(combat, `${source} : ${def.name} perd ${dmg} PV.`, tone);
  if (hp <= 0) {
    combat = log(combat, `${def.name} s’effondre.`, 'system');
    combat = { ...combat, xpEarned: combat.xpEarned + def.xp };
  } else if (def.phases) {
    // Changement de phase des boss.
    const ratio = hp / target.maxHp;
    const updated = combat.enemies.find((e) => e.uid === uid)!;
    let phase = updated.phase;
    def.phases.forEach((p, i) => {
      if (ratio <= p.belowHpRatio && phase < i + 1) phase = i + 1;
    });
    if (phase !== updated.phase) {
      const p = def.phases[phase - 1];
      combat = updateEnemy(combat, uid, (e) => ({ ...e, phase, intent: null }));
      combat = log(combat, `${p.name} — ${p.announce}`, 'danger');
    }
  }
  return withCombat(state, combat);
}

function applyEnemyStatus(state: GameState, uid: string, status: StatusKind, turns: number): GameState {
  const combat = updateEnemy(state.combat!, uid, (e) => ({ ...e, statuses: addStatus(e.statuses, status, turns) }));
  return withCombat(state, combat);
}

// ---------------------------------------------------------------------------
// Actions du joueur
// ---------------------------------------------------------------------------

function defaultTarget(state: GameState, requested?: string): string | null {
  const living = livingEnemies(state.combat!);
  if (requested && living.some((e) => e.uid === requested)) return requested;
  return living[0]?.uid ?? null;
}

function spendStamina(content: GameContent, state: GameState, amount: number): GameState {
  return { ...state, player: { ...state.player, stamina: clamp(state.player.stamina - amount, 0, maxStamina(content, state)) } };
}

function playerAttack(content: GameContent, state: GameState, action: CombatAction): GameState {
  const kind = action.weapon ?? 'melee';
  const targetUid = defaultTarget(state, action.target);
  if (!targetUid) return state;
  let s = spendStamina(content, state, attackStaminaCost(content, state, kind));
  const weapon = equippedWeapon(content, s, kind);
  if (kind === 'ranged' && weapon?.ammo) s = removeItem(content, s, weapon.ammo, 1, false);
  const target = s.combat!.enemies.find((e) => e.uid === targetUid)!;
  const def = enemyDef(content, target);
  const weaponName = weapon?.name ?? 'Poings';

  const hit = chance(s.rng, hitChance(content, s, target, kind));
  s = { ...s, rng: hit.seed };
  const ambush = !s.combat!.ambushUsed;
  if (ambush) s = withCombat(s, { ...s.combat!, ambushUsed: true });
  if (!hit.value && !ambush) {
    s = withCombat(s, log(s.combat!, `${weaponName} : vous manquez ${def.name}.`, 'player'));
  } else {
    const [min, max] = weaponDamageRange(content, s, kind);
    const roll = nextInt(s.rng, min, max);
    s = { ...s, rng: roll.seed };
    let dmg = roll.value;
    const crit = chance(s.rng, critChance(content, s));
    s = { ...s, rng: crit.seed };
    let label = weaponName;
    if (ambush) {
      const mult = s.player.profile === 'eclaireur' ? COMBAT.ambushMultiplier + 0.5 : COMBAT.ambushMultiplier;
      dmg = Math.round(dmg * mult);
      label = `Attaque surprise (${weaponName})`;
    } else if (crit.value) {
      dmg = Math.round(dmg * COMBAT.critMultiplier);
      label = `Coup critique (${weaponName})`;
    }
    if (hasStatus(s.combat!.playerStatuses, 'affaibli')) dmg = Math.round(dmg * 0.7);
    s = damageEnemy(content, s, targetUid, dmg, label, crit.value || ambush ? 'crit' : 'player');
    if (kind === 'melee' && def.meleePenalty) {
      s = hurtPlayer(content, s, def.meleePenalty.damage, def.meleePenalty.text, true);
    }
  }
  // Les armes à feu font du bruit : un Muet peut accourir.
  if (weapon?.loud && !livingEnemies(s.combat!).some((e) => enemyDef(content, e).boss) && s.combat!.summons < COMBAT.maxSummons) {
    const noise = chance(s.rng, 0.25);
    s = { ...s, rng: noise.seed };
    if (noise.value) s = summon(content, s, 'rodeur', 'La détonation résonne entre les murs. Un Muet accourt.');
  }
  return s;
}

function summon(content: GameContent, state: GameState, enemyId: string, text: string): GameState {
  const c = state.combat!;
  const uid = `s${c.summons + 1}`;
  const enemy = makeEnemy(content, enemyId, uid);
  let combat: CombatState = { ...c, enemies: [...c.enemies, enemy], summons: c.summons + 1 };
  combat = log(combat, text, 'danger');
  return withCombat(state, combat);
}

function playerSkill(content: GameContent, state: GameState, action: CombatAction): GameState {
  const profile = content.profiles[state.player.profile];
  let s = spendStamina(content, state, profile.skill.staminaCost);
  s = withCombat(s, { ...s.combat!, skillCooldown: profile.skill.cooldown + 1 });
  const targetUid = defaultTarget(s, action.target);
  if (!targetUid) return s;
  const target = s.combat!.enemies.find((e) => e.uid === targetUid)!;
  switch (state.player.profile) {
    case 'guerrier': {
      const [min, max] = weaponDamageRange(content, s, 'melee');
      const roll = nextInt(s.rng, min, max);
      s = { ...s, rng: roll.seed };
      s = damageEnemy(content, s, targetUid, Math.round(roll.value * 1.8), profile.skill.name, 'crit');
      const def = enemyDef(content, target);
      if (!def.boss || target.phase === 0) {
        s = applyEnemyStatus(s, targetUid, 'etourdi', 1);
        s = withCombat(s, log(s.combat!, `${def.name} est étourdi.`, 'player'));
      } else {
        s = withCombat(s, log(s.combat!, `${def.name} encaisse sans broncher.`, 'enemy'));
      }
      return s;
    }
    case 'eclaireur': {
      const [min, max] = weaponDamageRange(content, s, 'melee');
      const roll = nextInt(s.rng, min, max);
      s = { ...s, rng: roll.seed };
      const exposed = hasStatus(target.statuses, 'distrait') || hasStatus(target.statuses, 'etourdi');
      const mult = exposed ? 2.6 : COMBAT.critMultiplier + 0.2;
      s = damageEnemy(content, s, targetUid, Math.round(roll.value * mult), `${profile.skill.name}${exposed ? ' (cible exposée)' : ''}`, 'crit');
      s = applyEnemyStatus(s, targetUid, 'saignement', 3);
      return s;
    }
    case 'technicien': {
      let combat = s.combat!;
      for (const e of livingEnemies(combat)) {
        combat = updateEnemy(combat, e.uid, (en) => ({ ...en, statuses: addStatus(en.statuses, 'distrait', 2) }));
      }
      combat = log(combat, `${profile.skill.name} : un réveil bricolé se met à sonner. Les ennemis se détournent.`, 'player');
      return withCombat(s, combat);
    }
    default:
      return s;
  }
}

function playerItem(content: GameContent, state: GameState, action: CombatAction): GameState {
  const itemId = action.item!;
  const def = content.items[itemId];
  const u = def.use!;
  let s = removeItem(content, state, itemId, 1, false);
  let combat = s.combat!;
  // Effets sur le joueur.
  const p = s.player;
  const heal = u.heal ? Math.round(u.heal * healingMultiplier(content, s)) : 0;
  const hp = clamp(p.hp + heal, 0, maxHp(content, s));
  const stamina = clamp(p.stamina + (u.stamina ?? 0), 0, maxStamina(content, s));
  s = { ...s, player: { ...p, hp, stamina } };
  let playerStatuses = combat.playerStatuses;
  for (const cure of u.cures ?? []) playerStatuses = removeStatus(playerStatuses, cure);
  combat = { ...combat, playerStatuses };
  const parts: string[] = [];
  if (hp > p.hp) parts.push(`+${hp - p.hp} PV`);
  if (stamina > p.stamina) parts.push(`+${stamina - p.stamina} endurance`);
  if (u.cures?.length) parts.push(`soigne ${u.cures.map((c) => STATUS_LABELS[c].toLowerCase()).join(', ')}`);
  combat = log(combat, `${def.name}${parts.length ? ` : ${parts.join(', ')}` : ''}.`, 'player');
  s = withCombat(s, combat);
  if (u.cureInfection && s.player.infection > 0) s = applyEffect(content, s, { type: 'cureInfection' });
  // Effets offensifs.
  const targets = u.targetAll ? livingEnemies(s.combat!).map((e) => e.uid) : [defaultTarget(s, action.target)].filter((x): x is string => !!x);
  for (const uid of targets) {
    if (u.applyToEnemy) s = applyEnemyStatus(s, uid, u.applyToEnemy.status, u.applyToEnemy.turns);
    if (u.combatDamage) {
      const roll = nextInt(s.rng, u.combatDamage[0], u.combatDamage[1]);
      s = { ...s, rng: roll.seed };
      s = damageEnemy(content, s, uid, roll.value, def.name, 'player', true);
    }
  }
  if (u.applyToEnemy) {
    s = withCombat(s, log(s.combat!, `${STATUS_LABELS[u.applyToEnemy.status]} infligé.`, 'player'));
  }
  return s;
}

// ---------------------------------------------------------------------------
// Dégâts subis par le joueur
// ---------------------------------------------------------------------------

function hurtPlayer(content: GameContent, state: GameState, amount: number, text: string, ignoreArmor = false): GameState {
  let dmg = amount;
  if (!ignoreArmor) dmg -= armorValue(content, state);
  const c = state.combat!;
  if (c.defending) dmg = Math.floor(dmg * COMBAT.defendReduction);
  dmg = Math.max(1, dmg);
  const hp = Math.max(0, state.player.hp - dmg);
  const s: GameState = { ...state, player: { ...state.player, hp } };
  return withCombat(s, log(c, `${text} (−${dmg} PV)`, 'enemy'));
}

function enemyAct(content: GameContent, state: GameState, enemy: CombatEnemy): GameState {
  const def = enemyDef(content, enemy);
  let s = state;
  if (hasStatus(enemy.statuses, 'etourdi')) {
    return withCombat(s, log(s.combat!, `${def.name} titube, incapable d’agir.`, 'player'));
  }
  if (hasStatus(enemy.statuses, 'distrait')) {
    return withCombat(s, log(s.combat!, `${def.name} se tourne vers le bruit et vous oublie un instant.`, 'player'));
  }
  const move = findMove(def, enemy.phase, enemy.intent) ?? currentMoves(def, enemy.phase)[0];
  const combat = s.combat!;

  if (move.kind === 'guard') {
    s = applyEnemyStatus(s, enemy.uid, 'garde', 1);
    return withCombat(s, log(s.combat!, `${def.name} : ${move.name}.`, 'enemy'));
  }
  if (move.kind === 'scream') {
    if (move.summon && combat.summons < COMBAT.maxSummons) {
      return summon(content, s, move.summon, `${def.name} : ${move.name} ! Un ${content.enemies[move.summon]?.name ?? 'Muet'} surgit.`);
    }
    return withCombat(s, log(combat, `${def.name} hurle, mais personne ne répond plus.`, 'enemy'));
  }

  // Esquive (les étreintes ne s'esquivent pas si l'on est déjà agrippé).
  if (combat.dodging) {
    const d = chance(s.rng, dodgeChance(content, s));
    s = { ...s, rng: d.seed };
    if (d.value) {
      s = withCombat(s, log(s.combat!, `Vous esquivez : ${move.name}.`, 'player'));
      // L'éclaireur riposte après chaque esquive réussie.
      if (s.player.profile === 'eclaireur') {
        const [min, max] = weaponDamageRange(content, s, 'melee');
        const counter = nextInt(s.rng, min, max);
        s = { ...s, rng: counter.seed };
        s = damageEnemy(content, s, enemy.uid, Math.round(counter.value * 0.6), 'Contre-attaque', 'crit');
      }
      return s;
    }
  }

  const [min, max] = move.damage ?? [0, 0];
  const roll = nextInt(s.rng, min, max);
  s = { ...s, rng: roll.seed };
  let dmg = roll.value;
  if (move.kind === 'bite' && hasStatus(s.combat!.playerStatuses, 'agrippe')) dmg += 2;
  if (dmg > 0) s = hurtPlayer(content, s, dmg, `${def.name} : ${move.name}`, move.kind === 'spit');
  else s = withCombat(s, log(s.combat!, `${def.name} : ${move.name}.`, 'enemy'));

  if (move.kind === 'grab') {
    if (s.combat!.defending) {
      s = withCombat(s, log(s.combat!, 'Votre garde l’empêche de vous saisir.', 'player'));
    } else {
      s = withCombat(s, { ...s.combat!, playerStatuses: addStatus(s.combat!.playerStatuses, 'agrippe', 2) });
    }
  }
  if (move.applies) {
    const roll2 = chance(s.rng, move.applies.chance);
    s = { ...s, rng: roll2.seed };
    if (roll2.value && !(s.combat!.defending && move.applies.status === 'saignement')) {
      s = withCombat(s, {
        ...s.combat!,
        playerStatuses: addStatus(s.combat!.playerStatuses, move.applies.status, move.applies.turns),
      });
      s = withCombat(s, log(s.combat!, `Vous êtes ${STATUS_LABELS[move.applies.status].toLowerCase()}.`, 'danger'));
    }
  }
  if (move.infectionChance && s.player.hp > 0 && !s.combat!.defending) {
    const p = Math.max(0.03, move.infectionChance - armorValue(content, s) * COMBAT.biteInfectionArmorReduction);
    const inf = chance(s.rng, p);
    s = { ...s, rng: inf.seed };
    if (inf.value) {
      s = applyEffect(content, s, { type: 'infection', amount: 1 });
      s = withCombat(s, log(s.combat!, 'Les dents ont percé la peau. La morsure brûle.', 'danger'));
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Fin de tour
// ---------------------------------------------------------------------------

function alliesAct(content: GameContent, state: GameState): GameState {
  let s = state;
  for (const [id, status] of Object.entries(s.companions)) {
    if (status !== 'companion') continue;
    const ch = content.characters[id];
    const assist = ch?.combatAssist;
    if (!assist || s.combat!.turn % assist.every !== 0) continue;
    const roll = nextInt(s.rng, assist.amount[0], assist.amount[1]);
    s = { ...s, rng: roll.seed };
    if (assist.kind === 'heal') {
      if (s.player.hp >= maxHp(content, s)) continue;
      const hp = clamp(s.player.hp + roll.value, 0, maxHp(content, s));
      s = { ...s, player: { ...s.player, hp } };
      s = withCombat(s, log(s.combat!, `${ch.name} ${assist.text} (+${roll.value} PV)`, 'ally'));
    } else {
      const target = livingEnemies(s.combat!)[0];
      if (!target) continue;
      s = damageEnemy(content, s, target.uid, roll.value, `${ch.name} ${assist.text}`, 'ally', true);
    }
  }
  return s;
}

function endOfRound(content: GameContent, state: GameState): GameState {
  let s = state;
  let combat = s.combat!;
  // Statuts du joueur.
  if (hasStatus(combat.playerStatuses, 'saignement')) {
    s = { ...s, player: { ...s.player, hp: Math.max(0, s.player.hp - COMBAT.bleedDamage) } };
    combat = log(combat, `Vous saignez (−${COMBAT.bleedDamage} PV).`, 'danger');
  }
  // Statuts des ennemis.
  s = withCombat(s, combat);
  for (const e of livingEnemies(s.combat!)) {
    if (hasStatus(e.statuses, 'saignement')) s = damageEnemy(content, s, e.uid, COMBAT.bleedDamage, 'Saignement', 'player', true);
    const after = s.combat!.enemies.find((x) => x.uid === e.uid)!;
    if (after.hp > 0 && hasStatus(after.statuses, 'brulure')) s = damageEnemy(content, s, e.uid, COMBAT.burnDamage, 'Brûlure', 'player', true);
  }
  combat = s.combat!;
  combat = {
    ...combat,
    enemies: combat.enemies.map((e) => ({ ...e, statuses: tickStatuses(e.statuses) })),
    playerStatuses: tickStatuses(combat.playerStatuses),
    defending: false,
    dodging: false,
    skillCooldown: Math.max(0, combat.skillCooldown - 1),
    turn: combat.turn + 1,
  };
  s = withCombat(s, combat);
  s = { ...s, player: { ...s.player, stamina: clamp(s.player.stamina + COMBAT.staminaRegen, 0, maxStamina(content, s)) } };
  return chooseIntents(content, s);
}

function checkOutcome(state: GameState): GameState {
  const c = state.combat!;
  if (c.outcome !== 'ongoing') return state;
  if (state.player.hp <= 0) return withCombat(state, log({ ...c, outcome: 'defeat' }, 'Vous vous effondrez.', 'danger'));
  if (livingEnemies(c).length === 0) return withCombat(state, log({ ...c, outcome: 'victory' }, 'Le silence retombe. Vous avez survécu.', 'system'));
  return state;
}

/**
 * Résout une action du joueur puis la riposte des ennemis.
 * Une action invalide laisse l'état strictement inchangé.
 */
export function performAction(content: GameContent, state: GameState, action: CombatAction): GameState {
  const availability = canPerform(content, state, action);
  if (!availability.ok) return state;
  let s = state;
  let combat = s.combat!;
  combat = { ...combat, defending: false, dodging: false };
  s = withCombat(s, combat);

  switch (action.type) {
    case 'attack':
      s = playerAttack(content, s, action);
      break;
    case 'defend': {
      const wasGrabbed = hasStatus(s.combat!.playerStatuses, 'agrippe');
      s = { ...s, player: { ...s.player, stamina: clamp(s.player.stamina + COMBAT.defendStaminaGain, 0, maxStamina(content, s)) } };
      let c = { ...s.combat!, defending: true, playerStatuses: removeStatus(s.combat!.playerStatuses, 'agrippe') };
      c = log(c, wasGrabbed ? 'Vous repoussez l’étreinte et levez votre garde.' : 'Vous levez votre garde et reprenez votre souffle.', 'player');
      s = withCombat(s, c);
      break;
    }
    case 'dodge':
      s = spendStamina(content, s, COMBAT.dodgeStamina);
      s = withCombat(s, log({ ...s.combat!, dodging: true }, 'Vous vous préparez à esquiver.', 'player'));
      break;
    case 'skill':
      s = playerSkill(content, s, action);
      break;
    case 'item':
      s = playerItem(content, s, action);
      break;
    case 'flee': {
      s = spendStamina(content, s, COMBAT.fleeStamina);
      const f = chance(s.rng, fleeChance(content, s));
      s = { ...s, rng: f.seed };
      if (f.value) {
        return withCombat(s, log({ ...s.combat!, outcome: 'fled' }, 'Vous prenez la fuite.', 'system'));
      }
      s = withCombat(s, log(s.combat!, 'Votre fuite échoue : le passage est coupé.', 'danger'));
      break;
    }
  }

  s = checkOutcome(s);
  if (s.combat!.outcome !== 'ongoing') return s;

  s = alliesAct(content, s);
  s = checkOutcome(s);
  if (s.combat!.outcome !== 'ongoing') return s;

  for (const enemy of livingEnemies(s.combat!)) {
    const fresh = s.combat!.enemies.find((e) => e.uid === enemy.uid)!;
    if (fresh.hp <= 0) continue;
    s = enemyAct(content, s, fresh);
    s = checkOutcome(s);
    if (s.combat!.outcome !== 'ongoing') return s;
  }

  s = endOfRound(content, s);
  return checkOutcome(s);
}

/** Description lisible de l'intention d'un ennemi. */
export function describeIntent(content: GameContent, enemy: CombatEnemy): { text: string; kind: string } | null {
  const def = enemyDef(content, enemy);
  if (enemy.hp <= 0) return null;
  if (hasStatus(enemy.statuses, 'etourdi')) return { text: 'Étourdi : ne pourra pas agir.', kind: 'stunned' };
  if (hasStatus(enemy.statuses, 'distrait')) return { text: 'Distrait : regarde ailleurs.', kind: 'stunned' };
  const move = findMove(def, enemy.phase, enemy.intent);
  if (!move) return null;
  return { text: move.telegraph, kind: move.kind };
}
