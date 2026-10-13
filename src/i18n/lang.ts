/**
 * Langue de l'application : choisie dans les paramètres, ou celle de
 * l'appareil (« auto ») — français si l'appareil est en français, anglais sinon.
 */
import { getLocales } from 'expo-localization';

export type Lang = 'fr' | 'en';
export const LANGS: Lang[] = ['fr', 'en'];

let deviceLang: Lang | null = null;

export function deviceLanguage(): Lang {
  if (deviceLang) return deviceLang;
  try {
    const code = getLocales()[0]?.languageCode ?? 'fr';
    deviceLang = code === 'fr' ? 'fr' : 'en';
  } catch {
    deviceLang = 'fr';
  }
  return deviceLang;
}

export function resolveLanguage(setting: string): Lang {
  if (setting === 'fr' || setting === 'en') return setting;
  return deviceLanguage();
}
