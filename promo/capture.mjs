/**
 * Filme la vraie application, image par image, avec une horloge virtuelle :
 * chaque image avance le temps de l'application d'exactement 1/30 s, si bien
 * que les animations (fondus, barres de vie, transitions) sont parfaitement
 * fluides quel que soit le temps de capture.
 *
 *   npx expo export --platform web --output-dir dist
 *   node promo/capture.mjs --lang fr [--clips howler,combat] [--scale 2.5]
 *
 * Sortie : promo/.cache/<lang>/<plan>/0000.jpg … et meta.json (appuis, durée).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIPS } from './clips.mjs';
import { arg, CACHE, FPS, launch, ROOT, serve } from './lib.mjs';

const lang = arg('lang', 'fr');
const scale = Number(arg('scale', '2.5'));
const only = arg('clips', '')?.split(',').filter(Boolean);
const VIEWPORT = { width: 393, height: 852 };

const pick = (v) => (v && typeof v === 'object' && !(v instanceof RegExp) && ('fr' in v || 'en' in v) ? v[lang] : v);

async function settle(page) {
  // Polices et premier rendu : on fait avancer l'horloge jusqu'à ce que l'application soit prête.
  for (let i = 0; i < 120; i += 1) {
    const ready = await page.evaluate(() => document.fonts.status === 'loaded' && (document.body.innerText || '').trim().length > 20);
    if (ready) return;
    await page.clock.runFor(100);
    await page.waitForTimeout(20);
  }
  throw new Error('application non prête');
}

/** Élément défilant principal (le plus grand contenu défilable visible). */
async function scrollTarget(page, to, offset) {
  return page.evaluate(
    ({ to, offset }) => {
      const els = [...document.querySelectorAll('div')].filter((d) => {
        const st = getComputedStyle(d);
        return /(auto|scroll)/.test(st.overflowY) && d.scrollHeight > d.clientHeight + 4 && d.clientHeight > 300;
      });
      els.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
      const el = els[0];
      if (!el) return null;
      el.dataset.promoScroll = '1';
      let y = typeof to === 'number' ? to : 0;
      if (typeof to === 'string') {
        const node = [...el.querySelectorAll('*')].find((n) => n.childElementCount === 0 && n.textContent.trim() === to);
        if (node) y = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - offset;
      }
      return { from: el.scrollTop, to: Math.max(0, Math.min(y, el.scrollHeight - el.clientHeight)) };
    },
    { to, offset },
  );
}

async function locate(page, tap) {
  if (tap.role) return page.getByRole(tap.role, { name: pick(tap.name) }).first();
  if (tap.label) return page.getByLabel(pick(tap.label)).first();
  return page.getByText(pick(tap.text), { exact: true }).first();
}

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

async function captureClip(browser, base, clip) {
  const dir = join(CACHE, lang, clip.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: scale, locale: lang === 'en' ? 'en-GB' : 'fr-FR', hasTouch: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Horloge virtuelle à l'arrêt : seul runFor() fait avancer le temps de l'application.
  const T0 = Date.parse('2026-10-12T21:40:00Z');
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0 + 1000);
  await page.goto(`${base}/?promo=${clip.mockup}&lang=${lang}`, { waitUntil: 'networkidle' });
  await settle(page);

  const frames = Math.round(clip.duration * FPS);
  const taps = [];
  const scrolls = [];
  let held = null;
  for (let f = 0; f < frames; f += 1) {
    const t = f / FPS;
    for (const a of clip.actions ?? []) {
      if (Math.abs(a.at - t) > 0.5 / FPS) continue;
      if (a.scroll) {
        const to = typeof a.scroll.to === 'number' ? a.scroll.to : pick(a.scroll.to.text);
        const r = await scrollTarget(page, to, a.offset ?? a.scroll.offset ?? 0);
        if (r) scrolls.push({ ...r, start: f, end: f + Math.round(a.scroll.dur * FPS) });
      }
      if (a.tap) {
        const loc = await locate(page, a.tap);
        const box = await loc.boundingBox();
        if (!box) throw new Error(`${clip.id} : cible introuvable ${JSON.stringify(a.tap)}`);
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        held = { until: f + 4 };
        taps.push({ t, x: Math.round(x), y: Math.round(y) });
      }
    }
    for (const s of scrolls) {
      if (f < s.start || f > s.end) continue;
      const k = ease((f - s.start) / Math.max(1, s.end - s.start));
      await page.evaluate((y) => {
        const el = document.querySelector('[data-promo-scroll="1"]');
        if (el) el.scrollTop = y;
      }, s.from + (s.to - s.from) * k);
    }
    if (held && f >= held.until) {
      await page.mouse.up();
      held = null;
    }
    await page.screenshot({ path: join(dir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
    const next = Math.round(((f + 1) * 1000) / FPS) - Math.round((f * 1000) / FPS);
    await page.clock.runFor(next);
  }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id: clip.id, lang, fps: FPS, frames, viewport: VIEWPORT, scale, taps }, null, 1));
  await ctx.close();
  if (errors.length) console.warn(`  ⚠ ${clip.id} : ${errors.slice(0, 3).join(' | ')}`);
  console.log(`  ${clip.id} : ${frames} images${taps.length ? `, ${taps.length} appui(s)` : ''}`);
}

const { server, url } = await serve({ '/': join(ROOT, 'dist') });
const browser = await launch();
console.log(`Capture (${lang}, ×${scale})`);
try {
  for (const clip of CLIPS) if (!only?.length || only.includes(clip.id)) await captureClip(browser, url, clip);
} finally {
  await browser.close();
  server.close();
}
