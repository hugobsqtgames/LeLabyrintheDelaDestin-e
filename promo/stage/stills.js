/**
 * Captures App Store (1290 × 2796) : même scène, même téléphone, mêmes textes
 * que la vidéo. Chaque capture occupe un bloc de 3 s ; on la photographie à
 * STILL_TIMES[i], une fois les animations d'apparition terminées.
 */
const T = (fr, en) => ({ fr, en });
const B = 3;
const AT = 2.6;

const DEFS = [
  {
    aura: ['#FF6A3D', '#5B1F14'],
    kicker: T('Un récit de survie interactif', 'An interactive survival story'),
    text: T('Sept jours<br><em>pour fuir.</em>', 'Seven days<br><em>to escape.</em>'),
    main: { clip: 'howler', ct: 0.6, k: { x: 0, y: 1255, s: 0.6, rx: 6, ry: -10, rz: 1.2 } },
  },
  {
    aura: ['#FF6A3D', '#5B1F14'],
    text: T('Chaque choix<br><em>compte.</em>', 'Every choice<br><em>counts.</em>'),
    main: { clip: 'choice', ct: 3.6, k: { x: 0, y: 1230, s: 0.62 } },
  },
  {
    aura: ['#FF3B4E', '#3A0E14'],
    text: T('Des combats<br><em>sans pitié.</em>', 'Fights<br><em>without mercy.</em>'),
    main: { clip: 'combat', ct: 1.9, k: { x: 10, y: 1235, s: 0.62, rx: 3, ry: 8, rz: -1 } },
  },
  {
    aura: ['#3E8F86', '#1B2C4F'],
    text: T('Ils se souviennent<br><em>de vous.</em>', 'They<br><em>remember you.</em>'),
    main: { clip: 'people', ct: 5.9, k: { x: -6, y: 1235, s: 0.62, rx: 3, ry: -8, rz: 1 } },
  },
  {
    aura: ['#FFB04A', '#4A2A12'],
    text: T('Un monde qui garde<br><em>vos traces.</em>', 'A world that<br><em>bears your scars.</em>'),
    main: { clip: 'archives', ct: 3.0, k: { x: 0, y: 1300, s: 0.47 } },
    left: { clip: 'map', ct: 2.0, k: { x: -262, y: 1330, s: 0.37, ry: 22, rz: -1.5 } },
    right: { clip: 'workshop', ct: 3.0, k: { x: 262, y: 1330, s: 0.37, ry: -22, rz: 1.5 } },
  },
  {
    aura: ['#FF6A3D', '#3B1E6E'],
    kicker: T('Hors ligne · Sans pub · Sans compte', 'Offline · No ads · No account'),
    text: T('Entrez dans<br><em>le Labyrinthe.</em>', 'Enter<br><em>the Labyrinth.</em>'),
    main: { clip: 'title', ct: 1.0, k: { x: 0, y: 1250, s: 0.6 } },
  },
];

export const STILL_TIMES = DEFS.map((_, i) => i * B + AT);
export const DURATION = DEFS.length * B;
export const CUTS = [];
export const SCENES = DEFS.map((d, i) => ({ at: i * B, aura: d.aura }));
export const COPY = DEFS.map((d, i) => ({ in: i * B + 0.05, out: i * B + B - 0.02, kicker: d.kicker, text: d.text }));
export const CAPTIONS = [];
export const STATS = { in: 999, out: 1000, text: T('', '') };
export const OUTRO = { in: 999, brand: T('', ''), tagline: T('', ''), cta: T('', ''), langs: T('', '') };

const HIDDEN = { x: 0, y: 4000, s: 0.4, op: 0 };

function phone(slot) {
  const keys = [];
  const screens = [];
  DEFS.forEach((d, i) => {
    const p = d[slot];
    const k = p ? { rx: 0, ry: 0, rz: 0, op: 1, ...p.k } : HIDDEN;
    keys.push([i * B, k, 'linear'], [i * B + B - 0.001, k, 'linear']);
    // Écran figé sur l'instant `ct` du plan filmé.
    if (p) screens.push({ at: i * B, clip: p.clip, from: p.ct, until: p.ct });
  });
  if (!screens.length) screens.push({ at: 0, clip: 'title', from: 0 });
  return { keys, screens, zIndex: slot === 'main' ? 3 : 1 };
}

export const PHONES = { main: phone('main'), left: phone('left'), right: phone('right') };
