/**
 * Monkey test de l'interface, sur l'export web : des milliers d'appuis au
 * hasard (boutons, n'importe où à l'écran, rafales d'appuis, saisie de texte,
 * défilement, touche Échap), avec une horloge virtuelle pour que les
 * animations avancent. Échoue sur : erreur JavaScript, erreur console, page
 * figée, écran vide ou écran sans aucune action possible.
 *
 *   npx expo export --platform web --output-dir dist
 *   node scripts/monkey-ui.mjs [sessions=4] [événements=1500] [graine=1]
 */
import { join } from 'node:path';
import { launch, ROOT, serve } from '../promo/lib.mjs';

const SESSIONS = Number(process.argv[2] ?? 4);
const EVENTS = Number(process.argv[3] ?? 1500);
let seed = Number(process.argv[4] ?? 1) >>> 0;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const VIEWPORTS = [
  { width: 393, height: 852 }, // iPhone 16 Pro
  { width: 320, height: 568 }, // iPhone SE (1re gén.) : le plus étroit
  { width: 440, height: 956 }, // iPhone 16 Pro Max
];

/** Départs en pleine partie (vrais écrans, état de maquette, stockage en mémoire) : le hasard seul passe rarement la création. */
const STARTS = [null, 'story', 'combat', 'boss', 'inventory', 'character', 'map', 'workshop', 'relay', 'death', 'archives', 'story-check', 'pause', 'chapter-end', 'ending'];

// MONKEY_DIST : autre export (ex. export de développement) ; MONKEY_DEV=1 : relève aussi les avertissements
// du mode développement (ceux qu'Expo Go affiche) et le texte placé hors d'un composant <Text>.
const DIST = process.env.MONKEY_DIST ?? join(ROOT, 'dist');
const DEV = process.env.MONKEY_DEV === '1';
/** Bruit propre au navigateur ou au serveur statique, sans équivalent sur iPhone. */
const WEB_ONLY = [/WebSocket connection to/, /push token changes is not yet fully supported on web/, /React does not recognize the `%s` prop.*accessibilityElementsHidden/, /Unknown event handler property `%s`.*onResponder|Unknown event handler property `%s`.*onStartShouldSetResponder/, /cannot be a descendant of|cannot contain a nested/,
  // Propriétés natives valides (iOS/Android) que react-native-web ne transmet pas au DOM.
  /React does not recognize the `%s` prop.*importantForAccessibility/, /non-boolean attribute `%s`.*collapsable/];
const devWarnings = new Map();
const { server, url } = await serve({ '/': DIST });
const browser = await launch();
const problems = [];
const screens = new Map();
/** Boutons vus à l'écran et boutons effectivement touchés (libellé normalisé : chiffres masqués). */
const seenButtons = new Set();
const pressedButtons = new Set();
const norm = (l) => l.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
let total = 0;

const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(new Error(`figé : ${label}`)), ms))]);

