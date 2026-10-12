/**
 * Joueurs automatiques : parcourent la campagne avec le vrai moteur.
 * Utilisés par les tests (parcours complets, couverture des fins) et par
 * le script d'équilibrage.
 */
import { choosePerk, maxHp, spendStatPoint } from './character';
import { canPerform, describeIntent, dodgeChance, livingEnemies, performAction } from './combat';
import { choiceViews, choose, newGame, resolveCombat } from './narrative';
import { applyConsumable, canUseOutOfCombat, equip } from './inventory';
import { nextFloat } from './rng';
import type { CharacterDraft, ChoiceKind, CombatAction, GameContent, GameState, PerkId, StatId } from './types';

export type Policy = 'prudent' | 'agressif' | 'discret' | 'relationnel' | 'aleatoire';

export interface SimulationResult {
  state: GameState;
  steps: number;
  ending: string | null;
  stuck: boolean;
  path: string[];
  combats: number;
  error?: string;
}

const KIND_PREFS: Record<Policy, ChoiceKind[]> = {
  prudent: ['item', 'rest', 'talk', 'stealth', 'explore', 'negotiate', 'move', 'flee', 'fight', 'sacrifice'],
  agressif: ['fight', 'item', 'explore', 'move', 'negotiate', 'talk', 'stealth', 'rest', 'flee', 'sacrifice'],
  discret: ['stealth', 'item', 'explore', 'talk', 'negotiate', 'move', 'rest', 'flee', 'fight', 'sacrifice'],
  relationnel: ['talk', 'negotiate', 'item', 'rest', 'explore', 'stealth', 'move', 'flee', 'fight', 'sacrifice'],
  aleatoire: [],
};

export const PRESET_DRAFTS: CharacterDraft[] = [
    { name: 'Alex', profile: 'guerrier', background: 'pompier', emblem: 'lame', allocated: { force: 2, discretion: 1, survie: 1, astuce: 2 } },
    { name: 'Sacha', profile: 'eclaireur', background: 'cataphile', emblem: 'corbeau', allocated: { force: 1, discretion: 2, survie: 2, astuce: 1 } },
    { name: 'Camille', profile: 'technicien', background: 'ambulancier', emblem: 'cle', allocated: { force: 2, discretion: 1, survie: 1, astuce: 2 } },
    { name: 'Noa', profile: 'guerrier', background: 'detenu', emblem: 'masque', allocated: { force: 2, discretion: 2, survie: 1, astuce: 1 } },
];

export function draftFor(policy: Policy, index = 0): CharacterDraft {
  const presets = PRESET_DRAFTS;
  const byPolicy: Record<Policy, number> = { agressif: 0, discret: 1, prudent: 2, relationnel: 3, aleatoire: index % 4 };
  return presets[(byPolicy[policy] + index) % presets.length];
}

function rand(state: { seed: number }): number {
  const r = nextFloat(state.seed);
  state.seed = r.seed;
  return r.value;
}

function combatAction(content: GameContent, s: GameState, rng: { seed: number }, policy: Policy): CombatAction {
  const c = s.combat!;
  const target = livingEnemies(c)[0]?.uid;
  const hpRatio = s.player.hp / maxHp(content, s);
  const heals = ['trousse', 'bandage'].filter((i) => (s.inventory[i] ?? 0) > 0);
  if (hpRatio < 0.4 && heals.length) return { type: 'item', item: heals[0] };
  const heavy = livingEnemies(c).some((e) => {
    const intent = describeIntent(content, e);
    return intent && (intent.kind === 'heavy' || intent.kind === 'bite' || intent.kind === 'grab');
  });
  const heavyOnly = livingEnemies(c).some((e) => describeIntent(content, e)?.kind === 'heavy');
  const dodgeFirst: CombatAction = { type: 'dodge' };
  if (policy !== 'aleatoire' && heavy && dodgeChance(content, s) >= 0.6 && canPerform(content, s, dodgeFirst).ok) return dodgeFirst;
  if (policy !== 'aleatoire' && heavyOnly) return { type: 'defend' };
  const dodge: CombatAction = { type: 'dodge' };
  if (policy !== 'aleatoire' && policy !== 'agressif' && heavy && s.player.stamina > 8 && canPerform(content, s, dodge).ok) return dodge;
  for (const it of ['molotov', 'fusee']) {
    const a: CombatAction = { type: 'item', item: it, target };
    if (livingEnemies(c).some((e) => content.enemies[e.def].boss) && canPerform(content, s, a).ok) return a;
  }
  const skill: CombatAction = { type: 'skill', target };
  if (canPerform(content, s, skill).ok) return skill;
  const ranged: CombatAction = { type: 'attack', weapon: 'ranged', target };
  if (canPerform(content, s, ranged).ok && rand(rng) < 0.6) return ranged;
  const melee: CombatAction = { type: 'attack', weapon: 'melee', target };
  if (canPerform(content, s, melee).ok) return melee;
  return { type: 'defend' };
}

