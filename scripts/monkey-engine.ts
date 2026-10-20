/**
 * Monkey test du moteur : des milliers de parties jouées au hasard, y compris
 * avec des actions absurdes (objets inconnus, choix inexistants, actions de
 * combat impossibles, relève avec des fouilles au hasard). Après chaque action,
 * l'état doit rester cohérent et survivre à un aller-retour de sauvegarde.
 *
 *   npx tsx scripts/monkey-engine.ts [parties=2000] [graine=1] [fr|en]
 */
import { contentFor } from '../src/content/localized';
import { maxHp, maxStamina, choosePerk, spendStatPoint } from '../src/engine/character';
import { performAction } from '../src/engine/combat';
import { abandonGround, applyConsumable, canCraft, canEquip, canUseOutOfCombat, craft, currentWeight, dropItem, equip, pickUp, unequip } from '../src/engine/inventory';
import { choiceViews, choose, newGame, resolveCombat } from '../src/engine/narrative';
import { bodyItems, canRelay, relayCandidates, takeOver } from '../src/engine/relay';
import { PRESET_DRAFTS } from '../src/engine/simulate';
import type { CombatActionType, EquipSlot, GameContent, GameState, PerkId, StatId } from '../src/engine/types';
import { migrate, serialize, validateState } from '../src/persistence/schema';

const C: GameContent = contentFor(process.argv[4] === 'en' ? 'en' : 'fr');
const GAMES = Number(process.argv[2] ?? 2000);
let seed = Number(process.argv[3] ?? 1) >>> 0;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const pickOne = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];

const ITEMS = [...Object.keys(C.items), 'objet_inconnu', ''];
const RECIPES = [...Object.keys(C.recipes), 'recette_inconnue'];
const PERKS = [...Object.keys(C.perks), 'atout_inconnu'] as PerkId[];
const STATS: StatId[] = ['force', 'discretion', 'survie', 'astuce'];
const SLOTS: EquipSlot[] = ['melee', 'ranged', 'armor', 'accessory'];
const ACTIONS: CombatActionType[] = ['attack', 'defend', 'dodge', 'skill', 'skill2', 'item', 'flee'];

const failures = new Map<string, { count: number; example: string }>();
function fail(kind: string, detail: string) {
  const f = failures.get(kind);
  if (f) f.count += 1;
  else failures.set(kind, { count: 1, example: detail });
}

function check(s: GameState, ctx: string) {
  if (!C.scenes[s.currentScene]) fail('scène inexistante', `${ctx} → ${s.currentScene}`);
  const hpMax = maxHp(C, s);
  const stMax = maxStamina(C, s);
  if (!Number.isFinite(s.player.hp) || s.player.hp < 0 || s.player.hp > hpMax) fail('PV hors bornes', `${ctx} : ${s.player.hp}/${hpMax}`);
  if (!Number.isFinite(s.player.stamina) || s.player.stamina < 0 || s.player.stamina > stMax) fail('endurance hors bornes', `${ctx} : ${s.player.stamina}/${stMax}`);
  for (const [id, q] of Object.entries(s.inventory)) {
    if (!C.items[id]) fail('objet inconnu dans le sac', `${ctx} : ${id}`);
    if (!Number.isInteger(q) || q <= 0) fail('quantité invalide', `${ctx} : ${id}=${q}`);
    else if (q > (C.items[id]?.maxStack ?? Infinity)) fail('pile dépassée', `${ctx} : ${id}=${q}`);
  }
  for (const [id, q] of Object.entries(s.ground)) if (!C.items[id] || !Number.isInteger(q) || q <= 0) fail('sol invalide', `${ctx} : ${id}=${q}`);
  for (const slot of SLOTS) {
    const it = s.equipment[slot];
    if (it && !s.inventory[it]) fail('équipé sans être porté', `${ctx} : ${slot}=${it}`);
  }
  if (!Number.isFinite(currentWeight(C, s))) fail('poids invalide', ctx);
  if (s.combat) for (const e of s.combat.enemies) if (!Number.isFinite(e.hp) || e.hp < 0) fail('PV ennemi invalide', `${ctx} : ${e.def}=${e.hp}`);
  if (!s.ending && !s.combat && !choiceViews(C, s).some((v) => v.available)) fail('impasse (aucun choix)', `${ctx} : ${s.currentScene}`);
}

