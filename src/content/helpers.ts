/**
 * Petits constructeurs pour écrire le contenu narratif de façon lisible.
 */
import type {
  CharacterId,
  CompanionStatus,
  Condition,
  Effect,
  ItemId,
  LocationId,
  ProfileId,
  BackgroundId,
  QuestId,
  QuestStatus,
  Scene,
  StatId,
  TextBlock,
} from '../engine/types';

// Texte
export const p = (text: string, cond?: Condition): TextBlock => ({ text, if: cond });
export const say = (speaker: CharacterId | 'moi', text: string, cond?: Condition): TextBlock => ({ speaker, text, if: cond });

// Conditions
export const flag = (f: string): Condition => ({ type: 'flag', flag: f });
export const notFlag = (f: string): Condition => ({ type: 'notFlag', flag: f });
export const stat = (s: StatId, min: number): Condition => ({ type: 'stat', stat: s, min });
export const has = (item: ItemId, qty = 1): Condition => ({ type: 'item', item, qty });
export const lacks = (item: ItemId): Condition => ({ type: 'not', condition: { type: 'item', item, qty: 1 } });
export const profile = (...profiles: ProfileId[]): Condition => ({ type: 'profile', profiles });
export const background = (...backgrounds: BackgroundId[]): Condition => ({ type: 'background', backgrounds });
export const relMin = (character: CharacterId, min: number): Condition => ({ type: 'relation', character, min });
export const relMax = (character: CharacterId, max: number): Condition => ({ type: 'relation', character, max });
export const withUs = (character: CharacterId): Condition => ({ type: 'companion', character, status: ['companion'] });
export const notWithUs = (character: CharacterId): Condition => ({
  type: 'not',
  condition: { type: 'companion', character, status: ['companion'] },
});
export const companionIs = (character: CharacterId, ...status: CompanionStatus[]): Condition => ({ type: 'companion', character, status });
export const quest = (q: QuestId, ...status: QuestStatus[]): Condition => ({ type: 'quest', quest: q, status });
export const questStep = (q: QuestId, step: string): Condition => ({ type: 'questStep', quest: q, step });
export const all = (...conditions: Condition[]): Condition => ({ type: 'all', conditions });
export const any = (...conditions: Condition[]): Condition => ({ type: 'any', conditions });
export const not = (condition: Condition): Condition => ({ type: 'not', condition });
export const infected = (): Condition => ({ type: 'infection', min: 1 });

// Effets
export const set = (f: string, value = true): Effect => ({ type: 'setFlag', flag: f, value });
export const give = (item: ItemId, qty = 1): Effect => ({ type: 'giveItem', item, qty });
export const take = (item: ItemId, qty = 1): Effect => ({ type: 'takeItem', item, qty });
export const rel = (character: CharacterId, amount: number): Effect => ({ type: 'relation', character, amount });
export const xp = (amount: number): Effect => ({ type: 'xp', amount });
export const heal = (amount: number): Effect => ({ type: 'heal', amount });
export const hurt = (amount: number, cause: string): Effect => ({ type: 'damage', amount, cause });
export const companion = (character: CharacterId, status: CompanionStatus): Effect => ({ type: 'companion', character, status });
export const questFx = (q: QuestId, status?: QuestStatus, step?: string): Effect => ({ type: 'quest', quest: q, status, step });
export const step = (q: QuestId, s: string): Effect => ({ type: 'quest', quest: q, step: s });
export const discover = (location: LocationId): Effect => ({ type: 'discover', location });
export const world = (location: LocationId, change: string): Effect => ({ type: 'world', location, change });
export const journal = (text: string, major = true): Effect => ({ type: 'journal', text, major });
export const meal = (): Effect => ({ type: 'meal' });
export const rest = (amount?: number): Effect => ({ type: 'rest', amount });
export const when = (cond: Condition, then: Effect[], otherwise?: Effect[]): Effect => ({ type: 'if', cond, then, else: otherwise });
export const counter = (c: string, amount: number): Effect => ({ type: 'addCounter', counter: c, amount });

export function scenes(list: Scene[]): Record<string, Scene> {
  const out: Record<string, Scene> = {};
  for (const s of list) {
    if (out[s.id]) throw new Error(`Scène dupliquée : ${s.id}`);
    out[s.id] = s;
  }
  return out;
}
