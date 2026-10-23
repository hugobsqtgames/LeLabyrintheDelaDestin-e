/**
 * Gestion des emplacements de sauvegarde.
 *
 *  - 3 emplacements ; chaque partie se sauvegarde automatiquement dans le sien.
 *  - Avant d'écraser une sauvegarde valide, elle est copiée en secours (`:bak`).
 *  - Les écritures passent par une file : jamais deux écritures simultanées,
 *    et une rafale d'autosauvegardes n'écrit que l'état le plus récent.
 *  - Au chargement : somme de contrôle, migration, validation, puis repli sur
 *    la copie de secours si la sauvegarde principale est corrompue.
 *  - Avant une relève, l'état de la mort est mis de côté (`:releve`) : le
 *    joueur peut y revenir s'il regrette son choix de compagnon ou d'objets.
 */
import { ensureConsistency } from '../engine/narrative';
import type { GameContent, GameState } from '../engine/types';
import { checksum, migrate, serialize, validateState, type SaveEnvelope, type SaveSummary } from './schema';
import type { KeyValueStorage } from './storage';

export const SLOT_COUNT = 3;
const PREFIX = 'labyrinthe:v1';
export const slotKey = (slot: number) => `${PREFIX}:slot:${slot}`;
export const backupKey = (slot: number) => `${PREFIX}:slot:${slot}:bak`;
export const relayKey = (slot: number) => `${PREFIX}:slot:${slot}:releve`;
export const SETTINGS_KEY = `${PREFIX}:settings`;
/** Début de chapitre de la dernière partie qui l'a atteint (« Rejouer un chapitre »). */
export const chapterKey = (chapter: string) => `${PREFIX}:chapitre:${chapter}`;
/** Progression hors partie : succès, codex, personnages rencontrés, fins vues. */
export const META_KEY = `${PREFIX}:meta`;

export interface SlotInfo {
  slot: number;
  status: 'empty' | 'ok' | 'corrupt';
  summary?: SaveSummary;
  savedAt?: number;
  error?: string;
  /** Un état « avant la relève » est disponible pour cet emplacement. */
  relaySnapshot?: boolean;
}

export interface LoadResult {
  ok: boolean;
  state?: GameState;
  error?: string;
  /** La partie a été restaurée depuis la copie de secours. */
  fromBackup?: boolean;
  repairs?: string[];
  migratedFrom?: number;
}

interface ParsedSave {
  ok: boolean;
  envelope?: SaveEnvelope;
  error?: string;
}

