/**
 * Registre du contenu. Ajouter un chapitre : écrire ses scènes dans
 * chapters/, ajouter le chapitre à CHAPTERS (world.ts) et ses scènes ici.
 * Aucun écran n'a besoin d'être modifié.
 */
import { STAT_DESCRIPTIONS, STAT_LABELS } from '../engine/rules';
import type { GameContent } from '../engine/types';
import { chapter1 } from './chapters/c1';
import { chapter2 } from './chapters/c2';
import { chapter3 } from './chapters/c3';
import { chapter4 } from './chapters/c4';
import { ENEMIES } from './enemies';
import { scenes } from './helpers';
import { ITEMS } from './items';
import { SUMMARY_RULES } from './summary';
import { RECIPES } from './recipes';
import { DOCUMENTS } from './documents';
import { DIARY_RULES } from './diary';
import { BACKGROUNDS, CHAPTERS, CHARACTERS, ENDINGS, LOCATIONS, MAP_LINKS, PERKS, PROFILES, QUESTS, REGIONS } from './world';

export const CONTENT: GameContent = {
  scenes: scenes([...chapter1, ...chapter2, ...chapter3, ...chapter4]),
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
  profiles: PROFILES,
  backgrounds: BACKGROUNDS,
  perks: PERKS,
  recipes: RECIPES,
  documents: DOCUMENTS,
  diaryRules: DIARY_RULES,
  summaryRules: SUMMARY_RULES,
  startScene: 'c1_toit',
};
