/**
 * Personnages de la cinématique, dans la direction artistique de l'application :
 * les mêmes fiches que les portraits du jeu (src/ui/art/Portraits.tsx : teint,
 * coiffure, vêtement, accessoires), les mêmes tracés de tête (chemins SVG repris
 * tels quels), en pied, en aplats modernes ; puis éclairés selon la scène
 * (ambiance, lumière principale, liseré de contre-jour).
 *
 * Repère d'un personnage : pieds en (0, 0), le haut vers les y négatifs ; un adulte
 * mesure environ 250 unités ; la tête est dessinée dans le repère 100 × 100 des portraits.
 *
 *   Characters.draw(ctx, id, { x, y, height, pose, light })
 */
(() => {
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
    const r = ch((n >> 16) & 255);
    const g = ch((n >> 8) & 255);
    const b = ch(n & 255);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  // Fiches : couleurs et coiffures des portraits du jeu ; jambes, chaussures et sacs ajoutés pour le plein pied.
  const SPECS = {
    // Le protagoniste : la fiche « guerrier » (veste matelassée, cheveux courts, pansement), écharpe rouille en signe distinctif.
    hero: { skin: '#C89878', hair: '#2A2420', hairStyle: 'short', garment: '#4E4741', style: 'padded', pants: '#2C2F36', boots: '#191614', scarf: '#B5523A', pack: '#3E4A3A', extras: ['bandage'] },
    theo: { skin: '#D9A37E', hair: '#2A1E18', hairStyle: 'curly', garment: '#7A6A3E', style: 'hoodie', pants: '#33363F', boots: '#1C1A18', extras: ['scar'], young: true },
    maelle: { skin: '#E2B596', hair: '#5A3A28', hairStyle: 'bun', garment: '#4F7D6B', style: 'scrubs', pants: '#3F6658', boots: '#1C1A18', extras: ['stethoscope'], pack: '#6B5A44' },
    kaz: { skin: '#E3B59C', hair: '#8A8580', hairStyle: 'buzz', garment: '#6B3A2A', style: 'workjacket', pants: '#2E2B28', boots: '#1A1716', extras: ['beard', 'warpaint'], broad: true },
    ines: { skin: '#7A4A32', hair: '#16110E', hairStyle: 'braids', garment: '#34425E', style: 'jacket', pants: '#262A33', boots: '#141210', extras: ['headlamp'], pack: '#5A4630' },
    // Le Muet : la fiche « rôdeur » des ennemis (yeux pâles), en pied.
    muet: { skin: '#97A095', hair: '#221F1C', hairStyle: 'stringy', garment: '#55574F', style: 'torn', pants: '#2E302C', boots: '#1A1918', mute: true },
  };

  const P = (d) => new Path2D(d);
  const fillPath = (x, d, color) => {
    x.fillStyle = color;
    x.fill(typeof d === 'string' ? P(d) : d);
  };
  const strokePath = (x, d, color, w) => {
    x.strokeStyle = color;
    x.lineWidth = w;
    x.lineCap = 'round';
    x.stroke(P(d));
  };
  const circle = (x, cx, cy, r, color) => {
    x.fillStyle = color;
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
  };
  const ellipse = (x, cx, cy, rx, ry, color, rot = 0) => {
    x.fillStyle = color;
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    x.fill();
  };

  // ------------------------------------------------------------ tête (repère des portraits)
  function hairBack(x, s) {
    const c = s.hair;
    switch (s.hairStyle) {
      case 'braids':
        fillPath(x, 'M32 42 C31 26 41 20 50 20 C59 20 69 26 68 42 L70 70 L62 70 L62 46 L38 46 L38 70 L30 70 Z', c);
        for (let i = 0; i < 4; i += 1) {
          ellipse(x, 33, 52 + i * 6, 3, 3.4, c);
          ellipse(x, 67, 52 + i * 6, 3, 3.4, c);
        }
        break;
      case 'stringy':
        fillPath(x, 'M33 44 C31 26 41 20 50 20 C60 20 69 26 67 44 L69 64 L64 52 L62 62 L58 48 L42 48 L39 63 L36 52 L32 62 Z', c);
        break;
      default:
    }
  }
  function hairFront(x, s) {
    const c = s.hair;
    const hi = shade(c, 0.18);
    switch (s.hairStyle) {
      case 'bun':
        circle(x, 50, 17, 7, c);
        fillPath(x, 'M34 38 C34 25 42 21 50 21 C58 21 66 25 66 38 C61 31 55 29 50 29 C44 29 38 31 34 38 Z', c);
        strokePath(x, 'M44 24 C48 22 54 22 58 25', hi, 1.2);
        break;
      case 'curly':
        for (const [cx, cy, r] of [[37, 31, 6], [44, 25, 6.5], [52, 23, 7], [60, 26, 6.5], [65, 33, 5.5], [35, 38, 4.5]]) circle(x, cx, cy, r, c);
        break;
      case 'buzz':
        x.globalAlpha *= 0.9;
        fillPath(x, 'M34 37 C34 25 42 21 50 21 C58 21 66 25 66 37 C60 32 55 31 50 31 C45 31 40 32 34 37 Z', c);
        x.globalAlpha /= 0.9;
        break;
      case 'braids':
        fillPath(x, 'M35 38 C35 27 42 22 50 22 C58 22 65 27 65 38 C60 31 54 30 50 30 C46 30 40 31 35 38 Z', c);
        break;
      case 'short':
        fillPath(x, 'M34 37 C33 25 42 20 51 21 C60 21 67 26 66 37 C62 30 58 28 52 28 L48 31 C43 30 38 32 34 37 Z', c);
        break;
      case 'stringy':
        fillPath(x, 'M34 40 C33 26 42 21 50 21 C58 21 67 26 66 40 C63 34 60 31 57 31 L55 40 L52 31 L47 31 L45 41 L42 32 C38 33 35 36 34 40 Z', c);
        break;
      default:
    }
  }
  function extras(x, s) {
    const ex = new Set(s.extras ?? []);
    if (ex.has('beard')) fillPath(x, 'M38 50 C39 62 44 66 50 66 C56 66 61 62 62 50 C58 56 54 57 50 57 C46 57 42 56 38 50 Z', shade(s.hair, -0.1));
    if (ex.has('warpaint')) {
      x.globalAlpha *= 0.75;
      strokePath(x, 'M38 44 L46 46 M54 46 L62 44', '#1C1A18', 2.4);
      x.globalAlpha /= 0.75;
    }
    if (ex.has('scar')) strokePath(x, 'M58 34 L62 46', shade(s.skin, -0.3), 1.3);
    if (ex.has('headlamp')) {
      strokePath(x, 'M34 32 C40 28 60 28 66 32', '#2A2A2A', 3);
      x.fillStyle = '#3A3A3A';
      x.beginPath();
      x.roundRect(46, 26, 8, 6, 2);
      x.fill();
      circle(x, 50, 29, 2, '#FFE7A8');
    }
    if (ex.has('bandage')) {
      x.save();
      x.translate(59, 35);
      x.rotate((-18 * Math.PI) / 180);
      x.fillStyle = '#F0EBE2';
      x.beginPath();
      x.roundRect(-4.5, -2, 9, 4, 1);
      x.fill();
      x.restore();
    }
  }

  /** Tête de face, comme les portraits du jeu (regard bas, traits sobres). `mute` : yeux pâles des ennemis. */
  function headFront(x, s) {
    const eye = shade(s.skin, -0.7);
    hairBack(x, s);
    fillPath(x, 'M44 54 L44 68 C47 71 53 71 56 68 L56 54 Z', shade(s.skin, -0.22));
    const g = x.createRadialGradient(44, 34, 1, 50, 42, 22);
    g.addColorStop(0, shade(s.skin, 0.12));
    g.addColorStop(1, shade(s.skin, -0.18));
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(50, 42, s.young ? 14 : 15, s.young ? 15 : 16.5, 0, 0, Math.PI * 2);
    x.fill();
    ellipse(x, 35.5, 44, 2.4, 3.6, shade(s.skin, -0.12));
    ellipse(x, 64.5, 44, 2.4, 3.6, shade(s.skin, -0.12));
    if (s.mute) {
      // Orbites creuses et yeux pâles, comme les ennemis du jeu ; bouche entrouverte, dents.
      ellipse(x, 44, 42.5, 4.2, 3.4, shade(s.skin, -0.45));
      ellipse(x, 56, 42.5, 4.2, 3.4, shade(s.skin, -0.45));
      circle(x, 44, 42.5, 1.9, '#EDE6DA');
      circle(x, 56, 42.5, 1.9, '#EDE6DA');
      ellipse(x, 50, 54, 4, 2.6, '#1A1412');
      x.strokeStyle = '#D8D0C0';
      x.lineWidth = 0.8;
      x.beginPath();
      for (let i = -3; i <= 3; i += 1.5) {
        x.moveTo(50 + i, 52.2);
        x.lineTo(50 + i, 53.4);
      }
      x.stroke();
      strokePath(x, 'M40 49 C42 51 44 51 45 50 M55 50 C56 51 58 51 60 49', shade(s.skin, -0.35), 0.8);
    } else {
      strokePath(x, 'M41.5 42.5 C43 41.6 45 41.6 46.5 42.5', eye, 1.5);
      strokePath(x, 'M53.5 42.5 C55 41.6 57 41.6 58.5 42.5', eye, 1.5);
      x.globalAlpha *= 0.8;
      strokePath(x, 'M41 38.5 L46.5 37.8 M53.5 37.8 L59 38.5', shade(s.hair, -0.1), 1.3);
      x.globalAlpha /= 0.8;
      strokePath(x, 'M50 44 L48.6 49 L50.6 49.4', shade(s.skin, -0.3), 1);
      strokePath(x, 'M46.5 53 C48.5 54 51.5 54 53.5 53', shade(s.skin, -0.42), 1.2);
    }
    hairFront(x, s);
    extras(x, s);
  }

  /** Tête de dos : nuque, oreilles, chevelure. */
  function headBack(x, s) {
    hairBack(x, s);
    fillPath(x, 'M43 52 L43 68 C47 71 53 71 57 68 L57 52 Z', shade(s.skin, -0.3));
    ellipse(x, 35.5, 44, 2.4, 3.6, shade(s.skin, -0.2));
    ellipse(x, 64.5, 44, 2.4, 3.6, shade(s.skin, -0.2));
    ellipse(x, 50, 42, s.young ? 14 : 15, s.young ? 15 : 16.5, shade(s.skin, -0.15));
    const c = s.hair;
    const cap = (bottom) => fillPath(x, `M34.6 ${bottom} C33 30 40 24.5 50 24.5 C60 24.5 67 30 65.4 ${bottom} C60 ${bottom + 4} 40 ${bottom + 4} 34.6 ${bottom} Z`, c);
    switch (s.hairStyle) {
      case 'bun':
        cap(50);
        circle(x, 50, 21, 7.5, c);
        break;
      case 'curly':
        cap(48);
        for (const [cx, cy, r] of [[38, 30, 6.5], [46, 25, 7], [55, 25, 7], [63, 31, 6.5], [36, 40, 5.5], [64, 41, 5.5], [44, 36, 6], [56, 37, 6]]) circle(x, cx, cy, r, c);
        break;
      case 'buzz':
        x.globalAlpha *= 0.85;
        cap(51);
        x.globalAlpha /= 0.85;
        break;
      case 'braids':
        cap(52);
        break;
      case 'stringy':
        cap(50);
        break;
      default:
        cap(51);
    }
    if ((s.extras ?? []).includes('headlamp')) strokePath(x, 'M34 32 C40 36 60 36 66 32', '#2A2A2A', 3);
  }

  // ------------------------------------------------------------ corps
  /**
   * pose : { view: 'front' | 'back', walk: phase (radians) ou null, hunch: 0–1, sit: bool,
   *          head: 'front' | 'back' (par défaut, comme le corps), tilt: inclinaison de la tête }
   */
  function body(x, s, pose) {
    const view = pose.view ?? 'front';
    const back = view === 'back';
    const headView = pose.head ?? view;
    const hunch = pose.hunch ?? 0;
    const w = s.broad ? 36 : 30;
    const walking = pose.walk !== null && pose.walk !== undefined;
    const p = pose.walk ?? 0;
    const bob = walking ? Math.abs(Math.sin(p)) * 4 : 0;
    const hipY = -118 - bob;
    const sY = -200 + hunch * 16 - bob;
    const long = s.style === 'labcoat';
    const hemY = long ? -64 : s.style === 'torn' ? -104 : -110 - bob;
    const sleeve = shade(s.garment, -0.08);
    const dark = shade(s.garment, -0.3);
    const light = shade(s.garment, 0.15);

    // Jambes et chaussures
    if (!pose.sit) {
      for (const side of [-1, 1]) {
        const lift = walking ? Math.max(0, Math.sin(p + (side > 0 ? 0 : Math.PI))) * 16 : 0;
        const ax = side * (s.mute ? 15 : 12);
        const ay = -10 - lift;
        const kx = side * (s.mute ? 16 : 13);
        const ky = -64 - lift * 0.5 - bob * 0.5;
        x.lineCap = 'round';
        x.lineJoin = 'round';
        x.strokeStyle = s.pants;
        x.lineWidth = 19;
        x.beginPath();
        x.moveTo(side * 11, hipY);
        x.lineTo(kx, ky);
        x.lineWidth = 16;
        x.lineTo(ax, ay);
        x.stroke();
        x.fillStyle = s.boots;
        x.beginPath();
        x.roundRect(ax - 10, ay - 4, 20, 13 - lift * 0.15, 5);
        x.fill();
        // Pli au genou
        x.strokeStyle = shade(s.pants, -0.3);
        x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(kx - 6, ky + 2);
        x.lineTo(kx + 6, ky - 1);
        x.stroke();
      }
    }

    // Bras de dos derrière le corps, et sac
    const arm = (side) => {
      const sw = walking ? Math.sin(p + (side > 0 ? Math.PI : 0)) * 9 : 0;
      const sx = side * (w - 3);
      const ex = side * (w + 3 + hunch * 2);
      const ey = sY + 52 + sw * 0.4 + hunch * 6;
      const hx = side * (w + 1 - hunch * 4);
      const hy = pose.sit ? sY + 70 : sY + 96 - sw + hunch * 30;
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.strokeStyle = sleeve;
      x.lineWidth = 15;
      x.beginPath();
      x.moveTo(sx, sY + 8);
      x.lineTo(ex, ey);
      if (!pose.sit) {
        x.lineWidth = 13;
        x.lineTo(hx, hy);
      }
      x.stroke();
      if (!pose.sit) {
        circle(x, hx, hy + 4, s.mute ? 7.5 : 6.5, shade(s.skin, back ? -0.2 : -0.05));
        if (s.mute) strokePath(x, `M${hx - 4} ${hy + 8} L${hx - 5} ${hy + 14} M${hx} ${hy + 10} L${hx} ${hy + 16} M${hx + 4} ${hy + 8} L${hx + 5} ${hy + 14}`, shade(s.skin, -0.1), 2.5);
      }
    };

    // Torse
    const torso = `M${-w} ${sY + 8} C${-w - 2} ${sY + 44} ${-w + 6} ${hemY - 30} ${-23 - (long ? 6 : 0)} ${hemY} L${23 + (long ? 6 : 0)} ${hemY} C${w - 6} ${hemY - 30} ${w + 2} ${sY + 44} ${w} ${sY + 8} Q${w - 6} ${sY - 1} 10 ${sY - 4} L-10 ${sY - 4} Q${-w + 6} ${sY - 1} ${-w} ${sY + 8} Z`;
    if (s.style === 'hoodie' && !back) fillPath(x, `M-18 ${sY - 2} C-20 ${sY - 26} 20 ${sY - 26} 18 ${sY - 2} Z`, dark);
    fillPath(x, torso, s.garment);
    // Ceinture
    if (!long && !pose.sit) {
      x.fillStyle = '#1C1916';
      x.fillRect(-22, hemY - 2, 44, 6);
    }
    // Détails du vêtement
    x.lineCap = 'round';
    switch (s.style) {
      case 'padded':
        for (let i = 1; i <= 4; i += 1) strokePath(x, `M${-w + 3} ${sY + i * 19} C-10 ${sY + i * 19 - 4} 10 ${sY + i * 19 - 4} ${w - 3} ${sY + i * 19}`, light, 1.6);
        if (!back) strokePath(x, `M0 ${sY} L0 ${hemY}`, dark, 1.6);
        break;
      case 'hoodie':
        if (!back) {
          strokePath(x, `M-6 ${sY + 4} L-7 ${sY + 26} M6 ${sY + 4} L7 ${sY + 26}`, light, 1.6);
          x.fillStyle = dark;
          x.beginPath();
          x.roundRect(-16, hemY - 34, 32, 22, 6);
          x.fill();
        } else fillPath(x, `M-20 ${sY + 2} C-22 ${sY + 34} 22 ${sY + 34} 20 ${sY + 2} C12 ${sY - 6} -12 ${sY - 6} -20 ${sY + 2} Z`, dark);
        break;
      case 'scrubs':
        if (!back) {
          fillPath(x, `M-9 ${sY - 3} L0 ${sY + 16} L9 ${sY - 3} Z`, s.skin);
          x.fillStyle = dark;
          x.fillRect(10, sY + 26, 10, 8);
          if ((s.extras ?? []).includes('stethoscope')) strokePath(x, `M-10 ${sY} C-12 ${sY + 22} -2 ${sY + 30} 3 ${sY + 28} C8 ${sY + 26} 10 ${sY + 18} 10 ${sY}`, '#2A2F33', 2);
        }
        break;
      case 'workjacket':
        if (!back) {
          fillPath(x, `M-14 ${sY - 4} L-6 ${sY + 12} L0 ${sY + 2} L6 ${sY + 12} L14 ${sY - 4} Z`, light);
          strokePath(x, `M-4 ${sY + 6} L-6 ${hemY} M4 ${sY + 6} L6 ${hemY}`, dark, 2);
          x.fillStyle = dark;
          x.fillRect(-26, sY + 30, 12, 9);
          x.fillRect(14, sY + 30, 12, 9);
        } else strokePath(x, `M${-w + 4} ${sY + 30} L${w - 4} ${sY + 30}`, dark, 2);
        break;
      case 'jacket':
        if (!back) strokePath(x, `M0 ${sY} L0 ${hemY}`, dark, 1.8);
        strokePath(x, `M${-w + 4} ${sY + 10} L${w - 8} ${hemY - 6}`, '#5A4630', 4);
        break;
      case 'torn':
        // Chemise déchirée, ourlet en lambeaux, taches.
        fillPath(x, `M-23 ${hemY - 1} L-18 ${hemY + 9} L-12 ${hemY} L-6 ${hemY + 12} L1 ${hemY} L7 ${hemY + 8} L13 ${hemY - 1} L19 ${hemY + 10} L23 ${hemY - 1} Z`, s.garment);
        ellipse(x, -10, sY + 40, 5, 8, dark, 0.3);
        ellipse(x, 12, sY + 62, 4, 6, shade(s.skin, -0.25), -0.2);
        ellipse(x, 6, sY + 20, 6, 3, '#3A2420', 0.2);
        strokePath(x, `M-14 ${sY + 2} L-4 ${sY + 22} M14 ${sY + 2} L5 ${sY + 16}`, dark, 1.4);
        break;
      default:
    }
    if (s.pack) {
      if (back) {
        x.fillStyle = s.pack;
        x.beginPath();
        x.roundRect(-23, sY + 4, 46, 66, 9);
        x.fill();
        x.fillStyle = shade(s.pack, -0.25);
        x.beginPath();
        x.roundRect(-23, sY + 4, 46, 22, [9, 9, 4, 4]);
        x.fill();
        x.fillStyle = shade(s.pack, 0.15);
        x.fillRect(-4, sY + 22, 8, 7);
        x.fillStyle = shade(s.pack, -0.15);
        x.beginPath();
        x.roundRect(-18, sY + 40, 36, 22, 5);
        x.fill();
        // Rouleau de couchage
        x.fillStyle = '#4A5A4A';
        x.beginPath();
        x.roundRect(-26, sY + 66, 52, 14, 7);
        x.fill();
      } else strokePath(x, `M${-w + 8} ${sY + 2} L${-w + 10} ${sY + 58} M${w - 8} ${sY + 2} L${w - 10} ${sY + 58}`, shade(s.pack, -0.2), 4);
    }
    if (s.scarf) {
      // L'écharpe rouille du protagoniste.
      fillPath(x, `M-15 ${sY - 6} C-16 ${sY + 6} 16 ${sY + 6} 15 ${sY - 6} C10 ${sY - 11} -10 ${sY - 11} -15 ${sY - 6} Z`, s.scarf);
      if (!back) fillPath(x, `M4 ${sY + 2} L12 ${sY + 2} L14 ${sY + 34} L6 ${sY + 34} Z`, shade(s.scarf, -0.12));
      else fillPath(x, `M-6 ${sY - 2} L2 ${sY - 2} L-2 ${sY + 22} L-10 ${sY + 20} Z`, shade(s.scarf, -0.12));
    }
    arm(-1);
    arm(1);

    // Tête (repère des portraits : visage centré en (50, 42), 100 unités de large)
    x.save();
    const hs = s.young ? 1.12 : 1;
    x.translate(0 + hunch * 2, sY - 2 + hunch * 6);
    x.rotate(pose.tilt ?? 0);
    x.scale(hs, hs);
    x.translate(-50, -68);
    if (headView === 'back') headBack(x, s);
    else headFront(x, s);
    x.restore();
  }

  // ------------------------------------------------------------ éclairage
  const pool = new Map();
  function canvasFor(key, w, h) {
    let c = pool.get(key);
    if (!c || c.width < w || c.height < h) {
      c = document.createElement('canvas');
      c.width = Math.max(w, c?.width ?? 0);
      c.height = Math.max(h, c?.height ?? 0);
      pool.set(key, c);
    }
    return c;
  }

  /**
   * Dessine un personnage éclairé par la scène.
   *  light = { ambient: [couleur, opacité], key: { x, y, r, color, a } (repère du personnage, unités),
   *            rim: { color, a, dx, dy } (liseré de contre-jour, en pixels), shadow: opacité de l'ombre au sol }
   */
  function draw(ctx, id, { x, y, height, pose = {}, light = {}, spec = null }) {
    const s = spec ?? SPECS[id];
    const total = s.young ? 185 : 250;
    const k = height / total;
    const unitsW = 160;
    const unitsH = 300;
    const pw = Math.ceil(unitsW * k) + 8;
    const ph = Math.ceil(unitsH * k) + 8;
    const ox = pw / 2;
    const oy = ph - 6 - 10 * k;
    const scale = s.young ? 185 / 250 : 1;

    const fig = canvasFor('fig', pw, ph);
    const f = fig.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.globalCompositeOperation = 'source-over';
    f.globalAlpha = 1;
    f.clearRect(0, 0, fig.width, fig.height);
    f.setTransform(k * scale, 0, 0, k * scale, ox, oy);
    body(f, s, pose);
    f.setTransform(1, 0, 0, 1, 0, 0);

    // Ambiance de la scène : la nuit assombrit et refroidit, l'aube réchauffe.
    if (light.ambient) {
      f.globalCompositeOperation = 'source-atop';
      f.fillStyle = light.ambient[0];
      f.globalAlpha = light.ambient[1];
      f.fillRect(0, 0, pw, ph);
      f.globalAlpha = 1;
    }
    // Lumière principale (torche, radio, lampe frontale, aube).
    if (light.key) {
      const L = light.key;
      const lx = ox + L.x * k;
      const ly = oy + L.y * k;
      const gr = f.createRadialGradient(lx, ly, 0, lx, ly, L.r * k);
      gr.addColorStop(0, L.color + Math.round(255 * L.a).toString(16).padStart(2, '0'));
      gr.addColorStop(1, L.color + '00');
      const tmp = canvasFor('key', pw, ph);
      const t = tmp.getContext('2d');
      t.globalCompositeOperation = 'source-over';
      t.clearRect(0, 0, tmp.width, tmp.height);
      t.drawImage(fig, 0, 0);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = gr;
      t.fillRect(0, 0, pw, ph);
      f.globalCompositeOperation = 'lighter';
      f.drawImage(tmp, 0, 0);
    }
    // Liseré de contre-jour : le bord éclairé du personnage, côté lumière.
    if (light.rim) {
      const R = light.rim;
      const tmp = canvasFor('rim', pw, ph);
      const t = tmp.getContext('2d');
      t.globalCompositeOperation = 'source-over';
      t.clearRect(0, 0, tmp.width, tmp.height);
      t.drawImage(fig, 0, 0);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = R.color;
      t.fillRect(0, 0, pw, ph);
      t.globalCompositeOperation = 'destination-out';
      t.drawImage(fig, -(R.dx ?? 2) * Math.max(0.8, k * 0.9), -(R.dy ?? 0) * Math.max(0.8, k * 0.9));
      f.globalCompositeOperation = 'lighter';
      f.globalAlpha = R.a ?? 0.6;
      f.drawImage(tmp, 0, 0);
      f.globalAlpha = 1;
    }
    f.globalCompositeOperation = 'source-over';

    if (light.shadow && !pose.sit) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${light.shadow})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 34 * k, 7 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.drawImage(fig, 0, 0, pw, ph, x - ox, y - oy, pw, ph);
  }

  window.Characters = { draw, SPECS, shade };
})();
