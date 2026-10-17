/**
 * Portraits dessinés : un buste vectoriel par personnage, composé à partir
 * d'une fiche (teint, coiffure, vêtement, accessoires). Style aplat moderne,
 * éclairage de bord coloré, fond en dégradé de la couleur du personnage.
 */
import React, { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

type Hair = 'bun' | 'curly' | 'buzz' | 'braids' | 'bald_tufts' | 'long_grey' | 'bald' | 'bob' | 'crew' | 'scarf' | 'puffs' | 'hood' | 'short' | 'goggles' | 'cap' | 'veil' | 'slick';
type GarmentStyle = 'scrubs' | 'hoodie' | 'workjacket' | 'jacket' | 'coat' | 'shawl' | 'plastron' | 'labcoat' | 'uniform' | 'shirt' | 'padded' | 'cloak' | 'habit' | 'suit';
type Extra = 'stethoscope' | 'scar' | 'beard' | 'headlamp' | 'glasses' | 'medal' | 'pipe' | 'key' | 'warpaint' | 'collar' | 'mask' | 'headset' | 'bandage' | 'moustache' | 'lantern' | 'scarf' | 'tired' | 'cross' | 'sash' | 'smile';

interface Spec {
  bg: string;
  skin: string;
  hair: string;
  hairStyle: Hair;
  garment: string;
  garmentStyle: GarmentStyle;
  extras?: Extra[];
  /** Silhouette plus large (épaules). */
  broad?: boolean;
  /** Visage plus jeune / plus petit. */
  young?: boolean;
}

export const PORTRAITS: Record<string, Spec> = {
  maelle: { bg: '#7FA38A', skin: '#E2B596', hair: '#5A3A28', hairStyle: 'bun', garment: '#4F7D6B', garmentStyle: 'scrubs', extras: ['stethoscope', 'bandage'] },
  theo: { bg: '#C9A86A', skin: '#D9A37E', hair: '#2A1E18', hairStyle: 'curly', garment: '#7A6A3E', garmentStyle: 'hoodie', extras: ['scar'], young: true },
  kaz: { bg: '#B5654B', skin: '#E3B59C', hair: '#8A8580', hairStyle: 'buzz', garment: '#6B3A2A', garmentStyle: 'workjacket', extras: ['beard', 'warpaint'], broad: true },
  ines: { bg: '#8B9FC4', skin: '#7A4A32', hair: '#16110E', hairStyle: 'braids', garment: '#34425E', garmentStyle: 'jacket', extras: ['headlamp'] },
  odilon: { bg: '#A69C8A', skin: '#E5C0A3', hair: '#ECE6DB', hairStyle: 'bald_tufts', garment: '#5E574B', garmentStyle: 'coat', extras: ['glasses'] },
  helene: { bg: '#C2B48F', skin: '#EBC6A8', hair: '#BDB6AA', hairStyle: 'long_grey', garment: '#8A7B58', garmentStyle: 'shawl', extras: ['medal'] },
  gaspard: { bg: '#8E5A4A', skin: '#C99474', hair: '#1E1814', hairStyle: 'bald', garment: '#4A423C', garmentStyle: 'plastron', extras: ['beard', 'scar'], broad: true },
  sorel: { bg: '#9FB7B5', skin: '#EBC3A2', hair: '#2B2420', hairStyle: 'bob', garment: '#E6E9E8', garmentStyle: 'labcoat', extras: ['glasses'] },
  rousset: { bg: '#7D8590', skin: '#DDB094', hair: '#9A9690', hairStyle: 'crew', garment: '#4E555E', garmentStyle: 'uniform', extras: ['collar'] },
  cazal: { bg: '#B49A6E', skin: '#C7926E', hair: '#8C4A3A', hairStyle: 'scarf', garment: '#5C4A36', garmentStyle: 'coat', extras: ['pipe'] },
  nour: { bg: '#D49C8C', skin: '#A86F4E', hair: '#1A1310', hairStyle: 'puffs', garment: '#B9786A', garmentStyle: 'shirt', extras: ['key'], young: true },
  armand: { bg: '#8C8A6E', skin: '#E0B89A', hair: '#E4DFD4', hairStyle: 'cap', garment: '#2C4A7E', garmentStyle: 'workjacket', extras: ['moustache', 'lantern'] },
  claire: { bg: '#B48FA6', skin: '#E6BFA0', hair: '#2A1D18', hairStyle: 'bob', garment: '#5A4560', garmentStyle: 'coat', extras: ['scarf', 'tired'] },
  agathe: { bg: '#A9A08A', skin: '#F0D6C4', hair: '#1E1B1A', hairStyle: 'veil', garment: '#24211F', garmentStyle: 'habit', extras: ['cross'] },
  vautrin: { bg: '#9C7A5A', skin: '#E2B08F', hair: '#2A221C', hairStyle: 'slick', garment: '#2E3340', garmentStyle: 'suit', extras: ['sash', 'smile'], broad: true },
  // Protagoniste, selon le profil (silhouettes neutres).
  guerrier: { bg: '#FF6A3D', skin: '#C89878', hair: '#2A2420', hairStyle: 'short', garment: '#3A3532', garmentStyle: 'padded', extras: ['bandage'], broad: true },
  eclaireur: { bg: '#6FBF8A', skin: '#B9876A', hair: '#2E3A33', hairStyle: 'hood', garment: '#2E3A33', garmentStyle: 'cloak', extras: ['mask'] },
  technicien: { bg: '#9CCBFF', skin: '#D2A584', hair: '#3A2E26', hairStyle: 'goggles', garment: '#3C4452', garmentStyle: 'workjacket', extras: ['headset'] },
};

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function HairBack({ s }: { s: Spec }) {
  const c = s.hair;
  switch (s.hairStyle) {
    case 'long_grey':
      return <Path d="M30 44 C28 26 40 18 50 18 C60 18 72 26 70 44 L74 74 L26 74 Z" fill={c} />;
    case 'braids':
      return (
        <G fill={c}>
          <Path d="M32 42 C31 26 41 20 50 20 C59 20 69 26 68 42 L70 70 L62 70 L62 46 L38 46 L38 70 L30 70 Z" />
          {[0, 1, 2, 3].map((i) => (
            <Ellipse key={i} cx={33} cy={52 + i * 6} rx={3} ry={3.4} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <Ellipse key={`r${i}`} cx={67} cy={52 + i * 6} rx={3} ry={3.4} />
          ))}
        </G>
      );
    case 'bob':
      return <Path d="M31 46 C29 26 40 19 50 19 C60 19 71 26 69 46 L69 56 L31 56 Z" fill={c} />;
    case 'hood':
      return <Path d="M24 80 C22 46 32 18 50 16 C68 18 78 46 76 80 Z" fill={shade(c, 0.08)} />;
    case 'scarf':
      return <Path d="M30 50 C28 28 40 19 50 19 C60 19 72 28 70 50 L72 62 L28 62 Z" fill={c} />;
    case 'veil':
      return <Path d="M22 100 C20 62 26 22 50 16 C74 22 80 62 78 100 Z" fill={c} />;
    default:
      return null;
  }
}

function HairFront({ s }: { s: Spec }) {
  const c = s.hair;
  const hi = shade(c, 0.18);
  switch (s.hairStyle) {
    case 'bun':
      return (
        <G>
          <Circle cx={50} cy={17} r={7} fill={c} />
          <Path d="M34 38 C34 25 42 21 50 21 C58 21 66 25 66 38 C61 31 55 29 50 29 C44 29 38 31 34 38 Z" fill={c} />
          <Path d="M44 24 C48 22 54 22 58 25" stroke={hi} strokeWidth={1.2} fill="none" />
        </G>
      );
    case 'curly':
      return (
        <G fill={c}>
          {[
            [37, 31, 6],
            [44, 25, 6.5],
            [52, 23, 7],
            [60, 26, 6.5],
            [65, 33, 5.5],
            [35, 38, 4.5],
          ].map(([x, y, r], i) => (
            <Circle key={i} cx={x} cy={y} r={r} />
          ))}
        </G>
      );
    case 'buzz':
      return <Path d="M34 37 C34 25 42 21 50 21 C58 21 66 25 66 37 C60 32 55 31 50 31 C45 31 40 32 34 37 Z" fill={c} opacity={0.9} />;
    case 'braids':
      return <Path d="M35 38 C35 27 42 22 50 22 C58 22 65 27 65 38 C60 31 54 30 50 30 C46 30 40 31 35 38 Z" fill={c} />;
    case 'bald_tufts':
      return (
        <G fill={c}>
          <Path d="M33 40 C30 36 31 32 34 30 C34 34 35 37 36 40 Z" />
          <Path d="M67 40 C70 36 69 32 66 30 C66 34 65 37 64 40 Z" />
        </G>
      );
    case 'long_grey':
      return <Path d="M34 40 C34 26 42 21 50 21 C58 21 66 26 66 40 C62 33 57 28 50 28 C46 30 40 33 34 40 Z" fill={c} />;
    case 'bald':
      return <Path d="M40 24 C46 21 54 21 60 24" stroke={shade(s.skin, 0.25)} strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 'bob':
      return <Path d="M33 42 C33 26 42 21 50 21 C58 21 67 26 67 42 L63 36 C60 30 54 28 46 30 C41 32 36 36 33 42 Z" fill={c} />;
    case 'crew':
      return <Path d="M35 35 C35 25 42 21 50 21 C58 21 65 25 65 35 L60 30 L40 30 Z" fill={c} />;
    case 'scarf':
      return (
        <G>
          <Path d="M32 38 C32 24 41 18 50 18 C59 18 68 24 68 38 C62 31 56 29 50 29 C44 29 38 31 32 38 Z" fill={c} />
          <Path d="M36 28 C44 24 56 24 64 28" stroke={shade(c, 0.25)} strokeWidth={1.4} fill="none" strokeDasharray="2 3" />
        </G>
      );
    case 'puffs':
      return (
        <G fill={c}>
          <Circle cx={33} cy={26} r={7} />
          <Circle cx={67} cy={26} r={7} />
          <Path d="M36 36 C36 26 43 22 50 22 C57 22 64 26 64 36 C59 31 55 30 50 30 C45 30 41 31 36 36 Z" />
        </G>
      );
    case 'hood':
      return <Path d="M30 50 C30 30 38 20 50 20 C62 20 70 30 70 50 C66 36 60 30 50 30 C40 30 34 36 30 50 Z" fill={c} />;
    case 'short':
      return <Path d="M34 37 C33 25 42 20 51 21 C60 21 67 26 66 37 C62 30 58 28 52 28 L48 31 C43 30 38 32 34 37 Z" fill={c} />;
    case 'goggles':
      return (
        <G>
          <Path d="M34 37 C34 25 42 21 50 21 C58 21 66 25 66 37 C60 32 55 31 50 31 C45 31 40 32 34 37 Z" fill={c} />
          <Rect x={34} y={25} width={32} height={5} rx={2.5} fill="#1E2228" />
          <Circle cx={43} cy={27.5} r={4.5} fill="#2A3340" stroke="#C9A86A" strokeWidth={1.2} />
          <Circle cx={57} cy={27.5} r={4.5} fill="#2A3340" stroke="#C9A86A" strokeWidth={1.2} />
          <Circle cx={42} cy={26.5} r={1.2} fill="#9CCBFF" opacity={0.7} />
          <Circle cx={56} cy={26.5} r={1.2} fill="#9CCBFF" opacity={0.7} />
        </G>
      );
    case 'cap': {
      // Casquette de cheminot : bandeau, visière vernie, insigne ; touffes blanches dessous.
      const cap = shade(s.garment, -0.25);
      return (
        <G>
          <Path d="M33 42 C30 38 31 33 34 31 C34 35 35 38 36.5 42 Z" fill={c} />
          <Path d="M67 42 C70 38 69 33 66 31 C66 35 65 38 63.5 42 Z" fill={c} />
          <Path d="M31 22 C33 14 67 14 69 22 L66 31 L34 31 Z" fill={cap} />
          <Rect x={34} y={25} width={32} height={6} fill={shade(cap, -0.35)} />
          <Path d="M34 26.5 L66 26.5" stroke="#C9A86A" strokeWidth={0.8} />
          <Path d="M33 31 C40 29.5 60 29.5 67 31 C64 35.5 36 35.5 33 31 Z" fill="#14181F" />
          <Path d="M38 32 C44 31.2 56 31.2 62 32" stroke="#5A6476" strokeWidth={0.7} fill="none" />
          <Ellipse cx={50} cy={21.5} rx={3.2} ry={2.6} fill="#D9B45A" stroke="#8A6B2A" strokeWidth={0.7} />
          <Path d="M36 18 C44 15.5 56 15.5 64 18" stroke={shade(cap, 0.25)} strokeWidth={1} fill="none" />
        </G>
      );
    }
    case 'veil': {
      // Voile noir et guimpe blanche qui encadre le visage.
      const white = '#EEE9E0';
      return (
        <G>
          <Path
            d="M33 30 C33 22 41 19 50 19 C59 19 67 22 67 30 L68 56 C66 68 34 68 32 56 Z M50 29.5 C42.8 29.5 37.6 35 37.6 43 C37.6 51.5 43 56.6 50 56.6 C57 56.6 62.4 51.5 62.4 43 C62.4 35 57.2 29.5 50 29.5 Z"
            fill={white}
            fillRule="evenodd"
          />
          <Path d="M37.8 40 C38.5 33 43 29.6 50 29.6 C57 29.6 61.5 33 62.2 40" stroke="#C9C2B6" strokeWidth={1} fill="none" />
          <Path d="M28 44 C27 26 37 15 50 15 C63 15 73 26 72 44 C70 32 64 25 50 25 C36 25 30 32 28 44 Z" fill={c} />
          <Path d="M34 30 C40 26.5 60 26.5 66 30" stroke={shade(c, 0.3)} strokeWidth={0.8} fill="none" />
        </G>
      );
    }
    case 'slick':
      // Cheveux plaqués en arrière, raie nette, reflet de gomina.
      return (
        <G>
          <Path d="M34.5 40 C33 26 41 20 50 20 C59 20 67 25 65.5 40 C65 33 62.5 29 58 27.5 C52 26 46 26.5 41 28.5 C37.5 30.5 35.5 34 34.5 40 Z" fill={c} />
          <Path d="M41.5 28.6 C43 26.5 45.5 25.4 48 25" stroke={shade(c, -0.4)} strokeWidth={0.9} fill="none" />
          <Path d="M45 25.5 C51 22.5 58 23 63 27 M47 27.5 C53 25 59 25.5 63.5 30" stroke={hi} strokeWidth={0.9} fill="none" opacity={0.9} />
          <Path d="M35.2 39 L35.6 44.5 M64.8 39 L64.4 44.5" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}

function Garment({ s }: { s: Spec }) {
  const c = s.garment;
  const dark = shade(c, -0.3);
  const light = shade(c, 0.15);
  const w = s.broad ? 6 : 0;
  const body = `M${14 - w} 100 C${16 - w} 80 ${28 - w / 2} 70 41 67 L59 67 C${72 + w / 2} 70 ${84 + w} 80 ${86 + w} 100 Z`;
  switch (s.garmentStyle) {
    case 'scrubs':
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M41 67 L50 80 L59 67" fill={s.skin} />
          <Path d="M41 67 L50 80 L59 67" stroke={dark} strokeWidth={1.5} fill="none" />
          <Rect x={62} y={84} width={9} height={7} rx={1} fill={dark} />
        </G>
      );
    case 'hoodie':
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M36 69 C40 78 60 78 64 69" stroke={dark} strokeWidth={3} fill="none" />
          <Path d="M46 77 L45 90 M54 77 L55 90" stroke={light} strokeWidth={1.4} />
        </G>
      );
    case 'workjacket':
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M41 67 L46 100 M59 67 L54 100" stroke={dark} strokeWidth={2} />
          <Path d="M38 66 L44 74 L50 68 L56 74 L62 66" fill={light} />
          <Rect x={24} y={86} width={10} height={7} rx={1} fill={dark} />
        </G>
      );
    case 'jacket':
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M50 70 L50 100" stroke={dark} strokeWidth={1.6} />
          <Path d="M24 74 L60 100" stroke="#5A4630" strokeWidth={4} />
        </G>
      );
    case 'coat':
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M36 66 L44 82 L50 70 L56 82 L64 66" fill={dark} />
          <Circle cx={50} cy={88} r={1.6} fill={light} />
          <Circle cx={50} cy={95} r={1.6} fill={light} />
        </G>
      );
    case 'shawl':
      return (
        <G>
          <Path d={body} fill={shade(c, -0.15)} />
          <Path d="M18 86 C30 70 70 70 82 86 L72 100 L28 100 Z" fill={c} />
          <Path d="M24 88 C36 78 64 78 76 88" stroke={light} strokeWidth={1.2} strokeDasharray="1.5 2.5" fill="none" />
        </G>
      );
    case 'plastron':
      return (
        <G>
          <Path d={body} fill="#2E2925" />
          <Path d="M26 76 L74 76 L78 100 L22 100 Z" fill={c} />
          <Path d="M26 88 L74 88" stroke={dark} strokeWidth={1.4} />
          {[30, 40, 50, 60, 70].map((x) => (
            <Circle key={x} cx={x} cy={80} r={1.3} fill={light} />
          ))}
          {[28, 38, 48, 58, 68].map((x) => (
            <Circle key={x} cx={x + 2} cy={93} r={1.3} fill={light} />
          ))}
        </G>
      );
    case 'labcoat':
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M41 67 L50 84 L59 67" fill="#7C8F98" />
          <Path d="M38 66 L47 100 M62 66 L53 100" stroke={shade(c, -0.18)} strokeWidth={1.6} />
          <Rect x={62} y={84} width={8} height={2} rx={1} fill="#4C7BB8" />
        </G>
      );
    case 'uniform':
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M42 66 L50 76 L58 66" fill={shade(c, 0.25)} />
          <Path d="M24 76 L34 76 M66 76 L76 76" stroke={light} strokeWidth={3} />
          <Path d="M50 76 L50 100" stroke={dark} strokeWidth={1.6} />
        </G>
      );
    case 'shirt':
      return (
        <G>
          <Path d={`M${8} 100 C12 80 26 70 41 67 L59 67 C74 70 88 80 92 100 Z`} fill={c} />
          <Path d="M43 67 C46 72 54 72 57 67" stroke={dark} strokeWidth={1.4} fill="none" />
        </G>
      );
    case 'padded':
      return (
        <G>
          <Path d={body} fill={c} />
          {[76, 84, 92].map((y) => (
            <Path key={y} d={`M${18 - w} ${y + 4} C40 ${y} 60 ${y} ${82 + w} ${y + 4}`} stroke={shade(c, 0.12)} strokeWidth={1.4} fill="none" />
          ))}
          <Path d="M40 66 C44 72 56 72 60 66" stroke={shade(c, -0.35)} strokeWidth={4} fill="none" />
        </G>
      );
    case 'cloak':
      return (
        <G>
          <Path d="M10 100 C14 76 28 66 50 64 C72 66 86 76 90 100 Z" fill={c} />
          <Path d="M50 66 L50 100" stroke={shade(c, -0.3)} strokeWidth={1.2} />
        </G>
      );
    case 'habit':
      // Habit de religieuse : voile retombant sur les épaules, guimpe blanche.
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M22 100 C22 82 26 72 34 66 L38 100 Z M78 100 C78 82 74 72 66 66 L62 100 Z" fill={shade(c, -0.25)} />
          <Path d="M35 63 C33 76 41 82 50 82 C59 82 67 76 65 63 Z" fill="#EEE9E0" />
          <Path d="M37 72 C42 79 58 79 63 72" stroke="#C9C2B6" strokeWidth={0.9} fill="none" />
        </G>
      );
    case 'suit':
      // Costume trois-pièces soigné, chemise blanche, cravate, pochette.
      return (
        <G>
          <Path d={body} fill={c} />
          <Path d="M42 66 L50 84 L58 66" fill="#F2EFE8" />
          <Path d="M48.6 68 L51.4 68 L52.6 80 L50 84.5 L47.4 80 Z" fill="#7A2430" />
          <Path d="M48.4 66.5 L51.6 66.5 L51.4 69 L48.6 69 Z" fill="#5E1A24" />
          <Path d="M37 65 L46 88 L44 76 L41 74 Z M63 65 L54 88 L56 76 L59 74 Z" fill={dark} />
          <Path d="M37 65 L46 88 M63 65 L54 88" stroke={light} strokeWidth={0.8} />
          <Path d="M64 84 L71 84 L69.5 81 L67.5 82.5 L66 80.5 Z" fill="#F2EFE8" />
          <Circle cx={48} cy={94} r={1.2} fill={light} />
        </G>
      );
    default:
      return <Path d={body} fill={c} />;
  }
}

