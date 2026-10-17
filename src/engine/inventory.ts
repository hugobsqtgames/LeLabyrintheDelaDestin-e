/**
 * Inventaire, poids et équipement.
 *
 * Règles :
 *  - l'inventaire est un dictionnaire objet → quantité, sans doublon possible ;
 *  - un objet équipé reste dans l'inventaire (il compte dans le poids) et
 *    occupe un emplacement ; il est déséquipé s'il disparaît ;
 *  - un objet trop lourd est déposé « au sol » : le joueur peut faire de la
 *    place pour le prendre ou l'abandonner. Le sol est vidé en changeant de scène.
 */
import { CAPACITY_BASE } from './rules';
import { clampVitals, hasPerk, healingMultiplier, maxHp, maxStamina } from './character';
import type { EquipSlot, GameContent, GameState, ItemId } from './types';
import { addNotice, clamp } from './util';
import { missingRequirements } from './conditions';
import { MESSAGES_FR, msg, msgCount } from './messages';

export const EQUIP_SLOTS: EquipSlot[] = ['melee', 'ranged', 'armor', 'accessory'];

/** Libellés français des emplacements (référence ; à l'exécution : `slotLabel`). */
export const SLOT_LABELS: Record<EquipSlot, string> = {
  melee: MESSAGES_FR['slot.melee'],
  ranged: MESSAGES_FR['slot.ranged'],
  armor: MESSAGES_FR['slot.armor'],
  accessory: MESSAGES_FR['slot.accessory'],
};

/** Libellé d'un emplacement dans la langue du contenu. */
export function slotLabel(content: GameContent, slot: EquipSlot): string {
  return msg(content, `slot.${slot}`);
}

export function capacity(content: GameContent, state: GameState): number {
  const bg = content.backgrounds[state.player.background];
  let cap = CAPACITY_BASE + state.player.stats.force * 2 + (bg?.capacityModifier ?? 0);
  if (hasPerk(state, 'dos_solide')) cap += 4;
  for (const itemId of Object.values(state.equipment)) {
    if (itemId) cap += content.items[itemId]?.capacityBonus ?? 0;
  }
  return cap;
}

export function currentWeight(content: GameContent, state: GameState): number {
  let w = 0;
  for (const [id, qty] of Object.entries(state.inventory)) {
    w += (content.items[id]?.weight ?? 0) * qty;
  }
  // Au centième : certains objets pèsent 0,05 kg, un arrondi au dixième laisserait dépasser la charge.
  return Math.round(w * 100) / 100;
}

export function itemCount(state: GameState, item: ItemId): number {
  return state.inventory[item] ?? 0;
}

function setQty(state: GameState, item: ItemId, qty: number): GameState {
  const inventory = { ...state.inventory };
  if (qty <= 0) delete inventory[item];
  else inventory[item] = qty;
  let equipment = state.equipment;
  if (qty <= 0) {
    for (const slot of EQUIP_SLOTS) {
      if (equipment[slot] === item) equipment = { ...equipment, [slot]: null };
    }
  }
  return { ...state, inventory, equipment };
}

export interface AddResult {
  state: GameState;
  added: number;
  grounded: number;
  refused: number;
}

/**
 * Ajoute un objet en respectant la pile maximale et la capacité.
 * L'excédent dû au poids est posé au sol ; l'excédent dû à la pile est refusé.
 */
export function addItem(content: GameContent, state: GameState, item: ItemId, qty = 1, notify = true): AddResult {
  const def = content.items[item];
  if (!def || qty <= 0) return { state, added: 0, grounded: 0, refused: qty };
  const owned = itemCount(state, item);
  const stackRoom = Math.max(0, def.maxStack - owned);
  const wanted = Math.min(qty, stackRoom);
  const refused = qty - wanted;

  let fits = wanted;
  if (def.weight > 0 && !def.questItem) {
    const free = capacity(content, state) - currentWeight(content, state);
    fits = Math.max(0, Math.min(wanted, Math.floor((free + 1e-9) / def.weight)));
  }
  const grounded = wanted - fits;

  let s = fits > 0 ? setQty(state, item, owned + fits) : state;
  if (grounded > 0) {
    const groundQty = Math.min(def.maxStack, (s.ground[item] ?? 0) + grounded);
    s = { ...s, ground: { ...s.ground, [item]: groundQty } };
  }
  if (notify) {
    if (fits > 0) s = addNotice(s, msg(content, 'item.gained', { qty: fits, item: def.name }), 'good');
    if (grounded > 0)
      s = addNotice(s, msgCount(content, 'inventory.grounded', grounded, { item: def.name }), 'bad');
    if (refused > 0 && fits === 0 && grounded === 0)
      s = addNotice(s, msg(content, 'inventory.stackFull', { item: def.name, max: def.maxStack }), 'info');
  }
  return { state: s, added: fits, grounded, refused };
}

