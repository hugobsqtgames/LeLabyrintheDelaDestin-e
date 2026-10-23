/**
 * Illustrations plein écran des moments clés (champ `illustration` des
 * scènes). Compositions vectorielles en couches : ciel ou voûte, lumière
 * principale, silhouettes, brume et grain.
 */
import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export const ILLUSTRATIONS = [
  'hurleur', 'brasserie', 'berger', 'berge', 'port', 'ecluse', 'maree',
  'triage', 'vergers', 'peage', 'prieure', 'barrage', 'convoi', 'dame', 'brennes', 'draisine', 'gue', 'veillee',
] as const;
export type IllustrationId = (typeof ILLUSTRATIONS)[number];

/** Pseudo-aléatoire déterministe (même dessin à chaque rendu). */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Une silhouette humaine debout (Muet ou survivant), pieds en (x, y). */
function figure(x: number, y: number, h: number, lean = 0, arms = 0): string {
  const w = h * 0.26;
  const head = h * 0.11;
  const top = y - h;
  const sx = x + lean;
  return [
    `M${x - w * 0.35} ${y}`,
    `L${x - w * 0.42} ${y - h * 0.45}`,
    `L${sx - w * 0.5 - arms} ${y - h * 0.5}`,
    `L${sx - w * 0.5} ${top + head * 2.3}`,
    `Q${sx} ${top + head * 1.6} ${sx + w * 0.5} ${top + head * 2.3}`,
    `L${sx + w * 0.5 + arms} ${y - h * 0.5}`,
    `L${x + w * 0.42} ${y - h * 0.45}`,
    `L${x + w * 0.35} ${y}`,
    'Z',
    `M${sx + head} ${top + head} a${head} ${head} 0 1 1 -${head * 2} 0 a${head} ${head} 0 1 1 ${head * 2} 0`,
  ].join(' ');
}

function crowd(seed: number, count: number, x0: number, x1: number, y: number, hMin: number, hMax: number, spreadY = 0): string {
  const r = rand(seed);
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const x = x0 + (x1 - x0) * r();
    const yy = y + spreadY * r();
    const h = hMin + (hMax - hMin) * r() * (0.6 + (yy - y) / Math.max(1, spreadY) * 0.4 || 1);
    d += figure(x, yy, h, (r() - 0.5) * h * 0.12, r() * h * 0.06) + ' ';
  }
  return d;
}

function Sky({ id, top, mid, bottom }: { id: string; top: string; mid: string; bottom: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="0.55" stopColor={mid} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={400} height={500} fill={`url(#${id})`} />
    </>
  );
}

function Glow({ id, cx, cy, r, color, opacity = 0.8 }: { id: string; cx: number; cy: number; r: number; color: string; opacity?: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={cy} rx={r} ry={r} fill={`url(#${id})`} />
    </>
  );
}

function Fog({ id, y, color = '#9AA4AE', opacity = 0.35 }: { id: string; y: number; color?: string; opacity?: number }) {
  return (
    <>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="0.5" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={y - 60} width={400} height={120} fill={`url(#${id})`} />
    </>
  );
}

function Vignette({ id }: { id: string }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="45%" r="75%">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.75} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={400} height={500} fill={`url(#${id})`} />
    </>
  );
}

const INK = '#07090A';

function Hurleur({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#0B1514" mid="#14302A" bottom="#050707" />
      <Glow id={`g${u}`} cx={250} cy={150} r={170} color="#4DFF9A" opacity={0.35} />
      {/* Façades */}
      <Path d="M0 500 V170 h70 v-30 h40 v60 h30 V500 Z" fill="#0A1110" />
      <Path d="M400 500 V120 h-60 v40 h-40 v-20 h-30 V500 Z" fill="#0A1110" />
      {/* Enseigne de pharmacie */}
      <G transform="translate(232 112)">
        <Path d="M12 0 h12 v12 h12 v12 h-12 v12 h-12 v-12 h-12 v-12 h12 z" fill="#7DFFB3" opacity={0.95} />
      </G>
      <Line x1={250} y1={150} x2={250} y2={200} stroke="#1A2A26" strokeWidth={3} />
      {/* Horde au loin */}
      <Path d={crowd(11, 26, 60, 360, 330, 40, 60, 20)} fill="#0E1A18" opacity={0.85} />
      {/* Le Hurleur, bouche ouverte, bras écartés */}
      <G>
        <Path d="M200 470 L186 380 L150 330 L170 322 L192 350 L196 290 Q206 270 216 290 L220 350 L246 318 L262 330 L226 382 L214 470 Z" fill={INK} />
        <Circle cx={206} cy={268} r={17} fill={INK} />
        <Ellipse cx={208} cy={276} rx={5} ry={8} fill="#2BFF8A" opacity={0.25} />
      </G>
      {/* Lignes de cri */}
      <G stroke="#7DFFB3" strokeWidth={1.4} opacity={0.35} fill="none">
        <Path d="M170 250 q36 -30 72 0" />
        <Path d="M150 236 q56 -46 112 0" />
        <Path d="M132 222 q74 -62 148 0" />
      </G>
      <Rect x={0} y={460} width={400} height={40} fill="#040606" />
      <Fog id={`f${u}`} y={410} color="#3E6B60" opacity={0.3} />
    </G>
  );
}

function Brasserie({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#120C08" mid="#2A170C" bottom="#0A0604" />
      {/* Voûte */}
      <Path d="M0 0 H400 V140 Q200 40 0 140 Z" fill="#0A0604" />
      <Glow id={`g${u}`} cx={200} cy={300} r={190} color="#FFB04A" opacity={0.55} />
      {/* Fûts empilés */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4].map((i) => (
          <G key={`${row}-${i}`}>
            <Ellipse cx={30 + i * 34 - row * 6} cy={430 - row * 58} rx={24} ry={28} fill="#1C120B" />
            <Ellipse cx={30 + i * 34 - row * 6} cy={430 - row * 58} rx={14} ry={17} fill="none" stroke="#3A2414" strokeWidth={2} />
          </G>
        )),
      )}
      {[0, 1].map((row) =>
        [0, 1, 2].map((i) => (
          <Ellipse key={`r${row}-${i}`} cx={300 + i * 36 + row * 6} cy={430 - row * 58} rx={24} ry={28} fill="#1C120B" />
        )),
      )}
      {/* Table, lampe, survivants */}
      <Rect x={130} y={380} width={150} height={10} rx={3} fill="#140C07" />
      <Path d="M150 390 v60 M260 390 v60" stroke="#140C07" strokeWidth={6} />
      <Path d="M200 340 l-8 18 h16 z" fill="#2A1A0E" />
      <Circle cx={200} cy={364} r={7} fill="#FFD27A" />
      <Glow id={`l${u}`} cx={200} cy={364} r={46} color="#FFE2A0" opacity={0.9} />
      <Path d={figure(150, 382, 92, 4, 6)} fill={INK} />
      <Path d={figure(258, 382, 86, -4, 4)} fill={INK} />
      <Path d={figure(305, 450, 120, -6, 2)} fill={INK} />
      <Rect x={0} y={460} width={400} height={40} fill="#070403" />
    </G>
  );
}

function Berger({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#0C0B09" mid="#1E1C17" bottom="#080706" />
      {/* Parois de craie */}
      <Path d="M0 0 H130 Q110 200 150 500 H0 Z" fill="#26231D" />
      <Path d="M400 0 H270 Q300 220 250 500 H400 Z" fill="#26231D" />
      <G stroke="#C9BFAE" strokeWidth={1.2} opacity={0.35} fill="none">
        <Path d="M40 180 l18 -6 l6 14 M60 240 h30 M30 300 l20 12" />
        <Path d="M330 200 l-14 10 l10 10 M310 280 h34" />
      </G>
      {/* Faisceau de lampe venant du joueur */}
      <Defs>
        <LinearGradient id={`b${u}`} x1="0.5" y1="1" x2="0.5" y2="0">
          <Stop offset="0" stopColor="#FFF1C9" stopOpacity={0.4} />
          <Stop offset="1" stopColor="#FFF1C9" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M180 500 L120 160 L290 160 L220 500 Z" fill={`url(#b${u})`} />
      {/* Le troupeau */}
      <Path d={crowd(21, 30, 140, 270, 250, 42, 58, 30)} fill="#12110E" />
      {/* Le Berger, très grand, cloche à la main */}
      <Path d="M208 330 L198 240 L180 210 L188 160 Q204 136 220 160 L228 210 L214 240 L222 330 Z" fill={INK} />
      <Circle cx={204} cy={140} r={13} fill={INK} />
      <Path d="M228 214 L246 238" stroke={INK} strokeWidth={6} />
      <Path d="M240 236 h16 l-3 16 h-10 z" fill="#C9A24A" />
      <Circle cx={248} cy={256} r={2.5} fill="#C9A24A" />
      <G stroke="#C9A24A" strokeWidth={1.2} opacity={0.5} fill="none">
        <Path d="M262 238 q8 8 0 16 M270 232 q14 14 0 28" />
      </G>
      <Rect x={0} y={470} width={400} height={30} fill="#050504" />
    </G>
  );
}

