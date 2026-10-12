import { describe, expect, it } from 'vitest';
import { backupKey, SaveManager, slotKey } from '../src/persistence/saves';
import { checksum, migrate, SAVE_SCHEMA_VERSION, serialize, validateState } from '../src/persistence/schema';
import { MemoryStorage } from '../src/persistence/storage';
import { enterScene } from '../src/engine/narrative';
import { C, pick, start } from './helpers';

function manager() {
  const storage = new MemoryStorage();
  let t = 1000;
  return { storage, saves: new SaveManager(storage, C, () => (t += 1)) };
}

describe('sauvegarde et chargement', () => {
  it('restaure exactement la partie : scène, inventaire, décisions, quêtes', async () => {
    const { saves } = manager();
    let s = start();
    s = pick(s, 'noter');
    s = pick(s, 'dire');
    await saves.save(1, s);
    const res = await saves.load(1);
    expect(res.ok).toBe(true);
    expect(res.state!.currentScene).toBe(s.currentScene);
    expect(res.state!.inventory).toEqual(s.inventory);
    expect(res.state!.equipment).toEqual(s.equipment);
    expect(res.state!.flags).toEqual(s.flags);
    expect(res.state!.quests).toEqual(s.quests);
    expect(res.state!.relations).toEqual(s.relations);
    expect(res.state!.consumed).toEqual(s.consumed);
    expect(res.state!.chronicle.length).toBe(s.chronicle.length);
    expect(res.state!.rng).toBe(s.rng);
  });

  it('reprend un combat en cours au même tour', async () => {
    const { saves } = manager();
    const s = enterScene(C, start(), 'c1_super_combat');
    await saves.save(2, s);
    const res = await saves.load(2);
    expect(res.state!.combat!.turn).toBe(1);
    expect(res.state!.combat!.enemies.map((e) => e.hp)).toEqual(s.combat!.enemies.map((e) => e.hp));
  });

  it('liste les emplacements avec leur résumé', async () => {
    const { saves } = manager();
    await saves.save(3, start({ name: 'Ilyès' }));
    const slots = await saves.listSlots();
    expect(slots.map((x) => x.status)).toEqual(['empty', 'empty', 'ok']);
    expect(slots[2].summary!.name).toBe('Ilyès');
    expect(slots[2].summary!.chapterTitle).toMatch(/Chapitre 1/);
  });

  it('les emplacements sont indépendants : supprimer l’un n’affecte pas les autres', async () => {
    const { saves } = manager();
    await saves.save(1, start({ name: 'Un' }));
    await saves.save(2, start({ name: 'Deux' }));
    await saves.remove(1);
    const slots = await saves.listSlots();
    expect(slots[0].status).toBe('empty');
    expect(slots[1].summary!.name).toBe('Deux');
  });

  it('les autosauvegardes rapprochées sont fusionnées et écrites dans l’ordre', async () => {
    const { storage, saves } = manager();
    let s = start();
    const states = [s];
    for (const id of ['noter', 'dire', 'porte']) {
      s = pick(s, id);
      states.push(s);
    }
    const promises = states.map((st) => saves.save(1, st));
    await Promise.all(promises);
    await saves.flush();
    const res = await saves.load(1);
    expect(res.state!.currentScene).toBe(states[states.length - 1].currentScene);
    expect(storage.writes).toBeLessThan(states.length * 2);
  });

  it('une sauvegarde tronquée est restaurée depuis la copie de secours', async () => {
    const { storage, saves } = manager();
    const first = start();
    await saves.save(1, first);
    const second = pick(first, 'noter');
    await saves.save(1, second);
    // Corruption de la sauvegarde principale (écriture interrompue).
    const text = storage.data.get(slotKey(1))!;
    storage.data.set(slotKey(1), text.slice(0, text.length / 2));
    const res = await saves.load(1);
    expect(res.ok).toBe(true);
    expect(res.fromBackup).toBe(true);
    expect(res.state!.currentScene).toBe(first.currentScene);
  });

  it('détecte une sauvegarde altérée par la somme de contrôle', async () => {
    const { storage, saves } = manager();
    await saves.save(1, start());
    const env = JSON.parse(storage.data.get(slotKey(1))!);
    env.state.player.level = 99;
    storage.data.set(slotKey(1), JSON.stringify(env));
    storage.data.delete(backupKey(1));
    const res = await saves.load(1);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/altérée/);
    const slots = await saves.listSlots();
    expect(slots[0].status).toBe('corrupt');
  });

  it('ne plante pas sur des données absentes ou absurdes', async () => {
    const { storage, saves } = manager();
    storage.data.set(slotKey(1), 'pas du json');
    storage.data.set(slotKey(2), JSON.stringify({ schemaVersion: 2, state: null }));
    storage.data.set(slotKey(3), JSON.stringify({ schemaVersion: 2, state: { player: 'x' } }));
    for (const slot of [1, 2, 3]) {
      const res = await saves.load(slot);
      expect(res.ok).toBe(false);
      expect(typeof res.error).toBe('string');
    }
    expect((await saves.load(1)).ok).toBe(false);
    const empty = new SaveManager(new MemoryStorage(), C);
    expect((await empty.load(1)).error).toMatch(/vide/);
  });

  it('refuse une sauvegarde d’une version future', async () => {
    const { storage, saves } = manager();
    const state = start();
    storage.data.set(slotKey(1), JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION + 1, savedAt: 0, checksum: checksum(JSON.stringify(state)), state }));
    const res = await saves.load(1);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/plus récente/);
  });

  it('une panne d’écriture ne détruit pas la sauvegarde précédente', async () => {
    const { storage, saves } = manager();
    const s = start();
    await saves.save(1, s);
    storage.failWrites = true;
    await expect(saves.save(1, pick(s, 'noter'))).rejects.toThrow();
    storage.failWrites = false;
    const res = await saves.load(1);
    expect(res.ok).toBe(true);
    expect(res.state!.currentScene).toBe(s.currentScene);
    // La file reste utilisable après une erreur.
    await saves.save(1, pick(s, 'noter'));
    expect((await saves.load(1)).state!.currentScene).toBe('c1_descente');
  });

  it('les paramètres sont relus avec leurs valeurs par défaut en cas de problème', async () => {
    const { storage, saves } = manager();
    const defaults = { haptics: true, reduceMotion: false, textScale: 1 };
    expect(await saves.loadSettings(defaults)).toEqual(defaults);
    await saves.saveSettings({ ...defaults, haptics: false });
    expect((await saves.loadSettings(defaults)).haptics).toBe(false);
    storage.data.set('labyrinthe:v1:settings', '{cassé');
    expect(await saves.loadSettings(defaults)).toEqual(defaults);
  });
});

