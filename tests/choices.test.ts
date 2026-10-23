/**
 * Chacun des choix du récit (en français et en anglais) : placé dans sa scène,
 * conditions remplies, il doit être proposé, accepté par le moteur et mener à
 * une scène qui existe, sans exception.
 */
import { describe, expect, it } from 'vitest';
import { contentFor } from '../src/content/localized';
import { choiceViews, choose, newGame } from '../src/engine/narrative';
import { PRESET_DRAFTS } from '../src/engine/simulate';
import type { Condition, GameContent, GameState } from '../src/engine/types';

let C: GameContent;
let base: GameState;
function satisfy(s: GameState, c: Condition): GameState {
  const p = s.player;
  switch (c.type) {
    case 'stat': return { ...s, player: { ...p, stats: { ...p.stats, [c.stat]: Math.max(p.stats[c.stat], c.min) } } };
    case 'profile': return { ...s, player: { ...p, profile: c.profiles[0] } };
    case 'background': return { ...s, player: { ...p, background: c.backgrounds[0] } };
    case 'item': return { ...s, inventory: { ...s.inventory, [c.item]: Math.max(s.inventory[c.item] ?? 0, c.qty ?? 1) } };
    case 'flag': return { ...s, flags: { ...s.flags, [c.flag]: true } };
    case 'notFlag': { const f = { ...s.flags }; delete f[c.flag]; return { ...s, flags: f }; }
    case 'counter': return { ...s, counters: { ...s.counters, [c.counter]: c.min ?? Math.min(0, c.max ?? 0) } };
    case 'quest': { const q = s.quests[c.quest] ?? { status: 'active', step: null, completedSteps: [] }; return { ...s, quests: { ...s.quests, [c.quest]: { ...q, status: c.status[0] } } }; }
    case 'questStep': { const q = s.quests[c.quest] ?? { status: 'active', step: null, completedSteps: [] }; return { ...s, quests: { ...s.quests, [c.quest]: { ...q, completedSteps: [...q.completedSteps, c.step] } } }; }
    case 'relation': return { ...s, relations: { ...s.relations, [c.character]: c.min ?? c.max ?? 0 } };
    case 'companion': return { ...s, companions: { ...s.companions, [c.character]: c.status[0] } };
    case 'hp': return { ...s, player: { ...p, hp: Math.max(p.hp, c.min) } };
    case 'level': return { ...s, player: { ...p, level: Math.max(p.level, c.min) } };
    case 'perk': return { ...s, player: { ...p, perks: [...p.perks, c.perk] } };
    case 'visited': return { ...s, visitedScenes: [...s.visitedScenes, c.scene] };
    case 'infection': return { ...s, player: { ...p, infection: c.min ?? 0 } };
    case 'clock': return { ...s, clock: c.min ?? 0 };
    case 'document': return { ...s, documents: [...s.documents, c.doc] };
    case 'all': return c.conditions.reduce(satisfy, s);
    case 'any': return satisfy(s, c.conditions[0]);
    case 'not': return s;
  }
}

for (const lang of ['fr', 'en'] as const) {
  describe(`tous les choix du récit (${lang})`, () => {
    C = contentFor(lang);
    base = newGame(C, PRESET_DRAFTS[0], { seed: 5, id: 'tous', now: 0 });
    const content = C;
    const start = base;
    for (const sc of Object.values(content.scenes)) {
      it(`${sc.id} : ${sc.choices.length} choix`, () => {
        C = content;
        base = start;
        for (const ch of sc.choices) {
          const conds = [...(ch.requires ?? []), ...(ch.visibleIf ?? [])];
          let s: GameState = { ...start, currentScene: sc.id, chapter: sc.chapter, combat: null, ending: null, visitedScenes: [...start.visitedScenes, sc.id] };
          if (conds.some((c) => c.type === 'not')) s = { ...s, companions: { ...s.companions, maelle: 'companion', kaz: 'companion' } };
          for (const c of conds) s = satisfy(s, c);
          const v = choiceViews(content, s).find((x) => x.choice.id === ch.id);
          expect(v?.available, `${sc.id}/${ch.id} proposé`).toBe(true);
          const r = choose(content, s, sc.id, ch.id);
          expect(r.ok, `${sc.id}/${ch.id} accepté`).toBe(true);
          expect(content.scenes[r.state.currentScene], `${sc.id}/${ch.id} → scène existante`).toBeTruthy();
        }
      });
    }
  });
}
