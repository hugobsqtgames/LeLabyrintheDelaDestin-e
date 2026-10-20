/**
 * Stress test des sauvegardes : des milliers d'opérations concurrentes
 * (sauvegarde, effacement, chargement, copie, état avant relève, début de
 * chapitre, mémoires) sur un stockage lent qui échoue au hasard, écrit parfois
 * des données tronquées, et une application « tuée » en pleine écriture.
 *
 * Vérifie qu'un chargement ne plante jamais, ne renvoie jamais un état qui n'a
 * pas été sauvegardé dans cet emplacement (depuis son dernier effacement), et
 * que sans panne c'est toujours le dernier état demandé qui est relu.
 *
 *   npx tsx scripts/stress-saves.ts [tours=300] [graine=1]
 */
import { CONTENT } from '../src/content';
import { simulate } from '../src/engine/simulate';
import type { GameState } from '../src/engine/types';
import { backupKey, META_KEY, SaveManager, SLOT_COUNT } from '../src/persistence/saves';
import { serialize } from '../src/persistence/schema';
import type { KeyValueStorage } from '../src/persistence/storage';

const C = CONTENT;
const ROUNDS = Number(process.argv[2] ?? 300);
let seed = Number(process.argv[3] ?? 1) >>> 0;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

/** Stockage lent et capricieux. Les écritures restent atomiques sauf « torn » (écriture tronquée). */
class ChaosStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failRate = 0;
  tornRate = 0;
  async delay() {
    if (rnd() < 0.7) await new Promise((r) => setTimeout(r, Math.floor(rnd() * 3)));
  }
  async getItem(key: string) {
    await this.delay();
    if (rnd() < this.failRate / 3) throw new Error('lecture impossible');
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    await this.delay();
    if (rnd() < this.failRate) throw new Error('disque plein');
    this.data.set(key, rnd() < this.tornRate ? value.slice(0, Math.floor(value.length * rnd())) : value);
  }
  async removeItem(key: string) {
    await this.delay();
    if (rnd() < this.failRate / 3) throw new Error('effacement impossible');
    this.data.delete(key);
  }
}

/** Accès au stockage d'une instance de l'application : une fois « tuée », plus rien ne passe. */
class Process implements KeyValueStorage {
  dead = false;
  constructor(private readonly disk: KeyValueStorage) {}
  private alive() {
    if (this.dead) throw new Error('processus arrêté');
  }
  async getItem(key: string) {
    this.alive();
    return this.disk.getItem(key);
  }
  async setItem(key: string, value: string) {
    this.alive();
    await this.disk.setItem(key, value);
  }
  async removeItem(key: string) {
    this.alive();
    await this.disk.removeItem(key);
  }
}

const tag = (s: GameState) => `${s.id}#${s.turn}`;

// Une réserve d'états réels et distincts (parties simulées jusqu'au bout ou presque).
const pool: GameState[] = [];
for (let i = 0; pool.length < 40; i += 1) {
  const r = simulate(C, i % 2 ? 'prudent' : 'aleatoire', 1000 + i, { maxSteps: 50 + i * 40 });
  pool.push({ ...r.state, id: `etat-${pool.length}` });
}
const biggest = pool.reduce((a, b) => (serialize(C, a, 0).length > serialize(C, b, 0).length ? a : b));

const problems = new Map<string, { count: number; example: string }>();
const problem = (k: string, ex: string) => {
  const p = problems.get(k);
  if (p) p.count += 1;
  else problems.set(k, { count: 1, example: ex });
};
let ops = 0;
let loads = 0;
let fromBackup = 0;
let refusedLoads = 0;
let kills = 0;
let dumped = false;
const reasons = new Map<string, number>();

