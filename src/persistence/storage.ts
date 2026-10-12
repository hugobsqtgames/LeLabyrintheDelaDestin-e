/**
 * Abstraction du stockage clé/valeur. L'application utilise AsyncStorage
 * (voir asyncStorage.ts) ; les tests utilisent MemoryStorage.
 */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryStorage implements KeyValueStorage {
  readonly data = new Map<string, string>();
  /** Simule une panne d'écriture (tests). */
  failWrites = false;
  writes = 0;

  async getItem(key: string): Promise<string | null> {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.failWrites) throw new Error('Écriture impossible (simulée)');
    this.writes += 1;
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
}
