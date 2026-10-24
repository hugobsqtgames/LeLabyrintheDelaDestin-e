/**
 * Capture des dessins du jeu (illustrations, portraits, ennemis) depuis l'export web,
 * à la résolution de la cinématique : cinematic/assets/*.png (fond transparent pour
 * les portraits et ennemis). Ce sont les vrais composants de l'application.
 *
 *   npx expo export --platform web --output-dir dist && node cinematic/capture-art.mjs
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, ROOT, serve } from '../promo/lib.mjs';

const OUT = join(ROOT, 'cinematic', 'assets');
mkdirSync(OUT, { recursive: true });
const ART = ['hurleur', 'brasserie', 'berger', 'berge', 'port', 'ecluse', 'maree', 'triage', 'vergers', 'peage', 'prieure', 'barrage', 'convoi', 'dame', 'brennes', 'draisine', 'gue', 'veillee'];
const PORTRAITS = ['maelle', 'theo', 'kaz', 'ines', 'sorel', 'guerrier', 'eclaireur', 'technicien', 'nour', 'gaspard', 'vautrin'];
const ENEMIES = ['berger', 'hurleur', 'rodeur', 'coureur', 'colosse', 'pillard'];
const only = process.argv[2]?.split(',');

const { server, url } = await serve({ '/': join(ROOT, 'dist') });
const browser = await launch();
async function shot(id, file, { w, h, scale, transparent }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.goto(`${url}/?promo=${id}`);
  await page.waitForTimeout(1500);
  if (transparent) await page.evaluate(() => document.querySelectorAll('html, body, #root, #root > div, #root div').forEach((e) => (e.style.background = 'transparent')));
  await page.screenshot({ path: join(OUT, file), omitBackground: !!transparent });
  await page.close();
}
for (const a of ART) if (!only || only.includes(a)) await shot(`art-${a}`, `art-${a}.png`, { w: 390, h: 845, scale: 2.77, transparent: false });
if (!only) {
  for (const p of PORTRAITS) await shot(`portrait-${p}`, `portrait-${p}.png`, { w: 360, h: 450, scale: 3, transparent: true });
  for (const e of ENEMIES) await shot(`enemy-${e}`, `enemy-${e}.png`, { w: 360, h: 450, scale: 3, transparent: true });
}
await browser.close();
server.close();
console.log(`captures : ${OUT}`);