function Berge({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#071012" mid="#0D2125" bottom="#03070A" />
      {/* Puits de lumière */}
      <Defs>
        <LinearGradient id={`r${u}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#BFE9FF" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#BFE9FF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M250 0 h40 L340 360 H200 Z" fill={`url(#r${u})`} />
      <Path d="M0 0 H400 V60 Q300 110 240 70 Q170 30 90 90 Q40 120 0 100 Z" fill="#030607" />
      {/* Eau */}
      <Rect x={0} y={330} width={400} height={170} fill="#06171B" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Path key={i} d={`M${20 + (i % 4) * 90} ${350 + i * 12} h${30 + (i % 3) * 20}`} stroke="#7FD3FF" strokeWidth={1.2} opacity={0.25 + (i % 3) * 0.1} />
      ))}
      <Ellipse cx={270} cy={360} rx={90} ry={10} fill="#BFE9FF" opacity={0.12} />
      {/* Berge et groupe */}
      <Path d="M0 340 Q80 320 160 336 Q190 344 200 360 L0 360 Z" fill="#0A0F10" />
      <Path d={figure(70, 340, 74, 2, 3)} fill={INK} />
      <Path d={figure(104, 342, 60, -2, 2)} fill={INK} />
      <Path d={figure(132, 344, 70, 0, 4)} fill={INK} />
      <Circle cx={142} cy={300} r={4} fill="#FFD27A" />
      <Glow id={`l${u}`} cx={142} cy={300} r={36} color="#FFD27A" opacity={0.7} />
      {/* Reflets */}
      <Path d={figure(104, 342, -60, 2, 2)} fill="#0E2328" opacity={0.6} />
    </G>
  );
}

function Port({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#141922" mid="#3D2F28" bottom="#0B0A0A" />
      <Glow id={`sun${u}`} cx={120} cy={300} r={160} color="#FF9A4A" opacity={0.45} />
      {/* Grues */}
      <G stroke="#0B0D10" strokeWidth={6} fill="none">
        <Path d="M270 330 V110 M270 116 L380 150 M270 116 L230 140" />
        <Path d="M330 150 v60" strokeWidth={2} />
        <Path d="M80 330 V160 M80 166 L10 190 M80 166 L150 200" />
      </G>
      <G stroke="#0B0D10" strokeWidth={1.5} fill="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <Path key={i} d={`M262 ${130 + i * 25} L278 ${150 + i * 25}`} />
        ))}
      </G>
      {/* Réverbères au sodium */}
      {[40, 190, 340].map((x) => (
        <G key={x}>
          <Path d={`M${x} 340 V250`} stroke="#0B0D10" strokeWidth={3} />
          <Circle cx={x} cy={248} r={4} fill="#FFB04A" />
          <Glow id={`p${u}${x}`} cx={x} cy={248} r={40} color="#FFB04A" opacity={0.55} />
        </G>
      ))}
      {/* Barges et quai */}
      <Rect x={0} y={330} width={400} height={20} fill="#0B0D10" />
      <Rect x={0} y={350} width={400} height={150} fill="#0E1418" />
      <Path d="M30 380 h200 l-14 26 h-172 z" fill="#07090B" />
      <Path d="M250 372 h130 l-10 20 h-112 z" fill="#07090B" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Path key={i} d={`M${10 + i * 40} ${420 + (i % 3) * 18} h22`} stroke="#FFB04A" strokeWidth={1} opacity={0.25} />
      ))}
      <Fog id={`f${u}`} y={330} color="#C9A27A" opacity={0.25} />
      <Path d={figure(160, 330, 46, 0, 1)} fill={INK} />
    </G>
  );
}

function Ecluse({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#2B3550" mid="#C98A7A" bottom="#1A1414" />
      <Glow id={`sun${u}`} cx={290} cy={250} r={150} color="#FFD7A8" opacity={0.6} />
      {/* Peupliers */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Path key={i} d={`M${12 + i * 52} 260 q-12 -40 0 -110 q12 70 0 110`} fill="#1B1820" opacity={0.85} />
      ))}
      {/* Murs de l'écluse et bassin */}
      <Rect x={0} y={250} width={400} height={30} fill="#16131A" />
      <Rect x={40} y={280} width={320} height={110} fill="#1C2630" />
      <Rect x={20} y={230} width={26} height={160} fill="#100E12" />
      <Rect x={354} y={230} width={26} height={160} fill="#100E12" />
      {/* La Destinée */}
      <Path d="M70 320 h270 l-22 40 h-226 z" fill="#ECE7DF" />
      <Rect x={90} y={300} width={150} height={20} fill="#DAD3C8" />
      <Rect x={250} y={262} width={24} height={58} fill="#ECE7DF" />
      <Path d="M262 272 v24 M253 284 h18" stroke="#FF5468" strokeWidth={4} />
      <Path d="M70 360 h270" stroke="#9AA4AE" strokeWidth={1} opacity={0.6} />
      {/* Barbelés et foule */}
      <Rect x={0} y={390} width={400} height={110} fill="#0E0B0D" />
      <G stroke="#3A3238" strokeWidth={1.2}>
        {Array.from({ length: 11 }).map((_, i) => (
          <Path key={i} d={`M${i * 40} 400 v-30`} />
        ))}
        <Path d="M0 376 h400 M0 386 h400" />
      </G>
      <G stroke="#3A3238" strokeWidth={1} fill="none">
        {Array.from({ length: 20 }).map((_, i) => (
          <Circle key={i} cx={i * 20 + 10} cy={381} r={5} />
        ))}
      </G>
      <Path d={crowd(31, 40, 0, 400, 480, 70, 100, 20)} fill={INK} />
    </G>
  );
}

function Maree({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#1A1E26" mid="#4A4E58" bottom="#121316" />
      {/* Peupliers en perspective */}
      {Array.from({ length: 7 }).map((_, i) => (
        <Path key={`l${i}`} d={`M${20 + i * 22} ${300 - i * 6} q-${14 - i} -${70 - i * 6} 0 -${170 - i * 18} q${14 - i} ${100 - i * 10} 0 ${170 - i * 18}`} fill="#15171C" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <Path key={`r${i}`} d={`M${380 - i * 22} ${300 - i * 6} q-${14 - i} -${70 - i * 6} 0 -${170 - i * 18} q${14 - i} ${100 - i * 10} 0 ${170 - i * 18}`} fill="#15171C" />
      ))}
      {/* Chemin */}
      <Path d="M140 500 L190 250 L210 250 L260 500 Z" fill="#2A2C31" />
      {/* Marée grise */}
      <Path d={crowd(41, 70, 150, 250, 255, 14, 22, 30)} fill="#3A3D44" />
      <Path d={crowd(42, 50, 120, 280, 290, 26, 36, 40)} fill="#2A2D33" />
      <Path d={crowd(43, 30, 90, 310, 340, 40, 56, 40)} fill="#1C1E22" />
      {/* Le Colosse */}
      <G>
        <Path d="M170 470 L160 380 L130 360 L140 290 Q200 250 260 290 L270 360 L240 380 L230 470 Z" fill="#0A0B0D" />
        <Path d="M168 262 Q200 232 232 262 L228 292 Q200 302 172 292 Z" fill="#0A0B0D" />
        <Path d="M178 270 h44 v10 h-44 z" fill="#3A4250" opacity={0.8} />
        <Rect x={128} y={300} width={22} height={50} rx={4} fill="#14161A" />
      </G>
      {/* Maison de l'éclusier, volets bleus */}
      <G>
        <Rect x={300} y={330} width={80} height={60} fill="#1B1D22" />
        <Path d="M294 332 L340 300 L386 332 Z" fill="#141519" />
        <Rect x={312} y={346} width={14} height={18} fill="#3D6FA8" />
        <Rect x={352} y={346} width={14} height={18} fill="#3D6FA8" />
      </G>
      <Fog id={`f${u}`} y={300} color="#B7BCC6" opacity={0.3} />
      {/* Cliquetis : grêle de petits traits */}
      <G stroke="#C9CDD4" strokeWidth={1} opacity={0.25}>
        {Array.from({ length: 40 }).map((_, i) => {
          const r = rand(500 + i);
          const x = r() * 400;
          const y = 120 + r() * 220;
          return <Path key={i} d={`M${x} ${y} l2 5`} />;
        })}
      </G>
    </G>
  );
}

