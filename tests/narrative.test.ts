import { describe, expect, it } from 'vitest';
import { maxHp } from '../src/engine/character';
import { evaluate, explain } from '../src/engine/conditions';
import { applyEffects } from '../src/engine/effects';
import { choiceViews, choose, enterScene, visibleText } from '../src/engine/narrative';
import { checkProbability } from '../src/engine/rules';
import type { GameContent } from '../src/engine/types';
import { at, C, pick, start } from './helpers';

describe('conditions', () => {
  it('évalue caractéristiques, objets, drapeaux et combinaisons', () => {
    const s = start();
    expect(evaluate(C, s, { type: 'stat', stat: 'force', min: 5 })).toBe(true);
    expect(evaluate(C, s, { type: 'stat', stat: 'force', min: 6 })).toBe(false);
    expect(evaluate(C, s, { type: 'item', item: 'hachette' })).toBe(true);
    expect(evaluate(C, s, { type: 'flag', flag: 'x' })).toBe(false);
    expect(evaluate(C, s, { type: 'notFlag', flag: 'x' })).toBe(true);
    expect(
      evaluate(C, s, { type: 'any', conditions: [{ type: 'flag', flag: 'x' }, { type: 'profile', profiles: ['guerrier'] }] }),
    ).toBe(true);
    expect(evaluate(C, s, { type: 'not', condition: { type: 'profile', profiles: ['guerrier'] } })).toBe(false);
  });

  it('explique les conditions connues et masque celles que le personnage ignore', () => {
    const s = start();
    expect(explain(C, s, { type: 'stat', stat: 'discretion', min: 4 })).toMatch(/Discrétion 4 requise \(vous : 2\)/);
    expect(explain(C, s, { type: 'item', item: 'pied_de_biche' })).toMatch(/Pied-de-biche/);
    expect(explain(C, s, { type: 'flag', flag: 'secret' })).toBeNull();
  });

  it('l’équipement compte dans les caractéristiques effectives', () => {
    let s = start();
    s = { ...s, inventory: { ...s.inventory, semelles: 1 }, equipment: { ...s.equipment, accessory: 'semelles' } };
    expect(evaluate(C, s, { type: 'stat', stat: 'discretion', min: 3 })).toBe(true);
  });
});