export function removeItem(content: GameContent, state: GameState, item: ItemId, qty = 1, notify = true): GameState {
  const owned = itemCount(state, item);
  if (owned <= 0 || qty <= 0) return state;
  const removed = Math.min(owned, qty);
  let s = setQty(state, item, owned - removed);
  if (notify) s = addNotice(s, msg(content, 'item.lost', { qty: removed, item: content.items[item]?.name ?? item }), 'bad');
  return clampVitals(content, s);
}

export function canDrop(content: GameContent, state: GameState, item: ItemId): { ok: boolean; reason?: string } {
  const def = content.items[item];
  if (!def) return { ok: false, reason: msg(content, 'inventory.unknownItem') };
  if (itemCount(state, item) <= 0) return { ok: false, reason: msg(content, 'inventory.notOwned') };
  if (def.questItem) return { ok: false, reason: msg(content, 'inventory.questItem') };
  return { ok: true };
}

/** Le joueur pose un objet au sol (il peut le reprendre tant qu'il reste dans la scène). */
export function dropItem(content: GameContent, state: GameState, item: ItemId, qty = 1): GameState {
  if (!canDrop(content, state, item).ok) return state;
  const def = content.items[item];
  const removed = Math.min(itemCount(state, item), qty);
  let s = setQty(state, item, itemCount(state, item) - removed);
  s = { ...s, ground: { ...s.ground, [item]: Math.min(def.maxStack, (s.ground[item] ?? 0) + removed) } };
  s = addNotice(s, msg(content, 'inventory.dropped', { item: def.name }), 'info');
  return clampVitals(content, s);
}

export function pickUp(content: GameContent, state: GameState, item: ItemId): GameState {
  const onGround = state.ground[item] ?? 0;
  if (onGround <= 0) return state;
  const res = addItem(content, { ...state, ground: { ...state.ground, [item]: 0 } }, item, onGround, false);
  let s = res.state;
  const leftover = onGround - res.added;
  const ground = { ...state.ground };
  if (leftover > 0) ground[item] = leftover;
  else delete ground[item];
  s = { ...s, ground };
  if (res.added > 0) s = addNotice(s, msg(content, 'inventory.pickedUp', { qty: res.added, item: content.items[item].name }), 'good');
  else s = addNotice(s, msg(content, 'inventory.stillTooHeavy', { weight: content.items[item].weight }), 'bad');
  return s;
}

export function abandonGround(state: GameState, item?: ItemId): GameState {
  if (!item) return { ...state, ground: {} };
  const ground = { ...state.ground };
  delete ground[item];
  return { ...state, ground };
}

// ---------------------------------------------------------------------------
// Équipement
// ---------------------------------------------------------------------------

export function canEquip(content: GameContent, state: GameState, item: ItemId): { ok: boolean; reason?: string } {
  const def = content.items[item];
  if (!def) return { ok: false, reason: msg(content, 'inventory.unknownItem') };
  if (!def.slot) return { ok: false, reason: msg(content, 'equip.notEquippable') };
  if (itemCount(state, item) <= 0) return { ok: false, reason: msg(content, 'inventory.notOwned') };
  if (state.equipment[def.slot] === item) return { ok: false, reason: msg(content, 'equip.already') };
  if (def.category === 'ranged' && def.ammo && itemCount(state, def.ammo) <= 0) {
    // Autorisé, mais signalé : l'arme ne pourra pas tirer.
    return { ok: true, reason: msg(content, 'equip.noAmmo', { ammo: content.items[def.ammo]?.name ?? def.ammo }) };
  }
  return { ok: true };
}

