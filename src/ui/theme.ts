/**
 * Design system — « Nuit de braise » (refonte 2026).
 *
 * Fond presque noir, chaud. Les surfaces sont du verre fumé : couches
 * translucides, liseré clair d'un pixel, flou d'arrière-plan (Liquid Glass sur
 * iOS 26). Un seul accent vif, la braise, réservé à l'action. Les couleurs
 * d'état (sauge, glace, ambre, sang, lilas) codent santé, information,
 * progression, danger et expérience.
 *
 * Les noms de jetons historiques (rust, moss, paper…) sont conservés : ils
 * désignent désormais les teintes de la nouvelle palette.
 */
import { Platform } from 'react-native';

export const colors = {
  // Fonds
  bg: '#0B0A0A',
  bgDeep: '#060505',
  surface: '#141212',
  panel: '#181616',
  panelRaised: '#201D1C',
  panelPressed: '#2A2624',
  // Verre
  glass: 'rgba(255,248,240,0.055)',
  glassStrong: 'rgba(255,248,240,0.09)',
  glassStroke: 'rgba(255,248,240,0.11)',
  glassHighlight: 'rgba(255,248,240,0.22)',
  // Papier (documents, journal)
  paper: '#EDE6DA',
  paperDim: '#C9BFAE',
  paperInk: '#1B1714',
  // Texte
  text: '#F4F1EC',
  textDim: '#ABA59C',
  textFaint: '#857F77',
  // Accents
  rust: '#FF6A3D',
  rustBright: '#FF8A5B',
  rustDeep: '#4A1C10',
  moss: '#6FBF8A',
  mossBright: '#93DDA9',
  mossDeep: '#173323',
  steel: '#9AA4AE',
  ice: '#9CCBFF',
  amber: '#FFC46B',
  amberDim: '#7A5A26',
  blood: '#FF5468',
  violet: '#B9A4FF',
  // Lignes
  line: 'rgba(255,248,240,0.08)',
  lineStrong: 'rgba(255,248,240,0.16)',
  // Utilitaires
  overlay: 'rgba(6,5,5,0.72)',
  transparent: 'transparent',
} as const;

/** Couleurs opaques équivalentes (pour les calculs de contraste). */
export const SOLID_BACKGROUNDS = [colors.bg, colors.surface, colors.panel, colors.panelRaised] as const;

export const fonts = {
  /** Titres : grande sérif de magazine, contrastée. */
  title: 'InstrumentSerif_400Regular',
  titleItalic: 'InstrumentSerif_400Regular_Italic',
  /** Narration : sérif de lecture longue, à hauteur d'œil généreuse. */
  body: 'Newsreader_400Regular',
  bodyItalic: 'Newsreader_400Regular_Italic',
  bodyBold: 'Newsreader_600SemiBold',
  /** Interface : grotesque serrée, casse normale. */
  ui: 'InterTight_500Medium',
  uiBold: 'InterTight_600SemiBold',
  uiHeavy: 'InterTight_700Bold',
  /** Micro-étiquettes, chiffres, horloge. */
  mono: 'JetBrainsMono_500Medium',
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;

/** Les grands textes d'interface ne grossissent pas au-delà de ce facteur (taille du texte iOS). */
export const MAX_SCALE_UI = 1.35;
/** La narration suit la taille système plus largement. */
export const MAX_SCALE_READING = 1.8;

export const type = {
  display: { fontFamily: fonts.title, fontSize: 44, lineHeight: 46, color: colors.text, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.title, fontSize: 34, lineHeight: 38, color: colors.text, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.title, fontSize: 26, lineHeight: 30, color: colors.text },
  h3: { fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 22, color: colors.text, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 18, lineHeight: 29, color: colors.text },
  bodySmall: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, color: colors.textDim },
  label: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15, color: colors.textDim, letterSpacing: 1.1, textTransform: 'uppercase' as const },
  ui: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 21, color: colors.text, letterSpacing: -0.1 },
  uiSmall: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 19, color: colors.textDim },
  number: { fontFamily: fonts.mono, fontSize: 15, color: colors.text },
} as const;

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  android: { elevation: 10 },
  default: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
});

/** Lueur colorée sous un élément (iOS / web). */
export function glow(color: string, strength = 0.55) {
  return Platform.select({
    android: {},
    default: { shadowColor: color, shadowOpacity: strength, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  });
}

export const motion = {
  fast: 140,
  base: 260,
  slow: 520,
};

/** Taille minimale d'une cible tactile (recommandation Apple : 44 pt). */
export const TOUCH = 48;

/** Le pilote natif d'animation n'existe pas sur le web. */
export const NATIVE_DRIVER = Platform.OS !== 'web';

/** Coins continus (« squircle ») sur iOS. */
export const CONTINUOUS = { borderCurve: 'continuous' as const };

/** Ambiance lumineuse par chapitre : deux halos qui teintent le fond. */
export const AURAS = {
  title: ['#FF6A3D', '#3B1E6E'],
  c1: ['#FF6A3D', '#5B1F14'],
  c2: ['#3E8F86', '#1B2C4F'],
  c3: ['#FFB04A', '#4A2A12'],
  c4: ['#FF8FA3', '#2E3F7A'],
  combat: ['#FF3B4E', '#3A0E14'],
  ending: ['#B9A4FF', '#2B1B3F'],
  neutral: ['#7E8794', '#1B1F26'],
} as const;
export type AuraName = keyof typeof AURAS;