/** Cercle en commande de tracé (pour cumuler plusieurs formes dans un Path). */
function circ(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 -${r * 2} 0 `;
}

/** Silhouette assise, voûtée, pieds en (x, y). */
function seated(x: number, y: number, h: number, dir = 1): string {
  const hr = h * 0.13;
  return `M${x - h * 0.34} ${y} Q${x - h * 0.34} ${y - h * 0.6} ${x + dir * h * 0.04} ${y - h * 0.68} Q${x + h * 0.32} ${y - h * 0.6} ${x + h * 0.34} ${y} Z ${circ(x + dir * h * 0.08, y - h * 0.68 - hr * 0.8, hr)}`;
}

/** Religieuse voilée, pieds en (x, y). */
function nun(x: number, y: number, h: number): string {
  return `M${x - h * 0.24} ${y} Q${x - h * 0.2} ${y - h * 0.5} ${x - h * 0.13} ${y - h * 0.78} Q${x - h * 0.12} ${y - h} ${x} ${y - h} Q${x + h * 0.12} ${y - h} ${x + h * 0.13} ${y - h * 0.78} Q${x + h * 0.2} ${y - h * 0.5} ${x + h * 0.24} ${y} Z`;
}

/** Rangée de wagons fuyant vers (vx, vy) ; base et toit donnés à x = nearX. */
function wagons(vx: number, vy: number, nearX: number, base: number, top: number, s0: number, n: number): { body: string; wheels: string } {
  let body = '';
  let wheels = '';
  let s = s0;
  const X = (k: number) => vx + (nearX - vx) * k;
  const B = (k: number) => vy + (base - vy) * k;
  const T = (k: number) => vy + (top - vy) * k;
  for (let i = 0; i < n; i += 1) {
    const e = s * 1.3;
    body += `M${X(s)} ${T(s)} L${X(e)} ${T(e)} L${X(e)} ${B(e)} L${X(s)} ${B(s)} Z `;
    for (const k of [s + (e - s) * 0.2, s + (e - s) * 0.8]) wheels += circ(X(k), B(k), (B(k) - T(k)) * 0.11);
    s = e * 1.05;
  }
  return { body, wheels };
}

/** Pommier : tronc tordu et houppier ; fy = -1 donne son reflet. */
function appleTree(x: number, y: number, s: number, fy = 1): string {
  const Y = (dy: number) => y - dy * s * fy;
  const c = (dx: number, dy: number, r: number) => `M${x + (dx - r) * s} ${Y(dy)} a${r * s} ${r * s} 0 1 0 ${r * 2 * s} 0 a${r * s} ${r * s} 0 1 0 -${r * 2 * s} 0 `;
  return `M${x - 3 * s} ${y} L${x - 4 * s} ${Y(22)} L${x - 1 * s} ${Y(42)} L${x + 5 * s} ${Y(42)} L${x + 4 * s} ${Y(20)} L${x + 3 * s} ${y} Z ${c(-15, 52, 15)}${c(12, 56, 17)}${c(-1, 70, 18)}${c(25, 46, 11)}${c(-27, 44, 10)}`;
}

/** Saule pleureur : tronc, dôme et branches retombantes. */
function Willow({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <G>
      <Path d={`M${x - 4 * s} ${y} Q${x - 2 * s} ${y - 30 * s} ${x - 8 * s} ${y - 50 * s} L${x + 6 * s} ${y - 52 * s} Q${x + 4 * s} ${y - 28 * s} ${x + 5 * s} ${y} Z M${x - 40 * s} ${y - 40 * s} Q${x} ${y - 100 * s} ${x + 40 * s} ${y - 40 * s} Q${x} ${y - 56 * s} ${x - 40 * s} ${y - 40 * s} Z`} fill={color} />
      <G stroke={color} strokeWidth={2 * s} fill="none" strokeLinecap="round">
        {Array.from({ length: 11 }).map((_, i) => {
          const bx = x - 38 * s + i * 7.6 * s;
          const by = y - 44 * s - Math.sin((i / 10) * Math.PI) * 40 * s;
          return <Path key={i} d={`M${bx} ${by} q${(i - 5) * 1.5 * s} ${25 * s} ${(i - 5) * 2 * s} ${(y - by) * 0.85}`} />;
        })}
      </G>
    </G>
  );
}

/** Épave de voiture vue de profil, roues comprises, origine au bas gauche. */
function car(w: number): string {
  const h = w * 0.3;
  return `M0 0 v${-h * 0.55} l${w * 0.16} ${-h * 0.1} l${w * 0.16} ${-h * 0.35} h${w * 0.36} l${w * 0.14} ${h * 0.35} l${w * 0.18} ${h * 0.08} v${h * 0.57} Z ${circ(w * 0.2, 0, h * 0.24)}${circ(w * 0.8, 0, h * 0.24)}`;
}

/** Camion de l'Institut (profil, origine au bas gauche de la caisse). Plateau à cages si `cages`. */
function Truck({ t, cages = false, body = '#E8E6E0' }: { t: string; cages?: boolean; body?: string }) {
  return (
    <G transform={t}>
      {cages ? (
        <G stroke="#1C1F20" strokeWidth={2} fill="none">
          <Rect x={2} y={-34} width={50} height={34} />
          <Rect x={56} y={-34} width={50} height={34} />
          <Path d="M10 -34 v34 M18 -34 v34 M26 -34 v34 M34 -34 v34 M42 -34 v34 M64 -34 v34 M72 -34 v34 M80 -34 v34 M88 -34 v34 M96 -34 v34" strokeWidth={1.2} />
        </G>
      ) : (
        <>
          <Rect x={0} y={-60} width={110} height={60} fill={body} />
          <Circle cx={55} cy={-30} r={14} stroke="#C8323A" strokeWidth={3} fill="none" />
          <Path d="M55 -40 v20 M45 -30 h20" stroke="#C8323A" strokeWidth={5} />
        </>
      )}
      <Path d="M110 0 V-44 H130 L146 -26 V0 Z" fill={body} />
      <Path d="M114 -40 h14 l12 13 h-26 z" fill="#2E3438" />
      <Rect x={0} y={0} width={146} height={8} fill="#1E2022" />
      <Path d={`${circ(24, 12, 11)}${circ(60, 12, 11)}${circ(126, 12, 11)}`} fill="#121415" />
    </G>
  );
}

/** Cage vide, porte ouverte. */
function Cage({ x, y, w, h, a = 0, color = '#1E2224' }: { x: number; y: number; w: number; h: number; a?: number; color?: string }) {
  const bars = Array.from({ length: Math.floor(w / 9) }, (_, i) => `M${x + 9 * (i + 1)} ${y - h} v${h}`).join(' ');
  return (
    <G transform={`rotate(${a} ${x + w / 2} ${y})`} stroke={color} fill="none">
      <Rect x={x} y={y - h} width={w} height={h} strokeWidth={2.2} />
      <Path d={bars} strokeWidth={1.1} />
      <Path d={`M${x + w} ${y - h} l${h * 0.55} ${h * 0.25} v${h * 0.8} l${-h * 0.55} ${-h * 0.05}`} strokeWidth={1.6} />
    </G>
  );
}

function Triage({ u }: { u: string }) {
  const left = wagons(200, 262, -40, 470, 340, 0.16, 5);
  const right = wagons(200, 262, 460, 440, 350, 0.18, 4);
  return (
    <G>
      <Sky id={`s${u}`} top="#090C14" mid="#1E2536" bottom="#06070A" />
      <Glow id={`h${u}`} cx={200} cy={262} r={210} color="#7A90B4" opacity={0.25} />
      <Rect x={0} y={262} width={400} height={238} fill="#0B0C0E" />
      {/* Rails convergents et traverses */}
      <G stroke="#3E444C" strokeWidth={1.6}>
        {[-150, -60, 155, 245, 420, 520].map((x) => (
          <Path key={x} d={`M200 262 L${x} 500`} />
        ))}
      </G>
      <G stroke="#1A1C20" strokeWidth={2}>
        {Array.from({ length: 14 }).map((_, i) => {
          const t = ((i + 1) / 14) ** 2;
          return <Path key={i} d={`M${200 - 58 * t} ${262 + 238 * t} h${116 * t}`} />;
        })}
      </G>
      <Path d="M200 262 L245 500" stroke="#E0A060" strokeWidth={1.2} opacity={0.35} />
      {/* Wagons rouillés */}
      <Path d={right.body} fill="#2A1A14" />
      <Path d={right.wheels} fill="#08090A" />
      <Path d={left.body} fill="#33201A" />
      <Path d={left.wheels} fill="#08090A" />
      <G stroke="#5A3420" strokeWidth={1} opacity={0.5}>
        <Path d="M60 360 v26 M100 346 v18 M128 318 v14 M300 330 v20 M330 340 v16" />
      </G>
      {/* Signal rouge */}
      <Path d="M160 262 V120" stroke="#0A0B0D" strokeWidth={3} />
      <Circle cx={160} cy={128} r={4} fill="#FF4A3A" />
      <Glow id={`r${u}`} cx={160} cy={128} r={30} color="#FF4A3A" opacity={0.6} />
      {/* Poste d'aiguillage */}
      <Glow id={`w${u}`} cx={323} cy={215} r={130} color="#FFB04A" opacity={0.35} />
      <Path d="M282 252 v120 M356 252 v120 M282 300 L356 340 M356 300 L282 340" stroke="#0A0B0D" strokeWidth={5} />
      <Path d="M268 252 L232 372 M262 272 h10 M256 292 h10 M250 312 h10 M244 332 h10 M238 352 h10" stroke="#0A0B0D" strokeWidth={3} />
      <Rect x={268} y={190} width={110} height={62} fill="#111317" />
      <Rect x={276} y={202} width={94} height={26} fill="#FFC46A" />
      <Path d={figure(322, 244, 46, -1, 2)} fill="#2A1A0C" />
      <Rect x={315} y={196} width={14} height={4} fill="#2A1A0C" />
      <Path d="M299 202 v26 M345 202 v26" stroke="#3A2A18" strokeWidth={2} />
      <Rect x={268} y={228} width={110} height={24} fill="#111317" />
      <Path d="M258 194 L282 170 H374 L390 194 Z" fill="#090A0D" />
      <Ellipse cx={320} cy={376} rx={100} ry={14} fill="#FFB04A" opacity={0.08} />
      {/* Wagon-citerne au premier plan */}
      <G>
        <Rect x={-10} y={372} width={180} height={58} rx={29} fill="#101114" />
        <Rect x={64} y={358} width={26} height={16} rx={4} fill="#101114" />
        <Path d="M30 374 v54 M130 374 v54" stroke="#1C1D21" strokeWidth={3} />
        <Path d="M40 375 Q110 368 165 386" stroke="#E0A060" strokeWidth={1.5} fill="none" opacity={0.35} />
        <Path d="M50 400 v14 M96 396 v20 M112 404 v10" stroke="#4A2A1A" strokeWidth={2} opacity={0.6} />
        <Rect x={-10} y={428} width={180} height={9} fill="#07080A" />
        <Path d={`${circ(20, 446, 12)}${circ(50, 446, 12)}${circ(116, 446, 12)}${circ(146, 446, 12)}`} fill="#07080A" />
      </G>
      <Fog id={`f${u}`} y={292} color="#7A8AA4" opacity={0.25} />
      <Rect x={0} y={470} width={400} height={30} fill="#050607" />
    </G>
  );
}

function Vergers({ u }: { u: string }) {
  const trees: [number, number, number, string][] = [
    [40, 286, 0.35, '#5E646A'], [92, 288, 0.4, '#5E646A'], [168, 287, 0.32, '#5E646A'], [352, 287, 0.38, '#5E646A'],
    [20, 316, 0.7, '#3C4248'], [130, 306, 0.6, '#3C4248'], [372, 320, 0.72, '#3C4248'],
    [70, 392, 1.25, '#1C2024'], [350, 420, 1.15, '#1C2024'],
  ];
  const r = rand(77);
  return (
    <G>
      <Sky id={`s${u}`} top="#2A2E36" mid="#9A9A96" bottom="#585E64" />
      <Glow id={`g${u}`} cx={140} cy={268} r={170} color="#F2DCC0" opacity={0.5} />
      <Circle cx={140} cy={270} r={13} fill="#F6EADA" opacity={0.6} />
      <Path d="M0 282 Q60 272 120 278 T260 274 T400 280 V286 H0 Z" fill="#5A6066" opacity={0.7} />
      {/* Eau de crue */}
      <Defs>
        <LinearGradient id={`w${u}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8A9096" />
          <Stop offset="1" stopColor="#262B30" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={284} width={400} height={216} fill={`url(#w${u})`} />
      <Path d="M126 290 h28 M120 300 h40 M130 312 h22 M116 326 h48" stroke="#F6EADA" strokeWidth={1.4} opacity={0.35} />
      {trees.map(([x, y, s, c], i) => (
        <G key={i}>
          <Path d={appleTree(x, y, s, -1)} fill={c} opacity={0.25} />
          <Path d={appleTree(x, y, s)} fill={c} />
        </G>
      ))}
      {/* Toit de la ferme et ses deux réfugiés */}
      <Path d="M200 362 L234 404 L324 410 L340 366 Z" fill="#30363C" opacity={0.35} />
      <Path d="M200 362 L234 318 L322 312 L340 358 Z" fill="#202429" />
      <Path d="M200 362 L234 318 L266 362 Z" fill="#2C3137" />
      <Path d="M246 332 L330 328 M256 346 L336 344" stroke="#151719" strokeWidth={1} />
      <Rect x={290} y={294} width={12} height={22} fill="#1A1D21" />
      <Path d={figure(262, 318, 52, 0, 2)} fill={INK} />
      <Path d="M268 282 L278 258" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Path d={figure(278, 317, 28, -1, 1)} fill={INK} />
      {/* Débris et rides */}
      <Rect x={170} y={384} width={18} height={7} fill="#1E2226" />
      <Ellipse cx={230} cy={448} rx={10} ry={4} fill="#1E2226" />
      <G stroke="#D8DCE0" strokeWidth={1} opacity={0.25}>
        {Array.from({ length: 18 }).map((_, i) => (
          <Path key={i} d={`M${r() * 400} ${300 + r() * 190} h${10 + r() * 30}`} />
        ))}
      </G>
      <Path d="M300 120 l6 4 l6 -4 M330 104 l5 3 l5 -3 M318 140 l4 3 l4 -3" stroke="#1E2226" strokeWidth={1.4} fill="none" />
      <Fog id={`f${u}`} y={292} color="#C8CACC" opacity={0.4} />
    </G>
  );
}

