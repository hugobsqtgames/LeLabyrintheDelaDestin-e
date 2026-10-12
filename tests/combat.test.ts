import { describe, expect, it } from 'vitest';
import { maxHp } from '../src/engine/character';
import {
  canPerform,
  describeIntent,
  dodgeChance,
  fleeChance,
  hitChance,
  livingEnemies,
  performAction,
  startCombat,
  weaponDamageRange,
} from '../src/engine/combat';
import { addItem } from '../src/engine/inventory';
import { enterScene, resolveCombat } from '../src/engine/narrative';
import type { GameState } from '../src/engine/types';
import { C, fightOut, start } from './helpers';

function inCombat(sceneId: string, s: GameState = start()): GameState {
  return enterScene(C, s, sceneId);
}

describe('combat', () => {
  it('une scène de combat démarre un combat avec intentions annoncées', () => {
    const s = inCombat('c1_super_combat');
    expect(s.combat).not.toBeNull();
    expect(s.combat!.enemies).toHaveLength(2);
    for (const e of s.combat!.enemies) expect(describeIntent(C, e)).not.toBeNull();
  });

  it('une action invalide ne change rien (endurance, munitions, fuite interdite)', () => {
    let s = inCombat('c1_super_combat');
    s = { ...s, player: { ...s.player, stamina: 0 } };
    expect(canPerform(C, s, { type: 'skill' }).ok).toBe(false);
    expect(performAction(C, s, { type: 'skill' })).toBe(s);
    expect(canPerform(C, s, { type: 'attack', weapon: 'ranged' }).ok).toBe(false);
    const boss = inCombat('c1_boss');
    expect(canPerform(C, boss, { type: 'flee' }).ok).toBe(false);
  });

  it('attaquer consomme l’endurance et les munitions', () => {
    let s = start({ profile: 'eclaireur', allocated: { force: 1, discretion: 2, survie: 2, astuce: 1 } });
    s = inCombat('c1_super_combat', s);
    const ammo = s.inventory.carreau;
    const stamina = s.player.stamina;
    s = performAction(C, s, { type: 'attack', weapon: 'ranged', target: 'e1' });
    expect(s.inventory.carreau).toBe(ammo - 1);
    expect(s.player.stamina).toBeLessThanOrEqual(stamina);
    expect(s.combat!.turn).toBe(2);
  });

  it('se défendre réduit les dégâts et rend de l’endurance', () => {
    let s = inCombat('c1_super_combat');
    s = { ...s, player: { ...s.player, stamina: 2 } };
    s = performAction(C, s, { type: 'defend' });
    expect(s.player.stamina).toBeGreaterThan(2);
  });

  it('les probabilités restent dans leurs bornes', () => {
    const s = inCombat('c1_super_combat');
    const target = s.combat!.enemies[0];
    const p = hitChance(C, s, target, 'melee');
    expect(p).toBeGreaterThan(0.2);
    expect(p).toBeLessThanOrEqual(0.97);
    expect(dodgeChance(C, s)).toBeLessThanOrEqual(0.85);
    expect(fleeChance(C, s)).toBeGreaterThanOrEqual(0.05);
    const [min, max] = weaponDamageRange(C, s, 'melee');
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThanOrEqual(min);
  });

  it('consommer un objet en combat le retire de l’inventaire et soigne', () => {
    let s = inCombat('c1_super_combat');
    s = { ...s, player: { ...s.player, hp: 5 } };
    const n = s.inventory.bandage;
    s = performAction(C, s, { type: 'item', item: 'bandage' });
    expect(s.inventory.bandage).toBe(n - 1);
    expect(s.combat!.log.some((l) => l.text.includes('Bandage'))).toBe(true);
  });

  it('le cocktail Molotov inflige des brûlures', () => {
    let s = inCombat('c1_veto_combat_alerte');
    s = addItem(C, s, 'molotov', 1).state;
    s = performAction(C, s, { type: 'item', item: 'molotov', target: 'e1' });
    const e = s.combat!.enemies[0];
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(e.statuses.some((st) => st.kind === 'brulure') || e.hp < e.maxHp - 4).toBe(true);
  });

  it('la fusée distrait tous les ennemis : ils perdent leur action', () => {
    let s = inCombat('c1_super_combat');
    s = addItem(C, s, 'fusee', 1).state;
    const hp = s.player.hp;
    s = performAction(C, s, { type: 'item', item: 'fusee' });
    expect(s.player.hp).toBe(hp);
    expect(s.combat!.log.some((l) => l.text.includes('vous oublie'))).toBe(true);
  });

  it('le boss change de phase sous un seuil de santé', () => {
    let s = inCombat('c1_boss');
    const uid = s.combat!.enemies[0].uid;
    s = { ...s, combat: { ...s.combat!, enemies: s.combat!.enemies.map((e) => ({ ...e, hp: Math.ceil(e.maxHp * 0.47) })) } };
    let guard = 0;
    while (s.combat!.enemies.find((e) => e.uid === uid)!.phase === 0 && s.combat!.outcome === 'ongoing' && guard++ < 30) {
      s = performAction(C, s, { type: 'attack', weapon: 'melee', target: uid });
      s = { ...s, player: { ...s.player, hp: maxHp(C, s), stamina: 20 } };
    }
    const boss = s.combat!.enemies.find((e) => e.uid === uid)!;
    expect(boss.phase === 1 || boss.hp === 0).toBe(true);
  });

  it('le hurleur invoque des renforts, dans une limite', () => {
    let s = inCombat('c1_boss');
    for (let i = 0; i < 20 && s.combat!.outcome === 'ongoing'; i += 1) {
      s = performAction(C, s, { type: 'defend' });
      s = { ...s, player: { ...s.player, hp: maxHp(C, s) } };
    }
    expect(s.combat!.summons).toBeLessThanOrEqual(2);
  });

  it('la victoire accorde l’expérience et mène à la scène prévue', () => {
    let s = inCombat('c1_super_combat');
    s = { ...s, combat: { ...s.combat!, enemies: s.combat!.enemies.map((e) => ({ ...e, hp: 1 })) } };
    let guard = 0;
    while (s.combat!.outcome === 'ongoing' && guard++ < 50) {
      s = performAction(C, s, { type: 'attack', weapon: 'melee', target: livingEnemies(s.combat!)[0]?.uid });
      s = { ...s, player: { ...s.player, hp: maxHp(C, s) } };
    }
    expect(s.combat!.outcome).toBe('victory');
    const xp = s.player.xp;
    s = resolveCombat(C, s);
    expect(s.combat).toBeNull();
    expect(s.currentScene).toBe('c1_super_butin');
    expect(s.player.xp + s.player.level * 1000).toBeGreaterThan(xp);
  });

  it('une défaite non mortelle laisse le joueur en vie dans la scène de défaite', () => {
    let s = inCombat('c1_super_combat');
    s = { ...s, player: { ...s.player, hp: 1 } };
    let guard = 0;
    while (s.combat!.outcome === 'ongoing' && guard++ < 50) {
      const next = performAction(C, s, { type: 'attack' });
      s = next === s ? performAction(C, s, { type: 'defend' }) : next;
    }
    if (s.combat!.outcome === 'defeat') {
      s = resolveCombat(C, s);
      expect(s.currentScene).toBe('c1_super_defaite');
      expect(s.player.hp).toBeGreaterThan(0);
      expect(s.ending).toBeNull();
    }
  });

  it('une défaite contre le Berger est fatale', () => {
    let s = inCombat('c2_berger');
    s = { ...s, combat: { ...s.combat!, outcome: 'defeat' }, player: { ...s.player, hp: 0 } };
    s = resolveCombat(C, s);
    expect(s.ending).toEqual({ id: 'mort_berger', kind: 'death' });
  });

  it('la fuite réussie mène à la scène de fuite', () => {
    let fled = false;
    for (let seed = 1; seed < 40 && !fled; seed += 1) {
      let s = inCombat('c1_super_combat', start({ profile: 'eclaireur', allocated: { force: 1, discretion: 2, survie: 2, astuce: 1 } }, seed));
      s = performAction(C, s, { type: 'flee' });
      if (s.combat!.outcome === 'fled') {
        fled = true;
        s = resolveCombat(C, s);
        expect(s.currentScene).toBe('c1_rue');
      }
    }
    expect(fled).toBe(true);
  });

  it('un combat complet se termine toujours', () => {
    for (const scene of ['c1_hopital_combat', 'c2_berger_seul', 'c3_boss', 'c4_colosse_force']) {
      let s = inCombat(scene);
      s = { ...s, player: { ...s.player, level: 5 } };
      s = fightOut(s);
      expect(s.combat).toBeNull();
    }
  });
});
