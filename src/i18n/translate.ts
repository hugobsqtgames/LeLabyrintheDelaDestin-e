/** Traduction pure (sans React) : utilisable par le store et hors des écrans. */
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
