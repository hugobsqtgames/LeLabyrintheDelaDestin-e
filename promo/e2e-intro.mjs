/**
 * Bande-annonce d'introduction, de bout en bout, sur la version web exportée (Playwright).
 *
 * Le Chromium de test ne lit pas le H.264 (codec breveté absent des builds libres) : la
 * requête de la vidéo est interceptée et servie en VP9 (même film, transcodé), le reste
 * de l'application est le vrai code. La lecture se fait en temps réel (pas d'horloge simulée).
 *
 *   npx expo export --platform web --output-dir dist && node promo/e2e-intro.mjs
 *
 * Scénarios : premier lancement (lecture, vidéo de la bonne langue, fin, écran titre), relance
 * (pas d'intro), « Revoir » depuis les paramètres puis « Passer » (retour aux paramètres),
 * « Passer » à plusieurs instants, arrière-plan / premier plan, vidéo impossible à lire.
 * Les titres sont incrustés dans la vidéo : leur minutage est vérifié par tests/intro.test.ts.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { launch, ROOT, serve } from './lib.mjs';

const MP4 = join(ROOT, 'assets', 'video', 'intro-fr.mp4');
const WEBM = join(ROOT, 'cinematic', 'out', 'intro-test.webm');
if (!existsSync(WEBM) || statSync(WEBM).mtimeMs < statSync(MP4).mtimeMs) {
  console.log('Transcodage VP9 de la vidéo pour le navigateur de test…');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', MP4, '-vf', 'scale=540:-2', '-c:v', 'libvpx-vp9', '-b:v', '900k', '-deadline', 'realtime', '-cpu-used', '8', '-an', WEBM]);
}

const { server, url } = await serve({ '/': join(ROOT, 'dist') });
const browser = await launch();
const results = [];
const errors = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function session({ broken = false, locale = 'fr-FR' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale });
  const page = await ctx.newPage();
  page.requested = [];
  page.on('request', (r) => /intro.*\.mp4/.test(r.url()) && page.requested.push(r.url()));
  page.on('pageerror', (e) => errors.push(`exception : ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console : ${m.text().slice(0, 200)}`));
  await page.route(/intro.*\.mp4/, (route) => (broken ? route.abort() : route.fulfill({ path: WEBM, contentType: 'video/webm' })));
  return { ctx, page };
}
const has = async (page, text) => (await page.getByText(text, { exact: false }).count()) > 0;
const visible = async (page, text) => {
  const loc = page.getByText(text, { exact: false });
  if (!(await loc.count())) return false;
  return loc.first().evaluate((el) => {
    let o = 1;
    for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o > 0.5;
  });
};
const videoTime = (page) => page.evaluate(() => document.querySelector('video')?.currentTime ?? -1);
const waitFor = async (page, fn, ms, step = 100) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await page.waitForTimeout(step);
  }
  return false;
};
const settings = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('labyrinthe:v1:settings') ?? '{}'));
const skip = (page) => page.getByRole('button', { name: 'Passer', exact: true }).click();

// 1 · Premier lancement : l'introduction joue, ses textes apparaissent au bon moment, puis l'écran titre.
{
  const { ctx, page } = await session();
  await page.goto(url);
  check('premier lancement : « Passer » visible dès le début', await waitFor(page, () => page.getByRole('button', { name: 'Passer' }).isVisible().catch(() => false), 8000));
  check('premier lancement : l’écran titre n’apparaît pas avant l’intro', !(await has(page, 'Nouvelle partie')));
  check('la vidéo démarre', await waitFor(page, async () => (await videoTime(page)) > 0.3, 8000), `t = ${(await videoTime(page)).toFixed(2)} s`);
  check('vidéo française demandée', page.requested.some((u) => u.includes('intro-fr')) && !page.requested.some((u) => u.includes('intro-en')));
  await waitFor(page, async () => (await videoTime(page)) > 12, 16000);
  check('la lecture avance au rythme normal', (await videoTime(page)) > 11.5);
  check('pas d’écran titre pendant la bande-annonce', !(await has(page, 'Nouvelle partie')));
  check('intro marquée comme vue dès le début', (await settings(page)).introSeen === true);
  check('fin : l’écran titre s’ouvre tout seul', await waitFor(page, () => has(page, 'Nouvelle partie'), 25000));
  check('fin : plus de vidéo à l’écran', (await page.locator('video').count()) === 0);
  // 2 · Relance : pas d'introduction.
  await page.reload();
  await waitFor(page, () => has(page, 'Nouvelle partie'), 10000);
  check('relance : directement l’écran titre', (await has(page, 'Nouvelle partie')) && !(await page.getByRole('button', { name: 'Passer' }).count()));
  // 3 · Revoir depuis les paramètres, puis « Passer » : retour aux paramètres.
  await page.getByRole('button', { name: 'Paramètres', exact: true }).first().click();
  await page.getByRole('button', { name: 'Revoir l’introduction' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Revoir l’introduction' }).click();
  check('revoir : l’introduction se relance', await waitFor(page, async () => (await videoTime(page)) > 0.5, 8000));
  await skip(page);
  check('revoir puis passer : retour aux paramètres', await waitFor(page, () => has(page, 'Revoir l’introduction'), 4000));
  await ctx.close();
}

// 4 · « Passer » à différents instants (et double appui) : l'écran titre, une seule fois.
for (const at of [0, 3, 15, 25]) {
  const { ctx, page } = await session();
  await page.goto(url);
  await waitFor(page, () => page.getByRole('button', { name: 'Passer' }).isVisible().catch(() => false), 8000);
  if (at > 0) await waitFor(page, async () => (await videoTime(page)) > at, (at + 10) * 1000);
  const b = page.getByRole('button', { name: 'Passer' });
  await b.click();
  await b.click({ timeout: 300 }).catch(() => undefined);
  const ok = await waitFor(page, () => has(page, 'Nouvelle partie'), 4000);
  check(`passer à ${at} s : écran titre`, ok && (await page.locator('video').count()) === 0);
  check(`passer à ${at} s : intro marquée comme vue`, (await settings(page)).introSeen === true);
  await ctx.close();
}

// 4 bis · Anglais : la vidéo anglaise.
{
  const { ctx, page } = await session({ locale: 'en-GB' });
  await page.goto(url);
  await waitFor(page, async () => (await videoTime(page)) > 0.5, 10000);
  check('anglais : vidéo anglaise demandée', page.requested.some((u) => u.includes('intro-en')) && !page.requested.some((u) => u.includes('intro-fr')));
  const skipBtn = page.getByRole('button', { name: 'Skip', exact: true });
  check('anglais : bouton « Skip »', (await skipBtn.count()) > 0);
  await skipBtn.click();
  check('anglais : écran titre après « Skip »', await waitFor(page, () => has(page, 'New game'), 4000));
  await ctx.close();
}

// 5 · Arrière-plan : la lecture s'arrête, puis reprend au même endroit.
{
  const { ctx, page } = await session();
  await page.goto(url);
  await waitFor(page, async () => (await videoTime(page)) > 4, 12000);
  const setHidden = (hidden) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await setHidden(true);
  await page.waitForTimeout(300);
  const t1 = await videoTime(page);
  await page.waitForTimeout(2000);
  const t2 = await videoTime(page);
  check('arrière-plan : la vidéo est en pause', Math.abs(t2 - t1) < 0.05, `${t1.toFixed(2)} → ${t2.toFixed(2)} s`);
  await setHidden(false);
  await page.waitForTimeout(1500);
  const t3 = await videoTime(page);
  check('premier plan : la lecture reprend au même endroit', t3 > t2 + 0.5 && t3 < t2 + 3, `${t2.toFixed(2)} → ${t3.toFixed(2)} s`);
  await ctx.close();
}

// 6 · Vidéo impossible à charger : jamais bloqué, l'écran titre s'ouvre.
{
  const { ctx, page } = await session({ broken: true });
  const t0 = Date.now();
  await page.goto(url);
  const ok = await waitFor(page, () => has(page, 'Nouvelle partie'), 12000);
  check('vidéo absente : l’écran titre s’ouvre quand même', ok, `${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await ctx.close();
}

await browser.close();
server.close();
const bad = results.filter((r) => !r.ok);
const realErrors = errors.filter((e) => !/net::ERR_FAILED|Failed to load resource/.test(e));
console.log(`\n${results.length - bad.length}/${results.length} vérifications réussies ; erreurs console : ${realErrors.length}`);
for (const e of realErrors.slice(0, 10)) console.log(`  ${e}`);
if (bad.length || realErrors.length) process.exitCode = 1;