for (let session = 0; session < SESSIONS; session += 1) {
  const viewport = VIEWPORTS[session % VIEWPORTS.length];
  const locale = session % 2 ? 'en-GB' : 'fr-FR';
  const start = STARTS[session % STARTS.length];
  const ctx = await browser.newContext({ viewport, locale, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`exception : ${e.message}`));
  page.on('console', (m) => {
    const text = m.text().replace(/\s+/g, ' ');
    if (DEV) {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      if (WEB_ONLY.some((re) => re.test(text))) return;
      // Le message et ses arguments (nom de la propriété en cause), pas la pile.
      const k = text.replace(/ at .*$/, '').replace(/If you .*?instead\. ?/g, '').slice(0, 260);
      devWarnings.set(k, (devWarnings.get(k) ?? 0) + 1);
      return;
    }
    if (m.type() === 'error') errors.push(`console : ${text.slice(0, 200)}`);
  });
  const T0 = Date.parse('2026-10-20T10:00:00Z');
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0 + 1000);
  await page.goto(start ? `${url}/?promo=${start}&lang=${locale.slice(0, 2)}` : url);
  const tick = async (ms) => {
    for (let t = 0; t < ms; t += 50) await page.clock.runFor(50);
  };
  for (let i = 0; i < 150; i += 1) {
    if (await page.evaluate(() => document.fonts.status === 'loaded' && document.body.innerText.trim().length > 20)) break;
    await tick(100);
  }

  const tap = async (x, y, hold = 60) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await tick(hold);
    await page.mouse.up();
  };

  let lastLog = '';
  for (let e = 0; e < EVENTS; e += 1) {
    total += 1;
    try {
      const targets = await withTimeout(
        page.evaluate(() => {
          const sel = '[role=button],[role=radio],[role=tab],[role=switch],[role=checkbox],[role=adjustable],[role=link],button,input,textarea';
          return [...document.querySelectorAll(sel)]
            .map((el) => {
              const r = el.getBoundingClientRect();
              const cx = r.x + r.width / 2;
              const cy = r.y + r.height / 2;
              const top = document.elementFromPoint(cx, cy);
              const visible = r.width > 4 && r.height > 4 && cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight && top && (el === top || el.contains(top));
              return visible ? { x: cx, y: cy, input: el.tagName === 'INPUT' || el.tagName === 'TEXTAREA', label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) } : null;
            })
            .filter(Boolean);
        }),
        8000,
        'lecture des cibles',
      );
      for (const t of targets) if (t.label) seenButtons.add(norm(t.label));
      const r = rnd();
      if (!targets.length) {
        problems.push({ session, e, kind: 'aucune action possible', detail: lastLog });
        await page.keyboard.press('Escape');
      } else if (r < 0.7) {
        const t = targets[Math.floor(rnd() * targets.length)];
        lastLog = `appui « ${t.label} »`;
        if (t.label) pressedButtons.add(norm(t.label));
        await tap(t.x, t.y);
        if (t.input && rnd() < 0.7) await page.keyboard.type(rnd() < 0.2 ? '   ' : rnd() < 0.5 ? 'Zoé d’Ébène 🔥' : 'x'.repeat(Math.floor(rnd() * 40)));
      } else if (r < 0.8) {
        const t = targets[Math.floor(rnd() * targets.length)];
        lastLog = `rafale sur « ${t.label} »`;
        if (t.label) pressedButtons.add(norm(t.label));
        for (let k = 0; k < 2 + Math.floor(rnd() * 5); k += 1) await tap(t.x, t.y, 15);
      } else if (r < 0.88) {
        lastLog = 'appui au hasard';
        await tap(rnd() * viewport.width, rnd() * viewport.height);
      } else if (r < 0.95) {
        lastLog = 'défilement';
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await page.mouse.wheel(0, (rnd() - 0.4) * 1500);
      } else {
        lastLog = 'Échap';
        await page.keyboard.press('Escape');
      }
      await tick(100 + Math.floor(rnd() * 900));
      const state = await withTimeout(
        page.evaluate(() => ({ text: document.body.innerText.trim(), title: (document.body.innerText.trim().split('\n')[0] || '').slice(0, 40) })),
        8000,
        lastLog,
      );
      if (state.text.length < 15) problems.push({ session, e, kind: 'écran vide', detail: lastLog });
      if (DEV) {
        // Sur iPhone, un texte hors de <Text> fait planter l'écran (« Text strings must be rendered within a <Text> component ») ; le web, lui, l'affiche.
        const raw = await page.evaluate(() => {
          const out = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const p = n.parentElement;
            if (n.textContent.trim() && p && /\bcss-view-/.test(p.className || '')) out.push(n.textContent.trim().slice(0, 40));
          }
          return out;
        });
        for (const r of raw) problems.push({ session, e, kind: 'texte hors <Text>', detail: `« ${r} » (après ${lastLog})` });
      }
      screens.set(state.title, (screens.get(state.title) ?? 0) + 1);
    } catch (err) {
      problems.push({ session, e, kind: 'page figée ou fermée', detail: `${lastLog} — ${err.message}` });
      break;
    }
    if (errors.length) {
      for (const msg of errors.splice(0)) problems.push({ session, e, kind: 'erreur', detail: `${msg} (après ${lastLog})` });
    }
  }
  await ctx.close();
  console.log(`session ${session + 1}/${SESSIONS} (${start ?? 'accueil'}, ${viewport.width}×${viewport.height}, ${locale}) terminée`);
}

await browser.close();
server.close();
console.log(`${total} événements, ${screens.size} écrans différents visités`);
console.log(`Boutons : ${pressedButtons.size} libellés différents touchés sur ${seenButtons.size} vus`);
if (process.env.MONKEY_LIST) console.log('Jamais touchés :', [...seenButtons].filter((b) => !pressedButtons.has(b)).join(' | '));
console.log('Écrans les plus vus :', [...screens].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k} (${v})`).join(' · '));
if (DEV) {
  console.log(`Avertissements du mode développement (hors bruit propre au web) : ${devWarnings.size}`);
  for (const [k, n] of devWarnings) console.log(`  ⚠ ×${n} ${k}`);
  if (devWarnings.size) process.exitCode = 1;
}
if (!problems.length) console.log('Aucun problème détecté.');
else {
  const byKind = new Map();
  for (const p of problems) byKind.set(p.kind, [...(byKind.get(p.kind) ?? []), p]);
  for (const [k, list] of byKind) console.log(`✗ ${k} ×${list.length}\n    ex. session ${list[0].session}, événement ${list[0].e} : ${list[0].detail}`);
  process.exitCode = 1;
}
