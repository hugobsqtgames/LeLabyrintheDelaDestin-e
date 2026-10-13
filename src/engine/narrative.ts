/**
 * Moteur narratif : création de partie, entrée dans les scènes, choix,
 * jets de compétence et sortie de combat.
 */
import { checkBonus, clampVitals, draftStats, maxHp, maxStamina, normalizeName, validateDraft } from './character';
import { evaluate, evaluateAll, missingRequirements } from './conditions';
import { startCombat } from './combat';
import { applyEffects } from './effects';
import { addItem, EQUIP_SLOTS } from './inventory';
import { checkProbability, CHECK_DICE, CHECK_SIDES, CLOCK_START, STAT_LABELS } from './rules';
import { rollDice } from './rng';
import type {
  CharacterDraft,
  Choice,
  Effect,
  GameContent,
  GameState,
  PlayerCharacter,
  Scene,
  SceneId,
  TextBlock,
} from './types';
import { addChronicle, addNotice, interpolate } from './util';

export class EngineError extends Error {}

// ---------------------------------------------------------------------------
// Nouvelle partie
// ---------------------------------------------------------------------------

export function newGame(
  content: GameContent,
  draft: CharacterDraft,
  options: { seed: number; id: string; now: number },
): GameState {
  const validation = validateDraft(content, draft);
  if (!validation.valid) throw new EngineError(validation.errors.join(' '));
  const profile = content.profiles[draft.profile!];
  const background = content.backgrounds[draft.background!];
  const player: PlayerCharacter = {
    name: normalizeName(draft.name),
    profile: profile.id,
    background: background.id,
    emblem: draft.emblem!,
    stats: draftStats(content, draft),
    hp: 1,
    stamina: 1,
    level: 1,
    xp: 0,
    unspentStatPoints: 0,
    unspentPerks: 0,
    perks: [],
    infection: 0,
  };
  let state: GameState = {
    id: options.id,
    createdAt: options.now,
    turn: 0,
    rng: options.seed >>> 0,
    player,
    chapter: content.chapters[0].id,
    currentScene: content.startScene,
    previousScene: null,
    inventory: {},
    equipment: { melee: null, ranged: null, armor: null, accessory: null },
    ground: {},
    flags: {},
    counters: {},
    quests: {},
    relations: { ...(background.startingRelations ?? {}) },
    companions: {},
    discovered: [],
    world: {},
    visitedScenes: [],
    consumed: [],
    chronicle: [],
    chronicleCounter: 0,
    combat: null,
    notices: [],
    noticeCounter: 0,
    ending: null,
    playtimeMs: 0,
    clock: CLOCK_START,
    durability: {},
    documents: [],
    diary: [],
    lastCheck: null,
  };
  const starting: Record<string, number> = { ...profile.startingItems };
  for (const [item, qty] of Object.entries(background.startingItems ?? {})) {
    starting[item] = (starting[item] ?? 0) + qty;
  }
  for (const [item, qty] of Object.entries(starting)) {
    state = addItem(content, state, item, qty, false).state;
  }
  for (const slot of EQUIP_SLOTS) {
    const item = profile.startingEquipment[slot];
    if (item && state.inventory[item]) state = { ...state, equipment: { ...state.equipment, [slot]: item } };
  }
  state = { ...state, player: { ...state.player, hp: maxHp(content, state), stamina: maxStamina(content, state) } };
  state = addChronicle(content, state, `${player.name}, ${profile.name.toLowerCase()}, ${background.name.toLowerCase()}, prend son tour de garde.`, true);
  return enterScene(content, state, content.startScene);
}

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------

export function getScene(content: GameContent, id: SceneId): Scene {
  const scene = content.scenes[id];
  if (!scene) throw new EngineError(`Scène introuvable : ${id}`);
  return scene;
}

const MAX_ROUTE_DEPTH = 8;