async function round(r: number, faults: boolean) {
  const storage = new ChaosStorage();
  storage.failRate = faults ? 0.08 : 0;
  storage.tornRate = faults ? 0.03 : 0;
  let proc = new Process(storage);
  let saves = new SaveManager(proc, C, () => r * 1e6 + ops);
  // Par emplacement : états sauvegardés depuis le dernier effacement, et le dernier demandé.
  const allowed = new Map<number, Set<string>>();
  const last = new Map<number, string | null>();
  for (let s = 1; s <= SLOT_COUNT; s += 1) {
    allowed.set(s, new Set());
    last.set(s, null);
  }
  const log: { slot: number; at: number; id: string }[] = [];
  const relayTags = new Set<string>();
  const trace: string[] = [];
  const ev = (t: string) => trace.push(t);
  const track = (label: string, p: Promise<unknown>) =>
    p.then(
      () => ev(`  ok   ${label}`),
      (e) => ev(`  FAIL ${label} (${(e as Error).message})`),
    );
  const inflight: Promise<unknown>[] = [];
  // Chaque emplacement contient une partie (même identifiant), sauvegardée de nombreuses fois.
  const gameOf = new Map<number, string>();
  let version = 0;
  const nextState = (slot: number, fresh: boolean): GameState => {
    if (fresh || !gameOf.has(slot)) gameOf.set(slot, `partie-${r}-${slot}-${version}`);
    version += 1;
    return { ...pool[Math.floor(rnd() * pool.length)], id: gameOf.get(slot)!, turn: version };
  };
  const removeFailed = (slot: number, before: Set<string>) => {
    for (const id of before) allowed.get(slot)!.add(id);
    if (!faults) problem('effacement échoué sans panne', `emplacement ${slot}`);
  };
  const swallow = (p: Promise<unknown>) => inflight.push(p.catch(() => undefined));

  for (let i = 0; i < 60; i += 1) {
    ops += 1;
    // Rythme irrégulier : parfois en rafale, parfois le temps que les écritures aboutissent.
    if (rnd() < 0.6) await new Promise((res) => setTimeout(res, Math.floor(rnd() * 6)));
    const slot = 1 + Math.floor(rnd() * SLOT_COUNT);
    const x = rnd();
    if (x < 0.45) {
      const st = nextState(slot, rnd() < 0.08);
      allowed.get(slot)!.add(tag(st));
      last.set(slot, tag(st));
      log.push({ slot, at: i, id: tag(st) });
      ev(`${i} save ${slot} ${tag(st)}`);
      swallow(track(`save ${slot} ${tag(st)}`, saves.save(slot, st)));
    } else if (x < 0.55) {
      const before = allowed.get(slot)!;
      allowed.set(slot, new Set());
      last.set(slot, null);
      gameOf.delete(slot);
      log.push({ slot, at: i, id: '∅' });
      ev(`${i} remove ${slot}`);
      // Un effacement qui échoue (panne) laisse légitimement l'ancienne partie en place.
      swallow(saves.remove(slot).catch((e) => { removeFailed(slot, before); throw e; }));
    } else if (x < 0.62) {
      // Copie vers un autre emplacement (comme l'écran des sauvegardes : effacer puis écrire).
      const st = nextState(slot, true);
      const before = allowed.get(slot)!;
      allowed.set(slot, new Set([tag(st)]));
      last.set(slot, tag(st));
      log.push({ slot, at: i, id: '∅' }, { slot, at: i, id: tag(st) });
      // Mis en file d'un seul tenant : aucune autre opération ne s'intercale.
      ev(`${i} copy ${slot} ${tag(st)}`);
      swallow(saves.remove(slot).catch((e) => { removeFailed(slot, before); throw e; }));
      swallow(track(`copy-save ${slot} ${tag(st)}`, saves.save(slot, st)));
    } else if (x < 0.67) {
      // Mort avant une relève : l'état de la partie en cours est mis de côté.
      if (gameOf.has(slot)) {
        const snap = nextState(slot, false);
        relayTags.add(tag(snap));
        swallow(saves.saveRelaySnapshot(slot, snap));
      }
    } else if (x < 0.71) {
      swallow(saves.saveChapterStart(pool[0].chapter, pool[Math.floor(rnd() * pool.length)]));
    } else if (x < 0.75) {
      swallow(saves.saveJson(META_KEY, { runs: i }));
    } else if (x < 0.78) {
      swallow(saves.listSlots());
    } else if (x < 0.8 && faults) {
      // L'application est tuée : les écritures en file sont perdues, on rouvre avec un nouveau gestionnaire.
      kills += 1;
      ev(`${i} KILL`);
      proc.dead = true;
      // Le temps que l'application redémarre, les écritures déjà parties vers le disque ont abouti.
      await new Promise((res) => setTimeout(res, 15));
      proc = new Process(storage);
      saves = new SaveManager(proc, C, () => r * 1e6 + ops);
    } else {
      const expectSet = new Set(allowed.get(slot));
      const calledAt = i;
      const p = saves
        .load(slot)
        .then((res) => {
          loads += 1;
          if (!res.ok) {
            refusedLoads += 1;
            reasons.set(res.error ?? '?', (reasons.get(res.error ?? '?') ?? 0) + 1);
            if (res.error === 'Fichier de sauvegarde illisible.') {
              const bak = storage.data.get(backupKey(slot));
              let why = 'pas de copie de secours';
              if (bak !== undefined) {
                try {
                  JSON.parse(bak);
                  why = 'copie de secours lisible mais non utilisée';
                } catch {
                  why = 'copie de secours tronquée aussi';
                }
              }
              reasons.set(`  ↳ ${why}`, (reasons.get(`  ↳ ${why}`) ?? 0) + 1);
            }
            const erasedSince = log.some((l) => l.slot === slot && l.at >= calledAt && l.id === '∅');
            if (!faults && expectSet.size && !erasedSince && last.get(slot) !== null) problem('chargement refusé sans panne', `${res.error}`);
            return;
          }
          if (res.fromBackup) fromBackup += 1;
          // Le chargement attend la fin des écritures : un état sauvegardé après l'appel est légitime.
          const later = log.some((l) => l.slot === slot && l.at > calledAt && l.id === tag(res.state!));
          if (!expectSet.has(tag(res.state!)) && !allowed.get(slot)!.has(tag(res.state!)) && !later && !dumped) {
            dumped = true;
            console.log(`--- trace (emplacement ${slot}, chargement appelé à ${calledAt}, lu ${tag(res.state!)}) ---\n` + trace.filter((t) => /KILL|FAIL|ok/.test(t) || new RegExp(` ${slot}( |$)`).test(t)).join('\n'));
          }
          if (!expectSet.has(tag(res.state!)) && !allowed.get(slot)!.has(tag(res.state!)) && !later) problem(faults ? 'état étranger (avec pannes)' : 'état étranger SANS panne', `emplacement ${slot} : ${tag(res.state!)} (secours: ${!!res.fromBackup}, déjà sauvé ici: ${log.some((l) => l.slot === slot && l.id === tag(res.state!))}, ailleurs: ${log.filter((l) => l.id === tag(res.state!)).map((l) => l.slot).join(',') || 'non'}, relève: ${relayTags.has(tag(res.state!))})`);
        })
        .catch((e) => problem('chargement a planté', (e as Error).message));
      inflight.push(p);
    }
  }
  await Promise.all(inflight);
  await saves.flush().catch(() => undefined);
  // Contrôle final : sans panne, chaque emplacement contient exactement le dernier état demandé.
  for (let s = 1; s <= SLOT_COUNT; s += 1) {
    const res = await saves.load(s).catch((e) => ({ ok: false, error: `exception ${(e as Error).message}` }) as const);
    const want = last.get(s);
    if (!faults) {
      if (want === null && res.ok) problem('emplacement effacé qui réapparaît', `emplacement ${s} : ${tag(res.state!)}`);
      if (want !== null && (!res.ok || tag(res.state!) !== want)) problem('dernier état perdu', `emplacement ${s} : voulu ${want}, lu ${res.ok ? tag(res.state!) : res.error}`);
    } else if (res.ok && !allowed.get(s)!.has(tag(res.state!))) {
      problem('état étranger après pannes', `emplacement ${s} : ${tag(res.state!)}`);
    }
  }
  // « Revenir avant la relève » ne doit jamais ouvrir une autre partie que celle de l'emplacement.
  for (let s = 1; s <= SLOT_COUNT; s += 1) {
    const snap = await saves.loadRelaySnapshot(s).catch(() => ({ ok: false }) as const);
    if (!faults && snap.ok && snap.state!.id !== gameOf.get(s)) problem('état avant relève d’une autre partie', `emplacement ${s} : ${snap.state!.id} au lieu de ${gameOf.get(s) ?? 'vide'}`);
  }
  const list = await saves.listSlots().catch((e) => problem('liste des emplacements a planté', (e as Error).message));
  if (list && list.length !== SLOT_COUNT) problem('liste incomplète', String(list.length));
}

