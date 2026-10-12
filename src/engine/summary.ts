/**
 * Récapitulatif d'une fin de partie ou d'un chapitre.
 */
import { evaluate } from './conditions';
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

export function formatPlaytime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${m} min`;
}