describe('migrations et réparation', () => {
  it('migre une sauvegarde v1 (inventaire en liste) vers v2', async () => {
    const { storage, saves } = manager();
    const s = start();
    const v1: Record<string, unknown> = {
      ...s,
      inventory: Object.entries(s.inventory).map(([id, qty]) => ({ id, qty })),
      equipment: { melee: s.equipment.melee, ranged: null, armor: s.equipment.armor },
    };
    delete v1.world;
    delete v1.ground;
    storage.data.set(slotKey(1), JSON.stringify({ schemaVersion: 1, savedAt: 0, summary: {}, state: v1 }));
    const res = await saves.load(1);
    expect(res.ok).toBe(true);
    expect(res.migratedFrom).toBe(1);
    expect(res.state!.inventory).toEqual(s.inventory);
    expect(res.state!.equipment.accessory).toBeNull();
    expect(res.state!.world).toEqual({});
  });

  it('refuse une version inconnue', () => {
    expect(migrate(0, {}).ok).toBe(false);
    expect(migrate(1.5, {}).ok).toBe(false);
  });

  it('répare une scène disparue en reprenant au début du chapitre', () => {
    const s = { ...start(), currentScene: 'scene_supprimee', chapter: 'c2' };
    const v = validateState(C, JSON.parse(JSON.stringify(s)));
    expect(v.ok).toBe(true);
    expect(v.state!.currentScene).toBe('c2_brasserie');
    expect(v.repairs.join(' ')).toMatch(/introuvable/);
  });

  it('retire les objets inconnus et l’équipement incohérent', () => {
    const s = start();
    const raw = JSON.parse(JSON.stringify({ ...s, inventory: { ...s.inventory, objet_fantome: 3, ration: 999 }, equipment: { ...s.equipment, ranged: 'hachette' } }));
    const v = validateState(C, raw);
    expect(v.state!.inventory.objet_fantome).toBeUndefined();
    expect(v.state!.inventory.ration).toBe(C.items.ration.maxStack);
    expect(v.state!.equipment.ranged).toBeNull();
  });

  it('relance le combat si la scène courante est un combat sans état', async () => {
    const { storage, saves } = manager();
    const s = { ...start(), currentScene: 'c1_super_combat', combat: null };
    storage.data.set(slotKey(1), serialize(C, s, 0));
    const res = await saves.load(1);
    expect(res.state!.combat).not.toBeNull();
  });
});
