/**
 * Règles chiffrées du jeu : une seule source de vérité pour l'équilibrage.
 */
import type { StatId } from './types';

export const STAT_IDS: StatId[] = ['force', 'discretion', 'survie', 'astuce'];

export const STAT_LABELS: Record<StatId, string> = {
  force: 'Force',
  discretion: 'Discrétion',
  survie: 'Survie',
  astuce: 'Astuce',
};

export const STAT_DESCRIPTIONS: Record<StatId, string> = {
  force:
    'Puissance physique. Augmente les dégâts et la précision au corps à corps, la santé maximale et la charge transportable. Ouvre les portes bloquées.',
  discretion:
    'Se déplacer sans bruit. Améliore l’esquive, la fuite, les coups critiques, l’endurance et les armes de finesse (couteau). Permet d’éviter les rencontres.',
  survie:
    'Endurance, premiers soins, lecture du terrain. Augmente la santé, l’endurance et l’efficacité des soins.',
  astuce:
    'Ingéniosité, mécanique, négociation. Améliore la précision au tir, la fabrication et la persuasion.',
};

/** Valeur de base de chaque caractéristique avant bonus de profil. */
export const STAT_BASE = 1;
/** Points libres à répartir à la création. */
export const CREATION_POINTS = 6;
/** Plafond d'une caractéristique à la création (profil compris). */
export const CREATION_CAP = 5;
/** Plafond absolu d'une caractéristique de base (progression comprise). */
export const STAT_MAX = 8;
/** Plafond d'une caractéristique effective (équipement compris). */
export const EFFECTIVE_STAT_MAX = 10;

export const NAME_MIN = 2;
export const NAME_MAX = 18;

export const LEVEL_MAX = 6;
/** Niveaux qui octroient une compétence. */
export const PERK_LEVELS = [2, 4, 6];

export function xpToNext(level: number): number {
  return 60 + 40 * level;
}

export const HP_BASE = 22;
export const HP_PER_LEVEL = 4;
export const STAMINA_BASE = 8;
export const CAPACITY_BASE = 8;
export const INFECTION_HP_PENALTY = 3;
export const INFECTION_MAX = 3;

/** Jet de compétence : 2d6 + caractéristique >= difficulté. */
export const CHECK_DICE = 2;
export const CHECK_SIDES = 6;

/** Probabilité exacte de réussir un jet 2d6 + bonus >= difficulté. */
export function checkProbability(bonus: number, difficulty: number): number {
  let success = 0;
  for (let a = 1; a <= 6; a += 1) {
    for (let b = 1; b <= 6; b += 1) {
      if (a + b + bonus >= difficulty) success += 1;
    }
  }
  return success / 36;
}

// --- Combat --------------------------------------------------------------

export const COMBAT = {
  baseHit: 0.78,
  hitPerStat: 0.03,
  evasionPenalty: 0.05,
  minHit: 0.25,
  maxHit: 0.97,
  critBase: 0.06,
  critPerDiscretion: 0.025,
  critMultiplier: 1.6,
  unarmedDamage: [1, 3] as [number, number],
  unarmedStamina: 1,
  defendStaminaGain: 3,
  defendReduction: 0.5,
  dodgeStamina: 3,
  dodgeBase: 0.35,
  dodgePerDiscretion: 0.06,
  dodgeMax: 0.85,
  fleeStamina: 3,
  fleeBase: 0.3,
  fleePerDiscretion: 0.08,
  fleeMax: 0.9,
  staminaRegen: 1,
  bleedDamage: 2,
  burnDamage: 3,
  biteInfectionArmorReduction: 0.12,
  maxSummons: 2,
  ambushMultiplier: 2,
};
