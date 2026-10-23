/**
 * Bot explorateur : parties dont les choix privilégient ceux jamais encore joués.
 * Mesure la couverture réelle du récit (choix, scènes, fins) par de vraies parties.
 *
 *   npx tsx scripts/explore-choices.ts [parties=3000] [fr|en]
 */
import { contentFor } from '../src/content/localized';
import { performAction } from '../src/engine/combat';
import { choiceViews, choose, newGame, resolveCombat } from '../src/engine/narrative';
import { botCombatAction, PRESET_DRAFTS } from '../src/engine/simulate';
import { canRelay, relayCandidates, takeOver } from '../src/engine/relay';
import type { GameState } from '../src/engine/types';
const lang = (process.argv[3] ?? 'fr') as 'fr' | 'en';
const C = contentFor(lang);
const GAMES = Number(process.argv[2] ?? 3000);
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const all = new Set<string>();
for (const sc of Object.values(C.scenes)) for (const ch of sc.choices) all.add(`${sc.id}/${ch.id}`);
const taken = new Map<string, number>();
const scenes = new Set<string>();
const endings = new Set<string>();
const startScenes = C.chapters.map((c) => c.start);
let errors = 0;
for (let g = 0; g < GAMES; g++) {
  let s: GameState = newGame(C, PRESET_DRAFTS[g % PRESET_DRAFTS.length], { seed: g * 7919 + 1, id: `cov-${g}`, now: 0 });
  // Une partie sur deux démarre à un chapitre au hasard (comme « Rejouer un chapitre ») pour couvrir la fin du jeu.
  if (g % 2 && g > 10) {
    const st = startScenes[Math.floor(rnd() * startScenes.length)];
    s = { ...s, currentScene: st, chapter: C.scenes[st].chapter };
  }
  const rng = { seed: g + 3 };
  for (let i = 0; i < 3000; i++) {
    scenes.add(s.currentScene);
    if (s.ending) {
      endings.add(s.ending.id);
      if (s.ending.kind === 'death' && canRelay(C, s) && rnd() < 0.7) { s = takeOver(C, s, relayCandidates(C, s)[0].character); continue; }
      break;
    }
    if (s.combat) {
      if (s.combat.outcome !== 'ongoing') { s = resolveCombat(C, s); continue; }
      const n = performAction(C, s, botCombatAction(C, s, rng, rnd() < 0.5 ? 'prudent' : 'aleatoire'));
      s = n === s ? performAction(C, s, { type: 'defend' }) : n;
      continue;
    }
    const views = choiceViews(C, s).filter((v) => v.available);
    if (!views.length) { errors++; break; }
    // Priorité aux choix jamais pris, sinon au hasard.
    const fresh = views.filter((v) => !taken.has(`${s.currentScene}/${v.choice.id}`));
    const v = fresh.length && rnd() < 0.85 ? fresh[Math.floor(rnd() * fresh.length)] : views[Math.floor(rnd() * views.length)];
    const key = `${s.currentScene}/${v.choice.id}`;
    const res = choose(C, s, s.currentScene, v.choice.id);
    if (!res.ok) { errors++; break; }
    taken.set(key, (taken.get(key) ?? 0) + 1);
    s = res.state;
  }
}
const missing = [...all].filter((k) => !taken.has(k));
console.log(`[${lang}] ${GAMES} parties : choix joués ${all.size - missing.length}/${all.size}, scènes vues ${scenes.size}/${Object.keys(C.scenes).length}, fins/morts atteintes ${endings.size}/${Object.keys(C.endings).length}, impasses/erreurs ${errors}`);
if (missing.length) console.log('Jamais joués :', missing.slice(0, 40).join(' · '), missing.length > 40 ? `… (+${missing.length - 40})` : '');
