/**
 * Contenu du jeu dans la langue demandée. Le moteur reçoit toujours le
 * contenu en argument : changer de langue ne change que les textes.
 */
import type { Lang } from '../i18n/lang';
import { CONTENT } from './index';

export function contentFor(lang: Lang) {
  void lang;
  return CONTENT;
}
