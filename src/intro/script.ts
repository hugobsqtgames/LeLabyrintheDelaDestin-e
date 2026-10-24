/**
 * Cinématique d'introduction : minutage de référence, partagé par le rendu de la
 * vidéo (cinematic/) et par l'application (textes superposés, synchronisés sur la
 * lecture). Les textes ne sont pas incrustés dans la vidéo : ils restent nets,
 * traduits et lisibles par VoiceOver.
 *
 * Pur TypeScript, sans React (testé).
 */

/** Durée de la vidéo, en secondes. */
export const INTRO_DURATION = 44;

export type CueStyle =
  /** Petite capitale mono, en haut du cadre. */
  | 'label'
  /** Phrase en grande sérif, bas du cadre. */
  | 'line'
  /** Message radio, mono ambre, à la machine à écrire. */
  | 'radio'
  /** Compteur des jours (JOUR n / 7), au rythme des plans du voyage. */
  | 'days'
  /** Titre final (Valombre + sous-titre), sous l'emblème. */
  | 'title';

export interface Cue {
  id: string;
  style: CueStyle;
  /** Apparition et disparition (secondes). */
  from: number;
  to: number;
}

export const CUES: Cue[] = [
  { id: 'fever', style: 'label', from: 1.0, to: 4.6 },
  { id: 'waits', style: 'line', from: 5.8, to: 10.6 },
  { id: 'mutes', style: 'line', from: 12.2, to: 16.6 },
  { id: 'radio', style: 'radio', from: 21.6, to: 26.0 },
  { id: 'days', style: 'days', from: 26.0, to: 33.2 },
  { id: 'wait', style: 'line', from: 34.4, to: 38.0 },
  { id: 'title', style: 'title', from: 39.6, to: 44 },
];

/** Début de chaque plan du voyage (jours 1 à 7), en secondes. */
export const DAY_CUTS = [26.0, 27.0, 28.0, 29.0, 30.0, 31.0, 32.0];

/** Fondu d'entrée et de sortie des textes (secondes). */
export const CUE_FADE = 0.5;

/** Opacité d'un texte à l'instant `t` (0 à 1), avec fondus. */
export function cueOpacity(cue: Cue, t: number): number {
  if (!Number.isFinite(t) || t <= cue.from || t >= cue.to) return 0;
  const fadeOut = cue.to >= INTRO_DURATION ? 0 : CUE_FADE;
  const a = Math.min(1, (t - cue.from) / CUE_FADE);
  const b = fadeOut ? Math.min(1, (cue.to - t) / fadeOut) : 1;
  return Math.max(0, Math.min(a, b));
}

/** Textes visibles à l'instant `t`, avec leur opacité. */
export function visibleCues(t: number): { cue: Cue; opacity: number }[] {
  return CUES.map((cue) => ({ cue, opacity: cueOpacity(cue, t) })).filter((c) => c.opacity > 0);
}

/** Jour affiché par le compteur (1 à 7) à l'instant `t`. */
export function dayAt(t: number): number {
  let day = 1;
  DAY_CUTS.forEach((cut, i) => {
    if (t >= cut) day = i + 1;
  });
  return day;
}

/** Part du message radio déjà « tapée » (0 à 1) : la voix sort du bruit, mot après mot. */
export function radioProgress(t: number): number {
  const cue = CUES.find((c) => c.id === 'radio')!;
  const start = cue.from + 0.3;
  const end = cue.to - 1.6;
  return Math.max(0, Math.min(1, (t - start) / (end - start)));
}
