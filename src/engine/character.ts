/**
 * Création du personnage et statistiques dérivées.
 */
import { msg, msgCount } from './messages';
import {
  CREATION_CAP,
  CREATION_POINTS,
  EFFECTIVE_STAT_MAX,
  HP_BASE,
  HP_PER_LEVEL,
  INFECTION_HP_PENALTY,
  LEVEL_MAX,
  NAME_MAX,
  NAME_MIN,
  PERK_LEVELS,
  STAMINA_BASE,
  STAT_BASE,
  STAT_IDS,
  STAT_MAX,
  xpToNext,
} from './rules';
import type {
  CharacterDraft,
  GameContent,
  GameState,
  PerkId,
  StatId,
  Stats,
} from './types';
import { addChronicle, addNotice, clamp } from './util';

export function zeroStats(): Stats {
  return { force: 0, discretion: 0, survie: 0, astuce: 0 };
}

export function emptyDraft(): CharacterDraft {
  return { name: '', profile: null, background: null, emblem: null, allocated: zeroStats() };
}

export function allocatedTotal(draft: CharacterDraft): number {
  return STAT_IDS.reduce((sum, s) => sum + draft.allocated[s], 0);
}

export function remainingPoints(draft: CharacterDraft): number {
  return CREATION_POINTS - allocatedTotal(draft);
}

/** Valeur finale d'une caractéristique du brouillon (base + profil + points). */
export function draftStat(content: GameContent, draft: CharacterDraft, stat: StatId): number {
  const bonus = draft.profile ? content.profiles[draft.profile].bonuses[stat] ?? 0 : 0;
  return STAT_BASE + bonus + draft.allocated[stat];
}

export function draftStats(content: GameContent, draft: CharacterDraft): Stats {
  const s = zeroStats();
  for (const id of STAT_IDS) s[id] = draftStat(content, draft, id);
  return s;
}

export function canIncrement(content: GameContent, draft: CharacterDraft, stat: StatId): boolean {
  return remainingPoints(draft) > 0 && draftStat(content, draft, stat) < CREATION_CAP;
}

export function canDecrement(draft: CharacterDraft, stat: StatId): boolean {
  return draft.allocated[stat] > 0;
}

export function adjustDraftStat(
  content: GameContent,
  draft: CharacterDraft,
  stat: StatId,
  delta: 1 | -1,
): CharacterDraft {
  if (delta === 1 && !canIncrement(content, draft, stat)) return draft;
  if (delta === -1 && !canDecrement(draft, stat)) return draft;
  return { ...draft, allocated: { ...draft.allocated, [stat]: draft.allocated[stat] + delta } };
}

/**
 * Changer de profil peut faire dépasser le plafond : on retire alors les
 * points excédentaires pour garder un brouillon toujours valide.
 */
export function setDraftProfile(content: GameContent, draft: CharacterDraft, profile: CharacterDraft['profile']): CharacterDraft {
  const next: CharacterDraft = { ...draft, profile, allocated: { ...draft.allocated } };
  for (const s of STAT_IDS) {
    while (next.allocated[s] > 0 && draftStat(content, next, s) > CREATION_CAP) {
      next.allocated[s] -= 1;
    }
  }
  return next;
}

export function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export interface DraftValidation {
  valid: boolean;
  errors: string[];
}