function Extras({ s }: { s: Spec }) {
  const ex = new Set(s.extras ?? []);
  const line = shade(s.skin, -0.45);
  return (
    <G>
      {ex.has('beard') && <Path d="M38 50 C39 62 44 66 50 66 C56 66 61 62 62 50 C58 56 54 57 50 57 C46 57 42 56 38 50 Z" fill={shade(s.hair, s.hairStyle === 'bald' ? 0 : -0.1)} />}
      {ex.has('warpaint') && <Path d="M38 44 L46 46 M54 46 L62 44" stroke="#1C1A18" strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />}
      {ex.has('scar') && <Path d="M58 34 L62 46" stroke={shade(s.skin, -0.3)} strokeWidth={1.3} strokeLinecap="round" />}
      {ex.has('glasses') && (
        <G stroke="#1C1A18" strokeWidth={1.3} fill="rgba(200,230,255,0.18)">
          <Circle cx={44} cy={42} r={4.6} />
          <Circle cx={56} cy={42} r={4.6} />
          <Path d="M48.6 42 L51.4 42" />
        </G>
      )}
      {ex.has('headlamp') && (
        <G>
          <Path d="M34 32 C40 28 60 28 66 32" stroke="#2A2A2A" strokeWidth={3} fill="none" />
          <Rect x={46} y={26} width={8} height={6} rx={2} fill="#3A3A3A" />
          <Circle cx={50} cy={29} r={2} fill="#FFE7A8" />
        </G>
      )}
      {ex.has('stethoscope') && <Path d="M40 68 C38 82 46 88 52 86 C58 84 60 78 60 68" stroke="#2A2F33" strokeWidth={1.6} fill="none" />}
      {ex.has('medal') && (
        <G>
          <Path d="M44 68 L50 82 L56 68" stroke="#5A4630" strokeWidth={1.2} fill="none" />
          <Circle cx={50} cy={84} r={3.4} fill="#D9B45A" stroke="#8A6B2A" strokeWidth={0.8} />
        </G>
      )}
      {ex.has('pipe') && <Path d="M54 55 L64 58 L64 54 C64 52 69 52 69 54 L69 60 L63 61 Z" fill="#3A261A" />}
      {ex.has('key') && (
        <G>
          <Path d="M44 68 L50 80 L56 68" stroke="#2A2420" strokeWidth={0.9} fill="none" />
          <Circle cx={50} cy={82} r={2.2} stroke="#C9A86A" strokeWidth={1.2} fill="none" />
          <Path d="M50 84 L50 89 M50 87 L52 87" stroke="#C9A86A" strokeWidth={1.2} />
        </G>
      )}
      {ex.has('collar') && (
        <G>
          <Rect x={26} y={74} width={6} height={2} fill="#D9B45A" />
          <Rect x={68} y={74} width={6} height={2} fill="#D9B45A" />
        </G>
      )}
      {ex.has('mask') && <Path d="M36 50 C40 46 60 46 64 50 L62 62 C56 66 44 66 38 62 Z" fill={shade(s.garment, 0.1)} />}
      {ex.has('headset') && (
        <G>
          <Path d="M33 44 C32 30 40 22 50 22 C60 22 68 30 67 44" stroke="#1E2228" strokeWidth={2} fill="none" />
          <Rect x={30} y={40} width={6} height={9} rx={2} fill="#1E2228" />
          <Path d="M33 49 C34 56 40 58 44 58" stroke="#1E2228" strokeWidth={1.2} fill="none" />
        </G>
      )}
      {ex.has('tired') && (
        <Path
          d="M41.8 45.6 C43.2 46.6 45 46.6 46.4 45.8 M53.6 45.8 C55 46.6 56.8 46.6 58.2 45.6"
          stroke={shade(s.skin, -0.3)}
          strokeWidth={0.9}
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
        />
      )}
      {ex.has('smile') && (
        <G>
          <Path d="M44.5 51.8 C47 55.4 53 55.4 55.5 51.8" stroke={shade(s.skin, -0.45)} strokeWidth={1.3} strokeLinecap="round" fill="none" />
          <Path
            d="M43.6 50.6 C43.2 51.6 43.6 52.6 44.4 53 M56.4 50.6 C56.8 51.6 56.4 52.6 55.6 53"
            stroke={shade(s.skin, -0.3)}
            strokeWidth={0.8}
            strokeLinecap="round"
            fill="none"
          />
          <Ellipse cx={41} cy={48} rx={3} ry={1.8} fill="#E07A6A" opacity={0.25} />
          <Ellipse cx={59} cy={48} rx={3} ry={1.8} fill="#E07A6A" opacity={0.25} />
        </G>
      )}
      {ex.has('moustache') && (
        <Path
          d="M50 49.6 C47 48 43 48.4 41 51.4 C40 53 40.4 55 41.2 55.8 C42 53.6 44.6 52.4 47 52.6 C48.4 52.7 49.4 52.4 50 51.8 C50.6 52.4 51.6 52.7 53 52.6 C55.4 52.4 58 53.6 58.8 55.8 C59.6 55 60 53 59 51.4 C57 48.4 53 48 50 49.6 Z"
          fill={s.hair}
          stroke={shade(s.hair, -0.2)}
          strokeWidth={0.5}
        />
      )}
      {ex.has('scarf') && (
        // Écharpe de laine nouée, un pan qui tombe sur le manteau.
        <G>
          <Path d="M54 70 L60 70 L63 96 L56 97 Z" fill="#A9813E" />
          <Path d="M56 97 L63 96 M56.8 94 L62.6 93.2" stroke="#7E5E2A" strokeWidth={1} />
          <Path d="M36 64 C38 60 62 60 64 64 L63 71 C56 74 44 74 37 71 Z" fill="#C49A4A" />
          <Path d="M38 67 C45 69.5 55 69.5 62 67" stroke="#A9813E" strokeWidth={1} fill="none" />
          <Path d="M52 68 C55 66 59 67 60 70 C58 73 54 73 52 71 Z" fill="#B48A42" />
        </G>
      )}
      {ex.has('cross') && (
        <G>
          <Path d="M44 66 L50 79 L56 66" stroke="#1A1716" strokeWidth={0.9} fill="none" />
          <Path
            d="M48.7 78 L51.3 78 L51.3 81.5 L54.5 81.5 L54.5 84 L51.3 84 L51.3 91 L48.7 91 L48.7 84 L45.5 84 L45.5 81.5 L48.7 81.5 Z"
            fill="#B8B2A6"
            stroke="#4A4540"
            strokeWidth={0.6}
          />
        </G>
      )}
      {ex.has('sash') && (
        // Écharpe tricolore de maire, en bandoulière, glands dorés.
        <G transform="rotate(34 50 86)">
          <Rect x={22} y={78} width={66} height={3.2} fill="#2B4C9A" />
          <Rect x={22} y={81.2} width={66} height={3.2} fill="#F2F0EA" />
          <Rect x={22} y={84.4} width={66} height={3.2} fill="#C8323A" />
          <Path d="M22 87.6 L88 87.6" stroke="#8A6B2A" strokeWidth={0.6} />
        </G>
      )}
      {ex.has('lantern') && (
        // Lanterne de signalisation ferroviaire, verre rouge.
        <G>
          <Circle cx={20} cy={88} r={11} fill="#FF5A3C" opacity={0.18} />
          <Path d="M15 77 C15 71 25 71 25 77" stroke="#1E2228" strokeWidth={1.4} fill="none" />
          <Path d="M13.5 79 L26.5 79 L25 77 L15 77 Z" fill="#2A2F36" />
          <Rect x={14} y={79} width={12} height={15} rx={1.5} fill="#2A2F36" />
          <Rect x={15.8} y={81} width={8.4} height={10} rx={1} fill="#D8402E" />
          <Circle cx={20} cy={86} r={2.6} fill="#FFB27A" opacity={0.9} />
          <Path d="M15.8 86 L24.2 86 M20 81 L20 91" stroke="#2A2F36" strokeWidth={0.8} />
          <Rect x={13} y={94} width={14} height={2.5} rx={1} fill="#1E2228" />
        </G>
      )}
      {ex.has('bandage') && <Rect x={55} y={33} width={9} height={4} rx={1} fill="#F0EBE2" transform="rotate(-18 59 35)" />}
      {/* Rides discrètes pour les plus âgés */}
      {(s.hairStyle === 'bald_tufts' || s.hairStyle === 'scarf' || s.hairStyle === 'long_grey' || s.hairStyle === 'cap' || s.hairStyle === 'veil') && (
        <Path d="M41 49 C43 50 44 50 45 49 M55 49 C56 50 57 50 59 49" stroke={line} strokeWidth={0.7} fill="none" opacity={0.6} />
      )}
    </G>
  );
}

