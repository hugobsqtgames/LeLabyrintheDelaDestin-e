/**
 * Parcours de bout en bout sur la version web exportée (Playwright) : allers-retours
 * accueil ↔ sauvegardes ↔ création, création complète, tutoriel, pause, paramètres,
 * retour au menu, reprise. Échoue si un écran attendu manque ; liste les erreurs console.
 *
 *   npx expo export --platform web --output-dir dist && node promo/e2e-flow.mjs
 */
import { launch, serve, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync(join(ROOT, 'promo', '.cache'), { recursive: true });
const { server, url } = await serve({ '/': join(ROOT, 'dist') });
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: 'fr-FR' });
page.setDefaultTimeout(8000);
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
const adv = async (ms) => { for (let t = 0; t < ms; t += 50) { await page.clock.runFor(50); } };
const log = (...a) => console.log('•', ...a);
const btn = (name) => page.getByRole('button', { name, exact: true }).first();
const tap = async (loc) => { await loc.scrollIntoViewIfNeeded().catch(() => {}); const b = await loc.boundingBox(); if (!b) throw new Error('introuvable'); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await adv(60); await page.mouse.up(); };
const click = async (name) => { await tap(btn(name)); await adv(700); log('clic', name); };
const has = async (text) => (await page.getByText(text, { exact: false }).count()) > 0;
const T0 = Date.parse('2026-10-17T10:00:00Z');
await page.clock.install({ time: T0 });
await page.clock.pauseAt(T0 + 1000);
await page.goto(url);
for (let i = 0; i < 150 && !(await page.evaluate(() => document.fonts.status === 'loaded' && document.body.innerText.includes('Nouvelle partie'))); i++) { await page.clock.runFor(100); await page.waitForTimeout(20); }
log('accueil OK');
// Boucle accueil ↔ sauvegardes ↔ création, trois fois
for (let i = 0; i < 3; i++) {
  await click('Nouvelle partie');
  if (!(await has('Commencer ici'))) throw new Error('écran sauvegardes absent');
  await click('Commencer ici');
  if (!(await has('Identité'))) throw new Error('création absente');
  await click('Retour');
  if (!(await has('Commencer ici'))) throw new Error('retour création → sauvegardes KO');
  await click('Retour');
  if (!(await has('Nouvelle partie'))) throw new Error('retour sauvegardes → accueil KO');
}
log('3 allers-retours sans boucle');
// Paramètres depuis l'accueil
await click('Paramètres');
await click('Retour');
if (!(await has('Nouvelle partie'))) throw new Error('paramètres → accueil KO');
// Mémoires
await click('Mémoires');
await click('Retour');
if (!(await has('Nouvelle partie'))) throw new Error('mémoires → accueil KO');
log('paramètres et mémoires reviennent à l’accueil');
// Création complète
await click('Nouvelle partie');
await click('Commencer ici');
await page.getByLabel('Votre nom').first().fill('Audit').catch(async () => { await page.locator('input').first().fill('Audit'); });
for (let i = 0; i < 9; i++) {
  if (await btn('Prendre la garde').count()) break;
  if ((await page.locator('[aria-label="Continuer"][aria-disabled="true"]').count()) > 0) {
    const radio = page.getByRole('radio');
    if (await radio.count()) { await tap(radio.first()); await adv(300); log('choix d’une option'); }
    else if (await page.getByLabel('Ajouter un point à Survie').count()) {
      for (const st of ['Survie', 'Astuce', 'Discrétion', 'Force', 'Survie', 'Astuce', 'Discrétion', 'Force']) {
        const plus = page.locator(`[aria-label="Ajouter un point à ${st}"]:not([aria-disabled="true"])`);
        if (await plus.count()) { await tap(plus.first()); await adv(150); }
      }
      log('points répartis');
    }
    else { const pick = page.getByLabel('Corbeau'); if (await pick.count()) { await tap(pick.first()); await adv(300); log('emblème'); } }
  }
  const names = await page.getByRole('button').allInnerTexts();
  const next = names.find((n) => /Continuer|Suivant/.test(n));
  if (!next) { log('boutons', names.join(' | ')); break; }
  await click(next.trim());
}
log('écran :', (await page.evaluate(() => document.body.innerText)).replace(/\n/g, ' | ').slice(0, 700));
log('boutons :', (await page.getByRole('button').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.innerText) + (e.getAttribute('aria-disabled') === 'true' ? '[off]' : '')))).join(' / '));
// double appui volontaire sur « Prendre la garde »
{ const b = await btn('Prendre la garde').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { clickCount: 1 }); await adv(80); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
await adv(300);
log('carton de chapitre visible après double appui :', await has('Passer') || (await page.getByLabel(/passer/i).count()) > 0);
await adv(6000);
// Tutoriel
if (await btn('Suivant').count()) { await click('Suivant'); log('tutoriel étape 2'); }
if (await btn('Passer le tutoriel').count()) await click('Passer le tutoriel');
const before = await page.evaluate(() => document.body.innerText.slice(0, 200));
log('partie affichée :', before.replace(/\n/g, ' ').slice(0, 120));
// Un choix
const cards = page.getByRole('button');
await page.screenshot({ path: join(ROOT, 'promo', '.cache', 'e2e-game.png') });
const pause = page.getByRole('button', { name: 'Pause', exact: true }).first();
if (await pause.count()) { await tap(pause); await adv(500); log('pause ouverte', await has('Reprendre')); }
if (await btn('Paramètres').count()) { await click('Paramètres'); await click('Retour'); log('paramètres depuis la partie → retour : partie ?', !(await has('Nouvelle partie'))); }
log('élément sous Pause :', await page.evaluate(() => { const e = document.elementFromPoint(347, 34); let s = []; for (let n = e; n && s.length < 6; n = n.parentElement) s.push(n.tagName + '[' + (n.getAttribute('aria-label') || n.getAttribute('role') || '') + '] z=' + getComputedStyle(n).zIndex + ' pos=' + getComputedStyle(n).position); return s.join(' < '); }));
log('modales dans le DOM :', await page.evaluate(() => document.querySelectorAll('[aria-modal="true"], [role="dialog"]').length));
log('après retour des paramètres, pause ouverte ?', await has('Reprendre'), 'bouton Reprendre:', await btn('Reprendre').count());
if (await btn('Reprendre').count()) await click('Reprendre');
log('après Reprendre, pause ouverte ?', await has('Quitter vers le menu'));
await adv(1200); if (await pause.count()) { await tap(pause); await adv(1000); if (!(await has('Quitter vers le menu'))) throw new Error('pause impossible à rouvrir après les paramètres'); }
await page.screenshot({ path: join(ROOT, 'promo', '.cache', 'e2e-pause.png') }); log('pause box', JSON.stringify(await pause.boundingBox()));
log('boutons pause :', (await page.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.innerText.slice(0, 30)))).join(' / '));
if (await btn('Quitter vers le menu').count()) { await click('Quitter vers le menu'); }
log('après quitter :', (await page.evaluate(() => document.body.innerText)).replace(/\n/g, ' | ').slice(0, 300));
if (!(await has('Nouvelle partie'))) throw new Error('quitter vers le menu KO');
log('retour accueil OK');
if (await btn('Continuer').count()) { await click('Continuer'); log('reprise partie OK :', !(await has('Nouvelle partie'))); }
// Tout effacer : pause → paramètres → deux confirmations → accueil vierge.
await adv(1200);
await tap(pause); await adv(1000);
await click('Paramètres');
await btn('Tout effacer').scrollIntoViewIfNeeded();
await click('Tout effacer');
if (!(await has('Tout effacer ?'))) throw new Error('première confirmation absente');
await click('Continuer');
if (!(await has('Dernière confirmation'))) throw new Error('seconde confirmation absente');
await click('Oui, tout effacer');
await adv(1500);
const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('labyrinthe:')));
log('après effacement :', (await page.evaluate(() => document.body.innerText)).replace(/\n/g, ' | ').slice(0, 160));
log('clés restantes :', stored.join(', ') || 'aucune');
if (await btn('Continuer').count()) throw new Error('une partie est encore proposée après « Tout effacer »');
const leftovers = await page.evaluate(() => ({ meta: JSON.parse(localStorage.getItem('labyrinthe:v1:meta') ?? '{}'), settings: JSON.parse(localStorage.getItem('labyrinthe:v1:settings') ?? '{}') }));
if (leftovers.meta.runs || Object.keys(leftovers.meta.achievements ?? {}).length || (leftovers.meta.scenes ?? []).length) throw new Error('mémoires non remises à zéro');
if (leftovers.settings.tutorialDone) throw new Error('paramètres non remis à zéro');
if (stored.some((k) => k.includes(':slot:') || k.includes(':chapitre:'))) throw new Error('des sauvegardes restent après « Tout effacer »');
await click('Nouvelle partie');
if (!(await has('Vide'))) throw new Error('emplacements non vides après « Tout effacer »');
log('tout effacer OK');
console.log('ERREURS CONSOLE', errors.length, errors.slice(0, 10));
await browser.close(); server.close();
if (errors.length) process.exit(1);
