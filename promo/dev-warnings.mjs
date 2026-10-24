/**
 * Avertissements du mode développement (ceux qu'Expo Go affiche en bas de l'écran) :
 * parcours création → tutoriel complet → onglets → combat de démonstration, sur un
 * export web en mode dev. Tout console.warn / console.error est relevé.
 *
 *   npx expo export --platform web --dev --output-dir dist-dev && node promo/dev-warnings.mjs [dist-dev]
 */
import { join, resolve } from 'node:path';
import { launch, ROOT, serve } from './lib.mjs';

const DIST = resolve(process.argv[2] ?? join(ROOT, 'dist-dev'));
const LANG = process.argv[3] ?? 'fr';
const { server, url } = await serve({ '/': DIST });
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: LANG === 'en' ? 'en-US' : 'fr-FR' });
page.setDefaultTimeout(8000);
const seen = new Map();
const where = { step: 'démarrage' };
page.on('console', (m) => {
  if (m.type() !== 'error' && m.type() !== 'warning') return;
  const text = m.text().replace(/\s+/g, ' ').slice(0, 300);
  const k = text.slice(0, 120);
  if (!seen.has(k)) seen.set(k, { type: m.type(), text, at: where.step, n: 0 });
  seen.get(k).n += 1;
});
page.on('pageerror', (e) => seen.set('PAGE ' + e.message, { type: 'pageerror', text: e.message, at: where.step, n: 1 }));
const adv = async (ms) => { for (let t = 0; t < ms; t += 50) await page.clock.runFor(50); };
const btn = (name) => page.getByRole('button', { name, exact: true }).first();
const tap = async (loc) => { await loc.scrollIntoViewIfNeeded().catch(() => {}); const b = await loc.boundingBox(); if (!b) throw new Error('introuvable'); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await adv(60); await page.mouse.up(); };
const click = async (name) => { where.step = name; await tap(btn(name)); await adv(700); };
const L = LANG === 'en'
  ? { newGame: 'New game', here: 'Start here', next: 'Next', cont: 'Continue', take: 'Take watch', done: 'Done', name: 'Your name' }
  : { newGame: 'Nouvelle partie', here: 'Commencer ici', next: 'Suivant', cont: 'Continuer', take: 'Prendre la garde', done: 'Terminer', name: 'Votre nom' };
const T0 = Date.parse('2026-10-17T10:00:00Z');
await page.clock.install({ time: T0 });
await page.clock.pauseAt(T0 + 1000);
await page.goto(url + (LANG === 'en' ? '?lang=en' : ''));
for (let i = 0; i < 200 && !(await page.evaluate((t) => document.fonts.status === 'loaded' && document.body.innerText.includes(t), L.newGame)); i++) { await page.clock.runFor(100); await page.waitForTimeout(20); }
where.step = 'accueil';
await click(L.newGame);
await click(L.here);
await page.locator('input').first().fill('Audit');
for (let i = 0; i < 12; i++) {
  if (await btn(L.take).count()) break;
  if ((await page.locator('[aria-disabled="true"]').filter({ hasText: L.cont }).count()) > 0) {
    const radio = page.getByRole('radio');
    if (await radio.count()) { await tap(radio.first()); await adv(300); }
    else for (const plus of await page.locator('[aria-label*="+"], [aria-label^="Ajouter"], [aria-label^="Add"]').all()) { await tap(plus).catch(() => {}); await adv(120); }
  }
  const names = await page.getByRole('button').allInnerTexts();
  const next = names.find((n) => /Continuer|Suivant|Continue|Next/.test(n));
  if (!next) break;
  await click(next.trim());
}
await click(L.take);
where.step = 'carton de chapitre';
await adv(7000);
for (let i = 0; i < 20; i++) {
  if (await btn(L.next).count()) { await click(L.next); where.step = `tutoriel ${i + 2}`; await adv(800); }
  else if (await btn(L.done).count()) { await click(L.done); break; }
  else break;
}
where.step = 'après tutoriel';
await adv(3000);
// Les onglets, plusieurs fois
for (let r = 0; r < 2; r++)
  for (const tab of await page.getByRole('tab').all()) { where.step = 'onglet ' + (await tab.innerText()).trim(); await tap(tab).catch(() => {}); await adv(1500); }
// Quelques choix du récit
for (let i = 0; i < 12; i++) {
  const tabs = await page.getByRole('tab').all(); if (tabs[0]) { await tap(tabs[0]).catch(() => {}); await adv(500); }
  const choices = page.locator('[role=button]').filter({ hasText: /./ });
  const all = await choices.all();
  const pick = all[all.length - 1 - (i % 3)] ?? all[0];
  where.step = 'choix ' + (await pick.innerText().catch(() => '?')).slice(0, 40);
  await tap(pick).catch(() => {}); await adv(2500);
}
await page.screenshot({ path: join(ROOT, 'promo', '.cache', `dev-warnings-${LANG}.png`) });
await browser.close(); server.close();
console.log(`AVERTISSEMENTS/ERREURS DISTINCTS : ${seen.size}`);
for (const v of seen.values()) console.log(`[${v.type}] ×${v.n} @ ${v.at} :: ${v.text}`);
if (seen.size) process.exitCode = 1;
