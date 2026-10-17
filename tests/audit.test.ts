/**
 * Non-régression des défauts relevés par l'audit (persistance, relève, paramètres).
 */
import { describe, expect, it } from 'vitest';
import { absorbGame, emptyMeta } from '../src/engine/meta';
import { takeOver } from '../src/engine/relay';
import { META_KEY, relayKey, SaveManager, slotKey } from '../src/persistence/saves';
import { validateState } from '../src/persistence/schema';
import { MemoryStorage } from '../src/persistence/storage';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from '../src/store/settings';
import { C, start } from './helpers';

function manager(storage = new MemoryStorage()) {
  let t = 1000;
  return { storage, saves: new SaveManager(storage, C, () => (t += 1)) };
}

describe('file d’écriture', () => {
  it('une sauvegarde demandée après un effacement est bien écrite (pas avalée par une tâche plus ancienne)', async () => {
    const { saves } = manager();
    const a = { ...start(), id: 'A' };
    const b = { ...start({ name: 'Nouveau' }), id: 'B' };
    // Sans attendre : save(A) en file, effacement, puis save(B).
    saves.save(1, a);
    saves.remove(1);
    saves.save(1, b);
    await saves.flush();
    const res = await saves.load(1);
    expect(res.ok).toBe(true);
    expect(res.state!.player.name).toBe('Nouveau');
  });

  it('effacer un emplacement supprime aussi l’état « avant la relève »', async () => {
    const { saves, storage } = manager();
    const s = start();
    await saves.save(2, s);
    await saves.saveRelaySnapshot(2, s);
    expect((await saves.listSlots())[1].relaySnapshot).toBe(true);
    await saves.remove(2);
    expect(await storage.getItem(relayKey(2))).toBeNull();
    expect(await storage.getItem(slotKey(2))).toBeNull();
  });
});

describe('mémoires : lecture distinguant absent, illisible et abîmé', () => {
  it('absent, abîmé (copie gardée) et illisible', async () => {
    const storage = new MemoryStorage();
    const { saves } = manager(storage);
    expect((await saves.loadJson(META_KEY)).status).toBe('absent');
    await storage.setItem(META_KEY, '{pas du json');
    expect((await saves.loadJson(META_KEY)).status).toBe('corrupt');
    expect(await storage.getItem(`${META_KEY}:corrompu`)).toBe('{pas du json');
    const broken = { getItem: async () => { throw new Error('E/S'); }, setItem: async () => undefined, removeItem: async () => undefined };
    const s2 = new SaveManager(broken, C);
    expect((await s2.loadJson(META_KEY)).status).toBe('unreadable');
  });

  it('une partie terminée n’est comptée qu’une fois, même après de nombreuses autres', () => {
    const ended = { ...start(), id: 'vieille', ending: { id: 'fin_errance', kind: 'ending' as const } };
    let meta = absorbGame(emptyMeta(), C, ended, null, [], 1).meta;
    for (let i = 0; i < 60; i += 1) meta = absorbGame(meta, C, { ...ended, id: `p${i}` }, null, [], 1).meta;
    const before = meta.runs;
    meta = absorbGame(meta, C, ended, null, [], 1).meta;
    expect(meta.runs).toBe(before);
  });
});

describe('paramètres relus du stockage', () => {
  it('des valeurs abîmées sont remises dans leurs bornes', () => {
    const bad = { ...DEFAULT_SETTINGS, hintsSeen: null, textScale: 40, volume: 7, language: 'de', lastSlot: -3 } as unknown as Settings;
    const s = sanitizeSettings(bad);
    expect(s.hintsSeen).toEqual([]);
    expect(s.textScale).toBe(1);
    expect(s.volume).toBe(1);
    expect(s.language).toBe('auto');
    expect(s.lastSlot).toBe(0);
    expect(sanitizeSettings({ ...DEFAULT_SETTINGS, hintsSeen: ['combat', 3 as unknown as string] }).hintsSeen).toEqual(['combat']);
  });
});

describe('validation d’une sauvegarde', () => {
  it('scène précédente disparue : effacée ; chapitre recalé sur la scène', () => {
    const raw = JSON.parse(JSON.stringify({ ...start(), currentScene: 'r1_berge', chapter: 'chapitre_inconnu', previousScene: 'scene_supprimee' }));
    const v = validateState(C, raw);
    expect(v.ok).toBe(true);
    expect(v.state!.previousScene).toBeNull();
    expect(v.state!.chapter).toBe('r1');
  });

  it('un statut de compagnon illisible est signalé', () => {
    const raw = JSON.parse(JSON.stringify({ ...start(), companions: { kaz: 'Companion' } }));
    const v = validateState(C, raw);
    expect(v.state!.companions.kaz).toBeUndefined();
    expect(v.repairs.some((r) => r.includes('Kaz') || r.includes('Kaczmarek'))).toBe(true);
  });
});

describe('relève : reprise toujours sur une scène existante', () => {
  it('sans scène précédente valide, la relève reprend au début du chapitre', () => {
    const dead = { ...start(), chapter: 'r2', currentScene: 'r2_mort', previousScene: 'scene_supprimee', companions: { kaz: 'companion' as const }, ending: { id: 'mort', kind: 'death' as const } };
    if (!C.scenes.r2_mort) return; // scène de mort du chapitre (garde-fou si le contenu change)
    const s = takeOver(C, dead, 'kaz');
    expect(C.scenes[s.currentScene]).toBeDefined();
    expect(C.scenes[s.currentScene].kind).not.toBe('death');
  });
});
