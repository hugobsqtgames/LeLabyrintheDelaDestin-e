/**
 * Valombre — cinématique d'introduction.
 *
 * Rendu procédural en Canvas 2D, image par image et déterministe (aucun hasard non
 * semé) : la même seconde produit toujours la même image. Aucun asset externe :
 * décors, personnages, brouillard, grain et lumière sont calculés ici, dans la
 * palette « Nuit de braise » de l'application (src/ui/tokens.ts).
 *
 * API (utilisée par render.mjs) :
 *   await window.setupScene({ timeline, scale, overlay })  // overlay : textes incrustés (aperçus seulement)
 *   window.renderFrame(t)                                   // dessine l'instant t (secondes)
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
    paper: '#EDE6DA',
    paperDim: '#C9BFAE',
    ice: '#9CCBFF',
    steel: '#9AA4AE',
  };

  let TL = null;
  let main = null;
  let g = null;
  let buf = null;
  let scale = 1;
  let overlay = null;
  const L = {};

  // ---------------------------------------------------------------- outils
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);

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
  /** Bruit de valeur 2D, périodique (px × py mailles) : textures raccordables. */
  function noise2(seed, px, py) {
    const r = rng(seed);
    const v = new Float32Array(px * py);
    for (let i = 0; i < v.length; i += 1) v[i] = r();
    return (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const fx = x - xi;
      const fy = y - yi;
      const x0 = ((xi % px) + px) % px;
      const x1 = (x0 + 1) % px;
      const y0 = ((yi % py) + py) % py;
      const y1 = (y0 + 1) % py;
      const u = fx * fx * (3 - 2 * fx);
      const w = fy * fy * (3 - 2 * fy);
      const a = v[y0 * px + x0];
      const b = v[y0 * px + x1];
      const c = v[y1 * px + x0];
      const d = v[y1 * px + x1];
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
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
  const mixc = (c1, c2, t) => {
    const a = Array.isArray(c1) ? c1 : hex(c1);
    const b = Array.isArray(c2) ? c2 : hex(c2);
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  };
  /** Interpolation douce entre images-clés [[t, v], …]. */
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

  // ---------------------------------------------------------------- textures
  /** Nappe de brume : bruit fractal, raccordable horizontalement, fondue en haut et en bas. */
  function fogTexture(seed, w, h, color, { cells = 3, lo = 0.42, hi = 0.82, band = true } = {}) {
    const c = mk(w, h);
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const d = img.data;
    const oct = [0, 1, 2, 3, 4].map((k) => {
      const px = cells * (1 << k);
      const py = Math.max(1, Math.round((px * h) / w));
      return { f: noise2(seed + k * 101, px, py), px, py, a: Math.pow(0.55, k) };
    });
    const norm = oct.reduce((s, o) => s + o.a, 0);
    const [cr, cg, cb] = hex(color);
    for (let j = 0; j < h; j += 1) {
      const vy = band ? Math.pow(Math.sin((Math.PI * (j + 0.5)) / h), 1.4) : 1;
      for (let i = 0; i < w; i += 1) {
        let v = 0;
        for (const o of oct) v += o.a * o.f((i / w) * o.px, (j / h) * o.py);
        v /= norm;
        const a = smooth(lo, hi, v) * vy;
        const p = (j * w + i) * 4;
        d[p] = cr;
        d[p + 1] = cg;
        d[p + 2] = cb;
        d[p + 3] = a * 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  /** Dessine une nappe raccordable, décalée de `off` px, sur toute la largeur. */
  function drawFog(x, tex, off, y, h, alpha, w = W * 1.6) {
    if (alpha <= 0) return;
    x.save();
    x.globalAlpha = alpha;
    const o = ((off % w) + w) % w;
    for (let k = -1; k < 2; k += 1) x.drawImage(tex, k * w - o, y, w, h);
    x.restore();
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

  // ---------------------------------------------------------------- silhouettes
  /**
   * Toits de Valombre : ardoises en pente, mansardes, cheminées, antennes, clocher.
   * Le bas des bâtiments touche le bas du calque ; `base` = hauteur moyenne.
   */
  function skyline(seed, { w = W * 1.4, h = 1500, base = 900, vary = 120, color, rim = PAL.ice, rimA = 0.2, tower = null, windows = 0, haze = null }) {
    const c = mk(w, h);
    const x = c.getContext('2d');
    const r = rng(seed);
    const tops = [];
    let px = -30;
    while (px < w + 30) {
      const bw = 80 + r() * 160;
      const top = h - (base + (r() - 0.5) * 2 * vary);
      const kind = r();
      const pts = [[px, top]];
      if (kind < 0.42) {
        const peak = 40 + r() * 90;
        pts.push([px + bw * (0.3 + r() * 0.4), top - peak]);
      } else if (kind < 0.7) {
        const m = 16 + r() * 28;
        pts.push([px + m, top - 46], [px + bw - m, top - 46]);
      }
      pts.push([px + bw, top]);
      x.fillStyle = color;
      x.beginPath();
      x.moveTo(px, h);
      for (const p of pts) x.lineTo(p[0], p[1]);
      x.lineTo(px + bw, h);
      x.closePath();
      x.fill();
      const roofY = (cx) => {
        for (let i = 1; i < pts.length; i += 1) if (cx <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (cx - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0] || 1));
        return top;
      };
      // Cheminées et antennes
      const n = r() < 0.7 ? 1 + Math.floor(r() * 2) : 0;
      for (let k = 0; k < n; k += 1) {
        const cx = px + 14 + r() * (bw - 40);
        const ch = 26 + r() * 46;
        const cw = 14 + r() * 14;
        const y = Math.min(roofY(cx), roofY(cx + cw));
        x.fillRect(cx, y - ch, cw, ch + 40);
        x.fillRect(cx - 3, y - ch - 6, cw + 6, 8);
        tops.push([[cx - 3, y - ch - 6], [cx + cw + 3, y - ch - 6]]);
      }
      if (r() < 0.22) {
        const ax = px + bw * (0.2 + r() * 0.6);
        const ay = roofY(ax);
        x.strokeStyle = color;
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(ax, ay);
        x.lineTo(ax, ay - 70 - r() * 50);
        x.moveTo(ax - 22, ay - 50);
        x.lineTo(ax + 22, ay - 50);
        x.moveTo(ax - 14, ay - 70);
        x.lineTo(ax + 14, ay - 70);
        x.stroke();
      }
      // Fenêtres mortes : un reflet de ciel, jamais une lampe.
      if (windows > 0) {
        const floors = Math.floor((h - top) / 70);
        for (let f = 1; f < floors; f += 1)
          for (let wx = px + 18; wx < px + bw - 26; wx += 34) {
            const a = r();
            if (a < 0.35) continue;
            x.fillStyle = rgba(a < 0.85 ? '#9CCBFF' : '#000000', a < 0.85 ? windows * (0.4 + r() * 0.6) : 0.4);
            x.fillRect(wx, top + 30 + f * 70 - 70, 14, 24);
          }
      }
      tops.push(pts);
      px += bw + (r() < 0.25 ? r() * 30 : 0);
    }
    if (tower) {
      const { cx, bh, bw } = tower;
      const ty = h - bh;
      x.fillStyle = color;
      x.fillRect(cx - bw / 2, ty, bw, bh);
      x.fillRect(cx - bw / 2 - 10, ty - 8, bw + 20, 16);
      // Beffroi : abat-sons découpés, le ciel passe au travers.
      const by = ty - 190;
      x.fillRect(cx - bw / 2 + 6, by, bw - 12, 190);
      x.beginPath();
      x.moveTo(cx - bw / 2 - 4, by + 4);
      x.lineTo(cx, by - 330);
      x.lineTo(cx + bw / 2 + 4, by + 4);
      x.closePath();
      x.fill();
      x.fillRect(cx - 3, by - 400, 6, 80);
      x.fillRect(cx - 22, by - 380, 44, 6);
      x.save();
      x.globalCompositeOperation = 'destination-out';
      for (const ox of [-bw / 4, bw / 4]) {
        x.beginPath();
        x.moveTo(cx + ox - 14, by + 160);
        x.lineTo(cx + ox - 14, by + 60);
        x.arc(cx + ox, by + 60, 14, Math.PI, 0);
        x.lineTo(cx + ox + 14, by + 160);
        x.closePath();
        x.fill();
      }
      x.restore();
      tops.push([[cx - bw / 2 - 4, by + 4], [cx, by - 330], [cx + bw / 2 + 4, by + 4]]);
    }
    if (rim) {
      x.save();
      x.globalCompositeOperation = 'source-atop';
      x.strokeStyle = rgba(rim, rimA);
      x.lineWidth = 3;
      for (const p of tops) {
        x.beginPath();
        x.moveTo(p[0][0], p[0][1] + 1.5);
        for (const q of p.slice(1)) x.lineTo(q[0], q[1] + 1.5);
        x.stroke();
      }
      x.restore();
    }
    if (haze) {
      x.save();
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = vgrad(x, h - base - vary - 120, h, [[0, haze, 0.0], [0.25, haze, 0.35], [1, haze, 0.05]]);
      x.fillRect(0, 0, w, h);
      x.restore();
    }
    c.base = base;
    return c;
  }
  /** Ordonnée où dessiner un calque de toits pour que sa ligne moyenne tombe à `top`. */
  const place = (layer, top) => top - (layer.height - layer.base);

  function moonCanvas(r) {
    const s = r * 8;
    const c = mk(s, s);
    const x = c.getContext('2d');
    const m = s / 2;
    glow(x, m, m, r * 4, '#9CCBFF', 0.16, 'source-over');
    glow(x, m, m, r * 1.9, '#DDE8F5', 0.18);
    const disc = x.createRadialGradient(m - r * 0.3, m - r * 0.3, r * 0.2, m, m, r);
    disc.addColorStop(0, '#F6F2EA');
    disc.addColorStop(1, '#C9C6BF');
    x.fillStyle = disc;
    x.beginPath();
    x.arc(m, m, r, 0, Math.PI * 2);
    x.fill();
    const rr = rng(77);
    for (let i = 0; i < 9; i += 1) {
      x.fillStyle = 'rgba(80,85,96,0.10)';
      x.beginPath();
      x.arc(m + (rr() - 0.5) * r * 1.2, m + (rr() - 0.5) * r * 1.2, r * (0.12 + rr() * 0.22), 0, Math.PI * 2);
      x.fill();
    }
    return c;
  }

  function crow(x, cx, cy, s, phase) {
    const f = Math.sin(phase);
    x.fillStyle = '#060607';
    x.beginPath();
    x.ellipse(cx, cy, s * 0.55, s * 0.16, 0, 0, Math.PI * 2);
    x.fill();
    x.lineWidth = s * 0.12;
    x.strokeStyle = '#060607';
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx - s * 0.1, cy);
    x.quadraticCurveTo(cx - s * 0.5, cy - s * 0.6 * f - s * 0.1, cx - s * 1.1, cy - s * 0.9 * f + s * 0.1);
    x.moveTo(cx + s * 0.1, cy);
    x.quadraticCurveTo(cx + s * 0.5, cy - s * 0.6 * f - s * 0.1, cx + s * 1.1, cy - s * 0.9 * f + s * 0.1);
    x.stroke();
  }

  /** Arbre nu (récursif), dessiné une fois dans un calque. */
  function tree(x, cx, cy, len, ang, depth, r, w) {
    if (depth === 0 || len < 3) return;
    const ex = cx + Math.cos(ang) * len;
    const ey = cy + Math.sin(ang) * len;
    x.lineWidth = w;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(ex, ey);
    x.stroke();
    const n = depth > 4 ? 2 : 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i += 1) tree(x, ex, ey, len * (0.62 + r() * 0.18), ang + (r() - 0.5) * 1.1 + (i - (n - 1) / 2) * 0.35, depth - 1, r, w * 0.68);
  }

  // ---------------------------------------------------------------- particules
  function particles(x, t, { n, seed, vy, vx = 0, size, color, alpha, warm = false, sway = 30, y0 = 0, y1 = H }) {
    const r = rng(seed);
    const span = y1 - y0 + 200;
    for (let i = 0; i < n; i += 1) {
      const px0 = r() * W * 1.2 - W * 0.1;
      const py0 = r() * span;
      const sp = 0.5 + r();
      const sz = size * (0.4 + r() * 0.9);
      const ph = r() * 6.28;
      let py = py0 + vy * sp * t;
      py = ((py % span) + span) % span + y0 - 100;
      const px = px0 + vx * sp * t + Math.sin(t * 0.8 + ph) * sway;
      const a = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.7 + ph)));
      if (warm) glow(x, px, py, sz * 7, color, a * 0.5);
      x.fillStyle = rgba(color, a);
      x.beginPath();
      x.arc(px, py, sz, 0, Math.PI * 2);
      x.fill();
    }
  }

  // ---------------------------------------------------------------- caméra
  function camera(x, zoom, cx = W / 2, cy = H / 2, dx = 0, dy = 0, rot = 0) {
    x.translate(cx + dx, cy + dy);
    x.rotate(rot);
    x.scale(zoom, zoom);
    x.translate(-cx, -cy);
  }
  const shakeAt = (t, at, dur, amp, seed) => {
    const k = (t - at) / dur;
    if (k < 0 || k > 1) return [0, 0];
    const n = noise1(seed);
    const e = amp * Math.pow(1 - k, 2);
    return [(n(t * 40) - 0.5) * 2 * e, (n(t * 40 + 50) - 0.5) * 2 * e];
  };

  // ---------------------------------------------------------------- préparation
  async function build() {
    L.grain = [1, 2, 3, 4].map((s) => grainTexture(900 + s));
    L.moon = moonCanvas(56);
    L.cloud = fogTexture(11, 640, 200, '#2B3346', { cells: 3, lo: 0.45, hi: 0.85 });
    L.cloudLit = fogTexture(12, 640, 200, '#6D7A92', { cells: 4, lo: 0.6, hi: 0.95 });
    L.fog = fogTexture(21, 768, 220, '#3A3F4C', { cells: 3, lo: 0.38, hi: 0.8 });
    L.fogWarm = fogTexture(22, 768, 220, '#5A4038', { cells: 3, lo: 0.4, hi: 0.82 });
    L.fogPale = fogTexture(23, 768, 220, '#8C96A3', { cells: 3, lo: 0.35, hi: 0.78 });
    L.fogDawn = fogTexture(24, 768, 220, '#D9A27C', { cells: 3, lo: 0.36, hi: 0.8 });
    L.smoke = fogTexture(25, 256, 768, '#5A463C', { cells: 2, lo: 0.4, hi: 0.85 });
    L.mist = fogTexture(26, 512, 512, '#DCE3EA', { cells: 3, lo: 0.35, hi: 0.85 });

    // Ville (plan 2) et toit (plan 4) : quatre profondeurs.
    L.sky1 = skyline(101, { base: 1060, vary: 70, color: '#2B2A34', rimA: 0.1, windows: 0, haze: '#40384A' });
    L.sky2 = skyline(102, { h: 2000, base: 900, vary: 110, color: '#18171E', rimA: 0.22, windows: 0.03, tower: { cx: 560, bh: 1120, bw: 120 } });
    L.sky3 = skyline(103, { base: 700, vary: 140, color: '#0F0F13', rimA: 0.3, windows: 0.035 });
    L.sky4 = skyline(104, { h: 1300, base: 760, vary: 120, color: '#09090B', rimA: 0.34, windows: 0.03 });

    // Voiture rouillée au premier plan (rue), floue : profondeur de champ.
    {
      const c = mk(900, 520);
      const x = c.getContext('2d');
      x.fillStyle = '#0A0807';
      x.beginPath();
      x.moveTo(30, 470);
      x.lineTo(40, 330);
      x.quadraticCurveTo(70, 290, 170, 280);
      x.lineTo(250, 170);
      x.quadraticCurveTo(300, 140, 420, 140);
      x.lineTo(610, 140);
      x.quadraticCurveTo(680, 150, 730, 270);
      x.lineTo(830, 290);
      x.quadraticCurveTo(880, 300, 870, 380);
      x.lineTo(860, 470);
      x.closePath();
      x.fill();
      x.fillStyle = '#030303';
      for (const wx of [210, 700]) {
        x.beginPath();
        x.arc(wx, 470, 74, 0, Math.PI * 2);
        x.fill();
      }
      // Herbes et lierre sur le toit : « des jardinières de rouille ».
      const r = rng(5);
      x.strokeStyle = '#0C110D';
      x.lineCap = 'round';
      for (let i = 0; i < 70; i += 1) {
        const bx = 280 + r() * 360;
        x.lineWidth = 3 + r() * 4;
        x.beginPath();
        x.moveTo(bx, 145);
        x.quadraticCurveTo(bx + (r() - 0.5) * 60, 100 - r() * 40, bx + (r() - 0.5) * 90, 60 - r() * 90);
        x.stroke();
      }
      x.strokeStyle = 'rgba(156,203,255,0.18)';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(250, 172);
      x.quadraticCurveTo(300, 142, 420, 142);
      x.lineTo(610, 142);
      x.stroke();
      L.car = mk(1000, 640);
      const y = L.car.getContext('2d');
      y.filter = 'blur(14px)';
      y.drawImage(c, 50, 60);
    }

    // Arbres des vergers noyés (jour 4).
    L.trees = [0, 1, 2].map((k) => {
      const c = mk(520, 620);
      const x = c.getContext('2d');
      x.strokeStyle = k === 0 ? '#0B0D10' : k === 1 ? '#1D2228' : '#363C45';
      x.lineCap = 'round';
      const r = rng(300 + k);
      tree(x, 260, 620, 150, -Math.PI / 2 + (r() - 0.5) * 0.15, 8, r, 22);
      return c;
    });

    // Roseaux des tourbières (jour 7).
    {
      const c = mk(W * 1.3, 700);
      const x = c.getContext('2d');
      const r = rng(41);
      x.strokeStyle = '#08090A';
      x.lineCap = 'round';
      for (let i = 0; i < 260; i += 1) {
        const bx = r() * c.width;
        const hh = 200 + r() * 460;
        x.lineWidth = 2 + r() * 4;
        x.beginPath();
        x.moveTo(bx, 700);
        x.quadraticCurveTo(bx + (r() - 0.5) * 40, 700 - hh * 0.6, bx + (r() - 0.5) * 120, 700 - hh);
        x.stroke();
        if (r() < 0.25) {
          x.fillStyle = '#08090A';
          x.beginPath();
          x.ellipse(bx + (r() - 0.5) * 60, 700 - hh * 0.92, 6, 26, 0.2, 0, Math.PI * 2);
          x.fill();
        }
      }
      L.reeds = c;
    }

    // Grille du haut-parleur de la radio.
    {
      const c = mk(800, 640);
      const x = c.getContext('2d');
      x.fillStyle = '#120C08';
      x.beginPath();
      x.roundRect(0, 0, 800, 640, 46);
      x.fill();
      for (let j = 0; j < 19; j += 1)
        for (let i = 0; i < 24; i += 1) {
          const cx = 40 + i * 31 + (j % 2) * 15.5;
          const cy = 40 + j * 31;
          if (cx > 770) continue;
          x.fillStyle = '#030201';
          x.beginPath();
          x.arc(cx, cy, 10, 0, Math.PI * 2);
          x.fill();
          x.strokeStyle = 'rgba(255,196,107,0.08)';
          x.lineWidth = 1.5;
          x.beginPath();
          x.arc(cx, cy + 1, 10, 0.2, Math.PI - 0.2);
          x.stroke();
        }
      L.grille = c;
    }

    await document.fonts.load('34px "JetBrains Mono"');
    await document.fonts.load('80px "Instrument Serif"');
    await document.fonts.load('italic 80px "Instrument Serif"');
  }

  // ---------------------------------------------------------------- plans
  /** 1 · Braises : le noir, puis la cendre qui monte. */
  function shotEmbers(x, t) {
    x.fillStyle = '#050404';
    x.fillRect(0, 0, W, H);
    x.fillStyle = vgrad(x, H * 0.4, H, [[0, '#050404', 0], [1, '#2A120A', 0.55]]);
    x.fillRect(0, 0, W, H);
    const k = smooth(0, 1.4, t);
    x.globalAlpha = k;
    x.save();
    x.translate(W / 2, H * 0.6);
    x.rotate(-Math.PI / 2);
    x.globalAlpha = 0.22 * k;
    drawFog(x, L.fogWarm, t * 40, -260, 520, 1, H * 1.4);
    x.restore();
    x.globalAlpha = k;
    particles(x, t, { n: 70, seed: 3, vy: -42, size: 2.2, color: PAL.rustBright, alpha: 0.7, warm: true, sway: 40 });
    particles(x, t, { n: 140, seed: 4, vy: -18, size: 1.4, color: '#B7A99A', alpha: 0.35, sway: 25 });
    // La braise principale monte doucement au centre du cadre.
    const ey = lerp(H * 0.66, H * 0.42, easeInOut(clamp(t / 5)));
    const ex = W / 2 + Math.sin(t * 0.9) * 18;
    const pulse = 0.8 + 0.2 * Math.sin(t * 5.3) * Math.sin(t * 2.1);
    glow(x, ex, ey, 260 * pulse, PAL.rust, 0.32);
    glow(x, ex, ey, 70, PAL.amber, 0.9);
    x.fillStyle = '#FFF1D8';
    x.beginPath();
    x.arc(ex, ey, 6, 0, Math.PI * 2);
    x.fill();
    x.globalAlpha = 1;
  }

  function nightSky(x, dy, warm = 0.0) {
    x.fillStyle = vgrad(x, dy - 200, H * 0.62 + dy, [
      [0, '#05060A'],
      [0.45, '#10131D'],
      [0.8, '#252330'],
      [0.93, mixc('#2E2830', '#4A2C22', warm)],
      [1, mixc('#3A2C2A', '#6B3522', warm)],
    ]);
    x.fillRect(0, 0, W, H);
  }

  /** 2 · Valombre : la ville morte, vue des toits ; la caméra descend vers les rues. */
  function shotCity(x, t, k) {
    const c = easeInOut(k);
    const dy = lerp(-240, 120, c);
    x.save();
    camera(x, lerp(1.02, 1.12, c), W / 2, H * 0.58);
    nightSky(x, dy * 0.15, 0.35);
    x.drawImage(L.moon, W * 0.7 - 224, H * 0.17 + dy * 0.2 - 224);
    drawFog(x, L.cloud, t * 14, H * 0.08 + dy * 0.22, 420, 0.75);
    drawFog(x, L.cloudLit, t * 22 + 300, H * 0.14 + dy * 0.22, 300, 0.35);
    drawFog(x, L.cloud, -t * 9 + 700, H * 0.22 + dy * 0.24, 360, 0.55);
    // La Lisière, ligne pâle au loin ; des feux lointains rougissent l'horizon.
    const hy = H * 0.535 + dy * 0.35;
    glow(x, W * 0.86, hy, 420, PAL.rust, 0.13);
    glow(x, W * 0.12, hy + 20, 300, PAL.rust, 0.06);
    x.fillStyle = vgrad(x, hy - 30, hy + 10, [[0, '#9CCBFF', 0], [0.7, '#9CCBFF', 0.12], [1, '#9CCBFF', 0]]);
    x.fillRect(0, hy - 30, W, 40);
    x.drawImage(L.sky1, -170 - t * 3, place(L.sky1, 1290) + dy * 0.42);
    drawFog(x, L.fog, t * 18, hy - 60 + dy * 0.1, 260, 0.55);
    x.drawImage(L.sky2, -200 - t * 6, place(L.sky2, 1450) + dy * 0.6);
    drawFog(x, L.fog, -t * 26 + 500, H * 0.66 + dy * 0.62, 300, 0.5);
    x.drawImage(L.sky3, -120 - t * 10, place(L.sky3, 1700) + dy * 0.8);
    drawFog(x, L.fog, -t * 20 + 900, H * 0.7 + dy * 0.8, 380, 0.55);
    drawFog(x, L.fogWarm, t * 30 + 200, H * 0.78 + dy * 0.85, 340, 0.35);
    x.drawImage(L.sky4, -250 - t * 15, place(L.sky4, 2010) + dy * 1.0);
    // Corbeaux
    for (let i = 0; i < 6; i += 1) {
      const t0 = 5.6 + i * 0.25;
      const u = (t - t0) / 5.5;
      if (u < 0 || u > 1) continue;
      const bx = lerp(-80, W + 120, u) + i * 40;
      const by = H * 0.3 + Math.sin(u * 4 + i) * 40 - i * 26 + dy * 0.3;
      crow(x, bx, by, 16 - i, t * 9 + i * 1.3);
    }
    particles(x, t, { n: 90, seed: 8, vy: 22, vx: -6, size: 1.6, color: '#C9C2BA', alpha: 0.28, sway: 20 });
    x.restore();
  }

  // Rue (plan 3) : vraie perspective, la caméra avance.
  const ST = { f: 1450, vpx: W / 2, vpy: H * 0.47 };
  /** Projection avec lacet : la caméra pivote lentement vers l'abribus en avançant. */
  function proj(X, Y, Z, cam) {
    const dx = X - cam.x;
    const dz = Z - cam.z;
    const c = Math.cos(cam.yaw ?? 0);
    const sn = Math.sin(cam.yaw ?? 0);
    const xr = c * dx - sn * dz;
    const z = Math.max(0.3, sn * dx + c * dz);
    const s = ST.f / z;
    return [ST.vpx + xr * s, ST.vpy + (Y - cam.y) * s, s];
  }
  function quad(x, a, b, c, d, fill) {
    x.fillStyle = fill;
    x.beginPath();
    x.moveTo(a[0], a[1]);
    x.lineTo(b[0], b[1]);
    x.lineTo(c[0], c[1]);
    x.lineTo(d[0], d[1]);
    x.closePath();
    x.fill();
  }
  const STREET = (() => {
    const r = rng(61);
    const segs = [];
    for (const side of [-1, 1]) {
      let z = 1;
      while (z < 130) {
        const len = 8 + r() * 9;
        segs.push({ side, z0: z, z1: z + len, h: 11 + r() * 9, tone: r(), win: r() });
        z += len;
      }
    }
    const puddles = Array.from({ length: 12 }, () => ({ X: (r() - 0.5) * 8, Z: 6 + r() * 50, w: 1 + r() * 2.2 }));
    return { segs, puddles };
  })();

  /** Le Muet de l'abribus : immobile, puis des secousses de tête, puis il se tourne vers nous. */
  function muteHead(t) {
    const ev = TL.events;
    let a = 0;
    for (const c of ev.clicks) a += 0.22 * Math.exp(-Math.pow((t - c) * 9, 2)) * Math.sin((t - c) * 40);
    const turn = smooth(ev.snap, ev.snap + 0.16, t);
    return { tilt: a + turn * -0.35, turn };
  }

  function shotStreet(x, t, k) {
    const ev = TL.events;
    const c = easeInOut(k);
    const [sx, sy] = shakeAt(t, ev.snap, 0.5, 14, 9);
    const cam = { x: lerp(0.3, 2.2, c) + Math.sin(t * 0.5) * 0.05, y: -1.6 + Math.sin(t * 1.1) * 0.025, z: lerp(0, 10.6, c), yaw: lerp(0.06, 0.74, c) };
    x.save();
    x.translate(sx, sy);
    // Ciel : la fente entre les façades, la lune au fond.
    x.fillStyle = vgrad(x, 0, ST.vpy, [[0, '#06070C'], [0.7, '#141725'], [1, '#262330']]);
    x.fillRect(0, 0, W, H);
    x.drawImage(L.moon, W * 0.55 - 224, H * 0.1 - 224);
    drawFog(x, L.cloud, t * 10, H * 0.04, 380, 0.6);
    // Chaussée mouillée
    const g0 = proj(-5.2, 0, 140, cam);
    const g1 = proj(5.2, 0, 140, cam);
    const g2 = proj(5.2, 0, cam.z + 0.6, cam);
    const g3 = proj(-5.2, 0, cam.z + 0.6, cam);
    x.save();
    x.beginPath();
    x.rect(0, ST.vpy - 40, W, H);
    x.clip();
    quad(x, [-2000, H], [3000, H], [g1[0] + 2000, g1[1]], [g0[0] - 2000, g0[1]], '#0A0A0D');
    quad(x, g0, g1, g2, g3, '#0D0E12');
    // Reflet de la lune sur l'asphalte mouillé : une traînée douce, jamais un trapèze net.
    x.save();
    x.filter = 'blur(28px)';
    x.fillStyle = vgrad(x, ST.vpy, H, [[0, '#9CCBFF', 0.12], [0.4, '#9CCBFF', 0.05], [1, '#9CCBFF', 0.0]]);
    x.beginPath();
    x.moveTo(g0[0] + (g1[0] - g0[0]) * 0.45, g0[1]);
    x.lineTo(g0[0] + (g1[0] - g0[0]) * 0.55, g0[1]);
    x.lineTo(W * 0.62, H);
    x.lineTo(W * 0.38, H);
    x.closePath();
    x.fill();
    x.restore();
    // Ligne de trottoir
    for (const X of [-5.2, 5.2]) {
      const a = proj(X, 0, 140, cam);
      const b = proj(X, 0, cam.z + 0.5, cam);
      x.strokeStyle = 'rgba(156,203,255,0.12)';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
    }
    // Flaques : le ciel et la lune s'y reflètent.
    for (const p of STREET.puddles) {
      if (p.Z - cam.z < 1.2) continue;
      const [px, py, s] = proj(p.X, 0, p.Z, cam);
      const pg = x.createRadialGradient(px, py, 0, px, py, p.w * s * 0.5);
      pg.addColorStop(0, 'rgba(90,104,138,0.32)');
      pg.addColorStop(0.7, 'rgba(70,82,110,0.18)');
      pg.addColorStop(1, 'rgba(70,82,110,0)');
      x.fillStyle = pg;
      x.save();
      x.translate(px, py);
      x.scale(1, 0.18);
      x.translate(-px, -py);
      x.beginPath();
      x.arc(px, py, p.w * s * 0.5, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    x.restore();
    // Façades, du plus loin au plus proche.
    const segs = STREET.segs.filter((s) => s.z1 > cam.z + 0.4).sort((a, b) => b.z0 - a.z0);
    const fend = proj(0, -16, 140, cam);
    x.fillStyle = '#16161C';
    x.fillRect(proj(-7.5, 0, 140, cam)[0], fend[1], proj(7.5, 0, 140, cam)[0] - proj(-7.5, 0, 140, cam)[0], proj(0, 0, 140, cam)[1] - fend[1]);
    for (const s of segs) {
      const X = s.side * 7.4;
      const z0 = Math.max(s.z0, cam.z + 0.4);
      const a = proj(X, 0, z0, cam);
      const b = proj(X, 0, s.z1, cam);
      const cc = proj(X, -s.h, s.z1, cam);
      const d = proj(X, -s.h, z0, cam);
      const lit = s.side < 0 ? 0.11 : 0.05;
      const base = mixc('#0C0C10', '#1D1E26', s.tone * 0.6 + lit * 2);
      const fog = smooth(20, 120, (s.z0 + s.z1) / 2 - cam.z);
      quad(x, a, b, cc, d, rgba(mixc(base, '#2A2733', fog), 1));
      // Corniche éclairée par la lune
      x.strokeStyle = rgba('#9CCBFF', 0.18 * (1 - fog) + 0.05);
      x.lineWidth = Math.max(1, 0.12 * d[2]);
      x.beginPath();
      x.moveTo(d[0], d[1]);
      x.lineTo(cc[0], cc[1]);
      x.stroke();
      // Fenêtres
      const sMid = proj(X, 0, (z0 + s.z1) / 2, cam)[2];
      if (sMid < 6) continue;
      for (let fl = 1; fl * 3 + 1 < s.h; fl += 1)
        for (let wz = s.z0 + 1.2; wz + 1.2 < s.z1; wz += 2.6) {
          if (wz < cam.z + 0.5) continue;
          const y0 = -fl * 3 - 0.4;
          const y1 = y0 - 1.6;
          const p0 = proj(X, y0, wz, cam);
          const p1 = proj(X, y0, wz + 1.2, cam);
          const p2 = proj(X, y1, wz + 1.2, cam);
          const p3 = proj(X, y1, wz, cam);
          const h1 = Math.abs(Math.sin(wz * 12.9 + fl * 7.1 + s.win * 40));
          const near = smooth(2, 9, wz - cam.z);
          quad(x, p0, p1, p2, p3, h1 > 0.86 ? rgba('#7F95B8', 0.12 * (1 - fog) * near) : rgba('#050507', 0.85 * (1 - fog)));
        }
    }
    // Lampadaires éteints
    for (let Z = 9; Z < 100; Z += 17)
      for (const side of [-1, 1]) {
        if (Z - cam.z < 1) continue;
        const X = side * 5.5;
        const a = proj(X, 0, Z + (side > 0 ? 8 : 0), cam);
        const b = proj(X, -6.2, Z + (side > 0 ? 8 : 0), cam);
        const arm = proj(X - side * 1.1, -6.2, Z + (side > 0 ? 8 : 0), cam);
        x.strokeStyle = '#08080A';
        x.lineWidth = Math.max(1.2, 0.12 * a[2]);
        x.beginPath();
        x.moveTo(a[0], a[1]);
        x.lineTo(b[0], b[1]);
        x.lineTo(arm[0], arm[1]);
        x.stroke();
      }
    // L'abribus
    const SZ0 = 12.5;
    const SZ1 = 16;
    const glass = (pts, a) => {
      quad(x, ...pts, rgba('#9CCBFF', a));
      x.strokeStyle = 'rgba(156,203,255,0.22)';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(pts[0][0], pts[0][1]);
      for (const p of [...pts.slice(1), pts[0]]) x.lineTo(p[0], p[1]);
      x.stroke();
    };
    // Ombre intérieure
    quad(x, proj(5.2, 0, SZ0, cam), proj(5.2, 0, SZ1, cam), proj(7, 0, SZ1, cam), proj(7, 0, SZ0, cam), 'rgba(0,0,0,0.6)');
    glass([proj(7, 0, SZ0, cam), proj(7, 0, SZ1, cam), proj(7, -2.5, SZ1, cam), proj(7, -2.5, SZ0, cam)], 0.05);
    const pan = [proj(5.4, -0.25, SZ1, cam), proj(7, -0.25, SZ1, cam), proj(7, -2.3, SZ1, cam), proj(5.4, -2.3, SZ1, cam)];
    quad(x, ...pan, '#0E0D11');
    // Affiche déchirée, pâle
    const po = [proj(5.7, -0.6, SZ1 - 0.01, cam), proj(6.6, -0.6, SZ1 - 0.01, cam), proj(6.6, -2.0, SZ1 - 0.01, cam), proj(5.7, -2.0, SZ1 - 0.01, cam)];
    quad(x, ...po, 'rgba(201,191,174,0.16)');
    // Le Muet
    const fz = 14.6;
    const [fx, fy, fs] = proj(5.95, 0, fz, cam);
    const head = muteHead(t);
    // Le Muet, dans le style des ennemis du jeu : de dos sous l'abribus, puis il se retourne d'un coup.
    const turned = head.turn > 0.5;
    const mutePose = { view: turned ? 'front' : 'back', hunch: 0.8, tilt: head.tilt * 1.6 };
    const muteLight = { ambient: ['#070A14', 0.5], rim: { color: '#9CCBFF', a: 0.5, dx: -1.5, dy: 1 }, shadow: 0.45 };
    Characters.draw(x, 'muet', { x: fx, y: fy, height: 1.78 * fs, pose: mutePose, light: muteLight });
    // Reflet dans la flaque devant l'abribus
    x.save();
    x.globalAlpha = 0.16;
    x.translate(0, fy * 2 + fs * 0.05);
    x.scale(1, -1);
    Characters.draw(x, 'muet', { x: fx, y: fy, height: 1.78 * fs, pose: mutePose, light: { ambient: ['#0A1020', 0.6] } });
    x.restore();
    // Verre latéral devant le Muet
    glass([proj(5.2, 0, SZ0, cam), proj(7, 0, SZ0, cam), proj(7, -2.5, SZ0, cam), proj(5.2, -2.5, SZ0, cam)], 0.035);
    quad(x, proj(5.1, -2.5, SZ0 - 0.2, cam), proj(7.1, -2.5, SZ0 - 0.2, cam), proj(7.1, -2.75, SZ1, cam), proj(5.1, -2.75, SZ1, cam), '#09090C');
    drawFog(x, L.fog, t * 25, ST.vpy - 120, 300, 0.4);
    drawFog(x, L.fog, -t * 35 + 300, ST.vpy + 200, 260, 0.25);
    // Premier plan : voiture rouillée, floue.
    const [cx0, cy0, cs] = proj(-2.6, 0, 7.5, cam);
    if (cs < 900) {
      const cw = cs * 4.3;
      x.drawImage(L.car, cx0 - cw * 0.55, cy0 - cw * 0.62, cw, cw * 0.64);
    }
    particles(x, t, { n: 70, seed: 12, vy: 26, vx: -10, size: 1.5, color: '#C9C2BA', alpha: 0.22, sway: 18 });
    x.restore();
    // Coup de tête : un éclair froid très bref (pas de flash, juste une respiration de lumière).
    const hit = Math.exp(-Math.pow((t - ev.snap - 0.05) * 7, 2));
    if (hit > 0.01) {
      x.fillStyle = rgba('#9CCBFF', 0.07 * hit);
      x.fillRect(0, 0, W, H);
    }
  }

  /** 4a · Le toit de la pharmacie Saint-Clair. */
  function shotRoof(x, t, k) {
    const c = easeInOut(k);
    x.save();
    camera(x, lerp(1.0, 1.06, c), W * 0.45, H * 0.62);
    nightSky(x, -120, 0.25);
    x.drawImage(L.moon, W * 0.25 - 224, H * 0.13 - 224);
    drawFog(x, L.cloud, t * 12, H * 0.05, 400, 0.65);
    drawFog(x, L.cloudLit, t * 18 + 120, H * 0.1, 280, 0.3);
    const hy = H * 0.52;
    glow(x, W * 0.8, hy, 380, PAL.rust, 0.12);
    x.drawImage(L.sky1, -300, place(L.sky1, hy + 20));
    drawFog(x, L.fog, t * 20, hy - 40, 240, 0.5);
    x.drawImage(L.sky2, -360, place(L.sky2, hy + 160));
    drawFog(x, L.fog, -t * 24, H * 0.6, 280, 0.45);
    x.drawImage(L.sky3, -260, place(L.sky3, hy + 360));
    // Croix verte de la pharmacie, éteinte depuis l'hiver.
    x.save();
    x.translate(W * 0.8, H * 0.6);
    x.fillStyle = '#0A0B0B';
    x.fillRect(100, -12, 160, 20);
    x.fillRect(240, -60, 14, 300);
    const arm = 100;
    const crossPath = () => {
      x.beginPath();
      x.moveTo(-arm / 3, -arm);
      x.lineTo(arm / 3, -arm);
      x.lineTo(arm / 3, -arm / 3);
      x.lineTo(arm, -arm / 3);
      x.lineTo(arm, arm / 3);
      x.lineTo(arm / 3, arm / 3);
      x.lineTo(arm / 3, arm);
      x.lineTo(-arm / 3, arm);
      x.lineTo(-arm / 3, arm / 3);
      x.lineTo(-arm, arm / 3);
      x.lineTo(-arm, -arm / 3);
      x.lineTo(-arm / 3, -arm / 3);
      x.closePath();
    };
    crossPath();
    x.fillStyle = vgrad(x, -arm, arm, [[0, '#1F3A2A'], [1, '#0B1610']]);
    x.fill();
    x.strokeStyle = 'rgba(111,191,138,0.45)';
    x.lineWidth = 4;
    x.stroke();
    // Tubes éteints du néon
    x.strokeStyle = 'rgba(147,221,169,0.12)';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(0, -arm + 18);
    x.lineTo(0, arm - 18);
    x.moveTo(-arm + 18, 0);
    x.lineTo(arm - 18, 0);
    x.stroke();
    x.restore();
    // Parapet
    const py = H * 0.71;
    x.fillStyle = vgrad(x, py, H, [[0, '#121114'], [0.1, '#0B0A0C'], [1, '#050505']]);
    x.beginPath();
    x.moveTo(0, py + 20);
    x.lineTo(W, py - 10);
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(156,203,255,0.18)';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(0, py + 21);
    x.lineTo(W, py - 9);
    x.stroke();
    // Couvertine de pierre
    x.strokeStyle = 'rgba(0,0,0,0.6)';
    x.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      const xx = i * 130 + 40;
      x.beginPath();
      x.moveTo(xx, py + 20 - (xx / W) * 30);
      x.lineTo(xx - 6, py + 70 - (xx / W) * 30);
      x.stroke();
    }
    // La personne de garde ; la lueur de la radio sur ses mains.
    const sx = W * 0.4;
    const sy = py + 8;
    const flick = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
    glow(x, sx + 110, sy - 70, 620, PAL.amber, 0.22 * flick);
    glow(x, sx + 120, sy + 30, 260, PAL.amber, 0.25 * flick);
    // Le protagoniste, de dos, assis sur le parapet : la radio sur les genoux éclaire ses mains et son écharpe.
    const hk = 2.9;
    Characters.draw(x, 'hero', {
      x: sx,
      y: sy + 110 * hk,
      height: 250 * hk,
      pose: { view: 'back', sit: true, tilt: Math.sin(t * 0.6) * 0.03 },
      light: { ambient: ['#0A0E1A', 0.42], key: { x: 40, y: -120, r: 120, color: '#FFC46B', a: 0.55 * flick }, rim: { color: '#9CCBFF', a: 0.45, dx: 1.5, dy: 1.5 } },
    });
    // Antenne de la radio, qui dépasse de l'épaule
    x.strokeStyle = '#1A1A1C';
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(sx + 70, sy - 120);
    x.lineTo(sx + 175, sy - 430);
    x.stroke();
    glow(x, sx + 175, sy - 430, 18, PAL.amber, 0.5 * flick);
    // Buée de la respiration
    for (const b of TL.events.breath) {
      const u = (t - b) / 1.6;
      if (u < 0 || u > 1) continue;
      x.globalAlpha = 0.18 * Math.sin(Math.PI * u);
      x.drawImage(L.fogPale, 0, 0, 300, 120, sx - 20 + u * 140, sy - 520 - u * 120, 220 + u * 160, 110 + u * 60);
      x.globalAlpha = 1;
    }
    particles(x, t, { n: 60, seed: 15, vy: 20, vx: -8, size: 1.5, color: '#C9C2BA', alpha: 0.22, sway: 16 });
    x.restore();
  }

  const freqAt = (t) => keys(TL.events.tuneKeys, t) + (t > 21.6 ? Math.sin(t * 2.3) * 0.02 : 0);
  const voiceEnv = (t) => {
    const ev = TL.events;
    if (t < ev.voiceFrom || t > ev.voiceTo) return 0;
    const n = noise1(31);
    const syl = Math.pow(Math.max(0, Math.sin(t * 15.7 + n(t * 3) * 4)), 0.6);
    const phrase = smooth(ev.voiceFrom, ev.voiceFrom + 0.2, t) * smooth(ev.voiceTo, ev.voiceTo - 0.3, t) * (n(t * 1.3) > 0.2 ? 1 : 0.3);
    return syl * phrase;
  };

  /** 4b · La radio de chantier : l'aiguille cherche, puis la voix sort du bruit. */
  function shotRadio(x, t, k) {
    const ev = TL.events;
    const c = easeInOut(k);
    const f = freqAt(t);
    const locked = smooth(21.45, 21.7, t);
    const v = voiceEnv(t);
    x.save();
    camera(x, lerp(1.0, 1.1, c), W / 2, H * 0.42, 0, 0, lerp(-0.012, 0.01, c));
    x.fillStyle = vgrad(x, 0, H, [[0, '#2A170C'], [0.45, '#1B0F08'], [1, '#090504']]);
    x.fillRect(-100, -100, W + 200, H + 200);
    // Grain du plastique
    x.globalAlpha = 0.25;
    x.drawImage(L.grain[2], 0, 0, W, H);
    x.globalAlpha = 1;
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.fillRect(0, 0, W, H);
    // Arceau et coins en caoutchouc de la radio de chantier
    x.strokeStyle = '#3A2414';
    x.lineWidth = 34;
    x.beginPath();
    x.roundRect(40, 560, W - 80, 1700, 80);
    x.stroke();
    x.strokeStyle = 'rgba(255,196,107,0.12)';
    x.lineWidth = 3;
    x.beginPath();
    x.roundRect(24, 544, W - 48, 1732, 90);
    x.stroke();
    for (const [vx, vy] of [[110, 630], [W - 110, 630], [110, 2190], [W - 110, 2190]]) {
      x.fillStyle = '#0A0604';
      x.beginPath();
      x.arc(vx, vy, 16, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = 'rgba(255,196,107,0.25)';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(vx - 9, vy - 9);
      x.lineTo(vx + 9, vy + 9);
      x.stroke();
    }
    // Cadran rétroéclairé
    const wx = 100;
    const wy = 760;
    const ww = 880;
    const wh = 330;
    const back = 0.75 + 0.1 * Math.sin(t * 31) * (1 - locked) + 0.1 * v;
    x.save();
    x.beginPath();
    x.roundRect(wx, wy, ww, wh, 30);
    x.clip();
    x.fillStyle = vgrad(x, wy, wy + wh, [[0, '#B8641E', back], [0.5, '#F5A44A', back], [1, '#A2521A', back]]);
    x.fillRect(wx, wy, ww, wh);
    const fx = (fr) => wx + 60 + ((fr - 87.5) / (108.5 - 87.5)) * (ww - 120);
    x.strokeStyle = 'rgba(40,18,6,0.85)';
    x.fillStyle = 'rgba(40,18,6,0.9)';
    x.font = '34px "JetBrains Mono"';
    x.textAlign = 'center';
    for (let fr = 88; fr <= 108; fr += 0.5) {
      const big = Math.abs(fr - Math.round(fr)) < 0.01;
      x.lineWidth = big ? 3 : 2;
      x.beginPath();
      x.moveTo(fx(fr), wy + 70);
      x.lineTo(fx(fr), wy + (big ? 128 : 100));
      x.stroke();
      if (big && Math.round(fr) % 2 === 0) x.fillText(String(Math.round(fr)), fx(fr), wy + 180);
    }
    x.font = '26px "JetBrains Mono"';
    x.fillText('FM · MHz', wx + ww / 2, wy + 270);
    // Aiguille
    const nx = fx(f);
    glow(x, nx, wy + wh / 2, 120, PAL.rust, 0.5);
    x.fillStyle = '#C8200E';
    x.fillRect(nx - 4, wy + 20, 8, wh - 40);
    // Reflet de la vitre
    x.fillStyle = 'rgba(255,255,255,0.07)';
    x.beginPath();
    x.moveTo(wx, wy);
    x.lineTo(wx + 380, wy);
    x.lineTo(wx + 200, wy + wh);
    x.lineTo(wx, wy + wh);
    x.closePath();
    x.fill();
    x.restore();
    glow(x, wx + ww / 2, wy + wh / 2, 720, PAL.amber, 0.16 * back);
    x.strokeStyle = 'rgba(255,196,107,0.25)';
    x.lineWidth = 4;
    x.beginPath();
    x.roundRect(wx, wy, ww, wh, 30);
    x.stroke();
    // Vumètre : bruit avant l'accord, voix ensuite.
    const n = noise1(44);
    const level = (1 - locked) * (0.25 + 0.5 * n(t * 18)) + locked * (0.15 + 0.75 * v);
    for (let i = 0; i < 10; i += 1) {
      const on = i / 10 < level;
      const col = i < 6 ? PAL.moss : i < 8 ? PAL.amber : PAL.rust;
      x.fillStyle = on ? col : 'rgba(255,255,255,0.05)';
      x.beginPath();
      x.roundRect(wx + 520 + i * 36, wy - 70, 26, 34, 6);
      x.fill();
      if (on) glow(x, wx + 533 + i * 36, wy - 53, 40, col, 0.35);
    }
    x.fillStyle = 'rgba(255,196,107,0.55)';
    x.font = '26px "JetBrains Mono"';
    x.textAlign = 'left';
    x.fillText('SIGNAL', wx, wy - 44);
    // Haut-parleur : la grille vibre avec la voix.
    const gs = 1 + v * 0.004;
    x.save();
    x.translate(W / 2, 1520);
    x.scale(gs, gs);
    x.drawImage(L.grille, -400, -320);
    x.restore();
    glow(x, W / 2, 1520, 600, PAL.amber, 0.05 + 0.05 * v);
    // Bouton de réglage et pouce ganté.
    const kx = 800;
    const ky = 1990;
    x.save();
    x.translate(kx, ky);
    x.fillStyle = '#100A07';
    x.beginPath();
    x.arc(0, 0, 170, 0, Math.PI * 2);
    x.fill();
    x.rotate((f - 94) * 0.6);
    x.strokeStyle = 'rgba(255,196,107,0.14)';
    x.lineWidth = 6;
    for (let i = 0; i < 40; i += 1) {
      const a = (i / 40) * Math.PI * 2;
      x.beginPath();
      x.moveTo(Math.cos(a) * 150, Math.sin(a) * 150);
      x.lineTo(Math.cos(a) * 168, Math.sin(a) * 168);
      x.stroke();
    }
    x.restore();
    const tune = t < 21.6 ? Math.sin(t * 9) * 6 : 0;
    x.fillStyle = '#050403';
    x.beginPath();
    x.ellipse(kx + 150 + tune, ky + 120, 190, 120, -0.7, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = rgba(PAL.amber, 0.16);
    x.lineWidth = 4;
    x.beginPath();
    x.ellipse(kx + 150 + tune, ky + 120, 190, 120, -0.7, Math.PI * 0.95, Math.PI * 1.45);
    x.stroke();
    x.restore();
    // Parasites : lignes horizontales furtives tant que la station n'est pas accrochée.
    const r = rng(Math.floor(t * 30) + 7);
    for (let i = 0; i < 8 * (1 - locked); i += 1) {
      x.fillStyle = `rgba(255,220,180,${0.03 + r() * 0.05})`;
      x.fillRect(0, r() * H, W, 1 + r() * 3);
    }
  }

  // Voyage : sept jours, sept lieux, une seconde chacun.
  function push(x, k, cx = W / 2, cy = H / 2, dx = 0) {
    camera(x, lerp(1.0, 1.08, easeOut(k)), cx, cy, lerp(dx, -dx, k));
  }

  /** Jour 1 · Les carrières : les arches de calcaire, une torche. */
  function day1(x, t, k) {
    x.save();
    push(x, k, W / 2, H * 0.5, 20);
    x.fillStyle = '#050302';
    x.fillRect(-50, -50, W + 100, H + 100);
    const vp = { x: W / 2, y: H * 0.5 };
    const torchZ = 3.9 - k * 0.5;
    const fl = 0.85 + 0.15 * Math.sin(t * 37) * Math.sin(t * 13);
    for (let i = 16; i >= 0; i -= 1) {
      const z = 1.5 + i * 2.2 - k * 1.2;
      if (z < 0.6) continue;
      const s = 1100 / z;
      const light = Math.exp(-Math.abs(z - torchZ) / 4) * fl;
      const col = mixc('#120C08', '#C98A55', light * 0.85);
      x.strokeStyle = rgba(col, 1);
      x.lineWidth = Math.max(2, 0.45 * s);
      const half = 2.3 * s;
      const floor = vp.y + 1.7 * s;
      const spring = vp.y - 0.8 * s;
      x.beginPath();
      x.moveTo(vp.x - half, floor);
      x.lineTo(vp.x - half, spring);
      x.arc(vp.x, spring, half, Math.PI, 0);
      x.lineTo(vp.x + half, floor);
      x.stroke();
      // Sol de pierre mouillée
      x.fillStyle = rgba(mixc('#0B0806', '#5A3A22', light * 0.6), 1);
      x.fillRect(vp.x - half, floor - 0.04 * s, half * 2, 0.08 * s);
    }
    const tz = torchZ;
    const ts = 1100 / tz;
    const tx = vp.x - 0.5 * ts;
    const ty = vp.y + 1.7 * ts;
    // Kaz, derrière, porte la torche ; Inès ouvre la marche, lampe frontale allumée.
    const kz = tz + 2.2;
    const ks = 1100 / kz;
    const kx = vp.x + 0.75 * ks;
    const ky = vp.y + 1.7 * ks;
    const warm = { ambient: ['#160C06', 0.42], rim: { color: '#FFB066', a: 0.55, dx: -1.5, dy: 1.5 }, shadow: 0.35 };
    Characters.draw(x, 'kaz', { x: kx, y: ky, height: 1.85 * ks, pose: { view: 'front', walk: t * 7 + 1.4 }, light: warm });
    const fx = kx + 0.42 * ks;
    const fy = ky - 1.55 * ks;
    glow(x, fx, fy, 900 * fl, PAL.rust, 0.3);
    glow(x, fx, fy, 160 * fl, PAL.amber, 0.9);
    Characters.draw(x, 'ines', { x: tx, y: ty, height: 1.7 * ts, pose: { view: 'front', walk: t * 7 }, light: { ...warm, key: { x: 60, y: -180, r: 200, color: '#FFB066', a: 0.2 * fl } } });
    glow(x, tx, ty - 1.62 * ts, 70, '#FFF1D0', 0.55);
    particles(x, t, { n: 30, seed: 51, vy: -60, size: 2, color: PAL.amber, alpha: 0.6, warm: true, sway: 14, y0: fy - 400, y1: fy });
    x.restore();
  }

  /** Jour 2 · Les faubourgs : rails, caténaires, un wagon couché. */
  function day2(x, t, k) {
    x.save();
    push(x, k, W / 2, H * 0.55, -16);
    const hy = H * 0.5;
    x.fillStyle = vgrad(x, 0, hy, [[0, '#0D100F'], [1, '#3A4038']]);
    x.fillRect(-50, -50, W + 100, hy + 60);
    drawFog(x, L.cloud, t * 30, H * 0.12, 500, 0.6);
    x.fillStyle = vgrad(x, hy, H, [[0, '#1A1C19'], [1, '#060706']]);
    x.fillRect(-50, hy, W + 100, H);
    const P = (X, Y, Z) => {
      const s = 1000 / Math.max(0.4, Z - k * 3);
      return [W / 2 + X * s, hy + Y * s, s];
    };
    for (let Z = 2; Z < 120; Z += 1.2) {
      const a = P(-2.6, 1.5, Z);
      const b = P(2.6, 1.5, Z);
      x.fillStyle = 'rgba(10,8,6,0.9)';
      x.fillRect(a[0], a[1] - 0.06 * a[2], b[0] - a[0], 0.12 * a[2]);
    }
    for (const X of [-0.75, 0.75]) {
      const a = P(X, 1.5, 120);
      const b = P(X, 1.5, 1.2);
      x.strokeStyle = 'rgba(190,200,190,0.35)';
      x.lineWidth = 6;
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
    }
    for (let Z = 4; Z < 110; Z += 9) {
      const a = P(-3.4, 1.5, Z);
      const b = P(-3.4, -6, Z);
      const c = P(2.4, -5.4, Z);
      x.strokeStyle = '#0A0B0A';
      x.lineWidth = Math.max(1.5, 0.22 * a[2]);
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.lineTo(c[0], c[1]);
      x.stroke();
    }
    for (const Y of [-5.2, -4.6]) {
      const a = P(0, Y, 120);
      const b = P(0, Y, 1.5);
      x.strokeStyle = 'rgba(8,9,8,0.9)';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
    }
    // Wagon renversé
    const w0 = P(4, 1.5, 26);
    x.save();
    x.translate(w0[0], w0[1]);
    x.rotate(0.35);
    x.fillStyle = '#0B0C0B';
    x.fillRect(0, -3 * w0[2], 9 * w0[2], 3 * w0[2]);
    x.restore();
    // Le protagoniste et Théo, de dos, le long des voies.
    const cold = { ambient: ['#0C110E', 0.4], rim: { color: '#C9D4C4', a: 0.35, dx: 0, dy: 2 }, shadow: 0.35 };
    Characters.draw(x, 'theo', { x: P(0.6, 1.5, 6.4)[0], y: P(0.6, 1.5, 6.4)[1], height: 1.35 * P(0, 0, 6.4)[2], pose: { view: 'back', walk: t * 8 + 2 }, light: cold });
    Characters.draw(x, 'hero', { x: P(-0.35, 1.5, 5.6)[0], y: P(-0.35, 1.5, 5.6)[1], height: 1.78 * P(0, 0, 5.6)[2], pose: { view: 'back', walk: t * 7 }, light: cold });
    drawFog(x, L.fog, t * 40, hy - 160, 360, 0.55);
    x.restore();
  }

  function waterReflect(x, src, y, alpha, t) {
    const strips = 70;
    const sh = (H - y) / strips;
    for (let i = 0; i < strips; i += 1) {
      const sy = y - (i + 1) * sh;
      const off = Math.sin(t * 2 + i * 0.7) * (2 + i * 0.25);
      x.globalAlpha = alpha * (1 - i / strips);
      x.drawImage(src, 0, sy * scale, W * scale, sh * scale, off, y + i * sh, W, sh);
    }
    x.globalAlpha = 1;
  }

  /** Jour 3 · Le port fluvial : grues, ferraille et eau noire. */
  function day3(x, t, k) {
    x.save();
    push(x, k, W / 2, H * 0.48, 22);
    const hy = H * 0.55;
    x.fillStyle = vgrad(x, 0, hy, [[0, '#071012'], [0.7, '#14292B'], [1, '#2F4A48']]);
    x.fillRect(-60, -60, W + 120, hy + 60);
    drawFog(x, L.cloud, t * 25 + 200, H * 0.16, 480, 0.5);
    const crane = (cx, base, s, col) => {
      x.strokeStyle = col;
      x.fillStyle = col;
      x.lineWidth = 7 * s;
      x.beginPath();
      x.moveTo(cx - 60 * s, base);
      x.lineTo(cx - 40 * s, base - 520 * s);
      x.lineTo(cx + 40 * s, base - 520 * s);
      x.lineTo(cx + 60 * s, base);
      x.moveTo(cx - 50 * s, base - 260 * s);
      x.lineTo(cx + 50 * s, base - 260 * s);
      x.stroke();
      x.fillRect(cx - 70 * s, base - 560 * s, 140 * s, 50 * s);
      x.lineWidth = 9 * s;
      x.beginPath();
      x.moveTo(cx - 520 * s, base - 540 * s);
      x.lineTo(cx + 260 * s, base - 560 * s);
      x.stroke();
      x.lineWidth = 2 * s;
      x.beginPath();
      x.moveTo(cx - 380 * s, base - 540 * s);
      x.lineTo(cx - 380 * s, base - (240 + Math.sin(t * 1.5) * 8) * s);
      x.stroke();
      x.fillRect(cx - 395 * s, base - 240 * s, 30 * s, 18 * s);
    };
    crane(W * 0.82, hy + 10, 0.55, '#1E3233');
    crane(W * 0.28, hy + 10, 0.9, '#0F1C1D');
    crane(W * 0.7, hy + 30, 1.3, '#070D0E');
    x.fillStyle = '#050909';
    x.fillRect(-60, hy - 40, W * 0.45, 80);
    x.fillRect(W * 0.05, hy - 150, 300, 110);
    x.fillRect(W * 0.1, hy - 250, 220, 100);
    // Eau
    x.fillStyle = vgrad(x, hy, H, [[0, '#0D1A1B'], [1, '#030606']]);
    x.fillRect(-60, hy, W + 120, H - hy + 60);
    waterReflect(x, buf, hy, 0.5, t);
    drawFog(x, L.fog, -t * 30, hy - 120, 260, 0.45);
    // Maëlle et Théo sur le quai, face à l'eau noire.
    const teal = { ambient: ['#06100F', 0.45], rim: { color: '#9CCBFF', a: 0.4, dx: -1.5, dy: 1 }, shadow: 0.3 };
    x.fillStyle = '#040808';
    x.beginPath();
    x.moveTo(-60, hy - 40);
    x.lineTo(W * 0.42, hy - 40);
    x.lineTo(W * 0.62, H + 60);
    x.lineTo(-60, H + 60);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(156,203,255,0.18)';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(W * 0.42, hy - 40);
    x.lineTo(W * 0.62, H + 60);
    x.stroke();
    Characters.draw(x, 'maelle', { x: W * 0.3, y: H * 0.86, height: 640, pose: { view: 'front', tilt: 0.04 }, light: { ...teal, rim: { color: '#9CCBFF', a: 0.45, dx: 2, dy: 1 } } });
    Characters.draw(x, 'theo', { x: W * 0.52, y: H * 0.8, height: 400, pose: { view: 'front', tilt: -0.08 }, light: { ...teal, rim: { color: '#9CCBFF', a: 0.45, dx: 2, dy: 1 } } });
    x.restore();
  }

  /** Jour 4 · Les vergers noyés : des arbres debout dans l'eau. */
  function day4(x, t, k) {
    x.save();
    push(x, k, W / 2, H * 0.5, -18);
    const hy = H * 0.52;
    x.fillStyle = vgrad(x, 0, hy, [[0, '#0E1116'], [0.75, '#3B414B'], [1, '#5B616B']]);
    x.fillRect(-60, -60, W + 120, hy + 60);
    x.globalAlpha = 0.6;
    x.drawImage(L.moon, W * 0.3 - 224, H * 0.22 - 224);
    x.globalAlpha = 1;
    drawFog(x, L.fogPale, t * 15, H * 0.3, 380, 0.25);
    const rows = [
      { y: hy, s: 0.35, tex: 2, n: 9, off: 40 },
      { y: hy + 40, s: 0.6, tex: 1, n: 6, off: 10 },
      { y: hy + 120, s: 1.1, tex: 0, n: 3, off: -60 },
    ];
    for (const r of rows) {
      for (let i = 0; i < r.n; i += 1) {
        const tx = (i + 0.5) * (W / r.n) + r.off + Math.sin(i * 3.1) * 40 - t * 6 * r.s;
        const tw = 520 * r.s;
        const th = 620 * r.s;
        x.drawImage(L.trees[r.tex], tx - tw / 2, r.y - th, tw, th);
      }
      drawFog(x, L.fogPale, t * 20 + r.y, r.y - 100 * r.s, 200 * r.s + 60, 0.3);
    }
    x.fillStyle = vgrad(x, hy, H, [[0, '#4A505A'], [1, '#0B0D10']]);
    x.fillRect(-60, hy + 120, W + 120, H);
    waterReflect(x, buf, hy + 120, 0.55, t);
    x.restore();
  }

  /** Jour 5 · Le barrage de Vaulx : le mur, et la brume du déversoir. */
  function day5(x, t, k) {
    x.save();
    push(x, k, W / 2, H * 0.4, 14);
    x.fillStyle = vgrad(x, 0, H * 0.3, [[0, '#090B10'], [1, '#232633']]);
    x.fillRect(-60, -60, W + 120, H + 120);
    const top = H * 0.24;
    x.fillStyle = vgrad(x, top, H, [[0, '#2E2F35'], [0.35, '#18191D'], [1, '#070709']]);
    x.beginPath();
    x.moveTo(-60, top + 60);
    x.quadraticCurveTo(W / 2, top - 70, W + 60, top + 60);
    x.lineTo(W + 60, H + 60);
    x.lineTo(-60, H + 60);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 3;
    for (let i = 0; i < 14; i += 1) {
      const u = i / 13;
      const xx = lerp(-60, W + 60, u);
      const yy = top + 60 - Math.sin(Math.PI * u) * 130 + 10;
      x.beginPath();
      x.moveTo(xx, yy);
      x.lineTo(lerp(-400, W + 400, u), H + 60);
      x.stroke();
    }
    x.strokeStyle = 'rgba(156,203,255,0.25)';
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(-60, top + 60);
    x.quadraticCurveTo(W / 2, top - 70, W + 60, top + 60);
    x.stroke();
    Characters.draw(x, 'hero', { x: W * 0.44, y: top - 3, height: 52, pose: { view: 'back', walk: t * 6 }, light: { ambient: ['#0A0C14', 0.5] } });
    // Déversoir : l'eau tombe, la brume remonte.
    // Déversoir : un rideau d'eau strié, puis la brume qui remonte.
    x.save();
    x.filter = 'blur(6px)';
    const fall = x.createLinearGradient(W * 0.64, 0, W * 0.98, 0);
    fall.addColorStop(0, 'rgba(200,210,220,0)');
    fall.addColorStop(0.2, 'rgba(160,172,186,0.16)');
    fall.addColorStop(0.8, 'rgba(160,172,186,0.16)');
    fall.addColorStop(1, 'rgba(200,210,220,0)');
    x.fillStyle = fall;
    x.fillRect(W * 0.64, top - 10, W * 0.34, H);
    const rr = rng(Math.floor(t * 12));
    x.strokeStyle = 'rgba(220,228,236,0.16)';
    for (let i = 0; i < 26; i += 1) {
      const xx = W * 0.67 + ((i * 37 + t * 4) % (W * 0.28));
      x.lineWidth = 2 + rr() * 5;
      x.beginPath();
      x.moveTo(xx, top - 5);
      x.lineTo(xx + (rr() - 0.5) * 10, H);
      x.stroke();
    }
    x.restore();
    x.save();
    x.filter = 'blur(18px)';
    for (let i = 0; i < 4; i += 1) {
      x.globalAlpha = 0.12;
      x.drawImage(L.mist, W * 0.45 - i * 140, H * 0.5 - ((t * 70 + i * 130) % 300), W * 0.8 + i * 120, 1000);
    }
    x.restore();
    x.restore();
  }

  /** Jour 6 · La rocade : voitures abandonnées, fumées, un incendie au loin. */
  function day6(x, t, k) {
    x.save();
    push(x, k, W / 2, H * 0.5, -20);
    const hy = H * 0.46;
    x.fillStyle = vgrad(x, 0, hy, [[0, '#0A0706'], [0.75, '#2A1611'], [1, '#55261A']]);
    x.fillRect(-60, -60, W + 120, H + 120);
    glow(x, W * 0.7, hy, 700, PAL.rust, 0.35);
    x.save();
    x.filter = 'blur(4px)';
    for (let i = 0; i < 4; i += 1) {
      x.globalAlpha = 0.95;
      x.drawImage(L.smoke, W * (0.42 + i * 0.13) - 260, hy - 1500 + ((t * 40 + i * 90) % 120), 560, 1560);
    }
    x.restore();
    glow(x, W * 0.62, hy - 30, 420, PAL.rustBright, 0.25);
    x.fillStyle = '#0B0807';
    x.fillRect(-60, hy, W + 120, H);
    const P = (X, Z) => {
      const s = 1000 / Math.max(0.5, Z - k * 4);
      return [W / 2 + (X + Math.sin(Z * 0.04) * 6 - 3) * s, hy + 3 * s, s];
    };
    x.fillStyle = '#16100D';
    x.beginPath();
    const ptsL = [];
    const ptsR = [];
    for (let Z = 2; Z < 200; Z += 2) {
      ptsL.push(P(-6, Z));
      ptsR.push(P(6, Z));
    }
    x.moveTo(ptsL[0][0], ptsL[0][1]);
    for (const p of ptsL) x.lineTo(p[0], p[1]);
    for (const p of ptsR.reverse()) x.lineTo(p[0], p[1]);
    x.closePath();
    x.fill();
    const r = rng(66);
    for (let i = 0; i < 18; i += 1) {
      const Z = 6 + i * 7 + r() * 3;
      const X = (r() - 0.5) * 9;
      const [cx, cy, s] = P(X, Z);
      x.fillStyle = '#060404';
      x.beginPath();
      x.roundRect(cx - 2.1 * s, cy - 1.45 * s, 4.2 * s, 1.45 * s, 0.35 * s);
      x.fill();
      x.beginPath();
      x.roundRect(cx - 1.2 * s, cy - 2.05 * s, 2.4 * s, 0.7 * s, 0.3 * s);
      x.fill();
      x.strokeStyle = rgba(PAL.rust, 0.25);
      x.lineWidth = Math.max(1, 0.06 * s);
      x.beginPath();
      x.moveTo(cx - 1.2 * s, cy - 2.05 * s);
      x.lineTo(cx + 1.2 * s, cy - 2.05 * s);
      x.stroke();
    }
    // Le protagoniste vient vers nous, l'incendie dans le dos.
    Characters.draw(x, 'hero', { x: P(0.8, 5.4)[0], y: P(0.8, 5.4)[1], height: 1.78 * P(0.8, 5.4)[2], pose: { view: 'front', walk: t * 7 }, light: { ambient: ['#140806', 0.5], rim: { color: '#FF8A5B', a: 0.7, dx: 1.5, dy: 2 }, shadow: 0.4 } });
    particles(x, t, { n: 60, seed: 67, vy: -80, vx: 10, size: 2, color: PAL.rustBright, alpha: 0.6, warm: true, sway: 30 });
    x.restore();
  }

  /** Jour 7 · Les tourbières : le brouillard, et l'aube qui commence. */
  function day7(x, t, k) {
    const dawn = smooth(32.4, 33.6, t);
    x.save();
    push(x, k * 0.6, W / 2, H * 0.5, 10);
    const hy = H * 0.5;
    x.fillStyle = vgrad(x, 0, hy, [[0, mixc('#0A0C10', '#1A1A2A', dawn)], [0.8, mixc('#2C3038', '#7A4A35', dawn)], [1, mixc('#4A4E55', '#E08850', dawn)]]);
    x.fillRect(-60, -60, W + 120, H + 120);
    glow(x, W * 0.5, hy, 900, PAL.amber, 0.25 * dawn);
    x.fillStyle = vgrad(x, hy, H, [[0, '#2A2C30'], [1, '#08090A']]);
    x.fillRect(-60, hy, W + 120, H);
    drawFog(x, dawn > 0.5 ? L.fogDawn : L.fogPale, t * 18, hy - 220, 420, 0.6);
    drawFog(x, L.fogPale, -t * 25, hy - 60, 360, 0.5);
    // Le groupe s'enfonce dans la brume.
    const fog = { ambient: ['#2A2C30', 0.5], rim: { color: '#FFD08A', a: 0.3 * dawn, dx: 0, dy: 2 } };
    Characters.draw(x, 'maelle', { x: W * 0.42, y: hy + 120, height: 230, pose: { view: 'back', walk: t * 6 + 1 }, light: fog });
    Characters.draw(x, 'theo', { x: W * 0.68, y: hy + 150, height: 200, pose: { view: 'back', walk: t * 7 + 2 }, light: fog });
    Characters.draw(x, 'hero', { x: W * 0.56, y: hy + 190, height: 300, pose: { view: 'back', walk: t * 6 }, light: fog });
    x.drawImage(L.reeds, -100 - t * 30, H - 700, W * 1.3, 700);
    drawFog(x, L.fogPale, t * 35, H * 0.75, 400, 0.35);
    x.restore();
  }

  /** 6 · L'écluse de Morvan à l'aube : la Destinée attend, et sonne. */
  function shotLock(x, t, k) {
    const ev = TL.events;
    const c = easeInOut(k);
    const sun = smooth(ev.sun - 1.2, ev.sun + 1.2, t);
    const [sx, sy] = shakeAt(t, ev.horn, 1.4, 7, 21);
    x.save();
    x.translate(sx, sy);
    camera(x, lerp(1.0, 1.12, c), W / 2, H * 0.47, 0, lerp(80, -40, c));
    const hy = H * 0.47;
    x.fillStyle = vgrad(x, 0, hy, [
      [0, mixc('#0B0D18', '#1C2140', sun)],
      [0.5, mixc('#2A2337', '#6B4458', sun)],
      [0.85, mixc('#7A4532', '#F08A4A', sun)],
      [1, mixc('#C5703C', '#FFD08A', sun)],
    ]);
    x.fillRect(-100, -100, W + 200, H + 200);
    // Le soleil perce derrière la barge.
    const sunY = hy + lerp(40, -30, sun);
    glow(x, W * 0.5, sunY, 1400, PAL.amber, 0.25 + 0.35 * sun);
    glow(x, W * 0.5, sunY, 260, '#FFF1D8', 0.5 * sun);
    if (sun > 0) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.filter = 'blur(22px)';
      for (let i = 0; i < 7; i += 1) {
        const a = -Math.PI / 2 + (i - 3) * 0.3 + Math.sin(i * 7.7) * 0.08 + Math.sin(t * 0.3 + i) * 0.02;
        const gr = x.createLinearGradient(W / 2, sunY, W / 2 + Math.cos(a) * 1800, sunY + Math.sin(a) * 1800);
        gr.addColorStop(0, rgba(PAL.amber, 0.1 * sun));
        gr.addColorStop(1, rgba(PAL.amber, 0));
        x.fillStyle = gr;
        x.beginPath();
        x.moveTo(W / 2, sunY);
        x.lineTo(W / 2 + Math.cos(a - 0.05) * 1800, sunY + Math.sin(a - 0.05) * 1800);
        x.lineTo(W / 2 + Math.cos(a + 0.05) * 1800, sunY + Math.sin(a + 0.05) * 1800);
        x.closePath();
        x.fill();
      }
      x.restore();
    }
    // Collines lointaines
    x.fillStyle = rgba(mixc('#2A1C24', '#5A3438', sun), 1);
    x.beginPath();
    x.moveTo(-100, hy);
    for (let i = 0; i <= 20; i += 1) x.lineTo(-100 + i * ((W + 200) / 20), hy - 40 - Math.sin(i * 1.3) * 25 - Math.sin(i * 0.4) * 30);
    x.lineTo(W + 100, hy + 20);
    x.lineTo(-100, hy + 20);
    x.closePath();
    x.fill();
    // La Destinée
    const bx = W / 2;
    const by = hy + 24;
    x.fillStyle = '#0D0A0C';
    x.beginPath();
    x.moveTo(bx - 330, by - 70);
    x.lineTo(bx + 300, by - 70);
    x.lineTo(bx + 350, by - 110);
    x.lineTo(bx + 340, by);
    x.lineTo(bx - 320, by);
    x.closePath();
    x.fill();
    x.fillRect(bx - 200, by - 150, 260, 80);
    x.fillRect(bx - 120, by - 210, 120, 60);
    x.fillRect(bx - 66, by - 330, 6, 140);
    x.fillRect(bx + 120, by - 120, 30, 50);
    // Croix peinte sur la timonerie
    x.fillStyle = rgba(PAL.paper, 0.35 + 0.25 * sun);
    x.fillRect(bx - 82, by - 138, 36, 10);
    x.fillRect(bx - 69, by - 151, 10, 36);
    // Fanal du mât, qui bat lentement.
    const beacon = 0.5 + 0.5 * Math.pow(Math.max(0, Math.sin(t * 2.4)), 4);
    glow(x, bx - 63, by - 334, 160, PAL.amber, 0.7 * beacon);
    // Vapeur de la corne de brume
    const hornK = (t - ev.horn) / 2.4;
    if (hornK > 0 && hornK < 1.6) {
      x.globalAlpha = 0.35 * Math.sin(Math.PI * clamp(hornK / 1.6));
      x.drawImage(L.fogPale, 0, 0, 300, 220, bx + 110 + hornK * 60, by - 250 - hornK * 160, 260 + hornK * 260, 200 + hornK * 120);
      x.globalAlpha = 1;
    }
    // Eau du sas : reflets du ciel.
    x.fillStyle = vgrad(x, hy, H, [[0, mixc('#4A2E2A', '#B8703F', sun)], [0.25, mixc('#1A1418', '#4A2E2A', sun)], [1, '#050405']]);
    x.fillRect(-100, hy + 20, W + 200, H);
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.filter = 'blur(3px)';
    const wr = rng(17);
    for (let i = 0; i < 46; i += 1) {
      const yy = hy + 30 + Math.pow(i / 46 + wr() * 0.01, 1.6) * (H - hy);
      const ww = (40 + i * 8) * (0.4 + wr() * 0.9);
      x.fillStyle = rgba(PAL.amber, (0.14 + 0.2 * sun) * (1 - i / 46) * (0.5 + wr() * 0.5));
      x.fillRect(W / 2 - ww / 2 + (wr() - 0.5) * i * 6 + Math.sin(t * 2 + i) * (4 + i), yy, ww, 2 + i * 0.1);
    }
    x.restore();
    // Murs du sas vus depuis l'eau : faces verticales qui fuient vers la barge.
    const xi = (side) => W / 2 + side * 170;
    const edge = (side, u, v) => {
      // u : de l'horizon (0) vers nous (1) ; v : du couronnement (0) à la ligne d'eau (1).
      const xx = lerp(xi(side), W / 2 + side * 1600, u);
      return [xx, lerp(lerp(hy - 18, hy - 1400, u), lerp(hy + 14, hy + 1150, u), v)];
    };
    const wall = (side) => {
      const p = [edge(side, 0, 0), edge(side, 1, 0), edge(side, 1, 1), edge(side, 0, 1)];
      const fill = x.createLinearGradient(xi(side), 0, W / 2 + side * 1600, 0);
      fill.addColorStop(0, rgba(mixc('#2A1E22', '#6B4234', sun), 1));
      fill.addColorStop(0.25, '#110C0E');
      fill.addColorStop(1, '#060405');
      quad(x, ...p, fill);
      // Assises de pierre
      x.strokeStyle = 'rgba(0,0,0,0.45)';
      x.lineWidth = 2;
      for (let i = 1; i < 9; i += 1) {
        const a0 = edge(side, 0, i / 9);
        const a1 = edge(side, 1, i / 9);
        x.beginPath();
        x.moveTo(a0[0], a0[1]);
        x.lineTo(a1[0], a1[1]);
        x.stroke();
      }
      // Joints verticaux et échelle de fer
      for (let i = 1; i < 12; i += 1) {
        const u = 1 - 1 / (1 + i * 0.35);
        const a0 = edge(side, u, 0);
        const a1 = edge(side, u, 1);
        x.strokeStyle = 'rgba(0,0,0,0.5)';
        x.lineWidth = 1 + u * 6;
        x.beginPath();
        x.moveTo(a0[0], a0[1]);
        x.lineTo(a1[0], a1[1]);
        x.stroke();
      }
      const lu = 0.42;
      for (const du of [0, 0.025]) {
        const a0 = edge(side, lu + du, 0);
        const a1 = edge(side, lu + du, 0.95);
        x.strokeStyle = '#030203';
        x.lineWidth = 6;
        x.beginPath();
        x.moveTo(a0[0], a0[1]);
        x.lineTo(a1[0], a1[1]);
        x.stroke();
      }
      for (let v = 0.05; v < 0.95; v += 0.07) {
        const a0 = edge(side, lu, v);
        const a1 = edge(side, lu + 0.025, v);
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(a0[0], a0[1]);
        x.lineTo(a1[0], a1[1]);
        x.stroke();
      }
      // Couronnement éclairé par l'aube
      const c0 = edge(side, 0, 0);
      const c1 = edge(side, 1, 0);
      x.strokeStyle = rgba(PAL.amber, 0.35 + 0.3 * sun);
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(c0[0], c0[1]);
      x.lineTo(c1[0], c1[1]);
      x.stroke();
      // Bollards
      for (const u of [0.12, 0.3, 0.7]) {
        const [bx0, by0] = edge(side, u, 0);
        const hgt = (edge(side, u, 1)[1] - by0) / 5;
        x.fillStyle = '#060405';
        x.beginPath();
        x.roundRect(bx0 - hgt * 0.18, by0 - hgt * 0.42, hgt * 0.36, hgt * 0.44, hgt * 0.06);
        x.fill();
      }
      // Vantail de la porte, ouvert contre le mur
      const g0 = edge(side, 0.18, -0.05);
      const g1 = edge(side, 0.26, -0.05);
      const g2 = edge(side, 0.26, 1);
      const g3 = edge(side, 0.18, 1);
      const inset = (pt, k) => [pt[0] - side * k, pt[1]];
      quad(x, inset(g0, 14), inset(g1, 22), inset(g2, 22), inset(g3, 14), '#0C0809');
    };
    wall(-1);
    wall(1);
    // Ceux qui sont arrivés : un adulte et un enfant, sur le quai.
    // Le protagoniste et Théo, de dos, face à la Destinée ; l'aube les découpe.
    const dawnLight = { ambient: ['#2A1410', 0.45], rim: { color: '#FFC46B', a: 0.55 + 0.3 * sun, dx: -1.5, dy: 1.5 } };
    const deck = H * 0.83;
    // Passerelle de la porte d'écluse
    x.fillStyle = '#0A0708';
    x.fillRect(-100, deck, W + 200, 90);
    x.fillStyle = vgrad(x, deck + 90, H, [[0, '#060405'], [1, '#020102']]);
    x.fillRect(-100, deck + 90, W + 200, H);
    x.strokeStyle = rgba(PAL.amber, 0.35 + 0.25 * sun);
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(-100, deck);
    x.lineTo(W + 100, deck);
    x.stroke();
    Characters.draw(x, 'hero', { x: W * 0.36, y: deck + 8, height: 660, pose: { view: 'back' }, light: dawnLight });
    Characters.draw(x, 'theo', { x: W * 0.6, y: deck + 8, height: 470, pose: { view: 'back', tilt: 0.05 }, light: dawnLight });
    // Garde-corps, devant eux
    x.fillStyle = '#050304';
    x.fillRect(-100, deck - 150, W + 200, 10);
    for (let px = -40; px < W + 60; px += 180) x.fillRect(px, deck - 150, 12, 150);
    x.strokeStyle = rgba(PAL.amber, 0.3 + 0.3 * sun);
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(-100, deck - 150);
    x.lineTo(W + 100, deck - 150);
    x.stroke();
    drawFog(x, sun > 0.3 ? L.fogDawn : L.fogWarm, t * 30, hy - 80, 300, 0.5);
    drawFog(x, L.fogDawn, -t * 22, hy + 120, 360, 0.35 + 0.15 * sun);
    x.restore();
  }

  /** 7 · L'emblème : le labyrinthe se trace, l'aiguille trouve la sortie. */
  function shotEmblem(x, t) {
    const ev = TL.events;
    x.fillStyle = PAL.bg;
    x.fillRect(0, 0, W, H);
    const [d0, d1] = ev.emblemDraw;
    const draw = (from, to) => easeInOut(clamp((t - from) / (to - from)));
    const cx = W / 2;
    const cy = H * 0.4;
    const s = 3.2;
    const appear = smooth(ev.boom, ev.boom + 1.2, t);
    glow(x, cx, cy + 100, 1200, PAL.rust, 0.1 * appear, 'source-over');
    glow(x, cx, cy, 98 * s * 1.4, PAL.rust, 0.28 * draw(d0, d1 + 0.6));
    x.save();
    x.translate(cx - 100 * s, cy - 100 * s);
    x.scale(s, s);
    x.strokeStyle = PAL.paper;
    x.lineCap = 'round';
    const rings = [
      ['M100 18 A82 82 0 1 1 42 42', 5, 515],
      ['M100 38 A62 62 0 1 0 156 74', 4.5, 330],
      ['M100 58 A42 42 0 1 1 64 79', 4, 235],
      ['M100 78 A22 22 0 1 0 121 94', 3.5, 105],
    ];
    rings.forEach(([d, w, len], i) => {
      const p = draw(d0 + i * 0.35, d0 + i * 0.35 + 1.3);
      if (p <= 0) return;
      x.lineWidth = w;
      x.setLineDash([len * p, len]);
      x.stroke(new Path2D(d));
    });
    x.setLineDash([]);
    const radial = draw(d1 - 0.4, d1 + 0.3);
    x.globalAlpha = radial;
    x.lineWidth = 4.5;
    x.stroke(new Path2D('M42 42 L57 57'));
    x.lineWidth = 4;
    x.stroke(new Path2D('M156 74 L138 82 M100 38 L100 58'));
    x.lineWidth = 3.5;
    x.stroke(new Path2D('M64 79 L81 89'));
    x.globalAlpha = 1;
    // Fissure
    x.strokeStyle = PAL.bg;
    x.lineWidth = 3;
    x.stroke(new Path2D('M170 36 L158 52 L164 58 L150 72'));
    // Aiguille : elle tourne, hésite, puis désigne la sortie.
    const [n0, n1] = ev.needle;
    const nA = smooth(n0 - 0.3, n0, t);
    if (nA > 0) {
      const u = clamp((t - n0) / (n1 - n0));
      const spin = (1 - easeOut(u)) * Math.PI * 5 + Math.sin(u * 30) * 0.08 * (1 - u);
      x.globalAlpha = nA;
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
      x.globalAlpha = 1;
    }
    x.restore();
    // Arrêt de l'aiguille : un souffle de lumière.
    const stop = Math.exp(-Math.pow((t - n1) * 3.5, 2));
    glow(x, cx + 48 * s * 0.8, cy + 50 * s * 0.8, 380, PAL.rustBright, 0.35 * stop);
    particles(x, t, { n: 40, seed: 91, vy: -14, size: 1.6, color: PAL.rustBright, alpha: 0.4 * appear, warm: true, sway: 20 });
  }

  // ---------------------------------------------------------------- textes (aperçus)
  function wrap(x, text, maxW) {
    if (text.includes('\n')) return text.split('\n').flatMap((part) => wrap(x, part, maxW));
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (x.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  /** Incruste les textes comme l'application les superpose (aperçus vidéo uniquement). */
  function drawOverlay(x, t) {
    const { cues, texts, fade, days } = overlay;
    const U = W / 390;
    for (const cue of cues) {
      if (t <= cue.from || t >= cue.to) continue;
      const fo = cue.to >= TL.duration ? 0 : fade;
      const a = clamp(Math.min((t - cue.from) / fade, fo ? (cue.to - t) / fo : 1));
      x.save();
      x.globalAlpha = a;
      x.textAlign = 'center';
      x.shadowColor = 'rgba(0,0,0,0.85)';
      x.shadowBlur = 24;
      const txt = texts[cue.id] ?? '';
      if (cue.style === 'label') {
        x.font = `${11.5 * U}px "JetBrains Mono"`;
        x.fillStyle = PAL.rustBright;
        x.letterSpacing = `${2.2 * U}px`;
        x.fillText(txt.toUpperCase(), W / 2, H * 0.17);
      } else if (cue.style === 'line') {
        x.font = `${32 * U}px "Instrument Serif"`;
        x.fillStyle = PAL.paper;
        const lines = wrap(x, txt, W - 56 * U);
        lines.forEach((l, i) => x.fillText(l, W / 2, H * 0.8 + (i - (lines.length - 1) / 2) * 38 * U));
      } else if (cue.style === 'radio') {
        const p = clamp((t - cue.from - 0.3) / (cue.to - cue.from - 1.9));
        const shown = txt.slice(0, Math.round(txt.length * p));
        x.font = `${13 * U}px "JetBrains Mono"`;
        x.fillStyle = PAL.amber;
        x.textAlign = 'left';
        const lines = wrap(x, `${shown}${p < 1 && Math.floor(t * 4) % 2 ? '▌' : ''}`, W - 64 * U);
        x.fillStyle = 'rgba(11,10,10,0.55)';
        x.shadowBlur = 0;
        x.fillRect(24 * U, H * 0.1 - 22 * U, W - 48 * U, (lines.length + 1.2) * 20 * U);
        x.fillStyle = PAL.amber;
        x.font = `${10 * U}px "JetBrains Mono"`;
        x.fillText(texts.radioLabel ?? '', 36 * U, H * 0.1 - 6 * U);
        x.font = `${13 * U}px "JetBrains Mono"`;
        lines.forEach((l, i) => x.fillText(l, 36 * U, H * 0.1 + (14 + i * 20) * U));
      } else if (cue.style === 'days') {
        let day = 1;
        days.forEach((d, i) => {
          if (t >= d) day = i + 1;
        });
        x.font = `${12 * U}px "JetBrains Mono"`;
        x.fillStyle = PAL.paper;
        x.letterSpacing = `${2.4 * U}px`;
        x.fillText(`${texts.day.toUpperCase()} ${day} / 7`, W / 2, H * 0.12);
        x.letterSpacing = '0px';
        for (let i = 0; i < 7; i += 1) {
          x.fillStyle = i < day ? PAL.rustBright : 'rgba(237,230,218,0.25)';
          x.fillRect(W / 2 + (i - 3) * 16 * U - 5 * U, H * 0.12 + 12 * U, 10 * U, 3 * U);
        }
        x.font = `${33 * U}px "Instrument Serif"`;
        x.fillStyle = PAL.paper;
        if (t < cue.from + 3.6) x.fillText(txt, W / 2, H * 0.8);
      } else if (cue.style === 'title') {
        x.font = `${64 * U}px "Instrument Serif"`;
        x.fillStyle = PAL.paper;
        x.fillText('Valombre', W / 2, H * 0.67);
        x.font = `italic ${30 * U}px "Instrument Serif"`;
        x.fillStyle = PAL.rustBright;
        x.fillText(txt, W / 2, H * 0.67 + 44 * U);
      }
      x.restore();
    }
  }

  // ---------------------------------------------------------------- composition
  const SHOTS = { embers: shotEmbers, city: shotCity, street: shotStreet, roof: shotRoof, radio: shotRadio, d1: day1, d2: day2, d3: day3, d4: day4, d5: day5, d6: day6, d7: day7, lock: shotLock, emblem: shotEmblem };
  const BLOOM = { embers: 0.5, city: 0.2, street: 0.15, roof: 0.25, radio: 0.45, d1: 0.45, d3: 0.2, d6: 0.4, d7: 0.3, lock: 0.5, emblem: 0.35 };

  function renderShot(shot, t) {
    const bx = buf.getContext('2d');
    bx.setTransform(scale, 0, 0, scale, 0, 0);
    bx.globalAlpha = 1;
    bx.globalCompositeOperation = 'source-over';
    bx.filter = 'none';
    bx.fillStyle = '#000';
    bx.fillRect(0, 0, W, H);
    const k = clamp((t - shot.from) / (shot.to - shot.from));
    // Les reflets d'eau relisent l'image en cours : on la dessine d'abord dans le tampon secondaire.
    if (shot.id === 'd3' || shot.id === 'd4') {
      const sx = L.scratch.getContext('2d');
      sx.setTransform(scale, 0, 0, scale, 0, 0);
      sx.fillStyle = '#000';
      sx.fillRect(0, 0, W, H);
      const keep = buf;
      buf = L.scratch;
      SHOTS[shot.id](sx, t, k);
      buf = keep;
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.drawImage(L.scratch, 0, 0);
      bx.setTransform(scale, 0, 0, scale, 0, 0);
      return;
    }
    SHOTS[shot.id](bx, t, k);
  }

  function renderFrame(t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#000';
    g.fillRect(0, 0, main.width, main.height);
    const active = TL.shots.filter((s) => t >= s.from && t < s.to && s.id !== 'black');
    let bloom = 0;
    active.forEach((s, i) => {
      renderShot(s, t);
      let a = 1;
      if (i > 0) {
        const prev = active[i - 1];
        a = smooth(s.from, Math.min(prev.to, s.to), t);
      }
      g.globalAlpha = a;
      g.drawImage(buf, 0, 0);
      bloom = lerp(bloom, BLOOM[s.id] ?? 0.2, a);
    });
    g.globalAlpha = 1;
    // Lueur (bloom) : copie floue des hautes lumières, en mode écran.
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
    // Vignette
    const v = g.createRadialGradient(W / 2, H * 0.48, H * 0.28, W / 2, H * 0.48, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.62)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    // Grain argentique, différent à chaque image.
    const fr = Math.round(t * TL.fps);
    const r = rng(fr * 7 + 3);
    const tex = L.grain[fr % 4];
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.16;
    const ox = -r() * 384;
    const oy = -r() * 384;
    for (let yy = oy; yy < H; yy += 384) for (let xx = ox; xx < W; xx += 384) g.drawImage(tex, xx, yy);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // Ouverture au noir
    const open = smooth(0, 0.8, t);
    if (open < 1) {
      g.fillStyle = `rgba(0,0,0,${1 - open})`;
      g.fillRect(0, 0, W, H);
    }
    if (overlay) drawOverlay(g, t);
  }

  async function setupScene(opts) {
    TL = opts.timeline;
    scale = opts.scale ?? 1;
    overlay = opts.overlay ?? null;
    main = document.getElementById('frame');
    main.width = Math.round(W * scale);
    main.height = Math.round(H * scale);
    g = main.getContext('2d');
    buf = mk(main.width, main.height);
    L.scratch = mk(main.width, main.height);
    L.bloom = mk(main.width / 4, main.height / 4);
    await build();
    return { width: main.width, height: main.height };
  }

  window.setupScene = setupScene;
  window.renderFrame = renderFrame;
})();
