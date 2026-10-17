/** Paramètres persistants (module pur : utilisable hors React, par la galerie et les tests). */
import type { Lang } from '../i18n/lang';

export type LanguageSetting = 'auto' | Lang;

export interface Settings {
  reduceMotion: boolean;
  haptics: boolean;
  textScale: number;
  lastSlot: number;
  /** Choix chronométrés (désactivables : le temps n'est alors plus compté). */
  timedChoices: boolean;
  /** Volume de l'ambiance sonore, 0 à 1 (0 : coupé). */
  volume: number;
  language: LanguageSetting;
  /** Tutoriel d'accueil déjà vu (remis à false par « Revoir le tutoriel »). */
  tutorialDone: boolean;
  /** Récit imprimé sur papier clair (encre sombre) plutôt que sur fond de nuit. */
  paperReading: boolean;
  /** Rappel local de reprise (opt-in). */
  reminders: boolean;
  /** Astuces contextuelles déjà fermées. */
  hintsSeen: string[];
}

export const DEFAULT_SETTINGS: Settings = { reduceMotion: false, haptics: true, textScale: 1, lastSlot: 0, timedChoices: true, volume: 0.5, language: 'auto', tutorialDone: false, paperReading: false, reminders: false, hintsSeen: [] };