function Peage({ u }: { u: string }) {
  const stack = (x0: number, flip: number) =>
    [
      [0, 362, 0, 92], [70, 360, 3, 86],
      [10, 334, 178, 84], [76, 330, -6, 80],
      [-6, 300, 8, 80], [60, 298, 184, 76],
    ].map(([dx, y, a, w], i) => (
      <Path key={i} d={car(w)} transform={`translate(${flip > 0 ? x0 + dx : x0 - dx - w} ${y}) rotate(${a} ${w / 2} -10)`} fill="#0F0B0A" stroke="#FF9A3A" strokeWidth={0.8} strokeOpacity={0.25} />
    ));
  return (
    <G>
      <Sky id={`s${u}`} top="#0A080C" mid="#3A2412" bottom="#0C0806" />
      <Glow id={`g${u}`} cx={200} cy={220} r={230} color="#FF9A3A" opacity={0.3} />
      {/* Auvent du péage */}
      <Rect x={0} y={120} width={400} height={34} fill="#0E0C0C" />
      <Rect x={0} y={150} width={400} height={6} fill="#2A1C12" />
      {[40, 120, 270, 350].map((x) => (
        <Rect key={x} x={x} y={156} width={10} height={200} fill="#0C0A0A" />
      ))}
      <G stroke="#FF4A3A" strokeWidth={2}>
        {[80, 160, 240, 320].map((x) => (
          <Path key={x} d={`M${x - 5} 160 l10 10 M${x + 5} 160 l-10 10`} />
        ))}
      </G>
      {[100, 300].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={160} r={4} fill="#FFC46A" />
          <Glow id={`p${u}${x}`} cx={x} cy={160} r={70} color="#FFB04A" opacity={0.55} />
        </G>
      ))}
      {/* Chaussée et murs d'épaves */}
      <Rect x={0} y={354} width={400} height={80} fill="#130E0C" />
      <Path d="M60 400 h40 M180 400 h40 M300 400 h40" stroke="#4A3626" strokeWidth={2} />
      {stack(-8, 1)}
      {stack(408, -1)}
      <Path d="M0 276 l12 -14 l8 12 l14 -18 l10 16 l16 -10 l12 14 l20 -8 l20 10 M400 278 l-14 -16 l-10 12 l-14 -18 l-12 16 l-18 -10 l-10 14 l-20 -6 l-18 8" stroke="#0F0B0A" strokeWidth={3} fill="none" />
      {/* Barrière */}
      <Rect x={124} y={312} width={8} height={44} fill="#0E0B0A" />
      <Rect x={130} y={314} width={150} height={7} fill="#D8D0C4" />
      <Path d="M146 314 v7 M176 314 v7 M206 314 v7 M236 314 v7 M266 314 v7" stroke="#B4281E" strokeWidth={10} />
      {/* Le Péager */}
      <G>
        <Path d="M164 390 L170 306 L230 306 L236 390 L214 390 L204 330 L196 330 L186 390 Z" fill={INK} />
        <Path d="M146 304 L142 236 Q150 208 178 204 L222 204 Q250 208 258 236 L254 304 Z" fill={INK} />
        <Ellipse cx={146} cy={222} rx={26} ry={18} fill={INK} />
        <Ellipse cx={254} cy={222} rx={26} ry={18} fill={INK} />
        <Path d="M126 232 L120 304 L138 308 L148 240 Z M274 232 L282 304 L264 308 L252 240 Z" fill={INK} />
        <Path d="M182 208 L180 176 Q200 160 220 176 L218 208 Z" fill={INK} />
        <Rect x={187} y={184} width={26} height={4} fill="#FF7A2A" />
        <Path d="M152 250 h96 M150 270 h100 M150 290 h100" stroke="#2A1E16" strokeWidth={1.5} />
        <Path d="M122 220 Q146 196 176 204 M224 204 Q254 196 278 220" stroke="#FF9A3A" strokeWidth={1.4} fill="none" opacity={0.5} />
        <Path d="M276 304 L304 132" stroke={INK} strokeWidth={6} />
        <Circle cx={305} cy={128} r={19} fill="#8A1E18" />
        <Rect x={293} y={125} width={24} height={6} fill="#D8D0C4" />
      </G>
      {/* Viaduc */}
      <Rect x={0} y={428} width={400} height={12} fill="#1A1410" />
      <Rect x={0} y={440} width={400} height={60} fill="#060505" />
      {[-10, 90, 190, 290, 390].map((x) => (
        <Path key={x} d={`M${x} 500 V478 Q${x + 35} 452 ${x + 70} 478 V500 Z`} fill="#3A2414" opacity={0.6} />
      ))}
      <Fog id={`f${u}`} y={496} color="#C9824A" opacity={0.35} />
    </G>
  );
}

