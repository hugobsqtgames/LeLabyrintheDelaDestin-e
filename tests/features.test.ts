import { describe, expect, it } from 'vitest';
import { grantXp } from '../src/engine/character';
import { canPerform, performAction, weaponDamageRange, weaponDurability } from '../src/engine/combat';
import { applyEffects } from '../src/engine/effects';
import { addItem, canCraft, craft } from '../src/engine/inventory';
import { choose, enterScene, visibleText } from '../src/engine/narrative';
import { CLOCK_START, DEPARTED_HOUR, DEPARTURE_HOUR, formatClock } from '../src/engine/rules';
import { validateContent } from '../src/engine/validator';
import { migrate, SAVE_SCHEMA_VERSION, validateState } from '../src/persistence/schema';
import type { GameState } from '../src/engine/types';
import { at, C, pick, start } from './helpers';

describe('horloge des sept jours', () => {
  it('commence le jour 1 à 23 h et avance avec les choix', () => {
    let s = start();
    expect(s.clock).toBe(CLOCK_START);
    expect(formatClock(s.clock)).toBe('Jour 1 · 23 h · nuit');
    s = pick(s, 'regler'); // 30 minutes
    expect(s.clock).toBe(CLOCK_START + 0.5);
  });

  it('« attendre » avance jusqu’à la prochaine heure demandée', () => {
    let s = { ...start(), clock: 30 }; // jour 2, 6 h
    s = applyEffects(C, s, [{ type: 'waitUntil', hourOfDay: 5 }]);
    expect(s.clock).toBe(53); // jour 3, 5 h
    s = applyEffects(C, s, [{ type: 'timeAtLeast', hour: 40 }]);
    expect(s.clock).toBe(53);
  });

  it('le texte affiche le temps restant', () => {
    const s = { ...start(), clock: DEPARTURE_HOUR - 30 };
    const text = visibleText(C, s, C.scenes.c1_fin).map((b) => b.text).join(' ');
    expect(text).toContain('1 jour et 6 heures');
  });

  it('arriver en retard ferme l’audience de Sorel ; très en retard, la barge est partie', () => {
    const late = enterScene(C, { ...start(), clock: DEPARTURE_HOUR + 4 }, 'c4_ecluse');
    expect(late.flags.en_retard).toBe(true);
    const views = late.currentScene === 'c4_ecluse' ? (choose(C, late, 'c4_ecluse', 'sorel').ok ? 'ouvert' : 'fermé') : '';
    expect(views).toBe('fermé');
    const gone = enterScene(C, { ...start(), clock: DEPARTED_HOUR + 1 }, 'c4_ecluse');
    expect(gone.currentScene).toBe('c4_quai_vide');
    const early = enterScene(C, { ...start(), clock: 120 }, 'c4_ecluse');
    expect(early.clock).toBe(DEPARTURE_HOUR);
    expect(early.flags.en_retard).toBeUndefined();
  });
});

describe('atelier', () => {
  it('fabrique un objet en consommant les matériaux et du temps', () => {
    let s = start();
    s = addItem(C, s, 'chiffons', 1, false).state;
    s = addItem(C, s, 'alcool', 1, false).state;
    const bandages = s.inventory.bandage ?? 0;
    expect(canCraft(C, s, 'bandages').ok).toBe(true);
    const after = craft(C, s, 'bandages');
    expect(after.inventory.bandage).toBe(bandages + 2);
    expect(after.inventory.chiffons).toBeUndefined();
    expect(after.clock).toBe(s.clock + 1);
  });

  it('explique ce qui manque et respecte les prérequis', () => {
    const s = start({ profile: 'guerrier' });
    expect(canCraft(C, s, 'bandages').reason).toMatch(/Chiffons/);
    const withMetal = addItem(C, s, 'ferraille', 1, false).state;
    expect(canCraft(C, withMetal, 'carreaux').ok).toBe(false);
    expect(craft(C, withMetal, 'carreaux')).toBe(withMetal);
  });

  it('la réparation n’est proposée que si une arme est usée', () => {
    let s = addItem(C, start(), 'ferraille', 1, false).state;
    expect(canCraft(C, s, 'reparation').ok).toBe(false);
    s = { ...s, durability: { hachette: 10 } };
    s = craft(C, s, 'reparation');
    expect(s.durability.hachette).toBe(30);
  });
});

