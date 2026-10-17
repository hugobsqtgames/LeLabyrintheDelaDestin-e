/**
 * Mémoires : la progression hors partie, commune à toutes les sauvegardes.
 * Fins vues, personnages rencontrés, ennemis croisés (codex), scènes et
 * embranchements découverts (arbre des choix), chapitres atteints, succès.
 * Tout est déduit de vraies parties : rien ne se débloque autrement.
 */
import type { CharacterId, ChapterId, EndingId, EnemyId, GameContent, GameState, SceneId } from './types';

export interface MetaProfile {
  version: 1;
  endings: EndingId[];
  /** Personnages rencontrés (statut autre qu'inconnu). */
  met: CharacterId[];
  /** Ennemis croisés en combat. */
  enemies: EnemyId[];
  /** Scènes vues. */
  scenes: SceneId[];
  /** Embranchements empruntés : « scène→scène ». */
  edges: string[];
  chapters: ChapterId[];
  /** Succès débloqués (identifiant → horodatage). */
  achievements: Record<string, number>;
  /** Parties terminées (fin ou mort définitive). */
  runs: number;
  /** Identifiants des parties déjà comptées dans `runs`. */
  countedRuns: string[];
}

export function emptyMeta(): MetaProfile {
  return { version: 1, endings: [], met: [], enemies: [], scenes: [], edges: [], chapters: [], achievements: {}, runs: 0, countedRuns: [] };
}

/** Relit des données stockées (tolérant : champs manquants ou invalides ignorés). */
export function readMeta(raw: unknown): MetaProfile {
  const m = emptyMeta();
  if (!raw || typeof raw !== 'object') return m;
  const r = raw as Record<string, unknown>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  m.endings = strings(r.endings);
  m.met = strings(r.met);
  m.enemies = strings(r.enemies);
  m.scenes = strings(r.scenes);
  m.edges = strings(r.edges);
  m.chapters = strings(r.chapters);
  m.countedRuns = strings(r.countedRuns);
  m.runs = typeof r.runs === 'number' && r.runs >= 0 ? Math.floor(r.runs) : 0;
  if (r.achievements && typeof r.achievements === 'object') {
    for (const [k, v] of Object.entries(r.achievements as Record<string, unknown>)) if (typeof v === 'number') m.achievements[k] = v;
  }
  return m;
}

const add = <T>(list: T[], items: Iterable<T>): T[] => {
  const set = new Set(list);
  let changed = false;
  for (const i of items) {
    if (set.has(i)) continue;
    set.add(i);
    changed = true;
  }
  return changed ? [...set] : list;
};

/** Contexte d'évaluation d'un succès. */
export interface AchievementContext {
  meta: MetaProfile;
  game: GameState;
  content: GameContent;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Caché tant qu'il n'est pas débloqué (titre seul affiché « ??? »). */
  secret?: boolean;
  check: (c: AchievementContext) => boolean;
}

/**
 * Intègre une partie aux mémoires. `previousScene` : scène affichée juste
 * avant (pour enregistrer l'embranchement emprunté). Renvoie les nouvelles
 * mémoires et les succès débloqués à cette occasion.
 */
export function absorbGame(
  meta: MetaProfile,
  content: GameContent,
  game: GameState,
  previousScene: SceneId | null,
  achievements: AchievementDef[],
  now: number,
): { meta: MetaProfile; unlocked: AchievementDef[] } {
  let m = meta;
  const set = <K extends keyof MetaProfile>(k: K, v: MetaProfile[K]) => {
    if (m[k] !== v) m = { ...m, [k]: v };
  };
  set('scenes', add(m.scenes, game.visitedScenes));
  set('chapters', add(m.chapters, [...new Set(game.visitedScenes.map((s) => content.scenes[s]?.chapter).filter((c): c is ChapterId => !!c))]));
  set('met', add(m.met, Object.entries(game.companions).filter(([, s]) => s !== 'unknown').map(([id]) => id)));
  const seen: EnemyId[] = [];
  for (const sid of game.visitedScenes) for (const e of content.scenes[sid]?.encounter?.enemies ?? []) seen.push(e);
  if (game.combat) for (const e of game.combat.enemies) seen.push(e.def);
  set('enemies', add(m.enemies, seen));
  if (previousScene && previousScene !== game.currentScene && content.scenes[previousScene]) {
    set('edges', add(m.edges, [`${previousScene}→${game.currentScene}`]));
  }
  // Une mort n'est une fin que si personne ne peut reprendre la route.
  if (game.ending && (game.ending.kind === 'ending' || !hasRelay(content, game))) {
    set('endings', add(m.endings, [game.ending.id]));
    if (!m.countedRuns.includes(game.id)) m = { ...m, runs: m.runs + 1, countedRuns: [...m.countedRuns.slice(-50), game.id] };
  }
  const unlocked: AchievementDef[] = [];
  for (const a of achievements) {
    if (m.achievements[a.id]) continue;
    let ok = false;
    try {
      ok = a.check({ meta: m, game, content });
    } catch {
      ok = false;
    }
    if (ok) {
      unlocked.push(a);
      m = { ...m, achievements: { ...m.achievements, [a.id]: now } };
    }
  }
  return { meta: m, unlocked };
}

/** Un compagnon jouable présent peut-il encore reprendre la route ? */
function hasRelay(content: GameContent, game: GameState): boolean {
  return Object.values(content.heroes).some((h) => game.companions[h.character] === 'companion');
}

/** Arbre des choix : pour une scène vue, quels choix ont été explorés ? */
export function choiceTargets(content: GameContent, sceneId: SceneId): { choice: string; text: string; targets: SceneId[] }[] {
  const scene = content.scenes[sceneId];
  if (!scene) return [];
  return scene.choices.map((c) => ({
    choice: c.id,
    text: c.text,
    targets: [c.next, c.check?.success, c.check?.failure].filter((x): x is SceneId => !!x),
  }));
}

export function choiceExplored(meta: MetaProfile, sceneId: SceneId, targets: SceneId[]): boolean {
  if (!targets.length) return false;
  return targets.some((t) => meta.edges.includes(`${sceneId}→${t}`));
}

/** Avancement d'un chapitre dans l'arbre : scènes vues / scènes du chapitre. */
export function chapterProgress(content: GameContent, meta: MetaProfile, chapter: ChapterId): { seen: number; total: number } {
  const all = Object.values(content.scenes).filter((s) => s.chapter === chapter);
  const seen = new Set(meta.scenes);
  return { seen: all.filter((s) => seen.has(s.id)).length, total: all.length };
}

/** Les mémoires détaillées (arbre, rejouer un chapitre) s'ouvrent après une première fin. */
export function memoriesUnlocked(meta: MetaProfile): boolean {
  return meta.runs > 0;
}
