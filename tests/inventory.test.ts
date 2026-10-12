import { describe, expect, it } from 'vitest';
import { effectiveStat, maxHp } from '../src/engine/character';
import {
  addItem,
  applyConsumable,
  canDrop,
  canUseOutOfCombat,
  capacity,
  currentWeight,
  dropItem,
  equip,
  pickUp,
  removeItem,
  unequip,
  useItemOutOfCombat,
} from '../src/engine/inventory';
import { C, start } from './helpers';

describe('inventaire', () => {
  it('empile les objets sans doublon et respecte la pile maximale', () => {
    let s = start();
    s = addItem(C, s, 'ration', 3).state;
    s = addItem(C, s, 'ration', 100).state;
    expect(s.inventory.ration).toBe(C.items.ration.maxStack);
    const r = addItem(C, s, 'hachette', 1);
    expect(r.added).toBe(0);
    expect(r.refused).toBe(1);
    expect(r.state.inventory.hachette).toBe(1);
  });

  it('pose au sol un objet trop lourd et explique pourquoi', () => {
    let s = start();
    s = addItem(C, s, 'armure_ferraille', 1).state; // 6 kg
    s = addItem(C, s, 'gilet', 1).state; // 4 kg
    s = addItem(C, s, 'masse', 1).state; // 4 kg
    const before = currentWeight(C, s);
    const r = addItem(C, s, 'fusil', 1);
    if (before + 3.5 > capacity(C, s)) {
      expect(r.grounded).toBe(1);
      expect(r.state.ground.fusil).toBe(1);
      expect(r.state.notices.some((n) => n.text.includes('trop lourd'))).toBe(true);
    }
    expect(currentWeight(C, r.state)).toBeLessThanOrEqual(capacity(C, r.state));
  });

  it('permet de faire de la place puis de ramasser l’objet au sol', () => {
    let s = start();
    s = { ...s, ground: { masse: 1 } };
    s = dropItem(C, s, 'ration', 2);
    s = pickUp(C, s, 'masse');
    expect(s.inventory.masse).toBe(1);
    expect(s.ground.masse).toBeUndefined();
    expect(s.ground.ration).toBe(2);
  });

  it('les objets de quête ne peuvent pas être jetés et ne pèsent rien', () => {
    let s = start();
    s = addItem(C, s, 'cloche_berger', 1).state;
    expect(canDrop(C, s, 'cloche_berger').ok).toBe(false);
    const after = dropItem(C, s, 'cloche_berger');
    expect(after.inventory.cloche_berger).toBe(1);
    expect(C.items.cloche_berger.weight).toBe(0);
  });

  it('retirer un objet équipé le déséquipe', () => {
    let s = start();
    expect(s.equipment.melee).toBe('hachette');
    s = removeItem(C, s, 'hachette', 1);
    expect(s.equipment.melee).toBeNull();
  });
});

describe('équipement', () => {
  it('remplace l’objet de l’emplacement et applique les bonus une seule fois', () => {
    let s = start();
    const base = effectiveStat(C, s, 'discretion');
    s = addItem(C, s, 'semelles', 1).state;
    s = addItem(C, s, 'jumelles', 1).state;
    s = equip(C, s, 'semelles');
    expect(effectiveStat(C, s, 'discretion')).toBe(base + 1);
    s = equip(C, s, 'semelles'); // déjà équipé : rien ne change
    expect(effectiveStat(C, s, 'discretion')).toBe(base + 1);
    s = equip(C, s, 'jumelles'); // même emplacement : remplace
    expect(s.equipment.accessory).toBe('jumelles');
    expect(effectiveStat(C, s, 'discretion')).toBe(base);
  });

  it('les malus d’équipement s’appliquent (plastron bruyant)', () => {
    let s = start();
    const base = effectiveStat(C, s, 'discretion');
    s = addItem(C, s, 'armure_ferraille', 1).state;
    s = equip(C, s, 'armure_ferraille');
    expect(effectiveStat(C, s, 'discretion')).toBe(Math.max(0, base - 2));
  });

  it('refuse d’équiper un objet non possédé ou non équipable', () => {
    const s = start();
    expect(equip(C, s, 'gilet')).toBe(s);
    expect(equip(C, s, 'ration')).toBe(s);
  });

  it('refuse de retirer le sac si la charge devient excessive', () => {
    let s = start();
    s = addItem(C, s, 'sac_rando', 1).state;
    s = equip(C, s, 'sac_rando');
    while (addItem(C, s, 'ration', 1, false).added > 0 && currentWeight(C, s) < capacity(C, s) - 0.5) {
      s = addItem(C, s, 'ration', 1, false).state;
    }
    s = addItem(C, s, 'masse', 1, false).state;
    if (currentWeight(C, s) > capacity(C, s) - 6) {
      const after = unequip(C, s, 'accessory');
      expect(after.equipment.accessory).toBe('sac_rando');
    }
  });
});

describe('consommables', () => {
  it('soigne dans les limites et retire réellement l’objet', () => {
    let s = start();
    s = { ...s, player: { ...s.player, hp: 5 } };
    const bandages = s.inventory.bandage;
    s = useItemOutOfCombat(C, s, 'bandage');
    expect(s.inventory.bandage).toBe(bandages - 1);
    expect(s.player.hp).toBeGreaterThan(5);
    expect(s.player.hp).toBeLessThanOrEqual(maxHp(C, s));
  });

  it('refuse un soin inutile pour ne pas gaspiller', () => {
    const s = start();
    expect(canUseOutOfCombat(C, s, 'bandage').ok).toBe(false);
    expect(useItemOutOfCombat(C, s, 'bandage')).toBe(s);
  });

  it('les antibiotiques soignent l’infection', () => {
    let s = start();
    s = addItem(C, s, 'antibiotiques', 1).state;
    s = { ...s, player: { ...s.player, infection: 2 } };
    s = applyConsumable(C, s, 'antibiotiques');
    expect(s.player.infection).toBe(0);
    expect(s.inventory.antibiotiques).toBeUndefined();
  });

  it('le passé d’ambulancier améliore les soins', () => {
    let a = start({ background: 'ambulancier' });
    let b = start({ background: 'pompier' });
    a = { ...a, player: { ...a.player, hp: 2 } };
    b = { ...b, player: { ...b.player, hp: 2 } };
    a = applyConsumable(C, addItem(C, a, 'bandage', 1).state, 'bandage');
    b = applyConsumable(C, addItem(C, b, 'bandage', 1).state, 'bandage');
    expect(a.player.hp).toBeGreaterThan(b.player.hp);
  });
});
