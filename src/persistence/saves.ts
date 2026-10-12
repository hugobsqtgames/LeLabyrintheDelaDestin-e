/**
 * Gestion des emplacements de sauvegarde.
 *
 *  - 3 emplacements ; chaque partie se sauvegarde automatiquement dans le sien.
 *  - Avant d'écraser une sauvegarde valide, elle est copiée en secours (`:bak`).
 *  - Les écritures passent par une file : jamais deux écritures simultanées,
 *    et une rafale d'autosauvegardes n'écrit que l'état le plus récent.
 *  - Au chargement : somme de contrôle, migration, validation, puis repli sur
 *    la copie de secours si la sauvegarde principale est corrompue.
 */
import { ensureConsistency } from '../engine/narrative';
import type { GameContent, GameState } from '../engine/types';
import { checksum, migrate, serialize, validateState, type SaveEnvelope, type SaveSummary } from './schema';
import type { KeyValueStorage } from './storage';

export const SLOT_COUNT = 3;
const PREFIX = 'labyrinthe:v1';
export const slotKey = (slot: number) => `${PREFIX}:slot:${slot}`;
export const backupKey = (slot: number) => `${PREFIX}:slot:${slot}:bak`;
export const SETTINGS_KEY = `${PREFIX}:settings`;

export interface SlotInfo {
  slot: number;
  status: 'empty' | 'ok' | 'corrupt';
  summary?: SaveSummary;
  savedAt?: number;
  error?: string;
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

export class SaveManager {
  private queue: Promise<void> = Promise.resolve();
  private pending = new Map<number, GameState>();

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
    }
    return out;
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
    this.queue = this.queue
      .catch(() => undefined)
      .then(async () => {
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
    if (previous && parse(previous).ok) {
      await this.storage.setItem(backupKey(slot), previous);
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

  async remove(slot: number): Promise<void> {
    await this.flush();
    await this.storage.removeItem(slotKey(slot));
    await this.storage.removeItem(backupKey(slot));
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
