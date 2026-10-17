/**
 * Storyboard de la vidéo (30 s, 886 × 1920, 30 i/s).
 *
 *  0,0 – 2,7  Ouverture   « La ville est tombée. »          noir, braise, poussière
 *  2,7 – 5,7  Le besoin   « Il vous reste sept jours. »     le téléphone surgit : le Hurleur, compte à rebours
 *  5,7 – 8,3  Découverte  « Survivre est un choix. »         écran titre, téléphone de face
 *  8,3 – 12,2 Choix       « Chaque choix compte. »           zoom sur les choix, appui sur 83 % → détail du jet
 * 12,2 – 15,6 Combat      « Des combats sans pitié. »        deux coups portés, secousse
 * 15,6 – 18,8 Relations   « Ils se souviennent de vous. »    fiche : portraits, relations
 * 18,8 – 22,3 Monde       « Un monde qui garde vos traces. » trois téléphones : carte, archives, atelier
 * 22,3 – 25,8 Récit       plongée dans l'écran              carton de chapitre plein cadre, « 15 chapitres · 6 fins »
 * 25,8 – 30,0 Conclusion  icône, nom, « Entrez dans le Labyrinthe »
 *
 * Les écrans sont des plans filmés dans l'application (promo/clips.mjs) :
 * `at` = instant d'apparition dans la vidéo, `from` = instant de départ dans le plan.
 */
export const DURATION = 30;

/** Changements de plan (accents de la bande-son). */
export const CUTS = [2.7, 5.7, 8.3, 12.2, 15.6, 18.8, 22.3, 25.8];

/** Ambiance lumineuse : mêmes halos que l'application (src/ui/theme.ts, AURAS). */
export const SCENES = [
  { at: 0, aura: ['#FF6A3D', '#3B1E6E'], auraIntensity: 0.35 },
  { at: 2.7, aura: ['#FF6A3D', '#5B1F14'], auraIntensity: 1 },
  { at: 5.7, aura: ['#FF6A3D', '#3B1E6E'], auraIntensity: 1 },
  { at: 8.3, aura: ['#FF6A3D', '#5B1F14'], auraIntensity: 0.9 },
  { at: 12.2, aura: ['#FF3B4E', '#3A0E14'], auraIntensity: 1.1 },
  { at: 15.6, aura: ['#3E8F86', '#1B2C4F'], auraIntensity: 1 },
  { at: 18.8, aura: ['#FFB04A', '#4A2A12'], auraIntensity: 0.9 },
  { at: 22.3, aura: ['#3E8F86', '#1B2C4F'], auraIntensity: 1 },
  { at: 25.8, aura: ['#FF6A3D', '#3B1E6E'], auraIntensity: 1.1 },
];

const T = (fr, en) => ({ fr, en });

export const COPY = [
  { in: 0.5, out: 2.5, top: 700, kicker: T('Valombre · Jour 1 · 23 h', 'Valombre · Day 1 · 11 pm'), text: T('La ville<br>est tombée.', 'The city<br>has fallen.') },
  { in: 2.85, out: 5.55, text: T('Il vous reste<br><em>sept jours.</em>', 'You have<br><em>seven days.</em>') },
  { in: 5.9, out: 8.15, kicker: T('Un récit de survie interactif', 'An interactive survival story'), text: T('Survivre<br><em>est un choix.</em>', 'Survival<br><em>is a choice.</em>') },
  { in: 8.45, out: 9.75, text: T('Chaque choix<br><em>compte.</em>', 'Every choice<br><em>counts.</em>') },
  { in: 11.0, out: 12.05, text: T('Les dés<br><em>ne mentent pas.</em>', 'The dice<br><em>never lie.</em>') },
  { in: 12.35, out: 15.45, text: T('Des combats<br><em>sans pitié.</em>', 'Fights<br><em>without mercy.</em>') },
  { in: 15.75, out: 18.65, text: T('Ils se souviennent<br><em>de vous.</em>', 'They<br><em>remember you.</em>') },
  { in: 18.95, out: 22.15, text: T('Un monde qui garde<br><em>vos traces.</em>', 'A world that<br><em>bears your scars.</em>') },
];

export const STATS = { in: 24.1, out: 25.7, text: T('15 chapitres · 6 fins · 396 scènes', '15 chapters · 6 endings · 396 scenes') };

export const OUTRO = {
  in: 25.85,
  brand: T('Le Labyrinthe<br><em>de la Destinée</em>', 'The Labyrinth<br><em>of Destiny</em>'),
  tagline: T('Hors ligne · Sans pub · Sans compte', 'Offline · No ads · No account'),
  cta: T('Entrez dans le Labyrinthe', 'Enter the Labyrinth'),
  langs: T('Français · English', 'English · Français'),
};

/** Légendes sous les trois téléphones du plan « monde ». */
export const CAPTIONS = [
  { id: 'map', phone: 'left', in: 19.7, out: 22.1, y: 1790, text: T('Carte', 'Map') },
  { id: 'archives', phone: 'main', in: 19.8, out: 22.1, y: 1790, text: T('Archives', 'Archives') },
  { id: 'workshop', phone: 'right', in: 19.9, out: 22.1, y: 1790, text: T('Atelier', 'Workshop') },
];

/**
 * Téléphones : images clés de caméra (x relatif au centre, y absolu, s échelle,
 * rotations en degrés, op opacité) et écrans successifs.
 */