export function equip(content: GameContent, state: GameState, item: ItemId): GameState {
  const check = canEquip(content, state, item);
  if (!check.ok) return state;
  const def = content.items[item];
  const slot = def.slot as EquipSlot;
  const previous = state.equipment[slot];
  let s: GameState = { ...state, equipment: { ...state.equipment, [slot]: item } };
  // Remplacer un sac par un sac plus petit peut rendre la charge excessive.
  if (currentWeight(content, s) > capacity(content, s)) {
    return addNotice(
      state,
      msg(content, 'equip.tooHeavyWithout', { item: content.items[previous ?? '']?.name ?? msg(content, 'equip.thisEquipment') }),
      'bad',
    );
  }
  s = addNotice(
    s,
    previous
      ? msg(content, 'equip.doneReplaces', { item: def.name, previous: String(content.items[previous]?.name) })
      : msg(content, 'equip.done', { item: def.name }),
    'info',
  );
  return clampVitals(content, s);
}

export function unequip(content: GameContent, state: GameState, slot: EquipSlot): GameState {
  const current = state.equipment[slot];
  if (!current) return state;
  const s: GameState = { ...state, equipment: { ...state.equipment, [slot]: null } };
  if (currentWeight(content, s) > capacity(content, s)) {
    return addNotice(state, msg(content, 'unequip.tooHeavy'), 'bad');
  }
  return clampVitals(content, addNotice(s, msg(content, 'unequip.done', { item: content.items[current].name }), 'info'));
}

// ---------------------------------------------------------------------------
// Utilisation hors combat
// ---------------------------------------------------------------------------

export function canUseOutOfCombat(content: GameContent, state: GameState, item: ItemId): { ok: boolean; reason?: string } {
  const def = content.items[item];
  if (!def?.use?.outOfCombat) return { ok: false, reason: msg(content, 'use.notThisWay') };
  if (itemCount(state, item) <= 0) return { ok: false, reason: msg(content, 'use.noneLeft') };
  if (state.ending) return { ok: false, reason: msg(content, 'choice.gameOver') };
  if (state.combat) return { ok: false, reason: msg(content, 'use.inCombat') };
  const u = def.use;
  const needsHeal = (u.heal ?? 0) > 0 && state.player.hp < maxHp(content, state);
  const needsStamina = (u.stamina ?? 0) > 0 && state.player.stamina < maxStamina(content, state);
  const needsCure = !!u.cureInfection && state.player.infection > 0;
  if (!needsHeal && !needsStamina && !needsCure) {
    return { ok: false, reason: msg(content, 'use.useless') };
  }
  return { ok: true };
}

/** Applique l'effet d'un consommable sur le joueur et le retire de l'inventaire. */
export function applyConsumable(content: GameContent, state: GameState, item: ItemId): GameState {
  const def = content.items[item];
  const u = def.use ?? {};
  let s = removeItem(content, state, item, 1, false);
  const p = s.player;
  const heal = u.heal ? Math.round(u.heal * healingMultiplier(content, s)) : 0;
  const hp = clamp(p.hp + heal, 0, maxHp(content, s));
  const stamina = clamp(p.stamina + (u.stamina ?? 0), 0, maxStamina(content, s));
  s = { ...s, player: { ...p, hp, stamina } };
  if (u.cureInfection && s.player.infection > 0) {
    s = { ...s, player: { ...s.player, infection: 0 } };
    s = addNotice(s, msg(content, 'use.feverDown'), 'good');
  }
  const parts: string[] = [];
  if (hp > p.hp) parts.push(msg(content, 'gain.hp', { n: hp - p.hp }));
  if (stamina > p.stamina) parts.push(msg(content, 'gain.stamina', { n: stamina - p.stamina }));
  s = addNotice(
    s,
    parts.length ? msg(content, 'use.doneWith', { item: def.name, effects: parts.join(', ') }) : msg(content, 'use.done', { item: def.name }),
    'good',
  );
  return clampVitals(content, s);
}

export function consumeItemOutOfCombat(content: GameContent, state: GameState, item: ItemId): GameState {
  if (!canUseOutOfCombat(content, state, item).ok) return state;
  return applyConsumable(content, state, item);
}

/** Rend de la solidité à une arme (ou à toutes les armes équipées). */
export function repairWeapons(content: GameContent, state: GameState, amount: number, item?: string): GameState {
  const targets = item ? [item] : [state.equipment.melee, state.equipment.ranged].filter((x): x is string => !!x);
  let durability = state.durability;
  const repaired: string[] = [];
  for (const id of targets) {
    const max = content.items[id]?.durability;
    if (!max || !state.inventory[id]) continue;
    const before = durability[id] ?? max;
    const after = Math.min(max, before + amount);
    if (after > before) {
      durability = { ...durability, [id]: after };
      repaired.push(content.items[id].name);
    }
  }
  if (!repaired.length) return state;
  return addNotice({ ...state, durability }, msg(content, 'repair.done', { list: repaired.join(', ') }), 'good');
}