function parse(text: string | null): ParsedSave {
  if (text === null) return { ok: false, error: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Fichier de sauvegarde illisible.' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'Format de sauvegarde invalide.' };
  const env = data as SaveEnvelope;
  if (typeof env.schemaVersion !== 'number' || typeof env.state !== 'object' || env.state === null) {
    return { ok: false, error: 'Format de sauvegarde invalide.' };
  }
  if (typeof env.checksum === 'string' && env.checksum !== checksum(JSON.stringify(env.state))) {
    return { ok: false, error: 'Sauvegarde altérée (somme de contrôle incorrecte).' };
  }
  return { ok: true, envelope: env };
}

const gameId = (env: SaveEnvelope) => (env.state as { id?: unknown }).id;

export class SaveManager {
  private queue: Promise<void> = Promise.resolve();
  private pending = new Map<number, GameState>();
  /** Génération par emplacement : un effacement rend caduques les écritures mises en file avant lui. */
  private generation = new Map<number, number>();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly content: GameContent,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  async listSlots(): Promise<SlotInfo[]> {
    const out: SlotInfo[] = [];
    for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
      let raw: string | null = null;
      try {
        raw = await this.storage.getItem(slotKey(slot));
      } catch {
        out.push({ slot, status: 'corrupt', error: 'Lecture impossible.' });
        continue;
      }
      const parsed = parse(raw);
      if (parsed.error === 'empty') {
        out.push({ slot, status: 'empty' });
      } else if (!parsed.ok) {
        const backup = parse(await this.storage.getItem(backupKey(slot)).catch(() => null));
        if (backup.ok) out.push({ slot, status: 'ok', summary: backup.envelope!.summary, savedAt: backup.envelope!.savedAt, error: 'Restaurable depuis la copie de secours.' });
        else out.push({ slot, status: 'corrupt', error: parsed.error });
      } else {
        out.push({ slot, status: 'ok', summary: parsed.envelope!.summary, savedAt: parsed.envelope!.savedAt });
      }
      const last = out[out.length - 1];
      if (last.status === 'ok' && (await this.relaySnapshotFor(slot))) last.relaySnapshot = true;
    }
    return out;
  }

  /** Met de côté l'état d'une mort, juste avant la relève (passe par la file d'écriture). */
  saveRelaySnapshot(slot: number, state: GameState): Promise<void> {
    const text = serialize(this.content, state, this.clock());
    this.queue = this.queue.catch(() => undefined).then(() => this.storage.setItem(relayKey(slot), text));
    return this.queue;
  }

  /**
   * État avant relève de cet emplacement, seulement s'il appartient à la même partie que
   * la sauvegarde (ou sa copie de secours) : jamais celui d'une partie remplacée depuis.
   */
  private async relaySnapshotFor(slot: number): Promise<SaveEnvelope | null> {
    const snap = parse(await this.storage.getItem(relayKey(slot)).catch(() => null));
    if (!snap.ok) return null;
    let current = parse(await this.storage.getItem(slotKey(slot)).catch(() => null));
    if (!current.ok) current = parse(await this.storage.getItem(backupKey(slot)).catch(() => null));
    return current.ok && gameId(current.envelope!) === gameId(snap.envelope!) ? snap.envelope! : null;
  }

  /** Un état « avant la relève » de la même partie existe-t-il pour cet emplacement ? */
  async hasRelaySnapshot(slot: number): Promise<boolean> {
    await this.flush().catch(() => undefined);
    return (await this.relaySnapshotFor(slot).catch(() => null)) !== null;
  }

  /** Recharge l'état mis de côté avant la dernière relève. */
  async loadRelaySnapshot(slot: number): Promise<LoadResult> {
    await this.flush();
    const snap = await this.relaySnapshotFor(slot);
    if (!snap) return { ok: false, error: 'Aucun état avant relève pour cet emplacement.' };
    return this.decode(snap);
  }

  private decode(envelope: SaveEnvelope): LoadResult {
    const migrated = migrate(envelope.schemaVersion, envelope.state as Record<string, unknown>);
    if (!migrated.ok) return { ok: false, error: migrated.error };
    const validated = validateState(this.content, migrated.state);
    if (!validated.ok || !validated.state) return { ok: false, error: validated.errors.join(' ') || 'Sauvegarde invalide.' };
    return {
      ok: true,
      state: ensureConsistency(this.content, validated.state),
      repairs: validated.repairs,
      migratedFrom: migrated.migratedFrom,
    };
  }

  async load(slot: number): Promise<LoadResult> {
    await this.flush();
    let main: string | null;
    try {
      main = await this.storage.getItem(slotKey(slot));
    } catch {
      return { ok: false, error: 'Lecture impossible.' };
    }
    const parsed = parse(main);
    if (parsed.error === 'empty') return { ok: false, error: 'Emplacement vide.' };
    let decodeError: string | undefined;
    if (parsed.ok) {
      const res = this.decode(parsed.envelope!);
      if (res.ok) return res;
      decodeError = res.error;
    }
    // Repli sur la copie de secours.
    const backup = parse(await this.storage.getItem(backupKey(slot)).catch(() => null));
    if (backup.ok) {
      const res = this.decode(backup.envelope!);
      if (res.ok) return { ...res, fromBackup: true };
    }
    return { ok: false, error: decodeError ?? parsed.error ?? 'Sauvegarde invalide et aucune copie de secours utilisable.' };
  }

  /**
   * Sauvegarde (asynchrone, en file). Les appels rapprochés sont fusionnés :
   * seul le dernier état est écrit.
   */
  save(slot: number, state: GameState): Promise<void> {
    const alreadyQueued = this.pending.has(slot);
    this.pending.set(slot, state);
    if (alreadyQueued) return this.queue;
    const gen = this.generation.get(slot) ?? 0;
    this.queue = this.queue
      .catch(() => undefined)
      .then(async () => {
        // Un effacement est passé entre-temps : cette tâche ne doit pas écrire l'état suivant à sa place.
        if ((this.generation.get(slot) ?? 0) !== gen) return;
        const latest = this.pending.get(slot);
        this.pending.delete(slot);
        if (!latest) return;
        await this.write(slot, latest);
      });
    return this.queue;
  }

  private async write(slot: number, state: GameState): Promise<void> {
    const text = serialize(this.content, state, this.clock());
    const previous = await this.storage.getItem(slotKey(slot)).catch(() => null);
    const prev = parse(previous);
    if (prev.ok && gameId(prev.envelope!) === state.id) {
      await this.storage.setItem(backupKey(slot), previous!);
    } else {
      // Nouvelle partie dans l'emplacement (ou effacement resté à moitié) : la copie de secours
      // et l'état « avant la relève » d'une autre partie ne doivent jamais pouvoir être restaurés à sa place.
      for (const key of [backupKey(slot), relayKey(slot)]) {
        const other = parse(await this.storage.getItem(key).catch(() => null));
        if (other.error !== 'empty' && (!other.ok || gameId(other.envelope!) !== state.id)) await this.storage.removeItem(key);
      }
    }
    await this.storage.setItem(slotKey(slot), text);
  }

  /** Attend la fin de toutes les écritures en cours. */
  async flush(): Promise<void> {
    while (true) {
      const q = this.queue;
      await q.catch(() => undefined);
      if (q === this.queue && this.pending.size === 0) return;
    }
  }

  /**
   * Efface un emplacement (et sa copie de secours). Passe par la file :
   * une sauvegarde demandée après l'effacement sera bien écrite après lui.
   */
  remove(slot: number): Promise<void> {
    this.pending.delete(slot);
    this.generation.set(slot, (this.generation.get(slot) ?? 0) + 1);
    this.queue = this.queue
      .catch(() => undefined)
      .then(async () => {
        await this.storage.removeItem(slotKey(slot));
        await this.storage.removeItem(backupKey(slot));
        await this.storage.removeItem(relayKey(slot));
      });
    return this.queue;
  }

  /**
   * Remise à zéro complète : les emplacements (et leurs copies), les débuts de chapitre,
   * les mémoires et les paramètres. Passe par la file : aucune écriture en attente ne
   * peut ressusciter une partie après coup. Rejette si une donnée n'a pas pu être effacée.
   */
  eraseAll(chapters: string[]): Promise<void> {
    this.pending.clear();
    for (let slot = 1; slot <= SLOT_COUNT; slot += 1) this.generation.set(slot, (this.generation.get(slot) ?? 0) + 1);
    const keys = [
      ...Array.from({ length: SLOT_COUNT }, (_, i) => [slotKey(i + 1), backupKey(i + 1), relayKey(i + 1)]).flat(),
      ...chapters.map(chapterKey),
      META_KEY,
      `${META_KEY}:corrompu`,
      SETTINGS_KEY,
    ];
    this.queue = this.queue
      .catch(() => undefined)
      .then(async () => {
        let failed = 0;
        for (const key of keys) await this.storage.removeItem(key).catch(() => (failed += 1));
        if (failed) throw new Error(`${failed} donnée(s) n’ont pas pu être effacées.`);
      });
    return this.queue;
  }

  /** Mémorise l'état au début d'un chapitre (remplace le précédent). */
  saveChapterStart(chapter: string, state: GameState): Promise<void> {
    const text = serialize(this.content, state, this.clock());
    this.queue = this.queue.catch(() => undefined).then(() => this.storage.setItem(chapterKey(chapter), text));
    return this.queue;
  }

  async loadChapterStart(chapter: string): Promise<LoadResult> {
    await this.flush();
    const parsed = parse(await this.storage.getItem(chapterKey(chapter)).catch(() => null));
    if (!parsed.ok) return { ok: false, error: 'Ce chapitre n’a pas encore été atteint.' };
    return this.decode(parsed.envelope!);
  }

  /** Chapitres dont un début a été mémorisé. */
  async chapterStarts(chapters: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const c of chapters) {
      const raw = await this.storage.getItem(chapterKey(c)).catch(() => null);
      if (raw && parse(raw).ok) out.push(c);
    }
    return out;
  }

  /**
   * Données JSON libres (progression hors partie). Distingue « absentes » de
   * « illisibles » : une lecture ratée ne doit pas conduire à écraser les données.
   */
  async loadJson(key: string): Promise<{ status: 'absent' | 'ok' | 'unreadable' | 'corrupt'; value: unknown }> {
    let raw: string | null;
    try {
      raw = await this.storage.getItem(key);
    } catch {
      // Stockage momentanément illisible : surtout ne rien réécrire par-dessus.
      return { status: 'unreadable', value: null };
    }
    if (!raw) return { status: 'absent', value: null };
    try {
      return { status: 'ok', value: JSON.parse(raw) };
    } catch {
      // Contenu abîmé : une copie est gardée à part avant qu'il soit remplacé.
      await this.storage.setItem(`${key}:corrompu`, raw).catch(() => undefined);
      return { status: 'corrupt', value: null };
    }
  }

  saveJson(key: string, value: unknown): Promise<void> {
    const text = JSON.stringify(value);
    this.queue = this.queue.catch(() => undefined).then(() => this.storage.setItem(key, text));
    return this.queue;
  }

  async loadSettings<T extends object>(defaults: T): Promise<T> {
    try {
      const raw = await this.storage.getItem(SETTINGS_KEY);
      if (!raw) return defaults;
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return defaults;
      const out = { ...defaults };
      for (const key of Object.keys(defaults) as (keyof T)[]) {
        if (typeof data[key] === typeof defaults[key]) out[key] = data[key];
      }
      return out;
    } catch {
      return defaults;
    }
  }

  async saveSettings<T extends object>(settings: T): Promise<void> {
    await this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}