function Prieure({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#1A1A34" mid="#8A4E5A" bottom="#2A1820" />
      <Glow id={`g${u}`} cx={320} cy={240} r={180} color="#FFB27A" opacity={0.5} />
      <Path d="M0 260 Q90 230 180 252 T400 238 V320 H0 Z" fill="#3A2632" opacity={0.75} />
      {/* Colline et prieuré */}
      <Path d="M0 330 Q110 228 205 214 Q300 204 400 286 V500 H0 Z" fill="#1E141A" />
      <G fill="#120A0E">
        <Rect x={120} y={196} width={44} height={26} />
        <Path d="M116 198 L142 182 L168 198 Z" />
        <Rect x={160} y={180} width={90} height={40} />
        <Path d="M156 182 L205 156 L254 182 Z" />
        <Rect x={236} y={120} width={26} height={100} />
        <Path d="M232 122 L249 80 L266 122 Z" />
      </G>
      <Path d="M249 64 v16 M243 70 h12" stroke="#120A0E" strokeWidth={2.5} />
      <Rect x={244} y={132} width={10} height={16} rx={5} fill="#5A3440" />
      <Rect x={182} y={196} width={5} height={10} fill="#FFC46A" />
      <Rect x={200} y={196} width={5} height={10} fill="#FFC46A" opacity={0.6} />
      {/* Rangs de vigne */}
      <G stroke="#331F28" strokeWidth={3} strokeDasharray="3 5" fill="none">
        {Array.from({ length: 13 }).map((_, i) => (
          <Path key={i} d={`M${205 + (i - 6) * 9} 236 Q${205 + (i - 6) * 26} 330 ${205 + (i - 6) * 70} 500`} />
        ))}
      </G>
      {/* Porte de crypte éclairée */}
      <Glow id={`c${u}`} cx={330} cy={440} r={110} color="#FFB45A" opacity={0.55} />
      <Path d="M276 500 V372 Q336 344 400 356 V500 Z" fill="#170F14" />
      <Path d="M300 500 V426 Q330 384 360 426 V500 Z" fill="#FFB45A" />
      <Path d="M308 500 V432 Q330 400 352 432 V500 Z" fill="#E08A3A" />
      <G fill="#FFF0C8">
        <Rect x={314} y={470} width={4} height={18} />
        <Rect x={328} y={462} width={4} height={26} />
        <Rect x={342} y={468} width={4} height={20} />
      </G>
      <Path d={`${circ(316, 466, 2.5)}${circ(330, 458, 2.5)}${circ(344, 464, 2.5)}`} fill="#FFFFFF" />
      <Path d="M296 426 Q330 380 364 426" stroke="#2A1A20" strokeWidth={4} fill="none" />
      {/* Religieuses */}
      <Path d={`${nun(160, 470, 70)}${nun(212, 476, 80)}${nun(262, 484, 88)}`} fill={INK} />
      <Circle cx={226} cy={430} r={2.5} fill="#FFD27A" />
      <Glow id={`l${u}`} cx={226} cy={430} r={24} color="#FFD27A" opacity={0.7} />
      <Fog id={`f${u}`} y={300} color="#C08A8A" opacity={0.2} />
    </G>
  );
}

