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
  /** Cinématique d'introduction déjà lancée (elle ne revient plus d'elle-même ; « Revoir l'introduction »). */
  introSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = { reduceMotion: false, haptics: true, textScale: 1, lastSlot: 0, timedChoices: true, volume: 0.5, language: 'auto', tutorialDone: false, paperReading: false, reminders: false, hintsSeen: [], introSeen: false };

/** Tailles de texte proposées pour le récit. */
export const TEXT_SCALES = [0.9, 1, 1.15, 1.3];

/**
 * Remet des paramètres relus du stockage dans leurs bornes : un fichier
 * abîmé ou d'une autre version ne doit jamais faire planter l'interface.
 */
export function sanitizeSettings(raw: Settings): Settings {
  const s = { ...DEFAULT_SETTINGS, ...raw };
  return {
    ...s,
    textScale: TEXT_SCALES.includes(s.textScale) ? s.textScale : DEFAULT_SETTINGS.textScale,
    lastSlot: Number.isInteger(s.lastSlot) && s.lastSlot >= 0 && s.lastSlot <= 3 ? s.lastSlot : 0,
    volume: Number.isFinite(s.volume) ? Math.min(1, Math.max(0, s.volume)) : DEFAULT_SETTINGS.volume,
    language: s.language === 'fr' || s.language === 'en' ? s.language : 'auto',
    hintsSeen: Array.isArray(s.hintsSeen) ? s.hintsSeen.filter((h): h is string => typeof h === 'string') : [],
    introSeen: s.introSeen === true,
  };
}
