import { msg } from './messages';
import { hoursLeft } from './rules';
import type { GameState, Notice, ChronicleEntry, GameContent } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const MAX_NOTICES = 8;
const MAX_CHRONICLE = 400;

export function addNotice(state: GameState, text: string, tone: Notice['tone']): GameState {
  const id = state.noticeCounter + 1;
  const notices = [...state.notices, { id, text, tone }].slice(-MAX_NOTICES);
  return { ...state, notices, noticeCounter: id };
}

export function addChronicle(
  content: GameContent,
  state: GameState,
  text: string,
  major: boolean,
): GameState {
  const id = state.chronicleCounter + 1;
  const scene = content.scenes[state.currentScene];
  const entry: ChronicleEntry = {
    id,
    turn: state.turn,
    chapter: state.chapter,
    sceneId: state.currentScene,
    sceneTitle: scene ? scene.title : state.currentScene,
    text,
    major,
  };
  return { ...state, chronicle: [...state.chronicle, entry].slice(-MAX_CHRONICLE), chronicleCounter: id };
}

/** Remplace les variables de texte : {nom}. */
export function interpolate(content: GameContent, text: string, state: GameState): string {
  return text
    .replace(/\{nom\}/g, state.player.name)
    .replace(/\{reste\}/g, formatRemaining(content, hoursLeft(state.clock)));
}

/** « 3 jours et 6 heures », « 18 heures », « moins d’une heure ». */
export function formatRemaining(content: GameContent, hours: number): string {
  if (hours < 1) return msg(content, 'time.lessThanHour');
  const days = Math.floor(hours / 24);
  const h = Math.round(hours - days * 24);
  const d = days > 0 ? msg(content, days > 1 ? 'time.days' : 'time.day', { n: days }) : '';
  const hh = h > 0 ? msg(content, h > 1 ? 'time.hours' : 'time.hour', { n: h }) : '';
  return d && hh ? msg(content, 'time.and', { a: d, b: hh }) : d || hh;
}