function Barrage({ u }: { u: string }) {
  const r = rand(91);
  return (
    <G>
      <Sky id={`s${u}`} top="#0A1220" mid="#1A2838" bottom="#05070A" />
      <G fill="#C9D4E0">
        {Array.from({ length: 24 }).map((_, i) => (
          <Circle key={i} cx={r() * 400} cy={r() * 120} r={0.5 + r() * 0.8} opacity={0.3 + r() * 0.4} />
        ))}
      </G>
      {/* Lignes haute tension */}
      <G stroke="#04060A" fill="none">
        <Path d="M352 160 L344 64 L338 160 M330 70 h28 M333 90 h22 M336 120 h16" strokeWidth={2.5} />
        <Path d="M40 160 L46 80 L52 160 M34 86 h24 M38 110 h16" strokeWidth={2.5} />
        <Path d="M330 70 Q190 120 34 86 M358 70 Q300 100 260 110 M333 90 Q190 140 38 110" strokeWidth={1} />
      </G>
      <Circle cx={344} cy={62} r={2.5} fill="#FF4A3A" />
      <Glow id={`a${u}`} cx={344} cy={62} r={14} color="#FF4A3A" opacity={0.6} />
      <Path d="M0 150 L110 196 L118 500 H0 Z" fill="#070A0D" />
      <Path d="M400 150 L290 196 L282 500 H400 Z" fill="#070A0D" />
      {/* Voile de béton */}
      <Defs>
        <LinearGradient id={`d${u}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4A525C" />
          <Stop offset="1" stopColor="#15191E" />
        </LinearGradient>
        <LinearGradient id={`e${u}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EAF2F6" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#EAF2F6" stopOpacity={0.4} />
        </LinearGradient>
      </Defs>
      <Path d="M70 196 Q200 214 330 196 L314 404 Q200 420 86 404 Z" fill={`url(#d${u})`} />
      <G stroke="#0E1216" strokeWidth={1} opacity={0.6} fill="none">
        <Path d="M74 246 Q200 264 326 246 M78 296 Q200 314 322 296 M82 346 Q200 364 318 346" />
      </G>
      <Path d="M64 190 Q200 210 336 190 v9 Q200 219 64 199 Z" fill="#0C0F12" />
      {/* Salle de contrôle */}
      <Glow id={`g${u}`} cx={120} cy={176} r={80} color="#FFD27A" opacity={0.35} />
      <Rect x={84} y={160} width={74} height={34} fill="#0B0E11" />
      <Rect x={80} y={154} width={82} height={7} fill="#06080A" />
      {[90, 103, 116, 129, 142].map((x, i) => (
        <Rect key={x} x={x} y={168} width={8} height={10} fill={i === 3 ? '#9AD0FF' : '#FFD27A'} opacity={i === 1 ? 0.35 : 1} />
      ))}
      {/* Évacuateur et écume */}
      <Path d="M178 206 Q172 300 160 406 L240 406 Q228 300 222 206 Z" fill={`url(#e${u})`} />
      <G stroke="#FFFFFF" strokeWidth={1} opacity={0.5}>
        <Path d="M186 214 Q182 300 174 400 M200 214 V404 M214 214 Q218 300 226 400" />
      </G>
      <Glow id={`m${u}`} cx={200} cy={410} r={120} color="#DDE8EE" opacity={0.45} />
      <Rect x={0} y={404} width={400} height={96} fill="#05080B" />
      <G fill="#E6EEF2">
        {Array.from({ length: 30 }).map((_, i) => {
          const x = 140 + r() * 120;
          return <Ellipse key={i} cx={x} cy={404 + r() * 30} rx={6 + r() * 14} ry={3 + r() * 4} opacity={0.2 + r() * 0.5} />;
        })}
      </G>
      <G stroke="#C9D4E0" strokeWidth={1} opacity={0.25}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Path key={i} d={`M${r() * 400} ${440 + r() * 50} h${20 + r() * 40}`} />
        ))}
      </G>
      <Fog id={`f${u}`} y={402} color="#A8B8C4" opacity={0.35} />
    </G>
  );
}

function Convoi({ u }: { u: string }) {
  return (
    <G>
      <Sky id={`s${u}`} top="#6E767C" mid="#B4B8B6" bottom="#7A7E7A" />
      <Glow id={`g${u}`} cx={290} cy={170} r={150} color="#F4F0E6" opacity={0.55} />
      <Path d="M0 262 Q40 236 80 252 Q120 232 160 250 Q220 236 260 250 Q320 230 400 254 V270 H0 Z" fill="#8A908E" opacity={0.7} />
      <Rect x={0} y={262} width={400} height={238} fill="#5E625C" />
      <Path d="M0 330 H400 V500 H0 Z" fill="#4A4E48" />
      {/* Route */}
      <Path d="M186 262 Q196 310 130 380 Q70 446 40 500 H268 Q276 430 250 380 Q218 316 204 262 Z" fill="#6C6E6E" />
      <Path d="M195 270 Q200 320 170 380 Q140 440 150 500" stroke="#9A9C98" strokeWidth={2} strokeDasharray="8 10" fill="none" />
      {/* Arbres nus */}
      <G stroke="#3A3E3C" fill="none" strokeLinecap="round">
        <Path d="M60 330 V220 M60 260 l-20 -24 M60 240 l18 -22 M60 280 l14 -12" strokeWidth={4} />
        <Path d="M350 340 V200 M350 240 l-26 -30 M350 220 l20 -26 M350 270 l24 -18" strokeWidth={5} />
        <Path d="M300 280 V230 M300 248 l-10 -12 M300 240 l9 -10" strokeWidth={2} opacity={0.6} />
      </G>
      {/* Camions renversés */}
      <Truck t="translate(250 306) rotate(-14) scale(0.5)" body="#D8D8D2" />
      <Truck t="translate(282 404) rotate(184) scale(1.05)" />
      <Path d="M120 404 Q200 420 290 410" stroke="#2A2C2C" strokeWidth={2} opacity={0.5} fill="none" />
      {/* Cages vides */}
      <Cage x={30} y={466} w={72} h={46} a={-6} color="#232628" />
      <Cage x={240} y={484} w={84} h={52} a={12} color="#1A1C1E" />
      <Cage x={292} y={372} w={46} h={30} a={4} color="#3A3E40" />
      <Path d="M150 470 l6 -3 M164 462 l6 -3 M178 454 l6 -3 M192 446 l6 -3" stroke="#2A2C2C" strokeWidth={2} />
      <Fog id={`f${u}`} y={290} color="#E0E2DE" opacity={0.6} />
      <Fog id={`k${u}`} y={430} color="#D4D6D2" opacity={0.3} />
    </G>
  );
}

function Dame({ u }: { u: string }) {
  const r = rand(53);
  const logs = Array.from({ length: 20 }).map((_, i) => {
    const t = ((i + 1) / 20) ** 1.8;
    const cx = 196 - 30 * t + (r() - 0.5) * 6 * t;
    return { x: cx - 8 - 70 * t + (r() - 0.5) * 10 * t, y: 292 + 208 * t, w: (16 + 140 * t) * (0.9 + r() * 0.2), h: (2 + 9 * t) * (0.8 + r() * 0.4) };
  });
  return (
    <G>
      <Sky id={`s${u}`} top="#070B0E" mid="#1C282C" bottom="#050708" />
      <Glow id={`g${u}`} cx={300} cy={110} r={130} color="#CFE0DC" opacity={0.4} />
      <Circle cx={300} cy={110} r={24} fill="#DDE6E2" />
      <Path d="M250 118 Q300 110 352 120 Q300 126 250 118 Z M262 100 Q296 94 330 102 Q300 106 262 100 Z" fill="#1C282C" opacity={0.6} />
      <G stroke="#0C1214" strokeWidth={2}>
        {[20, 34, 70, 120, 150, 260, 340, 372].map((x, i) => (
          <Path key={x} d={`M${x} 292 V${250 - (i % 3) * 14} M${x} ${266 - (i % 2) * 8} l${i % 2 ? 8 : -8} -10`} />
        ))}
      </G>
      <Rect x={0} y={290} width={400} height={210} fill="#040607" />
      <G stroke="#CFE0DC" strokeWidth={1.2}>
        {Array.from({ length: 10 }).map((_, i) => (
          <Path key={i} d={`M${300 - 30 + r() * 30} ${296 + i * 7} h${10 + r() * 24}`} opacity={0.15 + r() * 0.3} />
        ))}
      </G>
      <Path d="M10 326 Q60 300 110 326 Z M330 346 Q380 326 410 346 Z" fill="#0B0F0F" />
      {/* La Dame des Tourbières */}
      <Path d="M286 336 L290 410 L300 440 L310 410 L314 336 Z" fill="#121A1C" opacity={0.5} />
      <G fill={INK}>
        <Path d="M286 336 L290 250 Q284 214 288 198 L296 186 L304 186 L312 198 Q316 214 310 250 L314 336 Z" />
        <Ellipse cx={300} cy={170} rx={9} ry={14} />
        <Path d="M291 162 Q280 206 274 262 Q284 230 292 204 Z M309 162 Q320 206 326 262 Q316 230 308 204 Z" />
      </G>
      <G stroke={INK} fill="none" strokeLinecap="round">
        <Path d="M290 198 Q272 244 266 316 M310 198 Q328 244 334 316" strokeWidth={4} />
        <Path d="M266 314 l-5 16 M266 314 l0 17 M267 314 l5 15 M334 314 l-5 15 M334 314 l0 17 M335 314 l5 16" strokeWidth={1.5} />
      </G>
      <Path d={`${circ(296, 170, 1.2)}${circ(304, 170, 1.2)}`} fill="#CFE8E0" />
      <G stroke="#8AA0A0" fill="none">
        <Ellipse cx={300} cy={338} rx={30} ry={4} opacity={0.35} />
        <Ellipse cx={300} cy={340} rx={52} ry={7} opacity={0.22} />
        <Ellipse cx={300} cy={343} rx={76} ry={10} opacity={0.12} />
      </G>
      {/* Chaussée de rondins */}
      <G fill="#16130F">
        {logs.map((l, i) => (
          <Rect key={i} x={l.x} y={l.y} width={l.w} height={l.h} rx={l.h / 2} />
        ))}
      </G>
      {/* Roseaux */}
      <G stroke={INK} strokeWidth={2} fill="none">
        {Array.from({ length: 26 }).map((_, i) => {
          const x = i < 13 ? r() * 90 : 320 + r() * 80;
          const h = 60 + r() * 90;
          const dx = (r() - 0.5) * 30;
          return <Path key={i} d={`M${x} 500 q${dx * 0.3} ${-h / 2} ${dx} ${-h}`} />;
        })}
      </G>
      <Path d={`${circ(30, 380, 3)}${circ(70, 372, 3)}${circ(350, 384, 3)}`} fill={INK} />
      <Fog id={`f${u}`} y={300} color="#9FB2B0" opacity={0.4} />
      <Fog id={`k${u}`} y={430} color="#9FB2B0" opacity={0.18} />
    </G>
  );
}