export function Portrait({ id, size = 48, ring, shape = 'circle' }: { id: string; size?: number; ring?: string; shape?: 'circle' | 'squircle' | 'tall' }) {
  const s = PORTRAITS[id] ?? PORTRAITS.guerrier;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const w = size;
  const h = shape === 'tall' ? size * 1.25 : size;
  const eye = shade(s.skin, -0.7);
  const faceRy = s.young ? 15 : 16.5;
  const clip =
    shape === 'circle' ? (
      <Circle cx={50} cy={50} r={50} />
    ) : (
      <Rect x={0} y={0} width={100} height={shape === 'tall' ? 125 : 100} rx={shape === 'tall' ? 22 : 28} />
    );
  const vbH = shape === 'tall' ? 125 : 100;
  return (
    <Svg width={w} height={h} viewBox={`0 ${shape === 'tall' ? -12 : 0} 100 ${vbH}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <ClipPath id={`c${uid}`}>{clip}</ClipPath>
        <LinearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shade(s.bg, 0.12)} />
          <Stop offset="1" stopColor={shade(s.bg, -0.62)} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor={shade(s.skin, 0.12)} />
          <Stop offset="1" stopColor={shade(s.skin, -0.18)} />
        </RadialGradient>
        <LinearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity={0} />
          <Stop offset="0.75" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor={s.bg} stopOpacity={0.55} />
        </LinearGradient>
      </Defs>
      <G clipPath={`url(#c${uid})`}>
        <Rect x={0} y={shape === 'tall' ? -12 : 0} width={100} height={vbH} fill={`url(#bg${uid})`} />
        <Circle cx={74} cy={18} r={26} fill={shade(s.bg, 0.3)} opacity={0.25} />
        <HairBack s={s} />
        {/* Cou */}
        <Path d="M44 54 L44 68 C47 71 53 71 56 68 L56 54 Z" fill={shade(s.skin, -0.22)} />
        <Garment s={s} />
        {/* Tête */}
        <Ellipse cx={50} cy={42} rx={s.young ? 14 : 15} ry={faceRy} fill={`url(#face${uid})`} />
        <Ellipse cx={35.5} cy={44} rx={2.4} ry={3.6} fill={shade(s.skin, -0.12)} />
        <Ellipse cx={64.5} cy={44} rx={2.4} ry={3.6} fill={shade(s.skin, -0.12)} />
        {/* Traits : regard bas, sobre */}
        <Path d="M41.5 42.5 C43 41.6 45 41.6 46.5 42.5" stroke={eye} strokeWidth={1.5} strokeLinecap="round" fill="none" />
        <Path d="M53.5 42.5 C55 41.6 57 41.6 58.5 42.5" stroke={eye} strokeWidth={1.5} strokeLinecap="round" fill="none" />
        <Path d="M41 38.5 L46.5 37.8 M53.5 37.8 L59 38.5" stroke={shade(s.hair, -0.1)} strokeWidth={1.3} strokeLinecap="round" opacity={0.8} />
        <Path d="M50 44 L48.6 49 L50.6 49.4" stroke={shade(s.skin, -0.3)} strokeWidth={1} strokeLinecap="round" fill="none" />
        {!s.extras?.includes('smile') && <Path d="M46.5 53 C48.5 54 51.5 54 53.5 53" stroke={shade(s.skin, -0.42)} strokeWidth={1.2} strokeLinecap="round" fill="none" />}
        <HairFront s={s} />
        <Extras s={s} />
        <Rect x={0} y={shape === 'tall' ? -12 : 0} width={100} height={vbH} fill={`url(#rim${uid})`} />
      </G>
      {ring && (shape === 'circle' ? <Circle cx={50} cy={50} r={48.5} stroke={ring} strokeWidth={3} fill="none" /> : null)}
    </Svg>
  );
}

/** Profils de relève : le compagnon joué garde son propre visage. */
const HERO_FACES: Record<string, string> = { eclusier: 'kaz', infirmiere: 'maelle', passeuse: 'ines', cartographe: 'theo', compteuse: 'nour' };

/** Portrait du protagoniste, d'après son profil. */
export function PlayerPortrait({ profile, size = 48, ring, shape }: { profile: string; size?: number; ring?: string; shape?: 'circle' | 'squircle' | 'tall' }) {
  const id = HERO_FACES[profile] ?? profile;
  return <Portrait id={PORTRAITS[id] ? id : 'guerrier'} size={size} ring={ring} shape={shape} />;
}
