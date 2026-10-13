/**
 * Format des sauvegardes, migrations et validation au chargement.
 *
 * Historique du schéma :
 *  - v1 : inventaire sous forme de liste [{ id, qty }], équipement sans
 *         emplacement « accessoire », pas de changements du monde ni de sol.
 *  - v2 : inventaire en dictionnaire, quatre emplacements, monde persistant.
 *  - v3 : horloge des sept jours, usure des armes, archives et journal intime.
 */
import { EQUIP_SLOTS } from '../engine/inventory';
import { CLOCK_START } from '../engine/rules';
import type { CombatState, CompanionStatus, GameContent, GameState, QuestState, QuestStatus } from '../engine/types';

export const SAVE_SCHEMA_VERSION = 3;

export interface SaveSummary {
  name: string;
  profile: string;
  emblem: string;
  level: number;
  chapter: string;
  chapterTitle: string;
  sceneTitle: string;
  playtimeMs: number;
  ended: 'ending' | 'death' | null;
}

export interface SaveEnvelope {
  schemaVersion: number;
  savedAt: number;
  checksum: string;
  summary: SaveSummary;
  state: unknown;
}

/** Empreinte FNV-1a 32 bits : détecte les sauvegardes tronquées ou altérées. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildSummary(content: GameContent, state: GameState): SaveSummary {
  const chapter = content.chapters.find((c) => c.id === state.chapter);
  return {
    name: state.player.name,
    profile: content.profiles[state.player.profile]?.name ?? state.player.profile,
    emblem: state.player.emblem,
    level: state.player.level,
    chapter: state.chapter,
    chapterTitle: chapter ? `Chapitre ${chapter.number} — ${chapter.title}` : state.chapter,
    sceneTitle: content.scenes[state.currentScene]?.title ?? '',
    playtimeMs: state.playtimeMs,
    ended: state.ending?.kind ?? null,
  };
}

export function serialize(content: GameContent, state: GameState, now: number): string {
  const stateJson = JSON.stringify(state);
  const envelope = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: now,
    checksum: checksum(stateJson),
    summary: buildSummary(content, state),
  };
  // L'état est inséré tel quel pour que la somme de contrôle porte sur le texte exact.
  return `${JSON.stringify(envelope).slice(0, -1)},"state":${stateJson}}`;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;
type Migration = (state: Raw) => Raw;

export const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2
  1: (s) => {
    const next: Raw = { ...s };
    if (Array.isArray(s.inventory)) {
      const inv: Record<string, number> = {};
      for (const entry of s.inventory as { id?: unknown; qty?: unknown }[]) {
        if (typeof entry?.id === 'string' && typeof entry.qty === 'number') inv[entry.id] = (inv[entry.id] ?? 0) + entry.qty;
      }
      next.inventory = inv;
    }
    const eq = (s.equipment ?? {}) as Raw;
    next.equipment = { melee: eq.melee ?? null, ranged: eq.ranged ?? null, armor: eq.armor ?? null, accessory: null };
    if (!next.world) next.world = {};
    if (!next.ground) next.ground = {};
    return next;
  },
  // v2 → v3 : l'horloge est estimée d'après le chapitre en cours.
  2: (s) => {
    const estimate: Record<string, number> = { c1: 30, c2: 52, c3: 100, c4: 140 };
    return {
      ...s,
      clock: typeof s.clock === 'number' ? s.clock : estimate[String(s.chapter)] ?? 30,
      durability: s.durability ?? {},
      documents: s.documents ?? [],
      diary: s.diary ?? [],
    };
  },
};

export interface MigrationResult {
  ok: boolean;
  state?: Raw;
  error?: string;
  migratedFrom?: number;
}

export function migrate(version: number, state: Raw): MigrationResult {
  if (!Number.isInteger(version) || version < 1) return { ok: false, error: 'Version de sauvegarde inconnue.' };
  if (version > SAVE_SCHEMA_VERSION) return { ok: false, error: 'Sauvegarde créée par une version plus récente du jeu.' };
  let current = state;
  for (let v = version; v < SAVE_SCHEMA_VERSION; v += 1) {
    const m = MIGRATIONS[v];
    if (!m) return { ok: false, error: `Migration manquante depuis la version ${v}.` };
    current = m(current);
  }
  return { ok: true, state: current, migratedFrom: version === SAVE_SCHEMA_VERSION ? undefined : version };
}

// ---------------------------------------------------------------------------
// Validation et réparation
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);

function numberRecord(v: unknown, keep: (k: string) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'number' && Number.isFinite(val) && keep(k)) out[k] = val;
  }
  return out;
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

const QUEST_STATUSES: QuestStatus[] = ['inactive', 'active', 'completed', 'failed'];
const COMPANION_STATUSES: CompanionStatus[] = ['unknown', 'met', 'companion', 'away', 'captured', 'dead'];

export interface ValidationResult {
  ok: boolean;
  state?: GameState;
  errors: string[];
  repairs: string[];
}

/**
 * Valide un état brut, répare ce qui peut l'être (valeurs hors bornes,
 * références disparues) et refuse ce qui est irrécupérable.
 */
