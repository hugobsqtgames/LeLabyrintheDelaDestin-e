/**
 * Traduction du contenu : un dictionnaire « texte français → texte traduit »
 * appliqué à tout l'arbre du contenu. Seules les chaînes rangées sous les
 * clés ci-dessous sont des textes (les autres sont des identifiants).
 */
import type { GameContent } from '../engine/types';

export const TRANSLATABLE_KEYS = new Set([
  'text',
  'description',
  'body',
  'title',
  'telegraph',
  'name',
  'intro',
  'summary',
  'warning',
  'announce',
  'source',
  'epitaph',
  'hint',
  'region',
  'advantage',
  'drawback',
  'role',
  'subtitle',
  'tagline',
  'cause',
]);

/** Clés dont les valeurs (et non les noms) sont des textes : `{ force: 'Force' }`. */
const TEXT_MAPS = new Set(['changes', 'statLabels', 'statDescriptions']);

export type Dictionary = Record<string, string>;

/** Parcourt le contenu et appelle `visit` sur chaque texte traduisible. */
export function mapTexts<T>(value: T, visit: (text: string) => string, key = ''): T {
  if (typeof value === 'string') return (TRANSLATABLE_KEYS.has(key) ? visit(value) : value) as T;
  if (Array.isArray(value)) return value.map((v) => mapTexts(v, visit, key)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Les messages du moteur ont leur propre traduction (avec paramètres).
      if (k === 'messages') out[k] = v;
      else out[k] = mapTexts(v, visit, TEXT_MAPS.has(key) ? 'text' : k === 'regions' ? 'region' : k);
    }
    return out as T;
  }
  return value;
}

/** Tous les textes traduisibles du contenu (sans doublon). */
export function collectTexts(content: GameContent): string[] {
  const set = new Set<string>();
  mapTexts(content, (t) => {
    set.add(t);
    return t;
  });
  return [...set];
}

/** Contenu traduit ; un texte absent du dictionnaire reste en français. */
export function translateContent(content: GameContent, dict: Dictionary): GameContent {
  return mapTexts(content, (t) => dict[t] ?? t);
}
