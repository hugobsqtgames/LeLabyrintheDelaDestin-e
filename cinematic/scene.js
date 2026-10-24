/**
 * Valombre — bande-annonce d'introduction (30 s, montage à 120 bpm).
 *
 * Rendu en Canvas 2D, image par image et déterministe. Les affiches, portraits et
 * cartes d'ennemis sont les vrais dessins de l'application (capturés par
 * cinematic/capture-art.mjs) ; le reste (radio, cartes de choix, dés, combat,
 * titre, typographie) est dessiné ici dans la palette « Nuit de braise ».
 *
 * API (utilisée par render.mjs) :
 *   await window.setupScene({ timeline, scale, text })   // text : textes de la langue (trailer-text.json)
 *   window.renderFrame(t)
 */
(() => {
  const W = 1080;
  const H = 2340;
  const PAL = {
    bg: '#0B0A0A',
    rust: '#FF6A3D',
    rustBright: '#FF8A5B',
    amber: '#FFC46B',
    moss: '#6FBF8A',
    mossBright: '#93DDA9',
    blood: '#FF5468',
    paper: '#EDE6DA',
    text: '#F4F1EC',
    textDim: '#ABA59C',
    steel: '#9AA4AE',
  };
  const F = {
    heavy: '"Inter Tight Heavy"',
    bold: '"Inter Tight Bold"',
    serif: '"Instrument Serif"',
    mono: '"JetBrains Mono"',
  };

  let TL = null;
  let TX = null;
  let main = null;
  let g = null;
  let scale = 1;
  const L = { art: {}, faces: {}, enemies: {} };

  // ---------------------------------------------------------------- outils
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const backOut = (t) => {
    const c1 = 1.9;
    const u = clamp(t) - 1;
    return 1 + (c1 + 1) * u * u * u + c1 * u * u;
  };
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function noise1(seed) {
    const r = rng(seed);
    const p = Array.from({ length: 512 }, r);
    return (x) => {
      const i = Math.floor(x);
      const f = x - i;
      const u = f * f * (3 - 2 * f);
      return lerp(p[((i % 512) + 512) % 512], p[(((i + 1) % 512) + 512) % 512], u);
    };
  }
  function hex(c) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (c, a) => {
    const [r, gg, b] = Array.isArray(c) ? c : hex(c);
    return `rgba(${Math.round(r)},${Math.round(gg)},${Math.round(b)},${a})`;
  };
  function keys(k, t) {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i += 1) {
      if (t <= k[i][0]) {
        const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
        return lerp(k[i - 1][1], k[i][1], (1 - Math.cos(Math.PI * u)) / 2);
      }
    }
    return k[k.length - 1][1];
  }
  function vgrad(x, y0, y1, stops) {
    const gr = x.createLinearGradient(0, y0, 0, y1);
    for (const [o, c, a = 1] of stops) gr.addColorStop(o, rgba(c, a));
    return gr;
  }
  function glow(x, cx, cy, r, color, a, comp = 'lighter') {
    if (a <= 0.001) return;
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, rgba(color, a));
    gr.addColorStop(0.35, rgba(color, a * 0.35));
    gr.addColorStop(1, rgba(color, 0));
    const prev = x.globalCompositeOperation;
    x.globalCompositeOperation = comp;
    x.fillStyle = gr;
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.globalCompositeOperation = prev;
  }
  function grainTexture(seed, size = 384) {
    const c = mk(size, size);
    const x = c.getContext('2d');
    const img = x.createImageData(size, size);
    const r = rng(seed);
    for (let i = 0; i < size * size; i += 1) {
      const v = 128 + (r() + r() + r() - 1.5) * 120;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function particles(x, t, { n, seed, vy, vx = 0, size, color, alpha, warm = false, sway = 30 }) {
    const r = rng(seed);
    const span = H + 200;
    for (let i = 0; i < n; i += 1) {
      const px0 = r() * W * 1.2 - W * 0.1;
      const py0 = r() * span;
      const sp = 0.5 + r();
      const sz = size * (0.4 + r() * 0.9);
      const ph = r() * 6.28;
      let py = py0 + vy * sp * t;
      py = ((py % span) + span) % span - 100;
      const px = px0 + vx * sp * t + Math.sin(t * 0.8 + ph) * sway;
      const a = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.7 + ph)));
      if (warm) glow(x, px, py, sz * 7, color, a * 0.5);
      x.fillStyle = rgba(color, a);
      x.beginPath();
      x.arc(px, py, sz, 0, Math.PI * 2);
      x.fill();
    }
  }
  /** Secousse d'impact : forte au coup, éteinte en ~0,3 s. */
  function shake(t, at, amp, seed) {
    const k = t - at;
    if (k < 0 || k > 0.4) return [0, 0];
    const n = noise1(seed);
    const e = amp * Math.exp(-k * 12);
    return [(n(t * 60) - 0.5) * 2 * e, (n(t * 60 + 40) - 0.5) * 2 * e];
  }
  function loadImage(src) {
    return new Promise((ok, ko) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => ko(new Error(`image introuvable : ${src}`));
      im.src = src;
    });
  }
  function roundRect(x, X, Y, w, h, r) {
    x.beginPath();
    x.roundRect(X, Y, w, h, r);
  }

  // ---------------------------------------------------------------- typographie
  /** Ajuste la taille pour tenir dans la largeur. */
  function fit(x, text, font, size, maxW) {
    let s = size;
    x.font = `${s}px ${font}`;
    while (x.measureText(text).width > maxW && s > 20) {
      s -= 2;
      x.font = `${s}px ${font}`;
    }
    return s;
  }
  /**
   * Titre qui claque : arrive gros avec une traînée de mouvement, se pose en 0,13 s,
   * puis un bref tremblé. Les segments entre * * sont en braise.
   */
  function slam(x, text, t, t0, opts) {
    const { y, size, font = F.heavy, maxW = W - 120, wrap = true } = opts;
    if (t < t0) return;
    // Trop long pour tenir en grand sur une ligne : deux lignes équilibrées, bien plus lisibles.
    x.save();
    x.font = `${size}px ${font}`;
    const words = text.split(' ');
    if (wrap && words.length > 1 && x.measureText(text.replace(/\*/g, '')).width > maxW * 1.15) {
      let best = 1;
      let bestDiff = Infinity;
      for (let i = 1; i < words.length; i += 1) {
        const d = Math.abs(x.measureText(words.slice(0, i).join(' ')).width - x.measureText(words.slice(i).join(' ')).width);
        if (d < bestDiff) {
          bestDiff = d;
          best = i;
        }
      }
      const l1 = words.slice(0, best).join(' ');
      const l2 = words.slice(best).join(' ');
      const s1 = Math.min(fit(x, l1.replace(/\*/g, ''), font, size, maxW), fit(x, l2.replace(/\*/g, ''), font, size, maxW));
      x.restore();
      const lh = s1 * 1.02;
      slamLine(x, l1, t, t0, { ...opts, y: y - lh / 2, size: s1 });
      slamLine(x, l2, t, t0 + 0.05, { ...opts, y: y + lh / 2, size: s1 });
      return;
    }
    x.restore();
    slamLine(x, text, t, t0, opts);
  }
  function slamLine(x, text, t, t0, { y, size, font = F.heavy, color = PAL.text, accent = PAL.rustBright, tracking = -0.01, maxW = W - 120, from = 1.7, cx: centerX = W / 2 }) {
    const k = t - t0;
    if (k < 0) return;
    const clean = text.replace(/\*/g, '');
    x.save();
    x.letterSpacing = `${tracking * size}px`;
    const s = fit(x, clean, font, size, maxW);
    x.letterSpacing = `${tracking * s}px`;
    const p = clamp(k / 0.13);
    const sc = lerp(from, 1, easeOut(p));
    const alpha = clamp(k / 0.05);
    const [sx, sy] = shake(t, t0 + 0.11, 6, 77);
    x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,0.75)';
    x.shadowBlur = 30;
    const drawText = (scaleK, a) => {
      x.save();
      x.translate(centerX + sx, y + sy);
      x.scale(scaleK, scaleK);
      x.globalAlpha = a;
      x.font = `${s}px ${font}`;
      const parts = text.split('*');
      const total = x.measureText(clean).width;
      let cx = -total / 2;
      parts.forEach((part, i) => {
        x.fillStyle = i % 2 ? accent : color;
        x.textAlign = 'left';
        x.fillText(part, cx, 0);
        cx += x.measureText(part).width;
      });
      x.restore();
    };
    if (p < 1) {
      drawText(sc * 1.12, alpha * 0.18);
      drawText(sc * 1.05, alpha * 0.3);
    }
    drawText(sc, alpha);
    x.restore();
  }
  function label(x, text, X, Y, { size = 30, color = PAL.rustBright, align = 'center', tracking = 0.18, font = F.mono } = {}) {
    x.save();
    x.font = `${size}px ${font}`;
    x.letterSpacing = `${tracking * size}px`;
    x.fillStyle = color;
    x.textAlign = align;
    x.textBaseline = 'middle';
    x.fillText(text, X, Y);
    x.restore();
  }
  const T = (key) => TX[key] ?? '';
  const tx = (key) => TL.texts[key];
  /** Bandeau sombre en bas : le texte ne recouvre jamais le sujet de l'image. */
  function scrim(x, from = 0.6, a = 0.9) {
    x.fillStyle = vgrad(x, H * from, H, [[0, '#000000', 0], [0.35, '#000000', a * 0.75], [1, '#000000', a]]);
    x.fillRect(0, H * from, W, H * (1 - from));
  }
  /** Fond des écrans de jeu : l'aura de l'application (lueurs colorées sur noir chaud). */
  function backdrop(x, t, c1 = PAL.rust, c2 = PAL.amber) {
    x.fillStyle = PAL.bg;
    x.fillRect(0, 0, W, H);
    glow(x, W * 0.15, H * 0.12, W * 1.1, c1, 0.22, 'source-over');
    glow(x, W * 0.95, H * 0.9, W * 1.0, c2, 0.12, 'source-over');
    particles(x, t, { n: 50, seed: 5, vy: -30, size: 2, color: PAL.rustBright, alpha: 0.35, warm: true });
  }
  /** En-tête des écrans de jeu. */
  function header(x, t, key) {
    slam(x, T(key), t, tx(key)[0], { y: H * 0.19, size: 132, from: 1.4 });
  }

  // ---------------------------------------------------------------- plans
  const freqAt = (t) => keys(TL.events.tuneKeys, t);
  const lockAt = () => TL.events.tuneKeys[TL.events.tuneKeys.length - 1][0];
  const voiceEnv = (t) => {
    const ev = TL.events;
    if (t < ev.voiceFrom || t > ev.voiceTo) return 0;
    const n = noise1(31);
    const syl = Math.pow(Math.max(0, Math.sin(t * 15.7 + n(t * 3) * 4)), 0.6);
    return syl * smooth(ev.voiceFrom, ev.voiceFrom + 0.2, t) * smooth(ev.voiceTo, ev.voiceTo - 0.3, t);
  };

  /** Ouverture : la radio de chantier accroche la Destinée ; le message se tape au-dessus du poste. */
  function shotRadio(x, t, k) {
    const f = freqAt(t);
    const lock = lockAt();
    const locked = smooth(lock - 0.15, lock + 0.1, t);
    const v = voiceEnv(t);
    const c = easeInOut(k);
    x.save();
    const zoom = lerp(1.02, 1.16, c);
    x.translate(W / 2, H * 0.55);
    x.rotate(lerp(-0.015, 0.01, c));
    x.scale(zoom, zoom);
    x.translate(-W / 2, -H * 0.55);
    x.fillStyle = vgrad(x, 0, H, [[0, '#2A170C'], [0.45, '#1B0F08'], [1, '#090504']]);
    x.fillRect(-200, -200, W + 400, H + 400);
    x.globalAlpha = 0.25;
    x.drawImage(L.grain[2], -200, -200, W + 400, H + 400);
    x.globalAlpha = 1;
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.fillRect(-200, -200, W + 400, H + 400);
    x.strokeStyle = '#3A2414';
    x.lineWidth = 34;
    roundRect(x, 40, 800, W - 80, 1500, 80);
    x.stroke();
    const wx = 100;
    const wy = 1000;
    const ww = 880;
    const wh = 330;
    const back = 0.75 + 0.1 * Math.sin(t * 31) * (1 - locked) + 0.12 * v;
    x.save();
    roundRect(x, wx, wy, ww, wh, 30);
    x.clip();
    x.fillStyle = vgrad(x, wy, wy + wh, [[0, '#B8641E', back], [0.5, '#F5A44A', back], [1, '#A2521A', back]]);
    x.fillRect(wx, wy, ww, wh);
    const fx = (fr) => wx + 60 + ((fr - 87.5) / (108.5 - 87.5)) * (ww - 120);
    x.strokeStyle = 'rgba(40,18,6,0.85)';
    x.fillStyle = 'rgba(40,18,6,0.9)';
    x.font = `34px ${F.mono}`;
    x.textAlign = 'center';
    for (let fr = 88; fr <= 108; fr += 0.5) {
      const big = Math.abs(fr - Math.round(fr)) < 0.01;
      x.lineWidth = big ? 3 : 2;
      x.beginPath();
      x.moveTo(fx(fr), wy + 70);
      x.lineTo(fx(fr), wy + (big ? 128 : 100));
      x.stroke();
      if (big && Math.round(fr) % 4 === 0) x.fillText(String(Math.round(fr)), fx(fr), wy + 180);
    }
    x.font = `26px ${F.mono}`;
    x.fillText('FM · MHz', wx + ww / 2, wy + 270);
    const nx = fx(f);
    glow(x, nx, wy + wh / 2, 120, PAL.rust, 0.5);
    x.fillStyle = '#C8200E';
    x.fillRect(nx - 4, wy + 20, 8, wh - 40);
    x.restore();
    glow(x, wx + ww / 2, wy + wh / 2, 720, PAL.amber, 0.18 * back);
    const n = noise1(44);
    const level = (1 - locked) * (0.25 + 0.5 * n(t * 18)) + locked * (0.15 + 0.8 * v);
    for (let i = 0; i < 10; i += 1) {
      const on = i / 10 < level;
      const col = i < 6 ? PAL.moss : i < 8 ? PAL.amber : PAL.rust;
      x.fillStyle = on ? col : 'rgba(255,255,255,0.05)';
      roundRect(x, wx + 520 + i * 36, wy - 70, 26, 34, 6);
      x.fill();
    }
    x.save();
    x.translate(W / 2, 1760);
    x.scale(1 + v * 0.006, 1 + v * 0.006);
    x.drawImage(L.grille, -400, -320);
    x.restore();
    glow(x, W / 2, 1760, 600, PAL.amber, 0.05 + 0.08 * v);
    x.restore();
    const r = rng(Math.floor(t * 30) + 7);
    for (let i = 0; i < 9 * (1 - locked); i += 1) {
      x.fillStyle = `rgba(255,220,180,${0.03 + r() * 0.06})`;
      x.fillRect(0, r() * H, W, 1 + r() * 4);
    }
    const typed = (key, y) => {
      const [a, b] = tx(key);
      if (t < a) return;
      const full = T(key);
      const p = clamp((t - a) / Math.max(0.6, (b - a) * 0.6));
      const shown = full.slice(0, Math.round(full.length * p));
      x.save();
      const s = fit(x, full, F.mono, 58, W - 100);
      x.font = `${s}px ${F.mono}`;
      x.fillStyle = PAL.amber;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.shadowColor = 'rgba(255,160,60,0.6)';
      x.shadowBlur = 18;
      x.fillText(shown + (p < 1 && Math.floor(t * 8) % 2 ? '▌' : ''), W / 2, y);
      x.restore();
    };
    if (t > 0.6) label(x, T('radioLabel').toUpperCase(), W / 2, 400, { size: 28, color: rgba(PAL.amber, 0.7) });
    typed('radio1', 520);
    typed('radio2', 640);
  }

  /** Affiche plein cadre (illustration du jeu) : coup de zoom à l'entrée, poussée lente, éclat de sa couleur. */
  function shotPoster(x, t, k, shot) {
    const img = L.art[shot.art];
    const u = t - shot.from;
    const dur = shot.to - shot.from;
    const punch = 1 + 0.14 * Math.exp(-u * 13);
    const push = lerp(1.0, dur > 1.5 ? 1.1 : 1.06, easeOut(u / dur));
    const [sx, sy] = shake(t, shot.from, 22, 13);
    x.save();
    x.translate(W / 2 + sx, H * 0.45 + sy);
    x.scale(punch * push, punch * push);
    x.rotate(lerp(-0.004, 0.006, u / dur));
    x.translate(-W / 2, -H * 0.45);
    x.drawImage(img, 0, 0, W, H);
    x.restore();
    // Éclat de la couleur de l'affiche au coup (jamais de flash blanc).
    glow(x, W / 2, H * 0.4, H * 0.9, shot.accent, 0.38 * Math.exp(-u * 7));
    particles(x, t, { n: 40, seed: shot.art.length * 7, vy: -40, vx: 8, size: 2, color: shot.accent, alpha: 0.4, warm: true });
    if (!shot.text) return;
    scrim(x, shot.big ? 0.5 : 0.6, 0.92);
    if (shot.big) {
      slam(x, T(shot.text[0]), t, tx(shot.text[0])[0], { y: H * 0.7, size: 250, wrap: false });
      if (shot.text[1]) slam(x, T(shot.text[1]).replace(/^(\d+)/, '*$1*'), t, tx(shot.text[1])[0], { y: H * 0.81, size: 250, wrap: false });
    } else if (shot.text.length === 2) {
      slam(x, T(shot.text[0]), t, tx(shot.text[0])[0], { y: H * 0.74, size: 110, font: F.bold, color: PAL.textDim, wrap: false });
      slam(x, T(shot.text[1]), t, tx(shot.text[1])[0], { y: H * 0.84, size: 150 });
    } else slam(x, T(shot.text[0]), t, tx(shot.text[0])[0], { y: H * 0.8, size: 150 });
  }

  /** Choix chronométré : le temps fond, le doigt tranche. */
  function shotChoice(x, t, k, shot) {
    const ev = TL.events;
    backdrop(x, t, PAL.rust, PAL.blood);
    header(x, t, 'seconds');
    const [t0, t1] = ev.ticks;
    const tapped = t >= ev.tap;
    const cards = [
      { text: T('choiceA'), y: H * 0.41 },
      { text: T('choiceB'), y: H * 0.54 },
    ];
    const cw = W - 120;
    const ch = 250;
    cards.forEach((c, i) => {
      const enter = easeOut((t - (shot.from + i * 0.08)) / 0.25);
      const chosen = tapped && i === 0;
      const faded = tapped && i === 1;
      const press = chosen ? 1 - 0.04 * Math.exp(-(t - ev.tap) * 14) : 1;
      x.save();
      x.globalAlpha = enter * (faded ? lerp(1, 0.3, clamp((t - ev.tap) / 0.2)) : 1);
      x.translate(W / 2, c.y + (1 - enter) * 120);
      x.scale(press, press);
      x.fillStyle = 'rgba(30,26,25,0.94)';
      roundRect(x, -cw / 2, -ch / 2, cw, ch, 66);
      x.fill();
      x.strokeStyle = chosen ? PAL.rust : 'rgba(255,248,240,0.14)';
      x.lineWidth = chosen ? 6 : 3;
      x.stroke();
      if (chosen) glow(x, 0, 0, 600, PAL.rust, 0.25 * Math.exp(-(t - ev.tap) * 3));
      x.fillStyle = rgba(PAL.rust, 0.16);
      x.beginPath();
      x.arc(-cw / 2 + 120, 0, 62, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = PAL.rustBright;
      x.lineWidth = 9;
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.beginPath();
      const ix = -cw / 2 + 120;
      if (i === 0) {
        // Course : flèche
        x.moveTo(ix - 22, 22);
        x.lineTo(ix + 20, -20);
        x.moveTo(ix - 6, -22);
        x.lineTo(ix + 22, -22);
        x.lineTo(ix + 22, 6);
      } else {
        // Se cacher : œil barré
        x.ellipse(ix, 0, 28, 17, 0, 0, Math.PI * 2);
        x.moveTo(ix - 26, 24);
        x.lineTo(ix + 26, -24);
      }
      x.stroke();
      x.textBaseline = 'middle';
      x.fillStyle = PAL.text;
      x.textAlign = 'left';
      const s = fit(x, c.text, F.bold, 62, cw - 300);
      x.font = `${s}px ${F.bold}`;
      x.fillText(c.text, -cw / 2 + 220, 2);
      x.restore();
    });
    // Le temps qui fond
    const p = 1 - clamp((t - t0) / (t1 - t0)) * 0.94;
    const by = H * 0.64;
    const bw = W - 120;
    const enter = easeOut((t - shot.from - 0.15) / 0.25);
    x.save();
    x.globalAlpha = enter;
    x.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(x, 60, by, bw, 26, 13);
    x.fill();
    const grad = x.createLinearGradient(60, 0, 60 + bw, 0);
    grad.addColorStop(0, PAL.blood);
    grad.addColorStop(1, PAL.rust);
    x.fillStyle = grad;
    roundRect(x, 60, by, Math.max(26, bw * p), 26, 13);
    x.fill();
    glow(x, 60 + bw * p, by + 13, 140, PAL.rust, 0.5);
    const secs = Math.max(1, Math.ceil(5 * p));
    label(x, `0:0${secs}`, W - 60, by + 90, { size: 48, color: p < 0.35 ? PAL.blood : PAL.textDim, align: 'right', tracking: 0.05 });
    x.restore();
    if (tapped) {
      const u = t - ev.tap;
      const cx = W * 0.62;
      const cy = H * 0.41;
      x.strokeStyle = rgba(PAL.paper, 0.7 * Math.exp(-u * 4));
      x.lineWidth = 6;
      x.beginPath();
      x.arc(cx, cy, 40 + u * 700, 0, Math.PI * 2);
      x.stroke();
      x.fillStyle = rgba(PAL.paper, 0.5 * Math.exp(-u * 6));
      x.beginPath();
      x.arc(cx, cy, 44, 0, Math.PI * 2);
      x.fill();
    }
  }

  function die(x, cx, cy, size, value, rot) {
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    x.shadowColor = 'rgba(0,0,0,0.6)';
    x.shadowBlur = 40;
    x.shadowOffsetY = 20;
    x.fillStyle = PAL.paper;
    roundRect(x, -size / 2, -size / 2, size, size, size * 0.18);
    x.fill();
    x.shadowColor = 'transparent';
    const pips = {
      1: [[0, 0]],
      2: [[-1, -1], [1, 1]],
      3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
      6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    }[value];
    x.fillStyle = '#1B1714';
    for (const [px, py] of pips) {
      x.beginPath();
      x.arc(px * size * 0.26, py * size * 0.26, size * 0.085, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
  }

  /** Les dés décident. */
  function shotDice(x, t) {
    const ev = TL.events;
    backdrop(x, t, PAL.amber, PAL.moss);
    header(x, t, 'price');
    const land = ev.diceLand;
    const u = clamp((t - ev.diceFrom) / (land - ev.diceFrom));
    const landed = t >= land;
    const r = rng(Math.floor(t * 16));
    [[-1, 6], [1, 5]].forEach(([side, final], i) => {
      const bounce = landed ? Math.exp(-(t - land) * 10) * Math.abs(Math.sin((t - land) * 30)) * 40 : (1 - u) * 520 * Math.abs(Math.sin(u * 9 + i));
      const rot = landed ? side * 0.08 : (1 - u) * 9 * side + side * 0.08;
      const value = landed ? final : 1 + Math.floor(r() * 6);
      const cx = W / 2 + side * 210 + (landed ? 0 : (1 - u) * side * 180);
      die(x, cx, H * 0.42 - bounce, 300, value, rot);
    });
    if (landed) {
      const [sx, sy] = shake(t, land, 18, 3);
      label(x, T('roll'), W / 2 + sx, H * 0.56 + sy, { size: 46, color: PAL.textDim, tracking: 0.12 });
    }
    if (t >= ev.success) {
      glow(x, W / 2, H * 0.66, 600, PAL.moss, 0.45 * Math.exp(-(t - ev.success) * 2.5) + 0.12);
      slam(x, T('rollOk'), t, ev.success, { y: H * 0.66, size: 150, color: PAL.mossBright, from: 1.5 });
    }
  }

  /** Combat : le Berger, une entaille, la jauge qui chute. */
  function shotCombat(x, t, k, shot) {
    const ev = TL.events;
    backdrop(x, t, PAL.blood, PAL.amber);
    header(x, t, 'survive');
    const img = L.enemies.berger;
    const [sx, sy] = shake(t, ev.impact, 30, 21);
    const enter = easeOut((t - shot.from) / 0.2);
    const cw = W * 0.6;
    const chh = (cw * img.height) / img.width;
    const cy = H * 0.41;
    x.save();
    x.translate(W / 2 + sx, cy + sy);
    x.scale(lerp(1.25, 1, enter), lerp(1.25, 1, enter));
    x.globalAlpha = enter;
    x.shadowColor = rgba(PAL.amber, 0.5);
    x.shadowBlur = 80;
    x.drawImage(img, -cw / 2, -chh / 2, cw, chh);
    x.restore();
    const s = t - ev.slash;
    if (s > 0 && s < 0.6) {
      const grow = clamp(s / 0.07);
      const fade = 1 - clamp((s - 0.12) / 0.45);
      x.save();
      x.translate(W / 2, cy);
      x.rotate(-0.75);
      const len = 1100 * grow;
      const gr = x.createLinearGradient(-550, 0, -550 + len, 0);
      gr.addColorStop(0, rgba(PAL.rust, 0));
      gr.addColorStop(0.7, rgba(PAL.rustBright, 0.95 * fade));
      gr.addColorStop(1, rgba('#FFF4E8', fade));
      x.fillStyle = gr;
      x.beginPath();
      x.moveTo(-550, 0);
      x.quadraticCurveTo(-550 + len / 2, -26, -550 + len, 0);
      x.quadraticCurveTo(-550 + len / 2, 14, -550, 0);
      x.fill();
      x.restore();
      glow(x, W / 2, cy, 700, PAL.blood, 0.4 * fade);
    }
    const ny = cy + chh / 2 + 90;
    x.save();
    x.translate(sx * 0.5, sy * 0.5);
    x.font = `78px ${F.serif}`;
    const nw = x.measureText(T('enemy')).width;
    const chip = 150;
    const startX = W / 2 - (nw + 24 + chip) / 2;
    x.fillStyle = PAL.text;
    x.textAlign = 'left';
    x.textBaseline = 'middle';
    x.fillText(T('enemy'), startX, ny);
    x.fillStyle = rgba(PAL.amber, 0.18);
    roundRect(x, startX + nw + 24, ny - 32, chip, 64, 32);
    x.fill();
    label(x, T('boss'), startX + nw + 24 + chip / 2, ny, { size: 30, color: PAL.amber, tracking: 0.1 });
    const hpY = ny + 80;
    const bw = W * 0.72;
    const hp = t < ev.impact ? 1 : lerp(1, 0.64, easeOut((t - ev.impact) / 0.15));
    const ghost = t < ev.impact ? 1 : lerp(1, 0.64, easeOut((t - ev.impact - 0.25) / 0.3));
    x.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(x, W / 2 - bw / 2, hpY, bw, 30, 15);
    x.fill();
    x.fillStyle = rgba(PAL.paper, 0.85);
    roundRect(x, W / 2 - bw / 2, hpY, bw * ghost, 30, 15);
    x.fill();
    x.fillStyle = PAL.blood;
    roundRect(x, W / 2 - bw / 2, hpY, bw * hp, 30, 15);
    x.fill();
    label(x, `${Math.round(50 * hp)}/50`, W / 2 - bw / 2, hpY + 76, { size: 38, color: PAL.textDim, align: 'left', tracking: 0.04 });
    x.restore();
    const d = t - ev.impact;
    if (d > 0) {
      x.save();
      x.globalAlpha = 1 - clamp((d - 0.4) / 0.3);
      const sc = lerp(1.8, 1, easeOut(d / 0.12));
      x.translate(W * 0.76, cy - chh * 0.2 - d * 160);
      x.scale(sc, sc);
      x.font = `140px ${F.heavy}`;
      x.fillStyle = PAL.blood;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.shadowColor = 'rgba(0,0,0,0.8)';
      x.shadowBlur = 20;
      x.fillText('−18', 0, 0);
      x.restore();
    }
  }

  /** Les compagnons : quatre visages qui claquent, puis l'un d'eux tombe. */
  function shotFaces(x, t) {
    const ev = TL.events;
    backdrop(x, t, PAL.amber, PAL.rust);
    const people = [
      { id: 'maelle', name: 'Maëlle' },
      { id: 'kaz', name: 'Kaz' },
      { id: 'ines', name: 'Inès' },
      { id: 'theo', name: 'Théo' },
    ];
    const cw = 455;
    const chh = (cw * 1350) / 1080;
    const pos = [
      [W * 0.27, H * 0.26],
      [W * 0.73, H * 0.26],
      [W * 0.27, H * 0.52],
      [W * 0.73, H * 0.52],
    ];
    people.forEach((p, i) => {
      const t0 = ev.faces[i];
      if (t < t0) return;
      const u = t - t0;
      const sc = lerp(1.35, 1, backOut(clamp(u / 0.22)));
      const fallen = i === 1 && t >= ev.fall;
      const fu = t - ev.fall;
      const [sx, sy] = fallen ? shake(t, ev.fall, 16, 9) : [0, 0];
      x.save();
      x.translate(pos[i][0] + sx, pos[i][1] + sy);
      x.scale(sc, sc);
      x.globalAlpha = clamp(u / 0.06);
      if (fallen) x.filter = `grayscale(${clamp(fu / 0.25)}) brightness(${lerp(1, 0.45, clamp(fu / 0.4))})`;
      x.shadowColor = 'rgba(0,0,0,0.6)';
      x.shadowBlur = 50;
      x.drawImage(L.faces[p.id], -cw / 2, -chh / 2, cw, chh);
      x.filter = 'none';
      x.shadowColor = 'transparent';
      glow(x, 0, 0, 420, PAL.amber, 0.4 * Math.exp(-u * 8));
      x.restore();
      x.save();
      x.globalAlpha = clamp(u / 0.15);
      x.font = `56px ${F.bold}`;
      x.fillStyle = fallen ? PAL.textDim : PAL.text;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(p.name, pos[i][0], pos[i][1] + chh / 2 + 60);
      x.restore();
      if (fallen) {
        x.save();
        x.strokeStyle = rgba(PAL.blood, clamp(fu / 0.15));
        x.lineWidth = 6;
        roundRect(x, pos[i][0] - cw / 2 + sx, pos[i][1] - chh / 2 + sy + chh * 0.09, cw, chh * 0.91, 56);
        x.stroke();
        x.restore();
        slam(x, T('fallen'), t, ev.fall + 0.05, { y: pos[i][1] + sy + chh * 0.05, cx: pos[i][0] + sx, size: 72, font: F.mono, color: PAL.blood, from: 1.6, tracking: 0.2, maxW: cw - 40, wrap: false });
      }
    });
    scrim(x, 0.66, 0.9);
    if (t < tx('notall')[0]) slam(x, T('count'), t, tx('count')[0], { y: H * 0.81, size: 140 });
    else slam(x, T('notall'), t, tx('notall')[0], { y: H * 0.81, size: 140 });
  }

  /** Titre : l'emblème explose, l'aiguille trouve la sortie, Valombre. */
  function shotTitle(x, t) {
    const ev = TL.events;
    x.fillStyle = PAL.bg;
    x.fillRect(0, 0, W, H);
    const u = t - ev.boom;
    const ey = H * 0.34;
    glow(x, W / 2, ey, W * 1.3, PAL.rust, 0.16 + 0.4 * Math.exp(-u * 3), 'source-over');
    for (const [delay, a] of [[0, 0.8], [0.12, 0.45]]) {
      const v = u - delay;
      if (v > 0 && v < 1.2) {
        x.strokeStyle = rgba(PAL.rustBright, a * (1 - v / 1.2));
        x.lineWidth = 10 * (1 - v / 1.2) + 2;
        x.beginPath();
        x.arc(W / 2, ey, 300 + v * 1400, 0, Math.PI * 2);
        x.stroke();
      }
    }
    const r = rng(404);
    for (let i = 0; i < 90; i += 1) {
      const ang = r() * Math.PI * 2;
      const sp = 500 + r() * 1400;
      const life = 0.6 + r() * 1.4;
      const tone = r();
      const size = 3 + r() * 3;
      if (u < 0 || u > life) continue;
      const d = (sp * (1 - Math.exp(-u * 2.2))) / 2.2;
      const px = W / 2 + Math.cos(ang) * d;
      const py = ey + Math.sin(ang) * d + u * u * 120;
      const a = (1 - u / life) * 0.9;
      glow(x, px, py, 20, PAL.amber, a * 0.5);
      x.fillStyle = rgba(tone < 0.5 ? PAL.amber : PAL.rustBright, a);
      x.beginPath();
      x.arc(px, py, size, 0, Math.PI * 2);
      x.fill();
    }
    // Emblème : le même dessin que le logo de l'application.
    const s = 3.1 * lerp(1.4, 1, backOut(clamp(u / 0.3)));
    x.save();
    x.translate(W / 2, ey);
    x.scale(s, s);
    x.translate(-100, -100);
    glow(x, 100, 100, 140, PAL.rust, 0.35);
    x.strokeStyle = PAL.paper;
    x.lineCap = 'round';
    x.shadowColor = rgba(PAL.amber, 0.6);
    x.shadowBlur = 12;
    for (const [d, w] of [['M100 18 A82 82 0 1 1 42 42', 5], ['M100 38 A62 62 0 1 0 156 74', 4.5], ['M100 58 A42 42 0 1 1 64 79', 4], ['M100 78 A22 22 0 1 0 121 94', 3.5], ['M42 42 L57 57', 4.5], ['M156 74 L138 82 M100 38 L100 58', 4], ['M64 79 L81 89', 3.5]]) {
      x.lineWidth = w;
      x.stroke(new Path2D(d));
    }
    x.shadowBlur = 0;
    x.strokeStyle = PAL.bg;
    x.lineWidth = 3;
    x.stroke(new Path2D('M170 36 L158 52 L164 58 L150 72'));
    const [n0, n1] = ev.needle;
    const spin = (1 - easeOut(clamp((t - n0) / (n1 - n0)))) * Math.PI * 6;
    x.translate(100, 100);
    x.rotate(spin);
    x.translate(-100, -100);
    x.fillStyle = PAL.rustBright;
    x.fill(new Path2D('M100 100 L148 150 L104 108 Z'));
    x.fillStyle = PAL.steel;
    x.fill(new Path2D('M100 100 L60 58 L96 92 Z'));
    x.fillStyle = PAL.paper;
    x.beginPath();
    x.arc(100, 100, 5, 0, Math.PI * 2);
    x.fill();
    x.restore();
    glow(x, W / 2 + 120, ey + 130, 360, PAL.rustBright, 0.5 * Math.exp(-Math.pow((t - n1) * 4, 2)));
    if (t >= tx('kicker')[0]) {
      x.save();
      x.globalAlpha = clamp((t - tx('kicker')[0]) / 0.4);
      label(x, T('kicker'), W / 2, H * 0.575, { size: 34, color: PAL.rustBright, tracking: 0.24 });
      x.restore();
    }
    slam(x, 'Valombre', t, tx('titleWord')[0], { y: H * 0.645, size: 230, font: F.serif, color: PAL.text, from: 1.35, tracking: -0.02 });
    if (t >= tx('sub')[0]) {
      const p = clamp((t - tx('sub')[0]) / 0.5);
      x.save();
      x.globalAlpha = p;
      x.font = `italic 96px ${F.serif}`;
      x.fillStyle = PAL.rustBright;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(T('sub'), W / 2, H * 0.715 + (1 - p) * 30);
      x.restore();
    }
    particles(x, t, { n: 40, seed: 91, vy: -18, size: 1.8, color: PAL.rustBright, alpha: 0.35, warm: true });
  }

  // ---------------------------------------------------------------- composition
  const SHOTS = { radio: shotRadio, poster: shotPoster, choice: shotChoice, dice: shotDice, combat: shotCombat, faces: shotFaces, title: shotTitle };
  const BLOOM = { radio: 0.45, poster: 0.3, choice: 0.3, dice: 0.3, combat: 0.35, faces: 0.25, title: 0.45 };

  function renderFrame(t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.filter = 'none';
    g.fillStyle = '#000';
    g.fillRect(0, 0, main.width, main.height);
    const shot = TL.shots.find((s) => t >= s.from && t < s.to) ?? TL.shots[TL.shots.length - 1];
    let bloom = 0;
    if (shot.id !== 'black') {
      g.setTransform(scale, 0, 0, scale, 0, 0);
      SHOTS[shot.id](g, t, clamp((t - shot.from) / (shot.to - shot.from)), shot);
      bloom = BLOOM[shot.id] ?? 0.3;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    if (bloom > 0) {
      const b = L.bloom.getContext('2d');
      b.filter = 'none';
      b.clearRect(0, 0, L.bloom.width, L.bloom.height);
      b.filter = 'blur(10px)';
      b.drawImage(main, 0, 0, L.bloom.width, L.bloom.height);
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = bloom;
      g.drawImage(L.bloom, 0, 0, main.width, main.height);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    g.setTransform(scale, 0, 0, scale, 0, 0);
    const v = g.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.48, H * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    const fr = Math.round(t * TL.fps);
    const r = rng(fr * 7 + 3);
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.1;
    const ox = -r() * 384;
    const oy = -r() * 384;
    for (let yy = oy; yy < H; yy += 384) for (let xx = ox; xx < W; xx += 384) g.drawImage(L.grain[fr % 4], xx, yy);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    const open = smooth(0, 0.5, t);
    if (open < 1) {
      g.fillStyle = `rgba(0,0,0,${1 - open})`;
      g.fillRect(0, 0, W, H);
    }
  }

  async function setupScene(opts) {
    TL = opts.timeline;
    TX = opts.text;
    scale = opts.scale ?? 1;
    main = document.getElementById('frame');
    main.width = Math.round(W * scale);
    main.height = Math.round(H * scale);
    g = main.getContext('2d');
    L.bloom = mk(main.width / 4, main.height / 4);
    L.grain = [1, 2, 3, 4].map((s) => grainTexture(900 + s));
    // Grille du haut-parleur de la radio
    const c = mk(800, 640);
    const x = c.getContext('2d');
    x.fillStyle = '#120C08';
    roundRect(x, 0, 0, 800, 640, 46);
    x.fill();
    for (let j = 0; j < 19; j += 1)
      for (let i = 0; i < 24; i += 1) {
        const cx = 40 + i * 31 + (j % 2) * 15.5;
        if (cx > 770) continue;
        x.fillStyle = '#030201';
        x.beginPath();
        x.arc(cx, 40 + j * 31, 10, 0, Math.PI * 2);
        x.fill();
      }
    L.grille = c;
    const arts = [...new Set(TL.shots.filter((s) => s.art).map((s) => s.art))];
    await Promise.all(arts.map(async (a) => (L.art[a] = await loadImage(`/assets/art-${a}.png`))));
    await Promise.all(['maelle', 'kaz', 'ines', 'theo'].map(async (p) => (L.faces[p] = await loadImage(`/assets/portrait-${p}.png`))));
    L.enemies.berger = await loadImage('/assets/enemy-berger.png');
    for (const f of [`40px ${F.heavy}`, `40px ${F.bold}`, `40px ${F.serif}`, `italic 40px ${F.serif}`, `40px ${F.mono}`]) await document.fonts.load(f);
    return { width: main.width, height: main.height };
  }

  window.setupScene = setupScene;
  window.renderFrame = renderFrame;
})();