export const PHONES = {
  main: {
    shake: true,
    zIndex: 3,
    screens: [
      { at: 2.7, clip: 'howler', from: 0 },
      { at: 5.75, clip: 'title', from: 0.6 },
      { at: 8.3, clip: 'choice', from: 0.5 },
      { at: 12.2, clip: 'combat', from: 0.5 },
      { at: 15.6, clip: 'people', from: 2.2 },
      { at: 18.8, clip: 'archives', from: 0.1 },
      { at: 22.3, clip: 'transition', from: 1.0, until: 2.6 },
    ],
    keys: [
      [0, { x: 0, y: 2700, s: 0.55, rx: 26, ry: -18, rz: 3, op: 1 }],
      [2.55, { x: 0, y: 2700, s: 0.55, rx: 26, ry: -18, rz: 3 }, 'outQuint'],
      [3.9, { x: 0, y: 1250, s: 0.56, rx: 10, ry: -12, rz: 1.5 }, 'inOut'],
      [5.6, { x: 0, y: 1215, s: 0.565, rx: 7, ry: -8, rz: 1 }, 'inOutQuint'],
      [6.5, { x: 0, y: 1180, s: 0.575, rx: 0, ry: 0, rz: 0 }, 'linear'],
      [8.3, { x: 0, y: 1172, s: 0.6, rx: 0, ry: 0, rz: 0 }, 'linear'],
      [9.45, { x: 0, y: 1165, s: 0.605, rx: 0, ry: 0, rz: 0 }, 'inOutQuint'],
      [10.15, { x: 40, y: 640, s: 1.0, rx: 0, ry: 0, rz: 0 }, 'linear'],
      [10.55, { x: 36, y: 636, s: 1.01, rx: 0, ry: 0, rz: 0 }, 'inOutQuint'],
      [11.3, { x: 0, y: 1185, s: 0.6, rx: 0, ry: 0, rz: 0 }, 'linear'],
      [12.0, { x: 0, y: 1182, s: 0.6, rx: 0, ry: 0, rz: 0 }, 'inOutQuint'],
      [12.9, { x: 14, y: 1185, s: 0.6, rx: 3, ry: 9, rz: -1 }, 'linear'],
      [15.2, { x: 4, y: 1180, s: 0.61, rx: 2, ry: 6, rz: -0.6 }, 'inOutQuint'],
      [16.3, { x: -10, y: 1190, s: 0.6, rx: 3, ry: -9, rz: 1 }, 'linear'],
      [18.4, { x: -4, y: 1185, s: 0.61, rx: 2, ry: -6, rz: 0.6 }, 'inOutQuint'],
      [19.4, { x: 0, y: 1255, s: 0.45, rx: 0, ry: 0, rz: 0, glow: 0.7 }, 'linear'],
      [21.9, { x: -10, y: 1250, s: 0.455, rx: 0, ry: 0, rz: 0, glow: 0.7 }, 'inOutQuint'],
      [22.8, { x: 0, y: 1180, s: 0.6, rx: 0, ry: 0, rz: 0, glow: 1 }, 'inOutQuint'],
      [23.9, { x: 0, y: 960, s: 0.955, rx: 0, ry: 0, rz: 0, shadow: 0, glow: 0 }, 'linear'],
      [25.6, { x: 0, y: 960, s: 0.975, rx: 0, ry: 0, rz: 0, shadow: 0, glow: 0, op: 1 }, 'inOut'],
      [26.3, { x: 0, y: 960, s: 1.06, rx: 0, ry: 0, rz: 0, shadow: 0, glow: 0, op: 0 }],
    ],
  },
  left: {
    screens: [{ at: 18.8, clip: 'map', from: 0.2 }],
    keys: [
      [0, { x: -760, y: 1320, s: 0.4, rx: 0, ry: 30, rz: -3, op: 0 }],
      [18.9, { x: -760, y: 1320, s: 0.4, rx: 0, ry: 30, rz: -3, op: 0 }, 'outQuint'],
      [19.8, { x: -262, y: 1285, s: 0.365, rx: 0, ry: 24, rz: -1.5, op: 1 }, 'linear'],
      [21.9, { x: -272, y: 1280, s: 0.37, rx: 0, ry: 18, rz: -1, op: 1 }, 'inOutQuint'],
      [22.6, { x: -900, y: 1280, s: 0.4, rx: 0, ry: 30, rz: -3, op: 0 }],
    ],
  },
  right: {
    screens: [{ at: 18.8, clip: 'workshop', from: 0.3 }],
    keys: [
      [0, { x: 760, y: 1320, s: 0.4, rx: 0, ry: -30, rz: 3, op: 0 }],
      [19.05, { x: 760, y: 1320, s: 0.4, rx: 0, ry: -30, rz: 3, op: 0 }, 'outQuint'],
      [19.95, { x: 262, y: 1285, s: 0.365, rx: 0, ry: -24, rz: 1.5, op: 1 }, 'linear'],
      [21.9, { x: 252, y: 1280, s: 0.37, rx: 0, ry: -18, rz: 1, op: 1 }, 'inOutQuint'],
      [22.6, { x: 900, y: 1280, s: 0.4, rx: 0, ry: -30, rz: 3, op: 0 }],
    ],
  },
};
