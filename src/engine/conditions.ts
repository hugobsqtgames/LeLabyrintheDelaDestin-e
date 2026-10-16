/**
 * Évaluation et explication des conditions.
 */
import { effectiveStat } from './character';
import { msg } from './messages';
import type { Condition, GameContent, GameState } from './types';

export function evaluate(content: GameContent, state: GameState, c: Condition): boolean {
  switch (c.type) {
    case 'stat':
      return effectiveStat(content, state, c.stat) >= c.min;
    case 'profile': {
      // Un compagnon en relève compte comme son profil de famille (Kaz : guerrier…).
      const fam = content.profiles[state.player.profile]?.family;
      return c.profiles.includes(state.player.profile) || (!!fam && c.profiles.includes(fam));
    }
    case 'background':
      return c.backgrounds.includes(state.player.background);
    case 'item':
      return (state.inventory[c.item] ?? 0) >= (c.qty ?? 1);
    case 'flag':
      return state.flags[c.flag] === true;
    case 'notFlag':
      return state.flags[c.flag] !== true;
    case 'counter': {
      const v = state.counters[c.counter] ?? 0;
      return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);
    }
    case 'quest':
      return c.status.includes(state.quests[c.quest]?.status ?? 'inactive');
    case 'questStep': {
      const q = state.quests[c.quest];
      return !!q && (q.step === c.step || q.completedSteps.includes(c.step));
    }
    case 'relation': {
      const v = state.relations[c.character] ?? 0;
      return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);
    }
    case 'companion':
      return c.status.includes(state.companions[c.character] ?? 'unknown');
    case 'hp':
      return state.player.hp >= c.min;
    case 'level':
      return state.player.level >= c.min;
    case 'perk':
      return state.player.perks.includes(c.perk);
    case 'visited':
      return state.visitedScenes.includes(c.scene);
    case 'infection':
      return (
        (c.min === undefined || state.player.infection >= c.min) &&
        (c.max === undefined || state.player.infection <= c.max)
      );
    case 'clock':
      return (c.min === undefined || state.clock >= c.min) && (c.max === undefined || state.clock <= c.max);
    case 'document':
      return state.documents.includes(c.doc);
    case 'all':
      return c.conditions.every((sub) => evaluate(content, state, sub));
    case 'any':
      return c.conditions.some((sub) => evaluate(content, state, sub));
    case 'not':
      return !evaluate(content, state, c.condition);
    default: {
      const never: never = c;
      throw new Error(`Condition inconnue : ${JSON.stringify(never)}`);
    }
  }
}

export function evaluateAll(content: GameContent, state: GameState, conditions: Condition[] | undefined): boolean {
  return !conditions || conditions.every((c) => evaluate(content, state, c));
}

/**
 * Explication lisible d'une condition non remplie.
 * Renvoie `null` lorsque le personnage ne peut pas savoir ce qui lui manque
 * (drapeaux narratifs, événements cachés).
 */
export function explain(content: GameContent, state: GameState, c: Condition): string | null {
  switch (c.type) {
    case 'stat':
      return msg(content, 'explain.stat', {
        stat: content.statLabels[c.stat],
        min: c.min,
        value: effectiveStat(content, state, c.stat),
      });
    case 'profile':
      return msg(content, 'explain.profile', {
        list: c.profiles.map((p) => content.profiles[p]?.name ?? p).join(msg(content, 'explain.or')),
      });
    case 'background':
      return msg(content, 'explain.background', {
        list: c.backgrounds.map((b) => content.backgrounds[b]?.name ?? b).join(msg(content, 'explain.or')),
      });
    case 'item': {
      const name = content.items[c.item]?.name ?? c.item;
      const qty = c.qty ?? 1;
      return qty > 1
        ? msg(content, 'explain.itemQty', { qty, item: name, owned: state.inventory[c.item] ?? 0 })
        : msg(content, 'explain.item', { item: name });
    }
    case 'relation': {
      const ch = content.characters[c.character]?.name ?? c.character;
      if (c.min !== undefined) return msg(content, 'explain.relationMin', { name: ch });
      return msg(content, 'explain.relationMax', { name: ch });
    }
    case 'companion': {
      const ch = content.characters[c.character]?.name ?? c.character;
      if (c.status.includes('companion')) return msg(content, 'explain.companion', { name: ch });
      return null;
    }
    case 'hp':
      return msg(content, 'explain.hp', { min: c.min, hp: state.player.hp });
    case 'level':
      return msg(content, 'explain.level', { level: c.min });
    case 'perk':
      return msg(content, 'explain.perk', { perk: content.perks[c.perk]?.name ?? c.perk });
    case 'infection':
      if (c.max !== undefined) return msg(content, 'explain.fever');
      return null;
    case 'clock':
      if (c.max !== undefined) return msg(content, 'explain.tooLate');
      return null;
    case 'all': {
      const parts = c.conditions
        .filter((sub) => !evaluate(content, state, sub))
        .map((sub) => explain(content, state, sub));
      if (parts.some((p) => p === null)) return null;
      return parts.join(' · ');
    }
    case 'any': {
      const parts = c.conditions.map((sub) => explain(content, state, sub)).filter((p): p is string => !!p);
      return parts.length ? parts.join(msg(content, 'explain.anyJoin')) : null;
    }
    default:
      return null;
  }
}

/** Liste des raisons connues pour lesquelles des conditions échouent. */
export function missingRequirements(
  content: GameContent,
  state: GameState,
  conditions: Condition[] | undefined,
): { known: string[]; unknown: number } {
  const known: string[] = [];
  let unknown = 0;
  for (const c of conditions ?? []) {
    if (evaluate(content, state, c)) continue;
    const reason = explain(content, state, c);
    if (reason) known.push(reason);
    else unknown += 1;
  }
  return { known, unknown };
}
