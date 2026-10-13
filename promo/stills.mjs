/**
 * Captures d'écran App Store (iPhone 6,9", 1290 × 2796), dans la même mise en
 * scène que la vidéo.
 *
 *   node promo/stills.mjs --lang fr   → promo/out/appstore-fr/01.png …
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arg, CACHE, launch, PROMO, ROOT, serve } from './lib.mjs';

const lang = arg('lang', 'fr');
const dir = join(PROMO, 'out', `appstore-${lang}`);
mkdirSync(dir, { recursive: true });
const { server, url } = await serve({
  '/': join(PROMO, 'stage'),
  '/cache/': CACHE,
  '/gf/': join(ROOT, 'node_modules', '@expo-google-fonts'),
  '/assets/': join(ROOT, 'assets'),
});
const browser = await launch();
try {
  // Rendu à 1,5× puis réduction exacte en 1290 × 2796 (rééchantillonnage Lanczos).
  const page = await browser.newPage({ viewport: { width: 886, height: 1920 }, deviceScaleFactor: 1.5 });
  await page.goto(`${url}/?stills=1&lang=${lang}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.STAGE_READY === true, null, { timeout: 60000 });
  const times = await page.evaluate(() => window.CUES.stills);
  for (const [i, t] of times.entries()) {
    await page.evaluate((x) => window.renderFrame(x), t);
    const raw = join(dir, `raw-${i}.png`);
    writeFileSync(raw, await page.screenshot({ type: 'png' }));
    const out = join(dir, `${String(i + 1).padStart(2, '0')}.png`);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=1290:2796:flags=lanczos', out], { stdio: 'inherit' });
    spawnSync('rm', [raw]);
    console.log(`  ${out}`);
  }
} finally {
  await browser.close();
  server.close();
}