function roundTrip(s: GameState, ctx: string) {
  const env = JSON.parse(serialize(C, s, 1));
  const m = migrate(env.schemaVersion, env.state);
  if (!m.ok) return fail('migration refusée', `${ctx} : ${m.error}`);
  const v = validateState(C, m.state);
  if (!v.ok) fail('sauvegarde rejetée', `${ctx} : ${v.errors.join(' ')}`);
  else if (v.repairs.length) fail('sauvegarde réparée (état moteur incohérent)', `${ctx} : ${v.repairs.join(' ')}`);
}

/** Une action au hasard, valide ou non. Renvoie le nouvel état. */
function chaos(s: GameState): GameState {
  const r = rnd();
  if (s.combat) {
    if (s.combat.outcome !== 'ongoing') return resolveCombat(C, s);
    if (r < 0.1) return equip(C, s, pickOne(ITEMS)); // changer d'arme en plein combat
    const enemy = pickOne([...s.combat.enemies.map((e) => e.uid), 'inconnu']);
    return performAction(C, s, { type: pickOne(ACTIONS), target: enemy, item: pickOne(ITEMS), weapon: rnd() < 0.5 ? 'melee' : 'ranged' });
  }
  if (r < 0.55) {
    const views = choiceViews(C, s);
    const v = rnd() < 0.9 && views.length ? pickOne(views).choice.id : 'choix_inexistant';
    const res = choose(C, s, rnd() < 0.97 ? s.currentScene : 'scene_bidon', v);
    return res.ok ? res.state : s;
  }
  const item = pickOne(ITEMS);
  if (r < 0.62) return canEquip(C, s, item).ok || rnd() < 0.3 ? equip(C, s, item) : s;
  if (r < 0.66) return unequip(C, s, pickOne(SLOTS));
  if (r < 0.71) return dropItem(C, s, item, 1 + Math.floor(rnd() * 3));
  if (r < 0.75) return pickUp(C, s, pickOne([...Object.keys(s.ground), item]));
  if (r < 0.77) return abandonGround(s, rnd() < 0.5 ? undefined : item);
  if (r < 0.83) return canUseOutOfCombat(C, s, item).ok || rnd() < 0.3 ? applyConsumable(C, s, item) : s;
  if (r < 0.89) {
    const recipe = pickOne(RECIPES);
    return canCraft(C, s, recipe).ok || rnd() < 0.3 ? craft(C, s, recipe) : s;
  }
  if (r < 0.95) return spendStatPoint(C, s, pickOne(STATS));
  return choosePerk(C, s, pickOne(PERKS));
}

const t0 = Date.now();
let steps = 0;
let endings = 0;
let relays = 0;
let crashes = 0;
for (let g = 0; g < GAMES; g += 1) {
  const draft = { ...pickOne(PRESET_DRAFTS), name: rnd() < 0.1 ? '  ' : 'Singe' };
  let s: GameState;
  try {
    s = newGame(C, draft, { seed: Math.floor(rnd() * 1e9), id: `singe-${g}`, now: 0 });
  } catch {
    // Nom vide : refusé par le moteur comme par l'écran de création (comportement attendu).
    continue;
  }
  for (let i = 0; i < 4000; i += 1) {
    const ctx = `partie ${g}, action ${i}, ${s.currentScene}`;
    if (s.ending) {
      if (s.ending.kind === 'death' && canRelay(C, s) && rnd() < 0.85) {
        const hero = pickOne([...relayCandidates(C, s).map((h) => h.character), 'personne']);
        const picks = Array.from({ length: Math.floor(rnd() * 6) }, () => pickOne([...bodyItems(C, s).map((b) => b.item), ...ITEMS]));
        const next = takeOver(C, s, hero, picks);
        if (next !== s) relays += 1;
        s = next;
        continue;
      }
      endings += 1;
      break;
    }
    try {
      s = chaos(s);
      steps += 1;
    } catch (e) {
      crashes += 1;
      fail('exception', `${ctx} : ${(e as Error).message}\n${(e as Error).stack?.split('\n').slice(1, 4).join('\n')}`);
      break;
    }
    check(s, ctx);
    if (i % 25 === 0) roundTrip(s, ctx);
  }
  if (!s.ending) roundTrip(s, `partie ${g} interrompue`);
}

console.log(`${GAMES} parties, ${steps} actions, ${endings} terminées, ${relays} relèves, ${crashes} exceptions — ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (!failures.size) {
  console.log('Aucune incohérence détectée.');
} else {
  for (const [k, v] of failures) console.log(`✗ ${k} ×${v.count}\n    ex. ${v.example}`);
  process.exitCode = 1;
}