function Brennes({ u }: { u: string }) {
  const r = rand(17);
  const lanterns = Array.from({ length: 10 }).map((_, i) => {
    const t = ((i % 5) + 0.5) / 5;
    const [x0, x1] = i < 5 ? [40, 172] : [238, 370];
    return { x: x0 + (x1 - x0) * t, y: 244 + 30 * 4 * t * (1 - t) };
  });
  return (
    <G>
      <Sky id={`s${u}`} top="#0A0C16" mid="#22202C" bottom="#0A0908" />
      <G fill="#C9D4E0">
        {Array.from({ length: 18 }).map((_, i) => (
          <Circle key={i} cx={r() * 400} cy={r() * 110} r={0.6} opacity={0.5} />
        ))}
      </G>
      <Glow id={`g${u}`} cx={200} cy={390} r={200} color="#FFB04A" opacity={0.35} />
      {/* Église et maisons */}
      <G fill="#0D0B0E">
        <Rect x={170} y={200} width={70} height={130} />
        <Rect x={190} y={130} width={30} height={80} />
        <Path d="M186 132 L205 66 L224 132 Z M0 330 V250 L30 228 L60 250 V240 L95 214 L130 246 V330 Z M400 330 V246 L370 222 L340 246 V238 L305 212 L270 240 V330 Z" />
      </G>
      <Path d="M205 50 v18 M199 56 h12" stroke="#0D0B0E" strokeWidth={2.5} />
      <Circle cx={205} cy={160} r={7} fill="#5A3A20" />
      <G fill="#FFC46A">
        <Rect x={22} y={262} width={7} height={10} />
        <Rect x={98} y={258} width={7} height={10} opacity={0.6} />
        <Rect x={300} y={256} width={7} height={10} />
        <Rect x={360} y={264} width={7} height={10} opacity={0.6} />
      </G>
      {/* Guirlande de lanternes */}
      <Path d="M40 244 Q106 304 172 244 M238 244 Q304 304 370 244" stroke="#1A1410" strokeWidth={1} fill="none" />
      {lanterns.map((l, i) => (
        <G key={i}>
          <Rect x={l.x - 2.5} y={l.y} width={5} height={7} fill="#FFD27A" />
          <Glow id={`l${u}${i}`} cx={l.x} cy={l.y + 3} r={24} color="#FFC46A" opacity={0.6} />
        </G>
      ))}
      {/* Place, longue table et marmites */}
      <Rect x={0} y={330} width={400} height={170} fill="#120E0B" />
      <Path d={crowd(61, 14, 70, 330, 400, 40, 50, 6)} fill="#0A0807" />
      <Rect x={56} y={382} width={288} height={9} fill="#2A1C12" />
      <Rect x={60} y={391} width={280} height={30} fill="#140E09" />
      {[120, 200, 280].map((x) => (
        <G key={x}>
          <Path d={`M${x - 16} 362 h32 l-3 20 h-26 Z`} fill="#0A0807" />
          <Ellipse cx={x} cy={362} rx={16} ry={3} fill="#3A2614" />
          <Path d={`M${x - 4} 356 q-6 -12 2 -22 q6 -10 -2 -22 M${x + 6} 356 q6 -10 -2 -20`} stroke="#E8DCC8" strokeWidth={1.4} fill="none" opacity={0.3} />
        </G>
      ))}
      <Path d={`${seated(110, 470, 70, -1)}${seated(200, 476, 76)}${seated(290, 470, 70, 1)}`} fill={INK} />
      {/* Barricade de charrettes */}
      <G stroke="#0A0807" strokeWidth={4} fill="none">
        <Path d="M-10 380 L80 350 M-6 392 L84 362 M70 356 L130 290 M84 360 L150 300" strokeWidth={6} />
        <Path d="M330 360 L410 390 M320 372 L410 402 M330 362 L280 290" strokeWidth={6} />
        <Circle cx={40} cy={410} r={36} />
        <Path d="M40 374 V446 M4 410 H76 M15 385 L65 435 M65 385 L15 435" strokeWidth={2.5} />
        <Circle cx={370} cy={420} r={32} />
        <Path d="M370 388 V452 M338 420 H402 M347 397 L393 443 M393 397 L347 443" strokeWidth={2.5} />
      </G>
      <Rect x={0} y={478} width={400} height={22} fill="#060504" />
    </G>
  );
}

function Draisine({ u }: { u: string }) {
  const r = rand(29);
  let bank = 'M0 316 ';
  for (let x = 0; x <= 400; x += 10) bank += `L${x} ${300 - r() * 12 - (x % 30 === 0 ? 6 : 0)} `;
  bank += 'L400 316 Z';
  return (
    <G>
      <Sky id={`s${u}`} top="#241C3A" mid="#E0784A" bottom="#5A2418" />
      <Glow id={`g${u}`} cx={280} cy={292} r={190} color="#FF9A4A" opacity={0.6} />
      <Circle cx={280} cy={292} r={34} fill="#FFD8A0" />
      <Path d="M20 200 Q120 190 220 204 Q120 210 20 200 Z M200 160 Q300 150 390 166 Q300 170 200 160 Z M60 240 Q150 234 240 244 Q150 248 60 240 Z" fill="#3A2238" opacity={0.6} />
      <Path d={bank} fill="#2A1622" />
      {/* Rivière */}
      <Rect x={0} y={314} width={400} height={68} fill="#5A2A28" />
      <G stroke="#FFC890">
        {Array.from({ length: 10 }).map((_, i) => {
          const w = 10 + r() * 40 * (1 - i / 14);
          return <Path key={i} d={`M${280 - w / 2 + (r() - 0.5) * 12} ${320 + i * 6} h${w}`} strokeWidth={1.5} opacity={0.75 - i * 0.05} />;
        })}
      </G>
      {/* Remblai, voie unique et poteaux */}
      <Path d="M0 380 L400 376 V420 L0 428 Z" fill="#1A0C10" />
      <Path d="M0 380 L400 376" stroke="#08040A" strokeWidth={3} />
      <G fill="#08040A">
        {Array.from({ length: 20 }).map((_, i) => (
          <Rect key={i} x={i * 20 + 4} y={381 - i * 0.2} width={10} height={4} />
        ))}
      </G>
      <G stroke="#120A0E" fill="none">
        {[40, 330].map((x) => (
          <Path key={x} d={`M${x} 380 V218 M${x - 16} 232 h32 M${x - 12} 244 h24`} strokeWidth={4} />
        ))}
        <Path d="M-60 238 Q-10 250 40 232 Q185 262 330 232 Q380 250 460 236 M-60 250 Q-10 262 40 244 Q185 272 330 244 Q380 262 460 248" strokeWidth={1} />
      </G>
      {/* La draisine */}
      <G fill={INK}>
        <Rect x={140} y={360} width={130} height={8} />
        <Path d={`${circ(162, 372, 10)}${circ(248, 372, 10)}`} />
        <Path d="M201 360 L205 318 L209 360 Z" />
        <Path d={figure(168, 360, 62, 6, 4)} />
        <Path d={figure(244, 360, 58, -6, 2)} />
      </G>
      <G stroke={INK} strokeLinecap="round" fill="none">
        <Path d="M150 310 L262 326" strokeWidth={4} />
        <Path d="M180 322 L156 311 M232 330 L256 325" strokeWidth={3.5} />
      </G>
      {/* Herbes du premier plan */}
      <Path d="M0 500 V430 Q100 420 200 432 T400 426 V500 Z" fill="#0C0608" />
      <G stroke="#0C0608" strokeWidth={2}>
        {Array.from({ length: 30 }).map((_, i) => {
          const x = r() * 400;
          return <Path key={i} d={`M${x} 436 l${(r() - 0.5) * 10} ${-12 - r() * 20}`} />;
        })}
      </G>
      <Path d="M90 130 l6 4 l6 -4 M116 118 l5 3 l5 -3" stroke="#2A1828" strokeWidth={1.4} fill="none" />
    </G>
  );
}