export function validateState(content: GameContent, raw: unknown): ValidationResult {
  const errors: string[] = [];
  const repairs: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['Données de partie absentes.'], repairs };
  const p = raw.player;
  if (!isObj(p)) return { ok: false, errors: ['Personnage absent.'], repairs };
  if (typeof p.name !== 'string' || !p.name.trim()) errors.push('Nom du personnage invalide.');
  if (typeof p.profile !== 'string' || !content.profiles[p.profile as keyof typeof content.profiles]) errors.push('Profil inconnu.');
  if (typeof p.background !== 'string' || !content.backgrounds[p.background as keyof typeof content.backgrounds]) errors.push('Passé inconnu.');
  if (!isObj(p.stats)) errors.push('Caractéristiques absentes.');
  if (errors.length) return { ok: false, errors, repairs };

  const stats = p.stats as Raw;
  const statVal = (k: string) => Math.max(0, Math.min(10, Math.round(num(stats[k], 1))));

  // Scène courante : si elle a disparu, reprise au point de contrôle du chapitre.
  let currentScene = str(raw.currentScene, '');
  let chapter = str(raw.chapter, content.chapters[0].id);
  if (!content.chapters.some((c) => c.id === chapter)) {
    chapter = content.chapters[0].id;
    repairs.push('Chapitre inconnu : retour au premier chapitre.');
  }
  if (!content.scenes[currentScene]) {
    const ch = content.chapters.find((c) => c.id === chapter)!;
    repairs.push(`Scène « ${currentScene} » introuvable : reprise au début du chapitre.`);
    currentScene = ch.start;
  }

  const quests: Record<string, QuestState> = {};
  if (isObj(raw.quests)) {
    for (const [id, q] of Object.entries(raw.quests)) {
      if (!content.quests[id] || !isObj(q)) continue;
      const status = QUEST_STATUSES.includes(q.status as QuestStatus) ? (q.status as QuestStatus) : 'active';
      quests[id] = { status, step: typeof q.step === 'string' ? q.step : null, completedSteps: stringArray(q.completedSteps) };
    }
  }
  const companions: Record<string, CompanionStatus> = {};
  if (isObj(raw.companions)) {
    for (const [id, c] of Object.entries(raw.companions)) {
      if (content.characters[id] && COMPANION_STATUSES.includes(c as CompanionStatus)) companions[id] = c as CompanionStatus;
    }
  }
  const flags: Record<string, boolean> = {};
  if (isObj(raw.flags)) for (const [k, v] of Object.entries(raw.flags)) if (typeof v === 'boolean') flags[k] = v;

  const inventory = numberRecord(raw.inventory, (k) => !!content.items[k]);
  for (const [k, v] of Object.entries(inventory)) {
    const clamped = Math.max(0, Math.min(content.items[k].maxStack, Math.floor(v)));
    if (clamped !== v) repairs.push(`Quantité de ${content.items[k].name} corrigée.`);
    if (clamped <= 0) delete inventory[k];
    else inventory[k] = clamped;
  }
  const rawEq = isObj(raw.equipment) ? raw.equipment : {};
  const equipment = { melee: null, ranged: null, armor: null, accessory: null } as GameState['equipment'];
  for (const slot of EQUIP_SLOTS) {
    const id = rawEq[slot];
    if (typeof id === 'string' && content.items[id]?.slot === slot && inventory[id]) equipment[slot] = id;
    else if (id) repairs.push(`Équipement « ${String(id)} » retiré.`);
  }

  const world: Record<string, string[]> = {};
  if (isObj(raw.world)) for (const [loc, changes] of Object.entries(raw.world)) if (content.locations[loc]) world[loc] = stringArray(changes);

  let combat: CombatState | null = null;
  if (isObj(raw.combat)) {
    const c = raw.combat as unknown as CombatState;
    const valid =
      typeof c.sceneId === 'string' &&
      !!content.scenes[c.sceneId]?.encounter &&
      Array.isArray(c.enemies) &&
      c.enemies.every((e) => isObj(e) && typeof e.def === 'string' && !!content.enemies[e.def] && typeof e.hp === 'number') &&
      Array.isArray(c.log);
    if (valid) combat = { ...c, xpEarned: num(c.xpEarned, 0), summons: num(c.summons, 0) };
    else repairs.push('Combat en cours illisible : il recommencera.');
  }

  const ending = isObj(raw.ending) && typeof raw.ending.id === 'string' ? (raw.ending as unknown as GameState['ending']) : null;

  const state: GameState = {
    id: str(raw.id, `partie-${Date.now()}`),
    createdAt: num(raw.createdAt, Date.now()),
    turn: Math.max(0, Math.floor(num(raw.turn, 0))),
    rng: num(raw.rng, 12345) >>> 0,
    player: {
      name: (p.name as string).slice(0, 24),
      profile: p.profile as GameState['player']['profile'],
      background: p.background as GameState['player']['background'],
      emblem: (typeof p.emblem === 'string' ? p.emblem : 'masque') as GameState['player']['emblem'],
      stats: { force: statVal('force'), discretion: statVal('discretion'), survie: statVal('survie'), astuce: statVal('astuce') },
      hp: Math.floor(num(p.hp, 1)),
      stamina: Math.floor(num(p.stamina, 0)),
      level: Math.max(1, Math.min(6, Math.floor(num(p.level, 1)))),
      xp: Math.max(0, Math.floor(num(p.xp, 0))),
      unspentStatPoints: Math.max(0, Math.floor(num(p.unspentStatPoints, 0))),
      unspentPerks: Math.max(0, Math.floor(num(p.unspentPerks, 0))),
      perks: stringArray(p.perks).filter((k) => k in content.perks) as GameState['player']['perks'],
      infection: Math.max(0, Math.min(3, Math.floor(num(p.infection, 0)))),
    },
    chapter,
    currentScene,
    previousScene: typeof raw.previousScene === 'string' ? raw.previousScene : null,
    inventory,
    equipment,
    ground: numberRecord(raw.ground, (k) => !!content.items[k]),
    flags,
    counters: numberRecord(raw.counters, () => true),
    quests,
    relations: numberRecord(raw.relations, (k) => !!content.characters[k]),
    companions,
    discovered: stringArray(raw.discovered).filter((l) => !!content.locations[l]),
    world,
    visitedScenes: stringArray(raw.visitedScenes),
    consumed: stringArray(raw.consumed),
    chronicle: Array.isArray(raw.chronicle) ? (raw.chronicle as GameState['chronicle']).filter((c) => isObj(c) && typeof c.text === 'string') : [],
    chronicleCounter: num(raw.chronicleCounter, 0),
    combat,
    notices: [],
    noticeCounter: num(raw.noticeCounter, 0),
    ending,
    playtimeMs: Math.max(0, num(raw.playtimeMs, 0)),
    clock: Math.max(0, num(raw.clock, CLOCK_START)),
    durability: numberRecord(raw.durability, (k) => !!content.items[k]?.durability),
    documents: stringArray(raw.documents).filter((d) => !!content.documents[d]),
    diary: Array.isArray(raw.diary)
      ? (raw.diary as unknown[]).filter((d): d is { chapter: string; text: string } => isObj(d) && typeof d.chapter === 'string' && typeof d.text === 'string')
      : [],
    lastCheck: null,
  };
  // Le combat restera cohérent avec la scène courante.
  if (state.combat && state.combat.sceneId !== state.currentScene) {
    state.combat = null;
    repairs.push('Combat détaché de la scène courante : annulé.');
  }
  return { ok: true, state, errors, repairs };
}
