/**
 * Couleurs du design system, sans dépendance à React Native (testées pour le contraste).
 */
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
  textFaint: '#8E887F',
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
