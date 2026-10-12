import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/engine/validator';
import type { GameContent, Scene } from '../src/engine/types';
import { C } from './helpers';

describe('validateur de contenu', () => {
  it('le contenu livré ne comporte aucune erreur', () => {
    const issues = validateContent(C);
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors, errors.map((e) => `${e.scene}: ${e.message}`).join('\n')).toEqual([]);
  });

  it('le contenu est substantiel : chapitres, scènes, fins', () => {
    const scenes = Object.values(C.scenes);
    expect(C.chapters.length).toBeGreaterThanOrEqual(4);
    expect(scenes.length).toBeGreaterThanOrEqual(120);
    expect(scenes.filter((s) => s.kind === 'combat').length).toBeGreaterThanOrEqual(20);
    expect(scenes.filter((s) => s.kind === 'ending').length).toBeGreaterThanOrEqual(6);
    expect(Object.values(C.enemies).filter((e) => e.boss).length).toBeGreaterThanOrEqual(5);
    for (const s of scenes) for (const b of s.text) expect(b.text.trim().length).toBeGreaterThan(10);
  });

  function broken(patch: (scenes: Record<string, Scene>) => void): GameContent {
    const scenes = JSON.parse(JSON.stringify(C.scenes)) as Record<string, Scene>;
    patch(scenes);
    return { ...C, scenes };
  }

  it('détecte une destination inexistante', () => {
    const c = broken((s) => {
      s.c1_toit.choices[1].next = 'scene_fantome';
    });
    expect(validateContent(c).some((i) => i.message.includes('scene_fantome'))).toBe(true);
  });

  it('détecte une scène inaccessible', () => {
    const c = broken((s) => {
      s.orpheline = { ...s.c1_descente, id: 'orpheline' };
    });
    expect(validateContent(c).some((i) => i.scene === 'orpheline' && i.message.includes('inaccessible'))).toBe(true);
  });

  it('détecte une impasse (aucun choix toujours disponible)', () => {
    const c = broken((s) => {
      s.c1_descente.choices = s.c1_descente.choices.map((ch) => ({ ...ch, requires: [{ type: 'flag', flag: 'radio_note' }] }));
    });
    expect(validateContent(c).some((i) => i.scene === 'c1_descente' && i.message.includes('impasse'))).toBe(true);
  });

  it('détecte des conditions contradictoires ou impossibles', () => {
    const c = broken((s) => {
      s.c1_toit.choices[0].requires = [{ type: 'flag', flag: 'radio_note' }, { type: 'notFlag', flag: 'radio_note' }];
      s.c1_toit.choices[1].requires = [{ type: 'stat', stat: 'force', min: 42 }];
    });
    const msgs = validateContent(c).map((i) => i.message).join('\n');
    expect(msgs).toMatch(/à la fois présent et absent/);
    expect(msgs).toMatch(/force 42 impossible/);
  });

  it('détecte un drapeau testé mais jamais posé', () => {
    const c = broken((s) => {
      s.c1_toit.choices[0].requires = [{ type: 'flag', flag: 'jamais_pose' }];
    });
    expect(validateContent(c).some((i) => i.message.includes('jamais_pose'))).toBe(true);
  });

  it('détecte une fin impossible à atteindre et des références inconnues', () => {
    const c = broken((s) => {
      delete s.c4_fin_gardien;
      s.c1_toit.onEnter = [{ type: 'giveItem', item: 'licorne' }];
    });
    const msgs = validateContent(c).map((i) => i.message).join('\n');
    expect(msgs).toMatch(/fin_gardien/);
    expect(msgs).toMatch(/licorne/);
  });
});