export function enterScene(content: GameContent, state: GameState, sceneId: SceneId, depth = 0): GameState {
  const scene = content.scenes[sceneId];
  if (!scene) return addNotice(state, `Erreur de contenu : scène « ${sceneId} » introuvable.`, 'bad');
  if (scene.routes && depth < MAX_ROUTE_DEPTH) {
    const route = scene.routes.find((r) => evaluate(content, state, r.if));
    if (route) return enterScene(content, state, route.to, depth + 1);
  }
  let s: GameState = {
    ...state,
    previousScene: state.currentScene === sceneId ? state.previousScene : state.currentScene,
    currentScene: sceneId,
    ground: state.currentScene === sceneId ? state.ground : {},
    visitedScenes: state.visitedScenes.includes(sceneId) ? state.visitedScenes : [...state.visitedScenes, sceneId],
  };
  if (scene.chapter !== s.chapter) s = applyEffects(content, s, [{ type: 'chapter', chapter: scene.chapter }]);
  s = applyEffects(content, s, [{ type: 'discover', location: scene.location }]);
  const key = `scene:${sceneId}`;
  if (scene.onEnter && !s.consumed.includes(key)) {
    s = { ...s, consumed: [...s.consumed, key] };
    s = applyEffects(content, s, scene.onEnter);
  }
  if (s.ending) return s; // Mort pendant les effets d'entrée.
  if ((scene.kind === 'ending' || scene.kind === 'death') && scene.ending) {
    s = { ...s, ending: { id: scene.ending, kind: scene.kind === 'death' ? 'death' : 'ending' } };
    const def = content.endings[scene.ending];
    s = addChronicle(content, s, def ? `Fin : ${def.title}.` : 'Fin de l’histoire.', true);
    return s;
  }
  if (scene.kind === 'combat' && scene.encounter && !s.combat) {
    s = startCombat(content, s, sceneId, scene.encounter);
  }
  return s;
}

/** Paragraphes visibles de la scène courante, variables remplacées. */
export function visibleText(content: GameContent, state: GameState, scene: Scene): TextBlock[] {
  return scene.text
    .filter((b) => !b.if || evaluate(content, state, b.if))
    .map((b) => ({ ...b, text: interpolate(b.text, state) }));
}

// ---------------------------------------------------------------------------
// Choix
// ---------------------------------------------------------------------------

export interface ChoiceView {
  choice: Choice;
  text: string;
  available: boolean;
  /** Raisons connues du verrouillage. */
  lockedReasons: string[];
  /** Le verrou dépend d'éléments que le personnage ignore. */
  lockedUnknown: boolean;
  /** Probabilité de réussite si le choix comporte un jet. */
  successChance: number | null;
  /** Coûts et risques déduits automatiquement des effets. */
  costs: string[];
}

function choiceKey(sceneId: SceneId, choiceId: string): string {
  return `choice:${sceneId}/${choiceId}`;
}

export function isChoiceConsumed(state: GameState, sceneId: SceneId, choiceId: string): boolean {
  return state.consumed.includes(choiceKey(sceneId, choiceId));
}

function describeCosts(content: GameContent, effects: Effect[] | undefined): string[] {
  const costs: string[] = [];
  for (const e of effects ?? []) {
    if (e.type === 'damage') costs.push(`−${e.amount} PV`);
    if (e.type === 'takeItem') costs.push(`−${e.qty ?? 1} ${content.items[e.item]?.name ?? e.item}`);
    if (e.type === 'infection' && e.amount > 0) costs.push('Risque d’infection');
    if (e.type === 'stamina' && e.amount < 0) costs.push(`−${-e.amount} endurance`);
  }
  return costs;
}

export function choiceViews(content: GameContent, state: GameState): ChoiceView[] {
  const scene = content.scenes[state.currentScene];
  if (!scene) return [];
  const views: ChoiceView[] = [];
  for (const choice of scene.choices) {
    if (choice.visibleIf && !evaluateAll(content, state, choice.visibleIf)) continue;
    if (choice.once && isChoiceConsumed(state, scene.id, choice.id)) continue;
    const available = evaluateAll(content, state, choice.requires);
    const missing = available ? { known: [], unknown: 0 } : missingRequirements(content, state, choice.requires);
    const successChance = choice.check
      ? checkProbability(checkBonus(content, state, choice.check.stat), choice.check.difficulty)
      : null;
    const costs = describeCosts(content, choice.effects);
    if (choice.check?.failureEffects) {
      const failCosts = describeCosts(content, choice.check.failureEffects);
      if (failCosts.length) costs.push(`En cas d’échec : ${failCosts.join(', ')}`);
    }
    views.push({
      choice,
      text: interpolate(choice.text, state),
      available,
      lockedReasons: missing.known,
      lockedUnknown: missing.unknown > 0,
      successChance,
      costs,
    });
  }
  return views;
}

export interface ChoiceResult {
  state: GameState;
  ok: boolean;
  error?: string;
}

/**
 * Applique un choix. `sceneId` doit correspondre à la scène courante : un
 * double appui ou un choix affiché sur un écran périmé est ainsi ignoré.
 */
