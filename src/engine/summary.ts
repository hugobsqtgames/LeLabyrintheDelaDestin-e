/**
 * Récapitulatif d'une fin de partie ou d'un chapitre.
 */
import { evaluate } from './conditions';
import { msg } from './messages';
import type { CompanionStatus, EndingDef, GameContent, GameState } from './types';

export interface AllyLine {
  id: string;
  name: string;
  status: CompanionStatus;
  relation: number;
}

export interface GameSummary {
  ending: EndingDef | null;
  cause?: string;
  lines: { text: string; tone: 'good' | 'bad' | 'neutral' }[];
  allies: AllyLine[];
  questsCompleted: string[];
  questsFailed: string[];
  majorEvents: string[];
  decisions: number;
  level: number;
  playtimeMs: number;
}

export function summarize(content: GameContent, state: GameState): GameSummary {
  const ending = state.ending ? content.endings[state.ending.id] ?? null : null;
  const lines = content.summaryRules
    .filter((r) => evaluate(content, state, r.if))
    .map((r) => ({ text: r.text.replace(/\{nom\}/g, state.player.name), tone: r.tone }));
  const allies: AllyLine[] = Object.entries(state.companions)
    .filter(([, status]) => status !== 'unknown')
    .map(([id, status]) => ({
      id,
      name: content.characters[id]?.name ?? id,
      status,
      relation: state.relations[id] ?? 0,
    }));
  const questsCompleted: string[] = [];
  const questsFailed: string[] = [];
  for (const [id, q] of Object.entries(state.quests)) {
    const title = content.quests[id]?.title ?? id;
    if (q.status === 'completed') questsCompleted.push(title);
    if (q.status === 'failed') questsFailed.push(title);
  }
  return {
    ending,
    cause: state.ending?.cause,
    lines,
    allies,
    questsCompleted,
    questsFailed,
    majorEvents: state.chronicle.filter((c) => c.major).map((c) => c.text),
    decisions: state.turn,
    level: state.player.level,
    playtimeMs: state.playtimeMs,
  };
}

export function formatPlaytime(content: GameContent, ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0
    ? msg(content, 'time.playtimeHours', { h, m: m.toString().padStart(2, '0') })
    : msg(content, 'time.playtimeMinutes', { m });
}

/** Résumé « Que s'est-il passé ? », affiché à la reprise d'une partie. */
export interface Recap {
  chapter: { number: number; title: string } | null;
  sceneTitle: string;
  location: string;
  clock: number;
  /** Étape en cours de la quête principale active. */
  objective: string | null;
  /** Derniers faits marquants (du plus ancien au plus récent). */
  recent: string[];
  companions: string[];
  lastDiary: string | null;
}

export function recap(content: GameContent, state: GameState, count = 4): Recap {
  const chapter = content.chapters.find((c) => c.id === state.chapter) ?? null;
  const scene = content.scenes[state.currentScene];
  const location = scene ? content.locations[scene.location]?.name ?? '' : '';
  let objective: string | null = null;
  for (const [id, q] of Object.entries(state.quests)) {
    const def = content.quests[id];
    if (def?.kind === 'main' && q.status === 'active') {
      objective = def.steps.find((s) => s.id === q.step)?.text ?? def.summary;
      break;
    }
  }
  const major = state.chronicle.filter((c) => c.major);
  const pool = major.length >= count ? major : state.chronicle;
  return {
    chapter: chapter ? { number: chapter.number, title: chapter.title } : null,
    sceneTitle: scene?.title ?? '',
    location,
    clock: state.clock,
    objective,
    recent: pool.slice(-count).map((c) => c.text),
    companions: Object.entries(state.companions)
      .filter(([, s]) => s === 'companion')
      .map(([id]) => content.characters[id]?.name ?? id),
    lastDiary: state.diary.length ? state.diary[state.diary.length - 1].text : null,
  };
}
