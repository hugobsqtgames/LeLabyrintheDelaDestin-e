/**
 * Illustrations plein écran des moments clés (champ `illustration` des
 * scènes). Compositions vectorielles en couches : ciel ou voûte, lumière
 * principale, silhouettes, brume et grain.
 */
import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export const ILLUSTRATIONS = ['hurleur', 'brasserie', 'berger', 'berge', 'port', 'ecluse', 'maree'] as const;
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

const SCENES: Record<IllustrationId, (p: { u: string }) => React.ReactElement> = {
  hurleur: Hurleur,
  brasserie: Brasserie,
  berger: Berger,
  berge: Berge,
  port: Port,
  ecluse: Ecluse,
  maree: Maree,
};

export function isIllustration(id: string | undefined): id is IllustrationId {
  return !!id && (ILLUSTRATIONS as readonly string[]).includes(id);
}

export function Illustration({ id, width = '100%', height = '100%', slice = true }: { id: IllustrationId; width?: number | string; height?: number | string; slice?: boolean }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const Scene = SCENES[id];
  return (
    <Svg width={width} height={height} viewBox="0 0 400 500" preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMid meet'}>
      <Scene u={u} />
      <Vignette id={`v${u}`} />
    </Svg>
  );
}