export function validateDraft(content: GameContent, draft: CharacterDraft): DraftValidation {
  const errors: string[] = [];
  const name = normalizeName(draft.name);
  if (name.length < NAME_MIN) errors.push(msg(content, 'draft.nameTooShort', { min: NAME_MIN }));
  if (name.length > NAME_MAX) errors.push(msg(content, 'draft.nameTooLong', { max: NAME_MAX }));
  if (/[<>{}\[\]\\]/.test(name)) errors.push(msg(content, 'draft.nameForbidden'));
  if (!draft.profile || !content.profiles[draft.profile]) errors.push(msg(content, 'draft.chooseProfile'));
  if (!draft.background || !content.backgrounds[draft.background]) errors.push(msg(content, 'draft.chooseBackground'));
  if (!draft.emblem) errors.push(msg(content, 'draft.chooseEmblem'));
  for (const s of STAT_IDS) {
    if (draft.allocated[s] < 0 || !Number.isInteger(draft.allocated[s])) errors.push(msg(content, 'draft.invalidAllocation'));
    if (draftStat(content, draft, s) > CREATION_CAP) errors.push(msg(content, 'draft.overCap', { cap: CREATION_CAP }));
  }
  const remaining = remainingPoints(draft);
  if (remaining > 0) errors.push(msgCount(content, 'draft.pointsLeft', remaining));
  if (remaining < 0) errors.push(msg(content, 'draft.tooManyPoints'));
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

// ---------------------------------------------------------------------------
// Statistiques dérivées
// ---------------------------------------------------------------------------

export function equipmentBonuses(content: GameContent, state: GameState): Stats {
  const bonus = zeroStats();
  for (const itemId of Object.values(state.equipment)) {
    if (!itemId) continue;
    const def = content.items[itemId];
    if (!def?.statBonus) continue;
    for (const s of STAT_IDS) bonus[s] += def.statBonus[s] ?? 0;
  }
  return bonus;
}

export function effectiveStat(content: GameContent, state: GameState, stat: StatId): number {
  const bonus = equipmentBonuses(content, state)[stat];
  return clamp(state.player.stats[stat] + bonus, 0, EFFECTIVE_STAT_MAX);
}

export function effectiveStats(content: GameContent, state: GameState): Stats {
  const s = zeroStats();
  for (const id of STAT_IDS) s[id] = effectiveStat(content, state, id);
  return s;
}

export function maxHp(content: GameContent, state: GameState): number {
  const p = state.player;
  const bg = content.backgrounds[p.background];
  const raw =
    HP_BASE +
    p.stats.force +
    p.stats.survie * 2 +
    (bg?.bonusMaxHp ?? 0) +
    (p.level - 1) * HP_PER_LEVEL -
    p.infection * INFECTION_HP_PENALTY;
  return Math.max(5, raw);
}

export function maxStamina(content: GameContent, state: GameState): number {
  const p = state.player;
  const bg = content.backgrounds[p.background];
  return Math.max(1, STAMINA_BASE + p.stats.survie + p.stats.discretion + (hasPerk(state, 'second_souffle') ? 3 : 0) + (bg?.staminaModifier ?? 0));
}

export function armorValue(content: GameContent, state: GameState): number {
  let total = 0;
  for (const itemId of Object.values(state.equipment)) {
    if (itemId) total += content.items[itemId]?.armor ?? 0;
  }
  return total;
}

export function hasPerk(state: GameState, perk: PerkId): boolean {
  return state.player.perks.includes(perk);
}

/** Bonus fixe aux jets de compétence. */
export function checkBonus(content: GameContent, state: GameState, stat: StatId): number {
  const bg = content.backgrounds[state.player.background];
  return effectiveStat(content, state, stat) + (hasPerk(state, 'sang_froid') ? 1 : 0) + (bg?.checkModifiers?.[stat] ?? 0);
}

/** Détail d'un bonus de jet, pour l'expliquer au joueur. */
export interface CheckBreakdown {
  base: number;
  equipment: number;
  /** Plafond des caractéristiques effectives (négatif si l'équipement dépasse le maximum). */
  cap: number;
  perk: number;
  background: number;
  total: number;
}

export function checkBreakdown(content: GameContent, state: GameState, stat: StatId): CheckBreakdown {
  const base = state.player.stats[stat];
  const equipment = equipmentBonuses(content, state)[stat];
  const effective = effectiveStat(content, state, stat);
  const cap = effective - (base + equipment);
  const perk = hasPerk(state, 'sang_froid') ? 1 : 0;
  const background = content.backgrounds[state.player.background]?.checkModifiers?.[stat] ?? 0;
  return { base, equipment, cap, perk, background, total: effective + perk + background };
}

export function healingMultiplier(content: GameContent, state: GameState): number {
  const bg = content.backgrounds[state.player.background];
  let m = bg?.healingMultiplier ?? 1;
  if (hasPerk(state, 'premiers_secours')) m += 0.5;
  // La Survie améliore légèrement les soins.
  m += state.player.stats.survie * 0.05;
  return m;
}

/** Ramène PV et endurance dans leurs bornes (après changement d'équipement, d'infection…). */
export function clampVitals(content: GameContent, state: GameState): GameState {
  const hp = clamp(state.player.hp, 0, maxHp(content, state));
  const stamina = clamp(state.player.stamina, 0, maxStamina(content, state));
  if (hp === state.player.hp && stamina === state.player.stamina) return state;
  return { ...state, player: { ...state.player, hp, stamina } };
}

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

export function grantXp(content: GameContent, state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  let s: GameState = { ...state, player: { ...state.player, xp: state.player.xp + amount } };
  while (s.player.level < LEVEL_MAX && s.player.xp >= xpToNext(s.player.level)) {
    const p = s.player;
    const newLevel = p.level + 1;
    const gainsPerk = PERK_LEVELS.includes(newLevel);
    s = {
      ...s,
      player: {
        ...p,
        xp: p.xp - xpToNext(p.level),
        level: newLevel,
        unspentStatPoints: p.unspentStatPoints + 1,
        unspentPerks: p.unspentPerks + (gainsPerk ? 1 : 0),
      },
    };
    s = { ...s, player: { ...s.player, hp: Math.min(maxHp(content, s), s.player.hp + 5), stamina: maxStamina(content, s) } };
    s = addNotice(s, msg(content, gainsPerk ? 'level.upPerk' : 'level.up', { level: newLevel }), 'level');
    s = addChronicle(content, s, msg(content, 'chronicle.levelUp', { level: newLevel }), false);
  }
  if (s.player.level >= LEVEL_MAX) {
    s = { ...s, player: { ...s.player, xp: Math.min(s.player.xp, xpToNext(LEVEL_MAX)) } };
  }
  return s;
}

export function spendStatPoint(content: GameContent, state: GameState, stat: StatId): GameState {
  // Partie terminée (mort, fin) : le sac et la fiche sont figés (la fouille du corps lors d'une relève en dépend).
  if (state.ending) return state;
  const p = state.player;
  if (p.unspentStatPoints <= 0 || p.stats[stat] >= STAT_MAX) return state;
  const before = maxHp(content, state);
  let s: GameState = {
    ...state,
    player: { ...p, unspentStatPoints: p.unspentStatPoints - 1, stats: { ...p.stats, [stat]: p.stats[stat] + 1 } },
  };
  // Le gain de santé maximale est aussi accordé en santé courante.
  const gained = maxHp(content, s) - before;
  if (gained > 0) s = { ...s, player: { ...s.player, hp: s.player.hp + gained } };
  return clampVitals(content, s);
}

export function choosePerk(content: GameContent, state: GameState, perk: PerkId): GameState {
  // Partie terminée (mort, fin) : le sac et la fiche sont figés (la fouille du corps lors d'une relève en dépend).
  if (state.ending) return state;
  const p = state.player;
  if (p.unspentPerks <= 0 || p.perks.includes(perk) || !content.perks[perk]) return state;
  let s: GameState = { ...state, player: { ...p, unspentPerks: p.unspentPerks - 1, perks: [...p.perks, perk] } };
  s = addChronicle(content, s, msg(content, 'chronicle.newPerk', { perk: content.perks[perk].name }), false);
  return clampVitals(content, s);
}
