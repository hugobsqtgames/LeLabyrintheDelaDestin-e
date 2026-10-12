/**
 * Design system — « carnet de survie ».
 *
 * Fond : béton humide et vert-de-gris. Encre : papier jauni. Accent : rouille.
 * Les couleurs secondaires (mousse, acier, ambre) codent l'état : santé,
 * information froide, progression.
 */
import { Platform } from 'react-native';

export const colors = {
  // Fonds
  bg: '#0D1110',
  bgDeep: '#080B0A',
  surface: '#141A18',
  panel: '#1A211E',
  panelRaised: '#212A26',
  panelPressed: '#28322D',
  // Papier (documents, dialogues)
  paper: '#D9CFB6',
  paperDim: '#B9AE93',
  paperInk: '#2A2620',
  // Texte
  text: '#E6DFCC',
  textDim: '#A9A390',
  textFaint: '#6F6C60',
  // Accents
  rust: '#A8462E',
  rustBright: '#CF6240',
  rustDeep: '#5E2416',
  moss: '#738F6A',
  mossBright: '#94B486',
  mossDeep: '#2F3D2C',
  steel: '#7E8C88',
  ice: '#A3BDBA',
  amber: '#C9A24A',
  amberDim: '#7A6430',
  blood: '#B0362B',
  // Lignes
  line: '#2B3531',
  lineStrong: '#44524B',
  // Utilitaires
  overlay: 'rgba(5, 8, 7, 0.82)',
  transparent: 'transparent',
} as const;

export const fonts = {
  /** Titres : machine à écrire, documents abîmés. */
  title: 'SpecialElite_400Regular',
  /** Narration : sérif lisible pour les lectures longues. */
  body: 'Spectral_400Regular',
  bodyItalic: 'Spectral_400Regular_Italic',
  bodyBold: 'Spectral_600SemiBold',
  /** Interface : condensé, capitales, étiquettes de matériel. */
  ui: 'BarlowCondensed_500Medium',
  uiBold: 'BarlowCondensed_700Bold',
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 4, md: 8, lg: 14, pill: 999 } as const;

export const type = {
  display: { fontFamily: fonts.title, fontSize: 34, lineHeight: 40, color: colors.text, letterSpacing: 1 },
  h1: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, color: colors.text },
  h2: { fontFamily: fonts.title, fontSize: 20, lineHeight: 26, color: colors.text },
  h3: { fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 22, color: colors.text, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.text },
  bodySmall: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textDim },
  label: { fontFamily: fonts.uiBold, fontSize: 13, lineHeight: 16, color: colors.textDim, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  ui: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 20, color: colors.text, letterSpacing: 0.3 },
  uiSmall: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 18, color: colors.textDim, letterSpacing: 0.3 },
  number: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.text },
} as const;

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 6 },
  default: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
});

export const motion = {
  fast: 140,
  base: 240,
  slow: 420,
};

/** Taille minimale d'une cible tactile (recommandation Apple : 44 pt). */
export const TOUCH = 48;

/** Le pilote natif d'animation n'existe pas sur le web. */
export const NATIVE_DRIVER = Platform.OS !== 'web';
