/**
 * Rend la vidéo App Store Preview : la scène (promo/stage) est photographiée
 * image par image, puis encodée en H.264 avec sa bande-son.
 *
 *   node promo/render.mjs --lang fr            → promo/out/app-preview-fr.mp4
 *   node promo/render.mjs --lang fr --frames 0,90,300 --stills   (vérification : PNG seuls)
 *
 * Format : 886 × 1920, 30 i/s, 30 s, H.264 High, AAC stéréo (exigences de
 * l'App Store pour les aperçus iPhone 6,9").
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arg, CACHE, FPS, launch, PROMO, ROOT, serve } from './lib.mjs';

const lang = arg('lang', 'fr');
const only = arg('frames', '');
const OUT = join(PROMO, 'out');
mkdirSync(OUT, { recursive: true });

const { server, url } = await serve({
  '/': join(PROMO, 'stage'),
  '/cache/': CACHE,
  '/gf/': join(ROOT, 'node_modules', '@expo-google-fonts'),
  '/assets/': join(ROOT, 'assets'),
});
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 886, height: 1920 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`${url}/?lang=${lang}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.STAGE_READY === true, null, { timeout: 60000 });
const cues = await page.evaluate(() => window.CUES);

async function shot(t) {
  await page.evaluate((x) => window.renderFrame(x), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 886, height: 1920 } });
}

try {
  if (only) {
    const dir = join(OUT, `frames-${lang}`);
    mkdirSync(dir, { recursive: true });
    for (const f of only.split(',').map(Number)) writeFileSync(join(dir, `${String(f).padStart(4, '0')}.png`), await shot(f / FPS));
    console.log(`Images de contrôle : ${dir}`);
  } else {
    // Bande-son calée sur les coupes et les appuis de la scène.
    const cuesFile = join(OUT, `cues-${lang}.json`);
    writeFileSync(cuesFile, JSON.stringify(cues, null, 1));
    const wav = join(OUT, `soundtrack-${lang}.wav`);
    const st = spawnSync('python3', [join(PROMO, 'soundtrack.py'), cuesFile, wav], { stdio: 'inherit' });
    if (st.status !== 0) throw new Error('bande-son : échec');

    const out = join(OUT, `app-preview-${lang}.mp4`);
    const ff = spawn(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-i', wav,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
        '-r', String(FPS), '-g', String(FPS), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
        '-movflags', '+faststart', '-shortest', out],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const total = Math.round(cues.duration * FPS);
    const t0 = Date.now();
    for (let f = 0; f < total; f += 1) {
      const png = await shot(f / FPS);
      if (!ff.stdin.write(png)) await new Promise((ok) => ff.stdin.once('drain', ok));
      if (f % 60 === 0) process.stdout.write(`\r  ${f}/${total} images · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    await new Promise((ok, ko) => ff.on('close', (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg ${c}`)))));
    console.log(`\n  → ${out}`);
  }
  if (errors.length) console.warn('Erreurs de la scène :', errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
}
