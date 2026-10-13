/**
 * Scène de la vidéo App Store Preview, rendue image par image.
 *
 * Tout est une fonction du temps t (secondes) : `window.renderFrame(t)` place
 * les téléphones, les textes, le fond et les écrans filmés (vraies images de
 * l'application, promo/.cache/<langue>/<plan>/NNNN.jpg). Aucune animation CSS :
 * le rendu est déterministe, donc identique à chaque export.
 */
// Données de mise en scène : la vidéo (timeline.js) ou les captures App Store (stills.js).
const PARAMS = new URLSearchParams(location.search);
const STILLS = PARAMS.get('stills') === '1';
let COPY, CUTS, DURATION, PHONES, SCENES, AURA_POINTS, phones;

const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'fr';
const W = 886;
const H = 1920;
const FPS = 30;
const CROSSFADE = 0.38;
const SHOT_SCALE = 2.5; // pixels de capture par point iOS

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  outBack: (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2),
};

/** Interpolation par images clés : [[t, {props}, easing?], …] (l'easing s'applique vers la clé suivante). */
function keyframes(t, keys) {
  if (t <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, v0, e = 'inOut'] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const k = ease[e](prog(t, t0, t1));
      const out = {};
      for (const p of new Set([...Object.keys(v0), ...Object.keys(v1)])) out[p] = lerp(v0[p] ?? v1[p], v1[p] ?? v0[p], k);
      return out;
    }
  }
  return { ...keys[keys.length - 1][1] };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a, b, k) => a.map((v, i) => Math.round(lerp(v, b[i], k)));

/** Bruit déterministe. */
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Construction de la scène
// ---------------------------------------------------------------------------

const $ = (s) => document.querySelector(s);
const world = $('#world');
const meta = {};

const STATUS_ICONS = `
  <svg width="300" height="40" viewBox="0 0 300 40" style="right:96px;width:180px;height:40px">
    <g fill="#fff">
      <rect x="0" y="24" width="9" height="12" rx="2"/><rect x="14" y="17" width="9" height="19" rx="2"/>
      <rect x="28" y="10" width="9" height="26" rx="2"/><rect x="42" y="3" width="9" height="33" rx="2"/>
      <path d="M86 12c9-8 23-8 32 0l-4 4c-7-6-17-6-24 0zM93 19c5-4 13-4 18 0l-4 4c-3-2-7-2-10 0zM100 26l2 2 2-2-2-2z" transform="translate(-6 4) scale(1.05)"/>
      <rect x="132" y="6" width="58" height="28" rx="8" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>
      <rect x="137" y="11" width="44" height="18" rx="4"/><rect x="193" y="15" width="4" height="10" rx="2" fill-opacity=".45"/>
    </g>
  </svg>`;

function makePhone(id) {
  const el = document.createElement('div');
  el.className = 'phone';
  el.innerHTML = `
    <div class="shadow"></div>
    <div class="glow"></div>
    <div class="body">
      <div class="btn" style="left:-8px;top:420px;height:110px"></div>
      <div class="btn" style="left:-8px;top:580px;height:190px"></div>
      <div class="btn" style="left:-8px;top:800px;height:190px"></div>
      <div class="btn" style="right:-8px;top:640px;height:300px"></div>
    </div>
    <div class="screen">
      <img class="shot a" alt="" />
      <img class="shot b" alt="" />
      <div class="status"><div class="time">9:41</div>${STATUS_ICONS}</div>
      <div class="island"></div>
      <div class="tap ring"></div>
      <div class="tap dot"></div>
      <div class="sweep"></div>
      <div class="glare"></div>
    </div>`;
  world.appendChild(el);
  return {
    id,
    el,
    shadow: el.querySelector('.shadow'),
    glow: el.querySelector('.glow'),
    a: el.querySelector('img.a'),
    b: el.querySelector('img.b'),
    ring: el.querySelector('.tap.ring'),
    dot: el.querySelector('.tap.dot'),
    sweep: el.querySelector('.sweep'),
    glare: el.querySelector('.glare'),
  };
}


