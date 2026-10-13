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