describe('effets', () => {
  it('applique objets, relations, quêtes et changements du monde', () => {
    let s = start();
    s = applyEffects(C, s, [
      { type: 'giveItem', item: 'ration', qty: 2 },
      { type: 'relation', character: 'maelle', amount: 3 },
      { type: 'quest', quest: 'q_fievre', status: 'active', step: 'trouver' },
      { type: 'world', location: 'pharmacie', change: 'barricade' },
      { type: 'setFlag', flag: 'test' },
    ]);
    expect(s.inventory.ration).toBe(4);
    expect(s.relations.maelle).toBe(3);
    expect(s.quests.q_fievre.status).toBe('active');
    expect(s.world.pharmacie).toEqual(['barricade']);
    expect(s.flags.test).toBe(true);
  });

  it('borne les relations et ne modifie plus une quête terminée', () => {
    let s = start();
    s = applyEffects(C, s, [{ type: 'relation', character: 'kaz', amount: 50 }]);
    expect(s.relations.kaz).toBe(10);
    s = applyEffects(C, s, [{ type: 'quest', quest: 'q_fievre', status: 'completed' }]);
    s = applyEffects(C, s, [{ type: 'quest', quest: 'q_fievre', status: 'failed' }]);
    expect(s.quests.q_fievre.status).toBe('completed');
  });

  it('les soins respectent la santé maximale', () => {
    let s = start();
    const max = s.player.hp;
    s = applyEffects(C, s, [{ type: 'damage', amount: 5, cause: 'test' }, { type: 'heal', amount: 100 }]);
    expect(s.player.hp).toBe(max);
  });

  it('les dégâts narratifs ne tuent pas, sauf s’ils sont déclarés mortels', () => {
    let s = start();
    s = applyEffects(C, s, [{ type: 'damage', amount: 999, cause: 'chute' }]);
    expect(s.player.hp).toBe(1);
    expect(s.ending).toBeNull();
    s = applyEffects(C, s, [{ type: 'damage', amount: 999, cause: 'chute', lethal: true }]);
    expect(s.player.hp).toBe(0);
    expect(s.ending?.kind).toBe('death');
  });

  it('les morts ne reviennent pas', () => {
    let s = start();
    s = applyEffects(C, s, [{ type: 'companion', character: 'maelle', status: 'dead' }, { type: 'companion', character: 'maelle', status: 'companion' }]);
    expect(s.companions.maelle).toBe('dead');
  });

  it('repas du groupe : consomme une ration par bouche et pénalise le manque', () => {
    let s = start();
    s = { ...s, inventory: { ...s.inventory, ration: 1 }, companions: { maelle: 'companion', theo: 'companion' }, relations: {} };
    s = applyEffects(C, s, [{ type: 'meal' }]);
    expect(s.inventory.ration).toBeUndefined();
    // 3 bouches, 1 ration : le joueur se prive, puis un compagnon.
    expect((s.relations.maelle ?? 0) + (s.relations.theo ?? 0)).toBe(-1);
    expect(s.player.hp).toBeLessThan(maxHp(C, s));
  });

  it('effet conditionnel', () => {
    let s = start();
    s = applyEffects(C, s, [{ type: 'if', cond: { type: 'profile', profiles: ['guerrier'] }, then: [{ type: 'setFlag', flag: 'a' }], else: [{ type: 'setFlag', flag: 'b' }] }]);
    expect(s.flags.a).toBe(true);
    expect(s.flags.b).toBeUndefined();
  });

  it('une infection non soignée s’aggrave à chaque chapitre et réduit la santé maximale', () => {
    let s = start();
    s = applyEffects(C, s, [{ type: 'infection', amount: 1 }]);
    const hp1 = s.player.hp;
    s = applyEffects(C, s, [{ type: 'chapter', chapter: 'c2' }]);
    expect(s.player.infection).toBe(2);
    expect(s.player.hp).toBeLessThanOrEqual(hp1);
    s = applyEffects(C, s, [{ type: 'cureInfection' }]);
    expect(s.player.infection).toBe(0);
  });
});

