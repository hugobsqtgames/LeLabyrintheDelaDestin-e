/**
 * Application centralisée des effets narratifs.
 *
 * Toute modification de l'état provoquée par l'histoire passe par
 * `applyEffects`. Les mesures de protection (récompenses uniques, bornes
 * de santé, objets de quête) sont donc garanties au même endroit.
 */
import { clampVitals, grantXp, maxHp, maxStamina } from './character';
import { addItem, removeItem } from './inventory';
import { INFECTION_MAX } from './rules';
import { evaluate } from './conditions';
import type { Effect, GameContent, GameState } from './types';
import { addChronicle, addNotice, clamp } from './util';

export const RELATION_MIN = -10;
export const RELATION_MAX = 10;

/** Nombre de bouches à nourrir lors d'un repas : le joueur et ses compagnons. */
export function mouthsToFeed(content: GameContent, state: GameState): number {
  let n = 1;
  for (const [id, status] of Object.entries(state.companions)) {
    if (status === 'companion' && content.characters[id]?.eats) n += 1;
  }
  return n;
}

export function applyEffect(content: GameContent, state: GameState, e: Effect): GameState {
  switch (e.type) {
    case 'setFlag':
      return { ...state, flags: { ...state.flags, [e.flag]: e.value ?? true } };
    case 'addCounter':
      return { ...state, counters: { ...state.counters, [e.counter]: (state.counters[e.counter] ?? 0) + e.amount } };
    case 'giveItem':
      return addItem(content, state, e.item, e.qty ?? 1).state;
    case 'takeItem':
      return removeItem(content, state, e.item, e.qty ?? 1);
    case 'heal': {
      const hp = clamp(state.player.hp + e.amount, 0, maxHp(content, state));
      const gained = hp - state.player.hp;
      const s = { ...state, player: { ...state.player, hp } };
      return gained > 0 ? addNotice(s, `+${gained} PV`, 'good') : s;
    }
    case 'damage': {
      const floor = e.lethal ? 0 : Math.min(1, state.player.hp);
      const hp = clamp(state.player.hp - e.amount, floor, maxHp(content, state));
      let s: GameState = { ...state, player: { ...state.player, hp } };
      s = addNotice(s, `−${state.player.hp - hp} PV (${e.cause})`, 'bad');
      if (hp <= 0 && !s.ending) {
        s = { ...s, ending: { id: 'mort', kind: 'death', cause: e.cause } };
      }
      return s;
    }
    case 'stamina': {
      const stamina = clamp(state.player.stamina + e.amount, 0, maxStamina(content, state));
      return { ...state, player: { ...state.player, stamina } };
    }
    case 'xp':
      return grantXp(content, addNotice(state, `+${e.amount} XP`, 'info'), e.amount);
    case 'relation': {
      const before = state.relations[e.character] ?? 0;
      const after = clamp(before + e.amount, RELATION_MIN, RELATION_MAX);
      let s: GameState = { ...state, relations: { ...state.relations, [e.character]: after } };
      const name = content.characters[e.character]?.name ?? e.character;
      if (after !== before) {
        s = addNotice(s, `${name} ${e.amount > 0 ? 's’en souviendra' : 'n’oubliera pas'}.`, e.amount > 0 ? 'good' : 'bad');
      }
      return s;
    }
    case 'companion': {
      const before = state.companions[e.character] ?? 'unknown';
      if (before === 'dead' && e.status !== 'dead') return state; // Les morts ne reviennent pas.
      let s: GameState = { ...state, companions: { ...state.companions, [e.character]: e.status } };
      const name = content.characters[e.character]?.name ?? e.character;
      const messages: Partial<Record<typeof e.status, string>> = {
        companion: `${name} vous accompagne.`,
        away: `${name} n’est plus avec vous.`,
        captured: `${name} a été capturé·e.`,
        dead: `${name} est mort·e.`,
      };
      const msg = messages[e.status];
      if (msg && before !== e.status) {
        s = addNotice(s, msg, e.status === 'companion' ? 'good' : 'bad');
        if (e.status === 'dead') s = addChronicle(content, s, msg, true);
      }
      return s;
    }
    case 'quest': {
      const def = content.quests[e.quest];
      if (!def) return state;
      const prev = state.quests[e.quest] ?? { status: 'inactive' as const, step: null, completedSteps: [] };
      // Une quête terminée ou échouée ne peut plus être modifiée.
      if (prev.status === 'completed' || prev.status === 'failed') return state;
      const status = e.status ?? (prev.status === 'inactive' ? 'active' : prev.status);
      let step = prev.step;
      let completedSteps = prev.completedSteps;
      if (e.step && e.step !== prev.step) {
        if (prev.step && !completedSteps.includes(prev.step)) completedSteps = [...completedSteps, prev.step];
        step = e.step;
      }
      if (status === 'completed' && step && !completedSteps.includes(step)) completedSteps = [...completedSteps, step];
      let s: GameState = { ...state, quests: { ...state.quests, [e.quest]: { status, step, completedSteps } } };
      if (prev.status === 'inactive' && status === 'active') {
        s = addNotice(s, `Nouvelle quête : ${def.title}`, 'info');
        s = addChronicle(content, s, `Quête commencée : ${def.title}.`, false);
      } else if (status === 'completed') {
        s = addNotice(s, `Quête accomplie : ${def.title}`, 'good');
        s = addChronicle(content, s, `Quête accomplie : ${def.title}.`, def.kind === 'main');
      } else if (status === 'failed') {
        s = addNotice(s, `Quête échouée : ${def.title}`, 'bad');
        s = addChronicle(content, s, `Quête échouée : ${def.title}.`, def.kind === 'main');
      } else if (e.step && e.step !== prev.step) {
        s = addNotice(s, `Journal mis à jour : ${def.title}`, 'info');
      }
      return s;
    }
    case 'discover': {
      if (state.discovered.includes(e.location) || !content.locations[e.location]) return state;
      const s = { ...state, discovered: [...state.discovered, e.location] };
      return addNotice(s, `Lieu découvert : ${content.locations[e.location].name}`, 'info');
    }
    case 'world': {
      const current = state.world[e.location] ?? [];
      if (current.includes(e.change)) return state;
      return { ...state, world: { ...state.world, [e.location]: [...current, e.change] } };
    }
    case 'infection': {
      const before = state.player.infection;
      const infection = clamp(before + e.amount, 0, INFECTION_MAX);
      let s: GameState = { ...state, player: { ...state.player, infection } };
      if (infection > before) {
        s = addNotice(s, infection >= INFECTION_MAX ? 'L’infection est critique. Il faut des antibiotiques.' : 'L’infection progresse. Votre santé maximale diminue.', 'bad');
      }
      s = clampVitals(content, s);
      if (s.player.hp <= 0 && !s.ending) s = { ...s, ending: { id: 'mort', kind: 'death', cause: 'l’infection' } };
      return s;
    }
    case 'cureInfection':
      return state.player.infection > 0
        ? addNotice({ ...state, player: { ...state.player, infection: 0 } }, 'L’infection est soignée.', 'good')
        : state;
    case 'journal':
      return addChronicle(content, state, e.text, e.major ?? false);
    case 'meal':
      return applyMeal(content, state);
    case 'rest': {
      const amount = e.amount ?? 6;
      const s = {
        ...state,
        player: {
          ...state.player,
          hp: clamp(state.player.hp + amount, 0, maxHp(content, state)),
          stamina: maxStamina(content, state),
        },
      };
      return addNotice(s, 'Vous reprenez des forces.', 'good');
    }
    case 'chapter': {
      if (state.chapter === e.chapter) return state;
      let s: GameState = { ...state, chapter: e.chapter };
      // Une infection non soignée s'aggrave à chaque nouveau chapitre.
      if (s.player.infection > 0) s = applyEffect(content, s, { type: 'infection', amount: 1 });
      return s;
    }
    case 'if':
      return applyEffects(content, state, evaluate(content, state, e.cond) ? e.then : e.else);
    default: {
      const never: never = e;
      throw new Error(`Effet inconnu : ${JSON.stringify(never)}`);
    }
  }
}

