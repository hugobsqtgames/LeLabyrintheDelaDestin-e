/**
 * Registre du contenu. Ajouter un chapitre : écrire ses scènes dans
 * chapters/, ajouter le chapitre à CHAPTERS (world.ts) et ses scènes ici.
 * Aucun écran n'a besoin d'être modifié.
 */
import { MESSAGES_FR } from '../engine/messages';
import { STAT_DESCRIPTIONS, STAT_LABELS } from '../engine/rules';
import type { DocumentDef, GameContent, Scene } from '../engine/types';
import { chapter1 } from './chapters/c1';
import { chapter2 } from './chapters/c2';
import { chapter3 } from './chapters/c3';
import { chapter4 } from './chapters/c4';
import { chapterFB, DIARY_FB, DOCUMENTS_FB } from './chapters/fb';
import { chapterR1, DIARY_R1, DOCUMENTS_R1 } from './chapters/r1';
import { chapterR2, DIARY_R2, DOCUMENTS_R2 } from './chapters/r2';
import { chapterR3, DIARY_R3, DOCUMENTS_R3 } from './chapters/r3';
import { chapterR4, DIARY_R4, DOCUMENTS_R4 } from './chapters/r4';
import { chapterR5, DIARY_R5, DOCUMENTS_R5 } from './chapters/r5';
import { chapterR6, DIARY_R6, DOCUMENTS_R6 } from './chapters/r6';
import { chapterR7, DIARY_R7, DOCUMENTS_R7 } from './chapters/r7';
import { chapterR8, DIARY_R8, DOCUMENTS_R8 } from './chapters/r8';
import { chapterR9, DIARY_R9, DOCUMENTS_R9 } from './chapters/r9';
import { chapterR10, DIARY_R10, DOCUMENTS_R10 } from './chapters/r10';
import { ENEMIES } from './enemies';
import { HERO_BACKGROUNDS, HERO_PROFILES, HEROES } from './heroes';
import { scenes } from './helpers';
import { ITEMS } from './items';
import { SUMMARY_RULES } from './summary';
import { RECIPES } from './recipes';
import { DOCUMENTS } from './documents';
import { DIARY_RULES } from './diary';
import { BACKGROUNDS, CHAPTERS, CHARACTERS, ENDINGS, LOCATIONS, MAP_LINKS, PERKS, PROFILES, QUESTS, REGIONS } from './world';

const docs = (list: DocumentDef[]): Record<string, DocumentDef> => Object.fromEntries(list.map((d) => [d.id, d]));

/**
 * Rythme de la route : les chapitres de la traversée (jours 3 à 6) ont été
 * écrits à l'échelle d'un chapitre isolé ; on resserre leurs durées pour que
 * l'ensemble tienne dans les sept jours. Les valeurs affichées sur les choix
 * sont celles-ci (arrondies au quart d'heure), il n'y a pas d'autre correction.
 */
const ROAD_PACE = 0.5;
const paced = (list: Scene[], pace = ROAD_PACE): Scene[] =>
  list.map((scene) => ({
    ...scene,
    choices: scene.choices.map((c) => (c.time ? { ...c, time: Math.max(0.25, Math.round(c.time * pace * 4) / 4) } : c)),
  }));

export const CONTENT: GameContent = {
  scenes: scenes([
    ...chapter1,
    ...chapter2,
    ...paced(chapterFB),
    ...chapter3,
    ...paced(chapterR1),
    ...paced(chapterR2),
    ...paced(chapterR3),
    ...paced(chapterR4),
    ...paced(chapterR5),
    ...paced(chapterR6),
    ...paced(chapterR7),
    ...paced(chapterR8),
    ...paced(chapterR9),
    ...paced(chapterR10),
    ...chapter4,
  ]),
  statLabels: STAT_LABELS,
  statDescriptions: STAT_DESCRIPTIONS,
  mapLinks: MAP_LINKS,
  regions: REGIONS,
  items: ITEMS,
  enemies: ENEMIES,
  quests: QUESTS,
  characters: CHARACTERS,
  locations: LOCATIONS,
  chapters: CHAPTERS,
  endings: ENDINGS,
  profiles: { ...PROFILES, ...HERO_PROFILES },
  backgrounds: { ...BACKGROUNDS, ...HERO_BACKGROUNDS },
  heroes: HEROES,
  perks: PERKS,
  recipes: RECIPES,
  documents: { ...DOCUMENTS, ...docs([...DOCUMENTS_FB, ...DOCUMENTS_R1, ...DOCUMENTS_R2, ...DOCUMENTS_R3, ...DOCUMENTS_R4, ...DOCUMENTS_R5, ...DOCUMENTS_R6, ...DOCUMENTS_R7, ...DOCUMENTS_R8, ...DOCUMENTS_R9, ...DOCUMENTS_R10]) },
  diaryRules: [...DIARY_RULES, ...DIARY_FB, ...DIARY_R1, ...DIARY_R2, ...DIARY_R3, ...DIARY_R4, ...DIARY_R5, ...DIARY_R6, ...DIARY_R7, ...DIARY_R8, ...DIARY_R9, ...DIARY_R10],
  summaryRules: SUMMARY_RULES,
  startScene: 'c1_toit',
  messages: MESSAGES_FR,
};