function Gue({ u }: { u: string }) {
  const r = rand(44);
  return (
    <G>
      <Sky id={`s${u}`} top="#2E3638" mid="#7E8882" bottom="#3A4240" />
      <Glow id={`g${u}`} cx={150} cy={120} r={150} color="#E8E6D4" opacity={0.3} />
      {/* Rive d'en face, saules, 4x4 et treuil */}
      <Path d="M0 236 Q100 226 200 234 T400 230 V262 H0 Z" fill="#2E3A32" />
      <Willow x={40} y={240} s={0.9} color="#1E2A24" />
      <Willow x={340} y={238} s={1.1} color="#1E2A24" />
      <Willow x={392} y={236} s={0.7} color="#26322C" />
      <G>
        <Path d="M232 250 v-20 l10 -2 l10 -16 h42 l4 18 h6 v20 Z" fill="#E8E8E2" />
        <Path d="M256 228 l7 -11 h12 v11 Z M279 228 v-11 h12 l3 11 Z" fill="#2E3438" />
        <Circle cx={285} cy={238} r={4} stroke="#C8323A" strokeWidth={1.5} fill="none" />
        <Path d={`${circ(248, 251, 7)}${circ(290, 251, 7)}`} fill="#121415" />
        <Rect x={225} y={236} width={8} height={8} fill="#2A2C2C" />
      </G>
      <Path d="M226 240 L150 336" stroke="#141616" strokeWidth={1.4} />
      <Path d="M0 258 Q200 266 400 256 V266 H0 Z" fill="#3E3A2E" />
      {/* Rivière et gué */}
      <Defs>
        <LinearGradient id={`w${u}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6A7876" />
          <Stop offset="1" stopColor="#263030" />
        </LinearGradient>
        <LinearGradient id={`o${u}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#546260" />
          <Stop offset="1" stopColor="#263030" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={264} width={400} height={236} fill={`url(#w${u})`} />
      <Truck t="translate(20 360) rotate(8) scale(1.05)" cages />
      <Rect x={0} y={350} width={400} height={150} fill={`url(#o${u})`} opacity={0.8} />
      <G fill="#E6EEEA">
        {Array.from({ length: 14 }).map((_, i) => (
          <Ellipse key={i} cx={10 + r() * 190} cy={350 + r() * 6} rx={4 + r() * 10} ry={1.5 + r() * 2} opacity={0.3 + r() * 0.3} />
        ))}
      </G>
      <G stroke="#D8E2DE" strokeWidth={1.2}>
        {Array.from({ length: 22 }).map((_, i) => (
          <Path key={i} d={`M${r() * 400} ${280 + r() * 200} q10 -2 ${20 + r() * 30} 0`} fill="none" opacity={0.15 + r() * 0.25} />
        ))}
      </G>
      {/* Rive proche et branches */}
      <Path d="M0 500 V462 Q120 446 220 470 Q320 490 400 470 V500 Z" fill="#141814" />
      <G stroke="#0C100E" strokeWidth={1.6} fill="none">
        {Array.from({ length: 14 }).map((_, i) => (
          <Path key={i} d={`M${i * 9} 0 q${4 + i} ${60 + i * 6} ${8 + i * 2} ${110 + (i % 4) * 30}`} />
        ))}
      </G>
      <Path d="M0 0 Q60 10 130 0 Z" fill="#0C100E" />
      <Fog id={`f${u}`} y={250} color="#C8D0CC" opacity={0.3} />
    </G>
  );
}

function Veillee({ u }: { u: string }) {
  const r = rand(83);
  return (
    <G>
      <Sky id={`s${u}`} top="#04060C" mid="#101828" bottom="#05070A" />
      <G fill="#C9D4E0">
        {Array.from({ length: 26 }).map((_, i) => (
          <Circle key={i} cx={r() * 400} cy={r() * 200} r={0.5 + r() * 0.7} opacity={0.3 + r() * 0.4} />
        ))}
      </G>
      {/* Projecteurs de la barge à l'horizon */}
      <Defs>
        <LinearGradient id={`b${u}`} x1="1" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#DCEBFF" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#DCEBFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M318 292 L110 150 L146 126 Z M336 292 L262 60 L300 58 Z" fill={`url(#b${u})`} />
      <Path d="M260 300 h126 l-6 -8 h-30 v-10 h-14 v10 h-70 Z" fill="#020305" />
      <Path d={`${circ(318, 290, 2)}${circ(336, 290, 2)}`} fill="#EAF4FF" />
      <Rect x={0} y={300} width={400} height={60} fill="#070C14" />
      <Path d="M300 306 h40 M290 316 h30 M310 326 h24" stroke="#DCEBFF" strokeWidth={1} opacity={0.25} />
      {/* Chapelle des mariniers */}
      <G fill="#0A0C10">
        <Rect x={60} y={278} width={72} height={56} />
        <Path d="M52 280 L96 244 L140 280 Z" />
        <Rect x={89} y={228} width={14} height={22} />
      </G>
      <Path d="M96 214 v14 M91 219 h10" stroke="#0A0C10" strokeWidth={2} />
      <Rect x={92} y={234} width={8} height={9} rx={4} fill="#1A2030" />
      <Rect x={90} y={306} width={13} height={28} rx={6} fill="#7A4220" opacity={0.85} />
      {/* Berge et feu de camp */}
      <Path d="M0 336 Q200 322 400 344 V500 H0 Z" fill="#0B0807" />
      <Glow id={`g${u}`} cx={210} cy={420} r={180} color="#FF8A3A" opacity={0.55} />
      <Path d="M186 436 L236 422 M190 422 L236 438" stroke="#120806" strokeWidth={6} strokeLinecap="round" />
      <Path d="M196 430 Q192 410 206 384 Q208 404 216 396 Q222 412 230 400 Q232 420 226 430 Z" fill="#FF9A3A" />
      <Path d="M204 430 Q202 414 211 400 Q214 414 220 408 Q222 422 218 430 Z" fill="#FFE2A0" />
      <G fill="#FFC46A">
        {Array.from({ length: 12 }).map((_, i) => (
          <Circle key={i} cx={196 + r() * 36} cy={340 + r() * 50} r={0.8 + r() * 0.8} opacity={0.4 + r() * 0.5} />
        ))}
      </G>
      <Path d={`${seated(150, 434, 52, 1)}${seated(272, 432, 54, -1)}${figure(250, 410, 74, -2, 3)}`} fill={INK} />
      <Path d={`${seated(110, 494, 80, 1)}${seated(318, 500, 86, -1)}`} fill="#050403" />
      <Fog id={`f${u}`} y={300} color="#3A4A60" opacity={0.3} />
    </G>
  );
}

const SCENES: Record<IllustrationId, (p: { u: string }) => React.ReactElement> = {
  hurleur: Hurleur,
  brasserie: Brasserie,
  berger: Berger,
  berge: Berge,
  port: Port,
  ecluse: Ecluse,
  maree: Maree,
  triage: Triage,
  vergers: Vergers,
  peage: Peage,
  prieure: Prieure,
  barrage: Barrage,
  convoi: Convoi,
  dame: Dame,
  brennes: Brennes,
  draisine: Draisine,
  gue: Gue,
  veillee: Veillee,
};

export function isIllustration(id: string | undefined): id is IllustrationId {
  return !!id && (ILLUSTRATIONS as readonly string[]).includes(id);
}

function IllustrationDrawing({ id, width = '100%', height = '100%', slice = true }: { id: IllustrationId; width?: number | string; height?: number | string; slice?: boolean }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const Scene = SCENES[id];
  return (
    <Svg width={width} height={height} viewBox="0 0 400 500" preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMid meet'}>
      <Scene u={u} />
      <Vignette id={`v${u}`} />
    </Svg>
  );
}

/** Dessin SVG coûteux : redessiné seulement si ses propriétés changent. */
export const Illustration = React.memo(IllustrationDrawing);