// ---------------------------------------------------------------------------
// Atelier : fabrication et réparation
// ---------------------------------------------------------------------------

export function canCraft(content: GameContent, state: GameState, recipeId: string): { ok: boolean; reason?: string } {
  const r = content.recipes[recipeId];
  if (!r) return { ok: false, reason: msg(content, 'craft.unknown') };
  if (state.ending) return { ok: false, reason: msg(content, 'choice.gameOver') };
  if (state.combat) return { ok: false, reason: msg(content, 'craft.inCombat') };
  const missing = Object.entries(r.inputs)
    .filter(([id, qty]) => itemCount(state, id) < qty)
    .map(([id, qty]) => msg(content, 'craft.qtyItem', { qty, item: content.items[id]?.name ?? id }));
  if (missing.length) return { ok: false, reason: msg(content, 'craft.missing', { list: missing.join(', ') }) };
  const req = missingRequirements(content, state, r.requires);
  if (req.known.length || req.unknown) return { ok: false, reason: req.known.join(' · ') || msg(content, 'craft.unknownSkill') };
  if (r.repair) {
    const weapons = [state.equipment.melee, state.equipment.ranged].filter((x): x is string => !!x);
    const needs = weapons.some((w) => {
      const max = content.items[w]?.durability;
      return !!max && (state.durability[w] ?? max) < max;
    });
    if (!needs) return { ok: false, reason: msg(content, 'craft.weaponsPristine') };
  }
  return { ok: true };
}

export function craft(content: GameContent, state: GameState, recipeId: string): GameState {
  if (!canCraft(content, state, recipeId).ok) return state;
  const r = content.recipes[recipeId];
  let s = state;
  for (const [id, qty] of Object.entries(r.inputs)) s = removeItem(content, s, id, qty, false);
  s = { ...s, clock: s.clock + r.time };
  if (r.output) s = addItem(content, s, r.output.item, r.output.qty).state;
  if (r.repair) s = repairWeapons(content, s, r.repair);
  return s;
}

// ---------------------------------------------------------------------------
// Comparaison avec l'équipement porté
// ---------------------------------------------------------------------------

export interface ComparisonRow {
  /** Clé de libellé : damage, accuracy, stamina, durability, armor, capacity, ou une caractéristique. */
  key: string;
  current: number;
  candidate: number;
  /** +1 : meilleur, −1 : moins bon, 0 : égal. */
  delta: -1 | 0 | 1;
}

/**
 * Compare un objet équipable à celui qui occupe le même emplacement.
 * `null` si l'objet n'est pas équipable ou s'il est déjà porté.
 */
export function compareWithEquipped(content: GameContent, state: GameState, itemId: ItemId): { equipped: ItemId | null; rows: ComparisonRow[] } | null {
  const cand = content.items[itemId];
  if (!cand?.slot) return null;
  const currentId = state.equipment[cand.slot];
  if (currentId === itemId) return null;
  const cur = currentId ? content.items[currentId] : null;
  const rows: ComparisonRow[] = [];
  const push = (key: string, a: number, b: number, lowerIsBetter = false) => {
    if (a === 0 && b === 0) return;
    const d = b === a ? 0 : (b > a) !== lowerIsBetter ? 1 : -1;
    rows.push({ key, current: a, candidate: b, delta: d as -1 | 0 | 1 });
  };
  const avg = (d?: [number, number]) => (d ? (d[0] + d[1]) / 2 : 0);
  const dura = (id: ItemId | null | undefined) => {
    const max = id ? content.items[id]?.durability : undefined;
    return max ? Math.min(max, state.durability[id!] ?? max) : 0;
  };
  push('damage', avg(cur?.damage), avg(cand.damage));
  push('accuracy', Math.round((cur?.accuracy ?? 0) * 100), Math.round((cand.accuracy ?? 0) * 100));
  push('stamina', cur?.staminaCost ?? 0, cand.staminaCost ?? 0, true);
  push('durability', dura(currentId), dura(itemId));
  push('armor', cur?.armor ?? 0, cand.armor ?? 0);
  push('capacity', cur?.capacityBonus ?? 0, cand.capacityBonus ?? 0);
  for (const s of ['force', 'discretion', 'survie', 'astuce'] as const) push(s, cur?.statBonus?.[s] ?? 0, cand.statBonus?.[s] ?? 0);
  return { equipped: currentId, rows };
}
