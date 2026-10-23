/**
 * Balayage systématique de l'interface (export web, Playwright) sur les vrais
 * écrans du jeu, dans l'état de chaque maquette :
 *
 *  A. Mise en page : maquettes × 3 tailles d'iPhone × 2 langues × 2 tailles de
 *     texte. Échecs : erreur JavaScript, écran vide, élément qui déborde
 *     horizontalement de l'écran (hors zones défilantes prévues pour).
 *  B. Chaque bouton : pour chaque maquette et chaque langue, on recharge l'état
 *     et on appuie sur UN bouton, puis on vérifie : pas d'erreur, pas de page
 *     figée, pas d'écran vide.
 *
 *   npx expo export --platform web --output-dir dist
 *   node scripts/ui-matrix.mjs [A|B|AB]
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, ROOT, serve } from '../promo/lib.mjs';

const MODE = process.argv[2] ?? 'AB';
const MOCKUPS = ['title', 'create-id', 'create-profile', 'create-stats', 'create-summary', 'transition', 'story', 'story-art', 'story-locked', 'story-check', 'combat', 'boss', 'recap', 'archives', 'workshop', 'character', 'inventory', 'inventory-empty', 'map', 'quests', 'chronicle', 'chapter-end', 'pause', 'settings', 'saves', 'tutorial', 'tutorial-tab', 'relay', 'memories', 'story-paper', 'death', 'ending'];
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 393, height: 852 },
  { width: 440, height: 956 },
];
const LANGS = ['fr', 'en'];
const SCALES = [1, 1.3];

const { server, url } = await serve({ '/': join(ROOT, 'dist') });
const browser = await launch();
const results = { layout: { runs: 0, failures: [] }, buttons: { runs: 0, failures: [], perMockup: {} } };
const T0 = Date.parse('2026-10-23T10:00:00Z');
const timeout = (p, ms, label) => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(new Error(`figé : ${label}`)), ms))]);

async function open(ctx, id, lang, scale) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0 + 1000);
  await page.goto(`${url}/?promo=${id}&lang=${lang}${scale !== 1 ? `&scale=${scale}` : ''}`);
  for (let i = 0; i < 60; i += 1) {
    if (await page.evaluate(() => document.fonts.status === 'loaded' && document.body.innerText.trim().length > 10)) break;
    await page.clock.runFor(100);
  }
  await page.clock.runFor(1500);
  return { page, errors };
}

const advance = async (page, ms) => {
  for (let t = 0; t < ms; t += 100) await page.clock.runFor(100);
};

/**
 * Éléments visibles qui sortent de l'écran ou de leur conteneur en largeur (donc coupés).
 * Seuls les conteneurs à défilement horizontal (rangées de puces) sont autorisés à déborder.
 */
const overflowProbe = () => {
  const W = innerWidth;
  const bad = [];
  for (const el of document.querySelectorAll('div, span, button, input')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
    if (!(el.textContent || '').trim()) continue;
    let hiddenParent = false;
    let clip = null;
    for (let a = el.parentElement; a; a = a.parentElement) {
      const sa = getComputedStyle(a);
      if (Number(sa.opacity) === 0 || sa.display === 'none') {
        hiddenParent = true;
        break;
      }
      if (!clip && sa.overflowX !== 'visible') clip = a;
    }
    if (hiddenParent) continue;
    if (clip) {
      const horizontal = /(auto|scroll)/.test(getComputedStyle(clip).overflowX) && clip.scrollWidth > clip.clientWidth + 1;
      if (horizontal) continue;
      const c = clip.getBoundingClientRect();
      if (r.right > c.right + 1.5 || r.left < c.left - 1.5) {
        bad.push(`coupé : ${(el.textContent || '').trim().slice(0, 40)} [${Math.round(r.left)}→${Math.round(r.right)} dans ${Math.round(c.left)}→${Math.round(c.right)}]`);
        continue;
      }
    }
    if (r.right > W + 1.5 || r.left < -1.5) bad.push(`hors écran : ${(el.textContent || '').trim().slice(0, 40)} [${Math.round(r.left)}→${Math.round(r.right)} / ${W}]`);
  }
  return [...new Set(bad)].slice(0, 4);
};