function levelUp(content: GameContent, s: GameState, policy: Policy): GameState {
  const statOrder: Record<Policy, StatId[]> = {
    agressif: ['force', 'survie', 'astuce', 'discretion'],
    discret: ['discretion', 'astuce', 'survie', 'force'],
    prudent: ['survie', 'astuce', 'force', 'discretion'],
    relationnel: ['astuce', 'survie', 'discretion', 'force'],
    aleatoire: ['survie', 'force', 'astuce', 'discretion'],
  };
  const perks: PerkId[] = ['sang_froid', 'premiers_secours', 'main_lourde', 'pas_de_loup', 'second_souffle', 'oeil_de_lynx', 'dos_solide'];
  let state = s;
  let guard = 0;
  while (state.player.unspentStatPoints > 0 && guard++ < 10) {
    const before = state.player.unspentStatPoints;
    for (const st of statOrder[policy]) {
      state = spendStatPoint(content, state, st);
      if (state.player.unspentStatPoints < before) break;
    }
    if (state.player.unspentStatPoints === before) break;
  }
  for (const perk of perks) if (state.player.unspentPerks > 0) state = choosePerk(content, state, perk);
  return state;
}

function maintenance(content: GameContent, s: GameState): GameState {
  let state = s;
  // Équiper les meilleures armes et protections trouvées.
  for (const [id] of Object.entries(state.inventory)) {
    const def = content.items[id];
    if (!def?.slot) continue;
    const current = state.equipment[def.slot];
    const cur = current ? content.items[current] : null;
    const score = (d: typeof def | null) => (d ? (d.damage ? d.damage[0] + d.damage[1] : 0) + (d.armor ?? 0) * 3 + (d.capacityBonus ?? 0) : -1);
    if (score(def) > score(cur)) state = equip(content, state, id);
  }
  if (state.player.infection > 0 && canUseOutOfCombat(content, state, 'antibiotiques').ok && state.player.infection >= 2) {
    state = applyConsumable(content, state, 'antibiotiques');
  }
  if (state.player.hp / maxHp(content, state) < 0.5) {
    for (const it of ['bandage', 'trousse']) {
      if (canUseOutOfCombat(content, state, it).ok) state = applyConsumable(content, state, it);
    }
  }
  return state;
}

export { combatAction as botCombatAction };

export function simulate(
  content: GameContent,
  policy: Policy,
  seed: number,
  options: { maxSteps?: number; draft?: CharacterDraft } = {},
): SimulationResult {
  const rng = { seed: seed ^ 0x9e3779b9 };
  let state = newGame(content, options.draft ?? draftFor(policy, seed), { seed, id: `sim-${seed}`, now: 0 });
  const path: string[] = [state.currentScene];
  const maxSteps = options.maxSteps ?? 2500;
  let steps = 0;
  let combats = 0;
  try {
    while (!state.ending && steps < maxSteps) {
      steps += 1;
      state = levelUp(content, state, policy);
      if (state.combat) {
        if (state.combat.outcome === 'ongoing') {
          if (state.combat.turn === 1 && state.combat.log.length <= 2) combats += 1;
          const action = combatAction(content, state, rng, policy);
          const next = performAction(content, state, action);
          state = next === state ? performAction(content, state, { type: 'defend' }) : next;
        } else {
          state = resolveCombat(content, state);
          path.push(state.currentScene);
        }
        continue;
      }
      state = maintenance(content, state);
      const views = choiceViews(content, state).filter((v) => v.available);
      if (!views.length) return { state, steps, ending: null, stuck: true, path, combats };
      let pick = views[Math.floor(rand(rng) * views.length)];
      if (policy !== 'aleatoire' && rand(rng) < 0.75) {
        const prefs = KIND_PREFS[policy];
        const sorted = [...views].sort((a, b) => {
          const ia = prefs.indexOf(a.choice.kind);
          const ib = prefs.indexOf(b.choice.kind);
          return ia - ib || (b.successChance ?? 1) - (a.successChance ?? 1);
        });
        // Éviter de tourner en rond : préférer les choix « une fois » et les scènes nouvelles.
        const fresh = sorted.find((v) => v.choice.once) ?? sorted.find((v) => v.choice.next && !state.visitedScenes.includes(v.choice.next));
        pick = fresh ?? sorted[0];
      }
      const res = choose(content, state, state.currentScene, pick.choice.id);
      if (!res.ok) return { state, steps, ending: null, stuck: true, path, combats, error: res.error };
      state = res.state;
      if (path[path.length - 1] !== state.currentScene) path.push(state.currentScene);
    }
  } catch (e) {
    return { state, steps, ending: null, stuck: true, path, combats, error: (e as Error).message };
  }
  return { state, steps, ending: state.ending?.id ?? null, stuck: !state.ending, path, combats };
}