describe('scènes et choix', () => {
  it('commence la partie dans la scène de départ avec sa quête', () => {
    const s = start();
    expect(s.currentScene).toBe('c1_toit');
    expect(s.quests.q_destinee.status).toBe('active');
    expect(s.discovered).toContain('pharmacie');
  });

  it('applique un choix et effectue la transition', () => {
    let s = start();
    s = pick(s, 'noter');
    expect(s.currentScene).toBe('c1_descente');
    expect(s.flags.radio_note).toBe(true);
    expect(s.chronicle.some((c) => c.text.includes('Noter'))).toBe(true);
  });

  it('ignore un choix périmé (double appui) et un choix inexistant', () => {
    const s = start();
    const r1 = choose(C, s, 'c1_toit', 'noter');
    expect(r1.ok).toBe(true);
    // Second appui sur le même bouton, alors que la scène a changé.
    const r2 = choose(C, r1.state, 'c1_toit', 'noter');
    expect(r2.ok).toBe(false);
    expect(r2.state).toBe(r1.state);
    expect(choose(C, s, 'c1_toit', 'nexistepas').ok).toBe(false);
  });

  it('refuse un choix verrouillé et l’affiche avec sa raison', () => {
    let s = start({ profile: 'eclaireur', allocated: { force: 1, discretion: 1, survie: 2, astuce: 2 } });
    s = at(s, 'c1_kaz_porte');
    const views = choiceViews(C, s);
    const expertise = views.find((v) => v.choice.id === 'expertise')!;
    expect(expertise.available).toBe(false);
    expect(expertise.lockedReasons[0]).toMatch(/Ancien ambulancier/);
    expect(choose(C, s, 'c1_kaz_porte', 'expertise').ok).toBe(false);
  });

  it('masque les choix secrets tant que leur condition manque', () => {
    let s = start();
    s = at(s, 'c1_hopital');
    expect(choiceViews(C, s).some((v) => v.choice.id === 'morgue')).toBe(false);
    s = { ...s, companions: { kaz: 'companion' } };
    expect(choiceViews(C, s).some((v) => v.choice.id === 'morgue')).toBe(true);
  });

  it('une récompense unique ne peut pas être obtenue deux fois', () => {
    let s = at(start(), 'c1_preparatifs');
    const before = s.inventory.bandage ?? 0;
    s = pick(s, 'reserve');
    expect(s.inventory.bandage).toBe(before + 1);
    expect(choiceViews(C, s).some((v) => v.choice.id === 'reserve')).toBe(false);
    expect(choose(C, s, 'c1_preparatifs', 'reserve').ok).toBe(false);
  });

  it('les effets d’entrée d’une scène ne s’appliquent qu’une fois, même en revenant', () => {
    let s = start();
    s = enterScene(C, s, 'c1_super_butin');
    const rations = s.inventory.ration;
    s = enterScene(C, s, 'c1_super');
    s = enterScene(C, s, 'c1_super_butin');
    expect(s.inventory.ration).toBe(rations);
  });

  it('les jets de compétence sont déterministes et enregistrés', () => {
    const s = start();
    const a = choose(C, s, 'c1_toit', 'regler').state;
    const b = choose(C, s, 'c1_toit', 'regler').state;
    expect(a.currentScene).toBe(b.currentScene);
    expect(a.lastCheck).toEqual(b.lastCheck);
    expect(a.lastCheck!.total).toBe(a.lastCheck!.roll[0] + a.lastCheck!.roll[1] + s.player.stats.astuce);
    expect(['c1_radio_clair', 'c1_radio_brouille']).toContain(a.currentScene);
  });

  it('calcule la probabilité exacte d’un jet', () => {
    expect(checkProbability(0, 2)).toBe(1);
    expect(checkProbability(0, 13)).toBe(0);
    expect(checkProbability(0, 7)).toBeCloseTo(21 / 36);
    const views = choiceViews(C, start());
    expect(views.find((v) => v.choice.id === 'regler')!.successChance).toBeCloseTo(checkProbability(3, 8));
  });

  it('les paragraphes conditionnels suivent l’état', () => {
    let s = at(start(), 'c1_descente');
    const without = visibleText(C, s, C.scenes.c1_descente).length;
    s = { ...s, flags: { radio_note: true } };
    expect(visibleText(C, s, C.scenes.c1_descente).length).toBe(without + 1);
  });

  it('remplace le nom du joueur dans le texte', () => {
    const s = start({ name: 'Ysé' });
    const text = visibleText(C, s, C.scenes.c4_fin_accord).map((b) => b.text).join(' ');
    expect(text).toContain('Ysé');
    expect(text).not.toContain('{nom}');
  });

  it('le routage conditionnel redirige vers la trahison de Kaz', () => {
    let s = start();
    s = { ...s, companions: { kaz: 'companion', theo: 'companion' }, relations: { kaz: 1 } };
    s = enterScene(C, s, 'c3_nuit');
    expect(s.currentScene).toBe('c3_trahison');
    expect(s.companions.theo).toBe('captured');
    let t = start();
    t = { ...t, companions: { kaz: 'companion', theo: 'companion' }, relations: { kaz: 5 } };
    t = enterScene(C, t, 'c3_nuit');
    expect(t.currentScene).toBe('c3_nuit');
  });

  it('une scène de fin termine la partie', () => {
    const s = enterScene(C, start(), 'c4_fin_racines');
    expect(s.ending).toEqual({ id: 'fin_racines', kind: 'ending' });
    expect(choose(C, s, s.currentScene, 'x').ok).toBe(false);
  });

  it('entrer dans un nouveau chapitre abandonne les objets laissés au sol', () => {
    let s = start();
    s = { ...s, ground: { masse: 1 } };
    s = enterScene(C, s, 'c1_descente');
    expect(s.ground).toEqual({});
  });

  it('une destination inexistante ne casse pas la partie', () => {
    const broken: GameContent = {
      ...C,
      scenes: { ...C.scenes, c1_toit: { ...C.scenes.c1_toit, choices: [{ id: 'x', text: 'x', kind: 'move', next: 'nulle_part' }] } },
    };
    const s = start();
    const r = choose(broken, s, 'c1_toit', 'x');
    expect(r.state.currentScene).toBe('c1_toit');
    expect(r.state.notices.some((n) => n.text.includes('introuvable'))).toBe(true);
  });
});
