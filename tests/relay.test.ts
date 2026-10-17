import { describe, expect, it } from 'vitest';
import { addItem } from '../src/engine/inventory';
import { bodyItems, canRelay, relayCandidates, takeOver } from '../src/engine/relay';
import type { GameState } from '../src/engine/types';
import { choiceViews } from '../src/engine/narrative';
import { simulate } from '../src/engine/simulate';
import { C, follow, start } from './helpers';

function dying(extra: Partial<GameState> = {}): GameState {
  let s = start();
  s = addItem(C, s, 'ration', 2, false).state;
  s = addItem(C, s, 'cle_aiguillage', 1, false).state;
  return {
    ...s,
    chapter: 'r5',
    companions: { kaz: 'companion', maelle: 'dead', ines: 'met' },
    previousScene: 'c1_toit',
    ending: { id: 'mort', kind: 'death', cause: 'test' },
    ...extra,
  };
}

describe('relève', () => {
  it('ne propose que les compagnons présents et jouables', () => {
    const s = dying();
    expect(relayCandidates(C, s).map((h) => h.character)).toEqual(['kaz']);
    expect(canRelay(C, { ...s, companions: {} })).toBe(false);
    expect(canRelay(C, { ...s, ending: null })).toBe(false);
  });

  it('le compagnon garde sa fiche et ne récupère que les objets de quête et la fouille', () => {
    const s = dying();
    const n = takeOver(C, s, 'kaz', ['ration', 'couteau_inexistant']);
    expect(n.ending).toBeNull();
    expect(n.hero).toBe('kaz');
    expect(n.companions.kaz).toBe('hero');
    expect(n.player.profile).toBe('eclusier');
    expect(n.player.name).toBe('Kaz');
    expect(n.player.perks).toEqual(C.heroes.kaz.perks);
    expect(n.equipment.melee).toBe('cle_molette');
    expect(n.inventory.cle_aiguillage).toBe(1);
    // Rations : celles de Kaz + la pile prise sur le corps.
    expect(n.inventory.ration).toBe((C.heroes.kaz.items.ration ?? 0) + s.inventory.ration);
    // Rien d'autre du héros d'origine.
    for (const id of Object.keys(s.inventory)) {
      if (id !== 'ration' && id !== 'cle_aiguillage' && !(id in C.heroes.kaz.items)) expect(n.inventory[id]).toBeUndefined();
    }
    expect(n.fallen).toHaveLength(1);
    expect(n.fallen[0].name).toBe(s.player.name);
    expect(n.player.hp).toBeGreaterThan(0);
  });

  it('limite la fouille à trois piles et rien si le corps est perdu', () => {
    const s = dying();
    const all = bodyItems(C, s).map((b) => b.item);
    const n = takeOver(C, s, 'kaz', all);
    const extra = all.filter((id) => (n.inventory[id] ?? 0) > (C.heroes.kaz.items[id] ?? 0));
    expect(extra.length).toBeLessThanOrEqual(3);
    const lost = dying({ ending: { id: 'mort_cage', kind: 'death' } });
    expect(bodyItems(C, lost)).toEqual([]);
    expect(takeOver(C, lost, 'kaz', ['ration']).inventory.cle_aiguillage).toBe(1);
  });

  it('un second héros tombé laisse la place au suivant', () => {
    const first = takeOver(C, dying({ companions: { kaz: 'companion', ines: 'companion' } }), 'kaz');
    const again = { ...first, ending: { id: 'mort', kind: 'death' as const } };
    expect(relayCandidates(C, again).map((h) => h.character)).toEqual(['ines']);
    const n = takeOver(C, again, 'ines');
    expect(n.companions.kaz).toBe('dead');
    expect(n.fallen.map((f) => f.character)).toEqual([null, 'kaz']);
  });
});

describe('relève en situation réelle', () => {
  it('après une vraie mort, le compagnon reprend et la partie peut aller jusqu’au bout', () => {
    let checked = 0;
    for (let seed = 1; seed <= 400 && checked < 5; seed += 1) {
      const r = simulate(C, (['prudent', 'agressif', 'discret', 'relationnel'] as const)[seed % 4], seed * 31);
      if (r.state.ending?.kind !== 'death' || !canRelay(C, r.state)) continue;
      const hero = relayCandidates(C, r.state)[0].character;
      const picks = bodyItems(C, r.state).slice(0, 3).map((b) => b.item);
      const s = takeOver(C, r.state, hero, picks);
      expect(s.ending).toBeNull();
      expect(s.player.hp).toBeGreaterThan(0);
      expect(choiceViews(C, s).some((v) => v.available) || !!s.combat).toBe(true);
      const end = follow(s, {});
      expect(end.ending, `relève ${hero} @ ${r.state.currentScene}`).not.toBeNull();
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('relève : les plus jeunes en dernier recours', () => {
  it('Théo et Nour ne sont proposés que s’il ne reste personne d’autre', () => {
    const both = dying({ companions: { kaz: 'companion', theo: 'companion', nour: 'companion' } });
    expect(relayCandidates(C, both).map((h) => h.character)).toEqual(['kaz']);
    const young = dying({ companions: { theo: 'companion', nour: 'companion', kaz: 'dead' } });
    expect(relayCandidates(C, young).map((h) => h.character).sort()).toEqual(['nour', 'theo']);
    const n = takeOver(C, young, 'theo');
    expect(n.player.name).toBe('Théo');
    expect(n.player.profile).toBe('cartographe');
    expect(n.flags.releve).toBe(true);
    expect(n.flags.releve_theo).toBe(true);
  });
});