async function main() {
  const t0 = Date.now();
  process.on('unhandledRejection', (e) => problem('promesse rejetée non gérée', String(e)));
  for (let r = 0; r < ROUNDS; r += 1) await round(r, r % 2 === 1);

  // Charge : la plus grosse sauvegarde, écrite 1 000 fois d'affilée (rafale d'autosauvegardes).
  const big = serialize(C, biggest, 0);
  const burst = new SaveManager(new ChaosStorage(), C);
  const tb = Date.now();
  for (let i = 0; i < 1000; i += 1) void burst.save(1, { ...biggest, turn: i });
  await burst.flush();
  const burstMs = Date.now() - tb;
  const back = await burst.load(1);
  if (!back.ok || back.state!.turn !== 999) problem('rafale : dernier état perdu', back.ok ? String(back.state!.turn) : String(back.error));

  console.log(
    `${ROUNDS} tours (moitié avec pannes, écritures tronquées et ${kills} arrêts brutaux), ${ops} opérations, ${loads} chargements ` +
      `(${fromBackup} depuis la copie de secours, ${refusedLoads} refusés proprement) — ${((Date.now() - t0) / 1000).toFixed(1)} s`,
  );
  console.log(`Plus grosse sauvegarde : ${(big.length / 1024).toFixed(0)} Ko (${biggest.visitedScenes.length} scènes vues) ; rafale de 1 000 autosauvegardes : ${burstMs} ms`);
  console.log('Refus :', [...reasons].map(([k, v]) => `${k} ×${v}`).join(' | '));
  if (!problems.size) console.log('Aucun problème détecté.');
  else {
    for (const [k, v] of problems) console.log(`✗ ${k} ×${v.count}\n    ex. ${v.example}`);
    process.exitCode = 1;
  }
}

void main();