const buttonsProbe = () =>
  [...document.querySelectorAll('[role=button],[role=radio],[role=tab],[role=switch],[role=checkbox],[role=adjustable],button,input')]
    .map((el, index) => {
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      const ok = r.width > 4 && r.height > 4 && cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight && top && (el === top || el.contains(top));
      return ok ? { index, x: cx, y: cy, input: el.tagName === 'INPUT', label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 50) } : null;
    })
    .filter(Boolean);

if (MODE.includes('A')) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    for (const lang of LANGS)
      for (const scale of SCALES)
        for (const id of MOCKUPS) {
          const label = `${id} ${lang} ${vp.width}×${vp.height} texte×${scale}`;
          results.layout.runs += 1;
          try {
            const { page, errors } = await open(ctx, id, lang, scale);
            const text = await timeout(page.evaluate(() => document.body.innerText.trim().length), 8000, label);
            const over = await page.evaluate(overflowProbe);
            if (errors.length) results.layout.failures.push(`${label} : erreur ${errors[0]}`);
            if (text < 15) results.layout.failures.push(`${label} : écran vide`);
            if (over.length) results.layout.failures.push(`${label} : débordement ${over.join(' ; ')}`);
            await page.close();
          } catch (e) {
            results.layout.failures.push(`${label} : ${e.message}`);
          }
        }
    await ctx.close();
    console.log(`A : ${vp.width}×${vp.height} fait (${results.layout.runs} rendus, ${results.layout.failures.length} échecs)`);
  }
}

if (MODE.includes('B')) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
  for (const lang of LANGS)
    for (const id of MOCKUPS) {
      const first = await open(ctx, id, lang, 1);
      const buttons = (await first.page.evaluate(buttonsProbe)).slice(0, 40);
      await first.page.close();
      results.buttons.perMockup[`${id}/${lang}`] = buttons.length;
      for (const b of buttons) {
        const label = `${id} ${lang} « ${b.label} »`;
        results.buttons.runs += 1;
        try {
          const { page, errors } = await open(ctx, id, lang, 1);
          const now = (await page.evaluate(buttonsProbe)).find((x) => x.index === b.index) ?? b;
          await page.mouse.move(now.x, now.y);
          await page.mouse.down();
          await advance(page, 80);
          await page.mouse.up();
          if (now.input) await page.keyboard.type('Zoé d’Ébène 🔥 <script>');
          await advance(page, 1500);
          const text = await timeout(page.evaluate(() => document.body.innerText.trim().length), 8000, label);
          if (errors.length) results.buttons.failures.push(`${label} : erreur ${errors[0]}`);
          if (text < 15) results.buttons.failures.push(`${label} : écran vide après l'appui`);
          await page.close();
        } catch (e) {
          results.buttons.failures.push(`${label} : ${e.message}`);
        }
      }
      console.log(`B : ${id}/${lang} — ${buttons.length} boutons (${results.buttons.runs} appuis au total, ${results.buttons.failures.length} échecs)`);
    }
  await ctx.close();
}

await browser.close();
server.close();
const out = join(ROOT, 'promo', '.cache', 'ui-matrix.json');
writeFileSync(out, JSON.stringify(results, null, 1));
console.log(`Mise en page : ${results.layout.runs} rendus, ${results.layout.failures.length} échecs`);
console.log(`Boutons : ${results.buttons.runs} appuis, ${results.buttons.failures.length} échecs`);
for (const f of [...results.layout.failures, ...results.buttons.failures].slice(0, 60)) console.log(`✗ ${f}`);
if (results.layout.failures.length || results.buttons.failures.length) process.exitCode = 1;
