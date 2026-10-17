/**
 * Traductions de l'interface. Les clés sont plates (« tab.story ») et les
 * paramètres s'écrivent entre accolades (« Niv. {n} »).
 * Un test vérifie que chaque clé utilisée existe dans toutes les langues.
 */
import { useStore } from '../store/GameStore';
import type { Lang } from './lang';
import { type Params, translate } from './translate';

export { DICTS, type Dict, type Params, translate } from './translate';

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
  'Aucun état avant relève pour cet emplacement.': 'persist.noRelay',
  'Ce chapitre n’a pas encore été atteint.': 'persist.noChapter',
};

export function translateSaveMessage(lang: Lang, message: string): string {
  const key = PERSISTENCE_KEYS[message];
  return key ? translate(lang, key) : message;
}
