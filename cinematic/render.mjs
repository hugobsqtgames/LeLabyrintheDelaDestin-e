/**
 * Rendu de la cinématique, image par image (Chromium headless + ffmpeg).
 *
 *   node cinematic/render.mjs                         # vidéo de l'app : assets/video/intro.mp4 (muette, sans texte)
 *   node cinematic/render.mjs --lang fr --audio cinematic/out/intro-mix.wav --out cinematic/out/valombre-intro-fr.mp4
 *   node cinematic/render.mjs --stills 2,8,14 --scale 0.5   # images de contrôle (cinematic/out/still-*.png)
 *
 * Options : --scale (1 = 1080×2340), --from/--to (secondes), --crf (qualité x264), --lang (textes incrustés).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arg, launch, ROOT, serve } from '../promo/lib.mjs';

const DIR = join(ROOT, 'cinematic');
const OUT = join(DIR, 'out');
mkdirSync(OUT, { recursive: true });
const timeline = JSON.parse(readFileSync(join(DIR, 'timeline.json'), 'utf8'));
const scale = Number(arg('scale', '1'));
const from = Number(arg('from', '0'));
const to = Number(arg('to', String(timeline.duration)));
const lang = arg('lang', null);
const stills = arg('stills', null);
const audio = arg('audio', null);
// CRF 26 : le grain argentique coûte cher à compresser ; 26 le garde sans aplats visibles (≈ 6 Mo pour 44 s).
const crf = arg('crf', '26');
const out = arg('out', join(ROOT, 'assets', 'video', 'intro.mp4'));

let overlay = null;
if (lang) {
  // Mêmes textes et même minutage que l'application (src/intro/script.ts, src/i18n).
  const { CUES, CUE_FADE, DAY_CUTS } = await import('../src/intro/script.ts');
  const dict = (await import(`../src/i18n/${lang}.ts`))[lang.toUpperCase()];
  const texts = Object.fromEntries(CUES.map((c) => [c.id, dict[`intro.${c.id}`] ?? '']));
  texts.day = dict['intro.day'];
  texts.radioLabel = dict['intro.radioLabel'];
  overlay = { cues: CUES, texts, fade: CUE_FADE, days: DAY_CUTS };
}

const { server, url } = await serve({ '/fonts/': join(ROOT, 'node_modules', '@expo-google-fonts'), '/': DIR });
const browser = await launch();
const W = Math.round(timeline.width * scale);
const H = Math.round(timeline.height * scale);
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('ERREUR', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()));
await page.goto(`${url}/index.html`);
const t0 = Date.now();
await page.evaluate((o) => window.setupScene(o), { timeline, scale, overlay });
console.log(`préparation : ${Date.now() - t0} ms`);
const canvas = page.locator('#frame');

if (stills) {
  for (const s of stills.split(',').map(Number)) {
    await page.evaluate((t) => window.renderFrame(t), s);
    const file = join(OUT, `still-${String(s).replace('.', '_')}${lang ? `-${lang}` : ''}.png`);
    await canvas.screenshot({ path: file });
    console.log(file);
  }
} else {
  mkdirSync(dirname(out), { recursive: true });
  const fps = timeline.fps;
  const frames = Math.round((to - from) * fps);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
  if (audio) args.push('-ss', String(from), '-i', audio);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-tune', 'film', '-x264-params', 'keyint=60:min-keyint=30');
  args.push('-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709');
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  else args.push('-an');
  args.push('-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, ko) => ff.on('close', (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg ${c}`)))));
  let last = Date.now();
  for (let i = 0; i < frames; i += 1) {
    const t = from + i / fps;
    await page.evaluate((tt) => window.renderFrame(tt), t);
    const png = await canvas.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (Date.now() - last > 15000) {
      console.log(`image ${i + 1}/${frames} (t = ${t.toFixed(2)} s)`);
      last = Date.now();
    }
  }
  ff.stdin.end();
  await done;
  writeFileSync(join(OUT, 'last-render.json'), JSON.stringify({ out, frames, fps, scale, lang, audio, seconds: (Date.now() - t0) / 1000 }, null, 1));
  console.log(`${out} : ${frames} images en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await browser.close();
server.close();