const dust = $('#dust');
const motes = Array.from({ length: 46 }, (_, i) => {
  const m = document.createElement('i');
  dust.appendChild(m);
  return { el: m, x: hash(i) * W, y: hash(i + 99) * H, v: 18 + hash(i + 7) * 40, s: 0.5 + hash(i + 3) * 1.6, o: 0.15 + hash(i + 5) * 0.4 };
});

const captions = $('#captions');
const capEls = {};

// ---------------------------------------------------------------------------
// Écrans filmés
// ---------------------------------------------------------------------------

function framePath(clip, clipTime) {
  const m = meta[clip];
  const f = clamp(Math.round(clipTime * FPS), 0, m.frames - 1);
  return `/cache/${LANG}/${clip}/${String(f).padStart(4, '0')}.jpg`;
}

const pending = [];
function setSrc(img, src) {
  if (img.dataset.src === src) return;
  img.dataset.src = src;
  img.src = src;
  pending.push(img.decode().catch(() => undefined));
}

/** Plan affiché dans un téléphone à l'instant t (et le précédent, pendant le fondu). */
function screenAt(segments, t) {
  let i = -1;
  for (let k = 0; k < segments.length; k += 1) if (t >= segments[k].at) i = k;
  if (i < 0) i = 0;
  const cur = segments[i];
  // `until` : le plan se fige sur cette image (fin d'animation tenue).
  const ct = Math.min(Math.max(0, t - cur.at) + (cur.from ?? 0), cur.until ?? Infinity);
  const fade = i > 0 ? prog(t, cur.at, cur.at + CROSSFADE) : 1;
  const prev = i > 0 && fade < 1 ? segments[i - 1] : null;
  return { cur, ct, prev, pt: prev ? t - prev.at + (prev.from ?? 0) : 0, fade };
}

