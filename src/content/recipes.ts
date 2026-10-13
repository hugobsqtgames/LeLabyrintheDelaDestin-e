/**
 * Atelier : ce qui se fabrique avec ce qu'on trouve. Chaque recette coûte du temps.
 */
import type { RecipeDef } from '../engine/types';
import { any, background, has, profile, stat } from './helpers';

const list: RecipeDef[] = [
  {
    id: 'bandages',
    name: 'Pansements',
    description: 'Des chiffons bouillis imbibés d’alcool : deux bandages propres.',
    inputs: { chiffons: 1, alcool: 1 },
    output: { item: 'bandage', qty: 2 },
    time: 1,
  },
  {
    id: 'molotov',
    name: 'Cocktail Molotov',
    description: 'Une bouteille d’alcool, un chiffon en guise de mèche.',
    inputs: { alcool: 1, chiffons: 1 },
    output: { item: 'molotov', qty: 1 },
    time: 0.5,
  },
  {
    id: 'trousse',
    name: 'Trousse de soins',
    description: 'Deux bandages, de l’alcool et des gestes sûrs : de quoi refermer une vraie plaie.',
    inputs: { bandage: 2, alcool: 1 },
    output: { item: 'trousse', qty: 1 },
    requires: [any(background('ambulancier'), stat('survie', 4))],
    time: 1,
  },
  {
    id: 'carreaux',
    name: 'Carreaux d’arbalète',
    description: 'Des tiges de métal affûtées et empennées de plastique.',
    inputs: { ferraille: 1 },
    output: { item: 'carreau', qty: 4 },
    requires: [any(has('outils'), profile('technicien'))],
    time: 1,
  },
  {
    id: 'clous',
    name: 'Bande de clous',
    description: 'Des clous redressés et recollés en bande pour le cloueur.',
    inputs: { ferraille: 1 },
    output: { item: 'clou', qty: 10 },
    requires: [any(has('outils'), profile('technicien'))],
    time: 1,
  },
  {
    id: 'fusee',
    name: 'Fusée artisanale',
    description: 'Un tube, de l’alcool gélifié et un allumeur bricolé. Elle brûle rouge et attire les Muets.',
    inputs: { composants: 1, alcool: 1 },
    output: { item: 'fusee', qty: 1 },
    requires: [any(profile('technicien'), stat('astuce', 4))],
    time: 1,
  },
  {
    id: 'reparation',
    name: 'Remettre les armes en état',
    description: 'Affûter, resserrer, remplacer un ressort : rend 20 points de solidité aux armes équipées.',
    inputs: { ferraille: 1 },
    repair: 20,
    time: 1.5,
  },
];

export const RECIPES: Record<string, RecipeDef> = Object.fromEntries(list.map((r) => [r.id, r]));
