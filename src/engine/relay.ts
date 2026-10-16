/**
 * La relève : quand le personnage joueur meurt, un compagnon présent peut
 * reprendre la route. Il garde sa propre fiche (profil, passé, niveau,
 * compétences, équipement) ; rien de celui qui est tombé ne lui revient,
 * sauf les objets de quête et ce qu'il récupère en fouillant le corps,
 * quand le corps est accessible.
 */
import { maxHp, maxStamina } from './character';
import { addItem } from './inventory';
import { msg } from './messages';
import { ensureConsistency } from './narrative';
import { LEVEL_MAX, PERK_LEVELS, STAT_MAX } from './rules';
import type { CharacterId, EquipSlot, GameContent, GameState, HeroSheet, ItemId, PlayerCharacter } from './types';
import { addChronicle, addNotice, clamp } from './util';

/** Nombre de piles que l'on peut prendre sur le corps. */
export const BODY_LOOT_MAX = 3;

/** Compagnons présents capables de reprendre la route, dans l'ordre de la fiche. */
export function relayCandidates(content: GameContent, state: GameState): HeroSheet[] {
  if (state.ending?.kind !== 'death') return [];
  return Object.values(content.heroes).filter((h) => state.companions[h.character] === 'companion');
}

export function canRelay(content: GameContent, state: GameState): boolean {
  return relayCandidates(content, state).length > 0;
}

/** Le corps peut-il être fouillé ? (Certaines morts ne laissent rien derrière.) */
export function bodyRecoverable(content: GameContent, state: GameState): boolean {
  if (state.ending?.kind !== 'death') return false;
  return content.endings[state.ending.id]?.remains !== 'lost';
}

/** Ce que porte le corps : chaque pile (hors objets de quête, toujours récupérés). */
export function bodyItems(content: GameContent, state: GameState): { item: ItemId; qty: number }[] {
  if (!bodyRecoverable(content, state)) return [];
  return Object.entries(state.inventory)
    .filter(([id, qty]) => qty > 0 && content.items[id] && !content.items[id].questItem)
    .map(([item, qty]) => ({ item, qty }));
}

/** Objets de quête : récupérés quoi qu'il arrive, l'histoire en a besoin. */
export function questItems(content: GameContent, state: GameState): { item: ItemId; qty: number }[] {
  return Object.entries(state.inventory)
    .filter(([id, qty]) => qty > 0 && content.items[id]?.questItem)
    .map(([item, qty]) => ({ item, qty }));
}

/** Niveau du compagnon : il a voyagé avec vous, il a progressé lui aussi. */
export function relayLevel(content: GameContent, state: GameState, sheet: HeroSheet): number {
  const number = content.chapters.find((c) => c.id === state.chapter)?.number ?? 1;
  const total = Math.max(1, content.chapters.length);
  const byJourney = 1 + Math.floor((number * (LEVEL_MAX - 1)) / total);
  const ceiling = Math.max(sheet.level, state.player.level);
  return clamp(Math.min(byJourney, ceiling), sheet.level, LEVEL_MAX);
}

function buildPlayer(content: GameContent, state: GameState, sheet: HeroSheet): PlayerCharacter {
  const level = relayLevel(content, state, sheet);
  const stats = { ...sheet.stats };
  // Points gagnés depuis le niveau 1, répartis selon l'ordre de la fiche.
  let points = level - 1;
  for (let i = 0; points > 0 && i < 64; i++) {
    const stat = sheet.growth[i % sheet.growth.length];
    if (stats[stat] < STAT_MAX) {
      stats[stat] += 1;
      points -= 1;
    }
  }
  const perksDue = PERK_LEVELS.filter((l) => l <= level).length;
  return {
    name: sheet.name,
    profile: sheet.profile,
    background: sheet.background,
    emblem: sheet.emblem,
    stats,
    hp: 1,
    stamina: 1,
    level,
    xp: 0,
    unspentStatPoints: 0,
    unspentPerks: Math.max(0, perksDue - sheet.perks.length),
    perks: [...sheet.perks],
    infection: 0,
  };
}

/**
 * Le compagnon `hero` reprend la route. `picks` : objets pris sur le corps
 * (au plus BODY_LOOT_MAX piles, ignorés si le corps est perdu).
 */
export function takeOver(content: GameContent, state: GameState, hero: CharacterId, picks: ItemId[] = []): GameState {
  const sheet = relayCandidates(content, state).find((h) => h.character === hero);
  if (!sheet) return state;
  const fallenName = state.player.name;
  const available = new Map(bodyItems(content, state).map((b) => [b.item, b.qty]));
  const taken = [...new Set(picks)].filter((id) => available.has(id)).slice(0, BODY_LOOT_MAX);
  const keep = questItems(content, state);

  const dead = state.ending!;
  const deathScene = content.scenes[state.currentScene];
  // On reprend juste avant le coup fatal : la scène précédente si l'on est
  // sur une scène de mort, sinon la scène courante (un combat est relancé).
  const resume = deathScene?.kind === 'death' && state.previousScene ? state.previousScene : state.currentScene;

  let s: GameState = {
    ...state,
    player: buildPlayer(content, state, sheet),
    inventory: {},
    equipment: { melee: null, ranged: null, armor: null, accessory: null },
    ground: {},
    durability: {},
    combat: null,
    ending: null,
    lastCheck: null,
    notices: [],
    currentScene: resume,
    hero,
    companions: { ...state.companions, [hero]: 'hero' },
    fallen: [
      ...state.fallen,
      {
        name: fallenName,
        profile: state.player.profile,
        level: state.player.level,
        chapter: state.chapter,
        scene: state.currentScene,
        turn: state.turn,
        character: state.hero,
      },
    ],
    turn: state.turn + 1,
  };
  // Le héros précédent, s'il était un compagnon, est désormais mort.
  if (state.hero) s = { ...s, companions: { ...s.companions, [state.hero]: 'dead' } };

  for (const [item, qty] of Object.entries(sheet.items)) s = addItem(content, s, item, qty, false).state;
  for (const slot of Object.keys(sheet.equipment) as EquipSlot[]) {
    const item = sheet.equipment[slot];
    if (item && s.inventory[item]) s = { ...s, equipment: { ...s.equipment, [slot]: item } };
  }
  for (const { item, qty } of keep) s = addItem(content, s, item, qty, false).state;
  for (const item of taken) s = addItem(content, s, item, available.get(item)!, false).state;
  // Ce qui ne rentre pas dans le sac reste au sol, pas question de le perdre en silence.

  s = { ...s, player: { ...s.player, hp: maxHp(content, s), stamina: maxStamina(content, s) } };
  const cause = dead.cause ? ` (${dead.cause})` : '';
  s = addChronicle(content, s, msg(content, 'relay.chronicle', { fallen: fallenName, hero: s.player.name }) + cause, true);
  s = addNotice(s, msg(content, 'relay.notice', { hero: s.player.name }), 'info');
  if (taken.length) {
    const names = taken.map((id) => content.items[id]?.name ?? id).join(', ');
    s = addNotice(s, msg(content, 'relay.searched', { items: names }), 'good');
  }
  return ensureConsistency(content, s);
}