/** Appuis filmés (meta.json) convertis en temps global. */
function tapsOf(segments) {
  const out = [];
  segments.forEach((s, i) => {
    const end = segments[i + 1]?.at ?? Infinity;
    for (const tap of meta[s.clip].taps) {
      const g = s.at + tap.t - (s.from ?? 0);
      if (g >= s.at && g < end) out.push({ t: g, x: tap.x, y: tap.y });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

function renderPhone(p, t) {
  const spec = PHONES[p.id];
  const k = keyframes(t, spec.keys);
  // Secousse légère après un coup porté (combat).
  let sx = 0;
  let sy = 0;
  for (const tap of spec.taps) {
    if (!spec.shake) break;
    const d = t - tap.t - 0.12;
    if (d > 0 && d < 0.32) {
      const a = 7 * (1 - d / 0.32);
      sx += Math.sin(d * 90) * a;
      sy += Math.cos(d * 70) * a * 0.6;
    }
  }
  const x = W / 2 + (k.x ?? 0) + sx;
  const y = (k.y ?? 1180) + sy;
  p.el.style.transform = `translate3d(${x}px, ${y}px, ${k.z ?? 0}px) rotateX(${k.rx ?? 0}deg) rotateY(${k.ry ?? 0}deg) rotateZ(${k.rz ?? 0}deg) scale(${k.s ?? 0.57})`;
  p.el.style.opacity = String(clamp(k.op ?? 1));
  p.el.style.zIndex = String(spec.zIndex ?? 1);
  p.el.style.display = (k.op ?? 1) <= 0.001 ? 'none' : 'block';
  p.shadow.style.opacity = String(clamp(k.shadow ?? 1));
  // Reflet qui suit l'orientation du téléphone.
  p.glare.style.transform = `translateX(${(k.ry ?? 0) * -6}px)`;
  const [r, g, b] = auraAt(t)[0];
  p.glow.style.background = `rgb(${r},${g},${b})`;
  p.glow.style.opacity = String(0.22 * (k.glow ?? 1));

  const scr = screenAt(spec.screens, t);
  setSrc(p.a, framePath(scr.cur.clip, scr.ct));
  if (scr.prev) {
    setSrc(p.b, framePath(scr.prev.clip, scr.pt));
    p.b.style.opacity = String(1 - ease.inOut(scr.fade));
  } else p.b.style.opacity = '0';
  // Balayage lumineux pendant le changement d'écran.
  const sw = scr.prev ? ease.out(scr.fade) : 1;
  p.sweep.style.opacity = scr.prev ? String(0.9 * Math.sin(Math.PI * sw)) : '0';
  p.sweep.style.transform = `translateX(${lerp(-900, 900, sw)}px)`;

  // Appui : point + onde.
  let shown = false;
  for (const tap of spec.taps) {
    const d = t - tap.t;
    if (d < -0.05 || d > 0.7) continue;
    shown = true;
    const cx = tap.x * SHOT_SCALE;
    const cy = tap.y * SHOT_SCALE;
    const pd = clamp((d + 0.05) / 0.3);
    const dotS = 70 * lerp(0.7, 1, ease.out(pd));
    Object.assign(p.dot.style, { left: `${cx - dotS / 2}px`, top: `${cy - dotS / 2}px`, width: `${dotS}px`, height: `${dotS}px`, opacity: String(d < 0.18 ? 0.85 * pd : 0.85 * (1 - prog(d, 0.18, 0.5))) });
    const pr = prog(d, 0.05, 0.7);
    const ringS = lerp(70, 260, ease.outQuint(pr));
    Object.assign(p.ring.style, { left: `${cx - ringS / 2}px`, top: `${cy - ringS / 2}px`, width: `${ringS}px`, height: `${ringS}px`, opacity: String(0.9 * (1 - pr) * (d > 0.05 ? 1 : 0)) });
  }
  if (!shown) {
    p.dot.style.opacity = '0';
    p.ring.style.opacity = '0';
  }
}

function auraAt(t) {
  let i = 0;
  for (let k = 0; k < AURA_POINTS.length; k += 1) if (t >= AURA_POINTS[k].t) i = k;
  const cur = AURA_POINTS[i];
  const prev = AURA_POINTS[Math.max(0, i - 1)];
  const k = ease.inOut(prog(t, cur.t - 0.2, cur.t + 0.7));
  return [mix(prev.a, cur.a, k), mix(prev.b, cur.b, k), lerp(prev.i, cur.i, k)];
}

function renderBackground(t) {
  const [a, b, i] = auraAt(t);
  const breathe = 1 + 0.06 * Math.sin(t * 1.3);
  const ia = (0.42 * i * breathe).toFixed(3);
  const ib = (0.55 * i).toFixed(3);
  $('#bg').style.background = `radial-gradient(ellipse 95% 48% at ${78 + Math.sin(t * 0.35) * 6}% -2%, rgba(${a},${ia}) 0%, rgba(${a},0) 72%),
    radial-gradient(ellipse 100% 55% at ${8 + Math.cos(t * 0.3) * 5}% 96%, rgba(${b},${ib}) 0%, rgba(${b},0) 72%), #0b0a0a`;
  for (const m of motes) {
    const y = (((m.y - t * m.v) % H) + H) % H;
    const x = m.x + Math.sin(t * 0.6 + m.y) * 14;
    m.el.style.transform = `translate(${x}px, ${y}px) scale(${m.s})`;
    m.el.style.opacity = String(m.o * (0.6 + 0.4 * Math.sin(t * 2 + m.x)));
  }
  // Grain qui bouge comme une pellicule (12 images/s).
  const g = Math.floor(t * 12);
  $('#grain').style.backgroundPosition = `${Math.floor(hash(g) * 256)}px ${Math.floor(hash(g + 50) * 256)}px`;
}

// --- Textes : apparition mot à mot (montée, flou, opacité) ---

function wordsHTML(html) {
  // Découpe en mots en conservant <em> et <br>.
  const out = [];
  let i = 0;
  html.split(/(<br>|<em>|<\/em>)/).forEach((part) => {
    if (part === '<br>' || part === '<em>' || part === '</em>') return out.push(part);
    part.split(/(\s+)/).forEach((w) => {
      if (!w) return;
      if (/^\s+$/.test(w)) out.push(' ');
      else out.push(`<span class="word" data-i="${i++}">${w}</span>`);
    });
  });
  return out.join('');
}

let currentCopy = null;
function renderCopy(t) {
  const c = COPY.find((x) => t >= x.in - 0.01 && t <= x.out + 0.01) ?? null;
  const kicker = $('#kicker');
  const head = $('#headline');
  if (c !== currentCopy) {
    currentCopy = c;
    kicker.innerHTML = c?.kicker ? wordsHTML(c.kicker[LANG]) : '';
    head.innerHTML = c?.text ? wordsHTML(c.text[LANG]) : '';
    $('#copy').style.top = `${c?.top ?? 150}px`;
  }
  if (!c) return;
  const out = prog(t, c.out - 0.42, c.out);
  const apply = (root, start, step, dur) => {
    root.querySelectorAll('.word').forEach((w) => {
      const i = Number(w.dataset.i);
      const p = ease.outExpo(prog(t, start + i * step, start + i * step + dur));
      const y = (1 - p) * 46 - ease.inOut(out) * 26;
      const blur = (1 - p) * 16 + out * 10;
      w.style.transform = `translateY(${y.toFixed(2)}px)`;
      w.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
      w.style.opacity = String((p * (1 - ease.inOut(out))).toFixed(3));
    });
  };
  apply(kicker, c.in, 0.05, 0.7);
  apply(head, c.in + (c.kicker ? 0.18 : 0), 0.085, 0.9);
}

function renderCaptions(t) {
  for (const cap of PHONES_CAPTIONS) {
    if (!capEls[cap.id]) {
      const el = document.createElement('div');
      el.className = 'cap';
      el.textContent = cap.text[LANG];
      captions.appendChild(el);
      capEls[cap.id] = el;
    }
    const el = capEls[cap.id];
    const k = keyframes(t, PHONES[cap.phone].keys);
    const p = ease.out(prog(t, cap.in, cap.in + 0.6)) * (1 - ease.inOut(prog(t, cap.out - 0.35, cap.out)));
    el.style.left = `${W / 2 + (k.x ?? 0)}px`;
    el.style.top = `${cap.y + (1 - p) * 16}px`;
    el.style.opacity = String(p * (k.op ?? 1));
  }
}

let PHONES_CAPTIONS = [];

function renderStats(t, spec) {
  const el = $('#stats');
  if (el.dataset.lang !== LANG) {
    el.innerHTML = wordsHTML(spec.text[LANG]);
    el.dataset.lang = LANG;
  }
  const out = ease.inOut(prog(t, spec.out - 0.35, spec.out));
  el.style.opacity = '1';
  el.querySelectorAll('.word').forEach((w) => {
    const i = Number(w.dataset.i);
    const p = ease.outExpo(prog(t, spec.in + i * 0.06, spec.in + i * 0.06 + 0.8));
    w.style.transform = `translateY(${(1 - p) * 30}px)`;
    w.style.opacity = String(p * (1 - out));
    w.style.filter = p < 0.99 ? `blur(${(1 - p) * 12}px)` : 'none';
  });
}

function renderOutro(t, spec) {
  const o = $('#outro');
  const vis = prog(t, spec.in, spec.in + 0.5);
  o.style.opacity = String(vis);
  o.style.display = vis <= 0 ? 'none' : 'flex';
  if (vis <= 0) return;
  if (o.dataset.lang !== LANG) {
    $('#brand').innerHTML = wordsHTML(spec.brand[LANG]);
    $('#tagline').innerHTML = wordsHTML(spec.tagline[LANG]);
    $('#cta').textContent = spec.cta[LANG];
    $('#langs').textContent = spec.langs[LANG];
    o.dataset.lang = LANG;
  }
  const ip = prog(t, spec.in + 0.1, spec.in + 1.1);
  $('#icon').style.transform = `translateY(${(1 - ease.outQuint(ip)) * 60}px) scale(${lerp(0.82, 1, ease.outBack(ip))})`;
  $('#icon').style.opacity = String(ease.out(ip));
  const words = (sel, start, step) =>
    document.querySelectorAll(`${sel} .word`).forEach((w) => {
      const i = Number(w.dataset.i);
      const p = ease.outExpo(prog(t, start + i * step, start + i * step + 0.9));
      w.style.transform = `translateY(${(1 - p) * 40}px)`;
      w.style.opacity = String(p);
      w.style.filter = p < 0.99 ? `blur(${(1 - p) * 14}px)` : 'none';
    });
  words('#brand', spec.in + 0.45, 0.09);
  words('#tagline', spec.in + 1.15, 0.06);
  const cp = prog(t, spec.in + 1.7, spec.in + 2.4);
  $('#cta').style.opacity = String(ease.out(cp));
  $('#cta').style.transform = `translateY(${(1 - ease.outQuint(cp)) * 30}px) scale(${lerp(0.94, 1, ease.outQuint(cp))})`;
  $('#langs').style.opacity = String(ease.out(prog(t, spec.in + 2.2, spec.in + 2.9)));
}

let OUTRO = null;
let STATS = null;

async function renderFrame(t) {
  renderBackground(t);
  for (const p of Object.values(phones)) renderPhone(p, t);
  renderCopy(t);
  renderCaptions(t);
  renderStats(t, STATS);
  renderOutro(t, OUTRO);
  $('#fade').style.opacity = String(OUTRO.fade ? keyframes(t, OUTRO.fade).v : 0);
  const waits = pending.splice(0);
  await Promise.all(waits);
}

async function init() {
  const mod = await import(STILLS ? './stills.js' : './timeline.js');
  ({ COPY, CUTS, DURATION, PHONES, SCENES } = mod);
  PHONES_CAPTIONS = mod.CAPTIONS;
  OUTRO = mod.OUTRO;
  STATS = mod.STATS;
  AURA_POINTS = SCENES.map((s) => ({ t: s.at, a: hexToRgb(s.aura[0]), b: hexToRgb(s.aura[1]), i: s.auraIntensity ?? 1 }));
  phones = Object.fromEntries(Object.keys(PHONES).map((id) => [id, makePhone(id)]));
  const clips = new Set(Object.values(PHONES).flatMap((p) => p.screens.map((s) => s.clip)));
  await Promise.all(
    [...clips].map(async (c) => {
      meta[c] = await (await fetch(`/cache/${LANG}/${c}/meta.json`)).json();
    }),
  );
  for (const [id, p] of Object.entries(PHONES)) p.taps = tapsOf(p.screens).map((x) => ({ ...x, id }));
  await document.fonts.ready;
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => undefined)));
  window.CUES = {
    duration: DURATION,
    cuts: CUTS,
    stills: mod.STILL_TIMES ?? [],
    taps: Object.values(PHONES).flatMap((p) => p.taps.map((x) => x.t)).sort((a, b) => a - b),
    hits: Object.entries(PHONES).flatMap(([, p]) => (p.shake ? p.taps.map((x) => x.t + 0.12) : [])),
  };
  window.renderFrame = renderFrame;
  window.STAGE_READY = true;
  await renderFrame(Number(PARAMS.get('t') ?? 0));
}

init();