export function choose(content: GameContent, state: GameState, sceneId: SceneId, choiceId: string): ChoiceResult {
  if (state.ending) return { state, ok: false, error: 'La partie est terminée.' };
  if (state.combat) return { state, ok: false, error: 'Un combat est en cours.' };
  if (state.currentScene !== sceneId) return { state, ok: false, error: 'Choix périmé.' };
  const scene = content.scenes[sceneId];
  if (!scene) return { state, ok: false, error: 'Scène introuvable.' };
  const choice = scene.choices.find((c) => c.id === choiceId);
  if (!choice) return { state, ok: false, error: 'Choix introuvable.' };
  if (choice.visibleIf && !evaluateAll(content, state, choice.visibleIf)) return { state, ok: false, error: 'Choix indisponible.' };
  if (!evaluateAll(content, state, choice.requires)) return { state, ok: false, error: 'Conditions non remplies.' };
  const key = choiceKey(sceneId, choiceId);
  if (choice.once && state.consumed.includes(key)) return { state, ok: false, error: 'Déjà fait.' };

  let s: GameState = { ...state, turn: state.turn + 1, lastCheck: null, notices: [] };
  if (choice.once) s = { ...s, consumed: [...s.consumed, key] };
  s = addChronicle(content, s, interpolate(choice.text, s), false);
  if (choice.time) s = { ...s, clock: s.clock + choice.time };
  s = applyEffects(content, s, choice.effects);
  if (s.ending) return { state: s, ok: true };

  let next = choice.next;
  if (choice.check) {
    const c = choice.check;
    const dice = rollDice(s.rng, CHECK_DICE, CHECK_SIDES);
    const bonus = checkBonus(content, s, c.stat);
    const total = dice.value[0] + dice.value[1] + bonus;
    const success = total >= c.difficulty;
    s = {
      ...s,
      rng: dice.seed,
      lastCheck: { stat: c.stat, roll: [dice.value[0], dice.value[1]], total, difficulty: c.difficulty, success },
    };
    s = addChronicle(
      content,
      s,
      `${STAT_LABELS[c.stat]} : ${dice.value[0]}+${dice.value[1]}+${bonus} = ${total} contre ${c.difficulty} — ${success ? 'réussite' : 'échec'}.`,
      false,
    );
    s = applyEffects(content, s, success ? c.successEffects : c.failureEffects);
    if (s.ending) return { state: s, ok: true };
    next = success ? c.success : c.failure;
  }
  if (next) s = enterScene(content, s, next);
  return { state: s, ok: true };
}

// ---------------------------------------------------------------------------
// Sortie de combat
// ---------------------------------------------------------------------------

export function resolveCombat(content: GameContent, state: GameState): GameState {
  const combat = state.combat;
  if (!combat || combat.outcome === 'ongoing') return state;
  const scene = content.scenes[combat.sceneId];
  const encounter = scene?.encounter;
  let s: GameState = { ...state, combat: null, turn: state.turn + 1, notices: [] };
  if (!encounter) return s;
  if (state.ending) return s;
  if (combat.outcome === 'victory') {
    s = addChronicle(content, s, `Victoire : ${scene.title}.`, !!encounter.enemies.some((e) => content.enemies[e]?.boss));
    if (combat.xpEarned > 0) s = applyEffects(content, s, [{ type: 'xp', amount: combat.xpEarned }]);
    return enterScene(content, s, encounter.victory);
  }
  if (combat.outcome === 'fled') {
    s = addChronicle(content, s, `Fuite : ${scene.title}.`, false);
    return enterScene(content, s, encounter.flee ?? encounter.defeat);
  }
  // Défaite : selon la scène, blessure, capture ou mort.
  const defeatScene = content.scenes[encounter.defeat];
  s = addChronicle(content, s, `Défaite : ${scene.title}.`, true);
  if (defeatScene && defeatScene.kind !== 'death') {
    s = { ...s, player: { ...s.player, hp: Math.max(1, s.player.hp) } };
  }
  return enterScene(content, s, encounter.defeat);
}

export function addPlaytime(state: GameState, ms: number): GameState {
  if (ms <= 0 || !Number.isFinite(ms)) return state;
  return { ...state, playtimeMs: state.playtimeMs + Math.min(ms, 60 * 60 * 1000) };
}

/**
 * Remet un état chargé dans une situation jouable : bornes des PV,
 * combat relancé si la scène courante est un combat sans état de combat.
 */
export function ensureConsistency(content: GameContent, state: GameState): GameState {
  let s = clampVitals(content, state);
  const scene = content.scenes[s.currentScene];
  if (!s.ending && s.player.hp <= 0 && !s.combat) s = { ...s, player: { ...s.player, hp: 1 } };
  if (scene && !s.ending && scene.kind === 'combat' && scene.encounter && !s.combat) {
    s = startCombat(content, s, scene.id, scene.encounter);
  }
  if (scene && !s.ending && (scene.kind === 'ending' || scene.kind === 'death') && scene.ending) {
    s = { ...s, ending: { id: scene.ending, kind: scene.kind === 'death' ? 'death' : 'ending' } };
  }
  return s;
}
