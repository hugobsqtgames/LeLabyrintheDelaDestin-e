/**
 * Registre du contenu. Ajouter un chapitre : écrire ses scènes dans
 * chapters/, ajouter le chapitre à CHAPTERS (world.ts) et ses scènes ici.
 * Aucun écran n'a besoin d'être modifié.
 */
import type { GameContent } from '../engine/types';
import { chapter1 } from './chapters/c1';
import { chapter2 } from './chapters/c2';
import { chapter3 } from './chapters/c3';
import { chapter4 } from './chapters/c4';
import { ENEMIES } from './enemies';
import { scenes } from './helpers';
import { ITEMS } from './items';
import { SUMMARY_RULES } from './summary';
import { BACKGROUNDS, CHAPTERS, CHARACTERS, ENDINGS, LOCATIONS, PERKS, PROFILES, QUESTS } from './world';

export const CONTENT: GameContent = {
  scenes: scenes([...chapter1, ...chapter2, ...chapter3, ...chapter4]),
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
  summaryRules: SUMMARY_RULES,
  startScene: 'c1_toit',
};
