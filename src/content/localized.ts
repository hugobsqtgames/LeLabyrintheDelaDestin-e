/**
 * Contenu du jeu dans la langue demandée. Le moteur reçoit toujours le
 * contenu en argument : changer de langue ne change que les textes.
 * L'anglais est construit une seule fois, à la première demande.
 */
import type { GameContent } from '../engine/types';
import type { Lang } from '../i18n/lang';
import c1 from './en/c1.json';
import c2 from './en/c2.json';
import c3 from './en/c3.json';
import c4 from './en/c4.json';
import { MESSAGES_EN } from './en/messages';
import road from './en/road.json';
import world from './en/world.json';
import { CONTENT } from './index';
import { type Dictionary, translateContent } from './translate';

export const EN_DICTIONARY: Dictionary = { ...world, ...c1, ...c2, ...c3, ...c4, ...road };

let english: GameContent | null = null;

export function contentFor(lang: Lang): GameContent {
  if (lang === 'fr') return CONTENT;
  if (!english) english = { ...translateContent(CONTENT, EN_DICTIONARY), messages: MESSAGES_EN };
  return english;
}
