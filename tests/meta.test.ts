import { describe, expect, it } from 'vitest';
import { absorbGame, chapterProgress, choiceExplored, emptyMeta, memoriesUnlocked, readMeta } from '../src/engine/meta';
import { simulate } from '../src/engine/simulate';
import { C, pick, start } from './helpers';

describe('mémoires hors partie', () => {
  it('retient scènes, embranchements, chapitres et personnages rencontrés', () => {
    let s = start();
    let meta = absorbGame(emptyMeta(), C, s, null, C.achievements, 1).meta;
    const before = s.currentScene;
    s = pick(s, 'regler');
    meta = absorbGame(meta, C, s, before, C.achievements, 2).meta;
    expect(meta.scenes).toContain(before);
    expect(meta.chapters).toEqual(['c1']);
    if (s.currentScene !== before) expect(meta.edges).toContain(`${before}→${s.currentScene}`);
    expect(chapterProgress(C, meta, 'c1').seen).toBeGreaterThan(0);
    expect(memoriesUnlocked(meta)).toBe(false);
  });

  it('une vraie fin compte une partie et débloque des succès, une seule fois', () => {
    let found = false;
    for (let seed = 1; seed < 80 && !found; seed += 1) {
      const r = simulate(C, 'relationnel', seed * 17);
      if (r.state.ending?.kind !== 'ending') continue;
      found = true;
      const a = absorbGame(emptyMeta(), C, r.state, null, C.achievements, 10);
      expect(a.meta.runs).toBe(1);
      expect(a.meta.endings).toContain(r.state.ending.id);
      expect(a.unlocked.map((x) => x.id)).toContain('premiere_fin');
      const b = absorbGame(a.meta, C, r.state, null, C.achievements, 11);
      expect(b.meta.runs).toBe(1);
      expect(b.unlocked).toEqual([]);
      expect(memoriesUnlocked(b.meta)).toBe(true);
    }
    expect(found).toBe(true);
  });

  it('une mort avec relève possible n’est pas une fin de partie', () => {
    const s = { ...start(), companions: { kaz: 'companion' as const }, ending: { id: 'mort', kind: 'death' as const } };
    const m = absorbGame(emptyMeta(), C, s, null, C.achievements, 1).meta;
    expect(m.runs).toBe(0);
    expect(m.endings).toEqual([]);
  });

  it('relit des données abîmées sans planter', () => {
    expect(readMeta('n’importe quoi')).toEqual(emptyMeta());
    const m = readMeta({ endings: ['fin_accord', 3], runs: -2, achievements: { a: 1, b: 'x' } });
    expect(m.endings).toEqual(['fin_accord']);
    expect(m.runs).toBe(0);
    expect(m.achievements).toEqual({ a: 1 });
    expect(choiceExplored(m, 'x', [])).toBe(false);
  });

  it('chaque succès a un identifiant unique et un texte', () => {
    const ids = C.achievements.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of C.achievements) expect(a.title.length * a.description.length).toBeGreaterThan(0);
  });
});