describe('usure des armes', () => {
  it('chaque attaque use l’arme ; à zéro, les dégâts sont divisés par deux', () => {
    let s = enterScene(C, start(), 'c1_super_combat');
    const before = weaponDurability(C, s, 'hachette')!.current;
    s = performAction(C, s, { type: 'attack', weapon: 'melee', target: 'e1' });
    expect(weaponDurability(C, s, 'hachette')!.current).toBe(before - 1);
    const fresh = weaponDamageRange(C, s, 'melee');
    const broken = weaponDamageRange(C, { ...s, durability: { hachette: 0 } }, 'melee');
    expect(broken[1]).toBeLessThan(fresh[1]);
  });

  it('une arme à feu usée peut s’enrayer', () => {
    let jammed = false;
    for (let seed = 1; seed < 60 && !jammed; seed += 1) {
      let s = addItem(C, start({}, seed), 'pistolet', 1, false).state;
      s = addItem(C, s, 'balle_9mm', 5, false).state;
      s = { ...s, equipment: { ...s.equipment, ranged: 'pistolet' }, durability: { pistolet: 2 } };
      s = enterScene(C, s, 'c1_super_combat');
      s = performAction(C, s, { type: 'attack', weapon: 'ranged', target: 'e1' });
      jammed = s.combat!.log.some((l) => l.text.includes('s’enraye'));
    }
    expect(jammed).toBe(true);
  });
});

describe('seconde compétence', () => {
  it('est verrouillée avant le niveau 4 puis utilisable', () => {
    let s = enterScene(C, start(), 'c1_super_combat');
    expect(canPerform(C, s, { type: 'skill2' }).reason).toMatch(/niveau 4/);
    s = grantXp(C, s, 100 + 140 + 180);
    expect(s.player.level).toBe(4);
    expect(canPerform(C, s, { type: 'skill2' }).ok).toBe(true);
  });

  it('Rempart : aucun dégât subi pendant le tour', () => {
    let s = grantXp(C, enterScene(C, start(), 'c1_super_combat'), 420);
    const hp = s.player.hp;
    s = performAction(C, s, { type: 'skill2' });
    expect(s.player.hp).toBe(hp);
    expect(s.combat!.skill2Cooldown).toBeGreaterThan(0);
  });

  it('Charge improvisée : touche tous les ennemis', () => {
    let s = start({ profile: 'technicien', allocated: { force: 2, discretion: 1, survie: 1, astuce: 2 } });
    s = grantXp(C, enterScene(C, s, 'c1_super_combat'), 420);
    s = performAction(C, s, { type: 'skill2' });
    for (const e of s.combat!.enemies) expect(e.hp).toBeLessThan(e.maxHp);
  });
});

describe('archives et journal intime', () => {
  it('les documents s’ajoutent une seule fois', () => {
    let s = start();
    expect(s.documents).toContain('doc_radio');
    s = applyEffects(C, s, [{ type: 'document', doc: 'doc_radio' }]);
    expect(s.documents.filter((d) => d === 'doc_radio')).toHaveLength(1);
  });

  it('la page du journal reflète les choix du chapitre', () => {
    let s: GameState = { ...at(start(), 'c1_apres'), flags: { theo_soigne: true, odilon_vole: true } };
    s = enterScene(C, s, 'c1_fin');
    const page = s.diary.find((d) => d.chapter === 'c1')!.text;
    expect(page).toMatch(/fièvre est tombée/);
    expect(page).toMatch(/cloches ne sonnaient pas/);
    expect(page).not.toMatch(/Odilon, le carillonneur/);
  });
});

describe('choix chronométrés', () => {
  it('chaque scène chronométrée a un repli toujours disponible', () => {
    const timed = Object.values(C.scenes).filter((s) => s.timed);
    expect(timed.length).toBeGreaterThanOrEqual(4);
    for (const s of timed) {
      const fb = s.choices.find((c) => c.id === s.timed!.fallback)!;
      expect(fb.requires ?? []).toEqual([]);
    }
    const scenes = JSON.parse(JSON.stringify(C.scenes));
    scenes.c1_assaut.timed.fallback = 'fusee';
    expect(validateContent({ ...C, scenes }).some((i) => i.message.includes('repli'))).toBe(true);
  });
});

describe('migration v2 → v3', () => {
  it('ajoute horloge, usure, archives et journal', () => {
    const s = start();
    const v2: Record<string, unknown> = { ...JSON.parse(JSON.stringify(s)), chapter: 'c3' };
    delete v2.clock;
    delete v2.durability;
    delete v2.documents;
    delete v2.diary;
    const m = migrate(2, v2);
    expect(SAVE_SCHEMA_VERSION).toBe(3);
    expect(m.ok).toBe(true);
    const v = validateState(C, m.state);
    expect(v.state!.clock).toBe(100);
    expect(v.state!.documents).toEqual([]);
  });
});
