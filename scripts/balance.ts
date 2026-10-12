/**
 * Équilibrage : lance de nombreux parcours automatiques et affiche la
 * répartition des fins, des morts et des scènes jamais visitées.
 *   npm run balance
 */
import { CONTENT } from '../src/content';
import { simulate, type Policy } from '../src/engine/simulate';

const policies: Policy[] = ['prudent', 'agressif', 'discret', 'relationnel', 'aleatoire'];
const runs = Number(process.argv[2] ?? 200);
const endings: Record<string, number> = {};
const deaths: Record<string, number> = {};
const visited = new Set<string>();
let stuck = 0;
for (const policy of policies) {
  const local: Record<string, number> = {};
  for (let i = 0; i < runs; i += 1) {
    const r = simulate(CONTENT, policy, 1000 + i * 7919);
    r.path.forEach((p) => visited.add(p));
    r.state.visitedScenes.forEach((p) => visited.add(p));
    const key = r.ending ?? `BLOQUÉ(${r.error ?? r.state.currentScene})`;
    if (!r.ending) stuck += 1;
    local[key] = (local[key] ?? 0) + 1;
    endings[key] = (endings[key] ?? 0) + 1;
    if (r.state.ending?.kind === 'death') {
      const where = `${r.ending} @ ${r.state.currentScene}${r.state.ending.cause ? ` (${r.state.ending.cause})` : ''}`;
      deaths[where] = (deaths[where] ?? 0) + 1;
    }
  }
  console.log(policy.padEnd(12), JSON.stringify(local));
}
console.log('\nFins :', endings);
console.log('Morts :', deaths);
const never = Object.keys(CONTENT.scenes).filter((id) => !visited.has(id));
console.log(`\nScènes jamais visitées (${never.length}) :`, never.join(', '));
console.log(`Parcours bloqués : ${stuck}`);
