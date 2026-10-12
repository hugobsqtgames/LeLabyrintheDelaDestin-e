import { CONTENT } from '../src/content';
import { performAction } from '../src/engine/combat';
import { choiceViews, choose, newGame, resolveCombat } from '../src/engine/narrative';
import { botCombatAction } from '../src/engine/simulate';
import type { CharacterDraft, GameState } from '../src/engine/types';

export const C = CONTENT;

export const DRAFT: CharacterDraft = {
  name: 'Testeur',
  profile: 'guerrier',
  background: 'pompier',
  emblem: 'lame',
  allocated: { force: 2, discretion: 1, survie: 1, astuce: 2 },
};

export function start(draft: Partial<CharacterDraft> = {}, seed = 42): GameState {
  return newGame(C, { ...DRAFT, ...draft, allocated: { ...DRAFT.allocated, ...(draft.allocated ?? {}) } }, { seed, id: 'test', now: 0 });
}

/** Place la partie directement dans une scène (sans appliquer ses effets d'entrée). */
export function at(state: GameState, sceneId: string): GameState {
  return { ...state, currentScene: sceneId, combat: null, ending: null };
}

export function pick(state: GameState, choiceId: string): GameState {
  const res = choose(C, state, state.currentScene, choiceId);
  if (!res.ok) throw new Error(`Choix « ${choiceId} » refusé dans ${state.currentScene} : ${res.error}`);
  return res.state;
}

export function fightOut(state: GameState, maxTurns = 200): GameState {
  let s = state;
  const rng = { seed: 99 };
  let guard = 0;
  while (s.combat && s.combat.outcome === 'ongoing' && guard++ < maxTurns) {
    const next = performAction(C, s, botCombatAction(C, s, rng, 'prudent'));
    s = next === s ? performAction(C, s, { type: 'defend' }) : next;
  }
  return s.combat ? resolveCombat(C, s) : s;
}

/**
 * Suit une liste de préférences (scène → choix préférés), combats compris.
 * Si aucune préférence ne s'applique, prend le premier choix disponible.
 */
export function follow(state: GameState, prefs: Record<string, string[]>, maxSteps = 600): GameState {
  let s = state;
  for (let i = 0; i < maxSteps && !s.ending; i += 1) {
    if (s.combat) {
      s = fightOut(s);
      continue;
    }
    const views = choiceViews(C, s).filter((v) => v.available);
    if (!views.length) throw new Error(`Impasse dans ${s.currentScene}`);
    if (i === maxSteps - 1) throw new Error(`Parcours trop long, arrêté dans ${s.currentScene}`);
    const wanted = prefs[s.currentScene] ?? [];
    const chosen = wanted.map((id) => views.find((v) => v.choice.id === id)).find(Boolean) ?? views[views.length - 1];
    s = pick(s, chosen!.choice.id);
  }
  return s;
}