/**
 * Repas du groupe lors d'une étape : chaque bouche consomme une ration.
 * Le manque affaiblit le joueur et entame la confiance des compagnons.
 */
export function applyMeal(content: GameContent, state: GameState): GameState {
  const mouths = mouthsToFeed(content, state);
  const rations = state.inventory['ration'] ?? 0;
  const eaten = Math.min(mouths, rations);
  let s = eaten > 0 ? removeItem(content, state, 'ration', eaten, false) : state;
  const missing = mouths - eaten;
  if (missing === 0) {
    s = addNotice(s, `Repas du groupe : ${eaten} ration${eaten > 1 ? 's' : ''} consommée${eaten > 1 ? 's' : ''}.`, 'info');
    return applyEffect(content, s, { type: 'heal', amount: 3 });
  }
  s = addNotice(s, `Il manque ${missing} ration${missing > 1 ? 's' : ''}. Vous vous privez en premier.`, 'bad');
  s = addChronicle(content, s, `Le groupe a manqué de ${missing} ration${missing > 1 ? 's' : ''}.`, false);
  // Le joueur se prive d'abord ; chaque ration manquante au-delà prive un compagnon.
  const hungry = Object.entries(s.companions)
    .filter(([id, status]) => status === 'companion' && content.characters[id]?.eats)
    .map(([id]) => id)
    .slice(0, missing - 1);
  for (const id of hungry) {
    s = { ...s, relations: { ...s.relations, [id]: clamp((s.relations[id] ?? 0) - 1, RELATION_MIN, RELATION_MAX) } };
    s = addNotice(s, `${content.characters[id].name} a dû se coucher le ventre vide.`, 'bad');
  }
  // La faim affaiblit mais ne tue pas (dégâts narratifs non mortels).
  return applyEffect(content, s, { type: 'damage', amount: 2 * missing, cause: 'la faim' });
}

export function applyEffects(content: GameContent, state: GameState, effects: Effect[] | undefined): GameState {
  let s = state;
  for (const e of effects ?? []) {
    s = applyEffect(content, s, e);
  }
  return s;
}
