/**
 * Banc d'essai des combats : taux de victoire d'un joueur « compétent »
 * contre chaque rencontre, selon le profil et le niveau.
 *   npx tsx scripts/bossbench.ts
 */
import { CONTENT } from '../src/content';
import { performAction, startCombat } from '../src/engine/combat';
import { maxHp, maxStamina, spendStatPoint } from '../src/engine/character';
import { addItem, equip } from '../src/engine/inventory';
import { newGame } from '../src/engine/narrative';
import { botCombatAction, PRESET_DRAFTS } from '../src/engine/simulate';
import type { GameState, StatId } from '../src/engine/types';

const fights: { scene: string; level: number; gear: string[]; companions?: string[] }[] = [
  { scene: 'c1_super_combat', level: 1, gear: [] },
  { scene: 'c1_hopital_combat', level: 1, gear: [] },
  { scene: 'c1_veto_combat_alerte', level: 1, gear: [] },
  { scene: 'c1_boss', level: 2, gear: ['bandage', 'bandage'] },
  { scene: 'c1_boss_surprise', level: 2, gear: ['bandage', 'bandage'] },
  { scene: 'c2_berger', level: 3, gear: ['bandage', 'bandage', 'trousse'], companions: ['ines'] },
  { scene: 'c2_berger_isole', level: 3, gear: ['bandage', 'bandage', 'trousse'], companions: ['ines'] },
  { scene: 'c2_berger_seul', level: 3, gear: ['bandage', 'bandage', 'trousse', 'machette'], companions: ['ines'] },
  { scene: 'c3_patrouille', level: 3, gear: [] },
  { scene: 'c3_boss', level: 4, gear: ['bandage', 'bandage', 'trousse', 'fusil', 'cartouche', 'cartouche', 'cartouche', 'cartouche'] },
  { scene: 'c3_boss_embuscade', level: 4, gear: ['bandage', 'bandage', 'trousse'] },
  { scene: 'c4_horde', level: 4, gear: ['bandage'] },
  { scene: 'c4_rousset', level: 5, gear: ['bandage', 'bandage', 'trousse', 'armure_ferraille'] },
  { scene: 'c4_rousset_foule', level: 5, gear: ['bandage', 'bandage', 'trousse'] },
  { scene: 'c4_colosse_force', level: 5, gear: ['bandage', 'bandage', 'trousse', 'molotov'] },
];

function prepare(profileIdx: number, level: number, gear: string[], companions: string[] = []): GameState {
  const draft = PRESET_DRAFTS[profileIdx];
  let s = newGame(CONTENT, draft, { seed: 7, id: 'bench', now: 0 });
  const order: StatId[] = draft.profile === 'guerrier' ? ['force', 'survie'] : draft.profile === 'eclaireur' ? ['discretion', 'survie'] : ['astuce', 'survie'];
  s = { ...s, player: { ...s.player, level, unspentStatPoints: level - 1 } };
  for (let i = 0; i < level - 1; i += 1) s = spendStatPoint(CONTENT, s, order[i % 2]);
  for (const g of gear) {
    s = addItem(CONTENT, s, g, 1, false).state;
    if (CONTENT.items[g].slot) s = equip(CONTENT, s, g);
  }
  for (const c of companions) s = { ...s, companions: { ...s.companions, [c]: 'companion' } };
  return { ...s, player: { ...s.player, hp: maxHp(CONTENT, s), stamina: maxStamina(CONTENT, s) } };
}

const N = 300;
for (const f of fights) {
  const row: string[] = [];
  for (let prof = 0; prof < 3; prof += 1) {
    let wins = 0;
    let turns = 0;
    let hpLeft = 0;
    for (let i = 0; i < N; i += 1) {
      const extra = PRESET_DRAFTS[prof].profile === 'technicien' ? Array(f.level * 4).fill('clou') : PRESET_DRAFTS[prof].profile === 'eclaireur' ? Array(f.level * 3).fill('carreau') : [];
      let s = prepare(prof, f.level, [...f.gear, ...extra], f.companions);
      s = { ...s, rng: (i * 2654435761) >>> 0 };
      s = startCombat(CONTENT, s, f.scene, CONTENT.scenes[f.scene].encounter!);
      const rng = { seed: i + 1 };
      let guard = 0;
      while (s.combat!.outcome === 'ongoing' && guard++ < 200) {
        const next = performAction(CONTENT, s, botCombatAction(CONTENT, s, rng, 'prudent'));
        s = next === s ? performAction(CONTENT, s, { type: 'defend' }) : next;
      }
      if (s.combat!.outcome === 'victory') {
        wins += 1;
        hpLeft += s.player.hp / maxHp(CONTENT, s);
      }
      turns += s.combat!.turn;
    }
    const name = PRESET_DRAFTS[prof].profile!.slice(0, 5);
    row.push(`${name} ${Math.round((wins / N) * 100)}% (${Math.round(turns / N)}t, ${wins ? Math.round((hpLeft / wins) * 100) : 0}%pv)`);
  }
  console.log(f.scene.padEnd(22), `niv${f.level}`, row.join('  |  '));
}
