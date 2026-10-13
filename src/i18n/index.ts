/**
 * Traductions de l'interface. Les clés sont plates (« tab.story ») et les
 * paramètres s'écrivent entre accolades (« Niv. {n} »).
 * Un test vérifie que chaque clé utilisée existe dans toutes les langues.
 */
import { useStore } from '../store/GameStore';
import { EN } from './en';
import { FR } from './fr';
import type { Lang } from './lang';

export type Dict = Record<string, string>;
export const DICTS: Record<Lang, Dict> = { fr: FR, en: EN };

export type Params = Record<string, string | number>;

export function translate(lang: Lang, key: string, params?: Params): string {
  const raw = DICTS[lang][key] ?? FR[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export type T = (key: string, params?: Params) => string;

export function useT(): T {
  const { lang } = useStore();
  return (key, params) => translate(lang, key, params);
}

/** Messages du système de sauvegarde (produits en français) traduits à l'affichage. */
const PERSISTENCE_KEYS: Record<string, string> = {
  'Fichier de sauvegarde illisible.': 'persist.unreadable',
  'Format de sauvegarde invalide.': 'persist.invalid',
  'Sauvegarde altérée (somme de contrôle incorrecte).': 'persist.checksum',
  'Lecture impossible.': 'persist.read',
  'Restaurable depuis la copie de secours.': 'persist.backup',
  'Sauvegarde invalide.': 'persist.invalid',
  'Sauvegarde créée par une version plus récente du jeu.': 'persist.newer',
};

export function translateSaveMessage(lang: Lang, message: string): string {
  const key = PERSISTENCE_KEYS[message];
  return key ? translate(lang, key) : message;
}
