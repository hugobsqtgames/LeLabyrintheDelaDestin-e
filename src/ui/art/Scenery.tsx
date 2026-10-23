/**
 * Vignettes de lieux : un bandeau panoramique par lieu, construit à partir
 * d'un décor de région et d'un motif propre au lieu.
 */
import React, { useId } from 'react';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

const ink = colors.bgDeep;

function Motif({ id }: { id: string }) {
  switch (id) {
    case 'pharmacie':
      return (
        <G>
          <Rect x={150} y={40} width={100} height={60} fill={ink} />
          <Path d="M195 22 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 v-10 h10 z" fill={colors.moss} />
          <Path d="M160 70 h80" stroke={colors.lineStrong} strokeWidth={2} />
          <Path d="M160 78 h80 M160 86 h80" stroke={colors.line} strokeWidth={2} />
        </G>
      );
    case 'hopital':
      return (
        <G>
          <Rect x={110} y={20} width={180} height={80} fill={ink} />
          {Array.from({ length: 6 }).map((_, i) => (
            <Rect key={i} x={122 + i * 28} y={34} width={14} height={18} fill={i === 2 ? colors.ice : colors.panel} opacity={i === 2 ? 0.5 : 1} />
          ))}
          <Path d="M190 64 h20 v36 h-20 z" fill={colors.panelRaised} />
        </G>
      );
    case 'clocher':
      return (
        <G>
          <Path d="M188 100 V40 L200 14 L212 40 V100 Z" fill={ink} />
          <Circle cx={200} cy={52} r={6} fill={colors.amber} opacity={0.7} />
        </G>
      );
    case 'supermarche':
      return (
        <G>
          <Rect x={110} y={52} width={180} height={48} fill={ink} />
          <Rect x={110} y={44} width={180} height={10} fill={colors.rustDeep} />
          <Path d="M150 62 l20 38 M230 60 l-14 40" stroke={colors.panelRaised} strokeWidth={3} />
        </G>
      );
    case 'clinique_veto':
      return (
        <G>
          <Rect x={150} y={48} width={100} height={52} fill={ink} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Line key={i} x1={160} y1={58 + i * 5} x2={240} y2={58 + i * 5} stroke={colors.lineStrong} />
          ))}
        </G>
      );
    case 'ossuaire':
      return (
        <G>
          {Array.from({ length: 30 }).map((_, i) => (
            <Circle key={i} cx={30 + (i % 15) * 24} cy={62 + Math.floor(i / 15) * 18} r={7} fill={colors.paperDim} opacity={0.35} />
          ))}
          <Circle cx={200} cy={40} r={4} fill={colors.amber} />
          <Path d="M200 44 v20" stroke={colors.amber} strokeWidth={1} />
        </G>
      );
    case 'grande_salle':
      return (
        <G>
          {[60, 130, 270, 340].map((x) => (
            <Rect key={x} x={x} y={10} width={16} height={90} fill={ink} />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <Path key={i} d={`M${150 + i * 12} 100 v-16 a4 4 0 0 1 8 0 v16`} fill={ink} />
          ))}
        </G>
      );
    case 'puits_noye':
      return (
        <G>
          <Rect x={0} y={74} width={400} height={26} fill="#0F1C1E" />
          <Path d="M40 80 q20 -4 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke={colors.ice} strokeWidth={1} fill="none" opacity={0.5} />
        </G>
      );
    case 'casse':
      return (
        <G>
          <Path d="M90 100 l20 -30 h50 l10 -16 h40 l14 20 h40 l20 26 Z" fill={ink} />
          <Path d="M260 40 L300 100" stroke={colors.rust} strokeWidth={4} />
        </G>
      );
    case 'capitainerie':
    case 'quai':
      return (
        <G>
          <Path d="M260 100 V20 h6 v80 M266 24 L320 40" stroke={ink} strokeWidth={6} fill="none" />
          <Rect x={0} y={84} width={400} height={16} fill="#121B20" />
        </G>
      );
    case 'pont_fer':
      return (
        <G>
          <Path d="M0 70 Q200 10 400 70" stroke={ink} strokeWidth={6} fill="none" />
          {Array.from({ length: 11 }).map((_, i) => (
            <Line key={i} x1={i * 40} y1={70} x2={i * 40 + 20} y2={70 - Math.sin((i / 10) * Math.PI) * 52} stroke={ink} strokeWidth={3} />
          ))}
          <Rect x={0} y={70} width={400} height={6} fill={ink} />
        </G>
      );
    case 'ecluse':
    case 'destinee':
      return (
        <G>
          <Rect x={0} y={82} width={400} height={18} fill="#1A2224" />
          <Path d="M120 82 h170 l-12 -24 h-140 z" fill={colors.paperDim} opacity={0.85} />
          <Rect x={230} y={40} width={12} height={18} fill={colors.paperDim} />
          <Path d="M236 44 v10 M231 49 h10" stroke={colors.rust} strokeWidth={2.5} />
          <Rect x={60} y={40} width={14} height={60} fill={ink} />
          <Rect x={330} y={40} width={14} height={60} fill={ink} />
        </G>
      );
    case 'halage':
      return (
        <G>
          {Array.from({ length: 9 }).map((_, i) => (
            <Path key={i} d={`M${20 + i * 46} 100 v-40 q-8 -16 0 -40 q8 24 0 40`} fill={ink} />
          ))}
        </G>
      );
    case 'cimetiere':
      return (
        <G>
          <Path d="M0 100 v-6 h400 v6 Z" fill={ink} />
          {[30, 92, 150, 236, 300, 356].map((x, i) => (
            <Path key={x} d={i % 2 ? `M${x} 96 v-22 q10 -12 20 0 v22 Z` : `M${x + 8} 96 v-30 h4 v8 h8 v4 h-8 v18 Z`} fill={ink} />
          ))}
          <Path d="M186 96 v-46 l14 -14 l14 14 v46 Z M198 30 v-10 h4 v10 Z" fill={ink} />
        </G>
      );
    case 'triage':
    case 'voie_fleuve':
      return (
        <G>
          <Path d="M0 96 h400 v4 H0 Z M0 90 h400 v2 H0 Z" fill={ink} />
          {Array.from({ length: 14 }).map((_, i) => (
            <Path key={i} d={`M${i * 30 + 4} 100 l6 -10 h4 l-6 10 Z`} fill={ink} />
          ))}
          <Path d="M40 88 v-26 h90 v26 Z M140 88 v-26 h90 v26 Z M300 88 v-60 h6 v60 Z M290 36 h26 v6 h-26 Z" fill={ink} />
        </G>
      );
    case 'remblai':
      return <Path d="M0 100 L0 80 Q100 60 200 64 T400 74 V100 Z M260 66 h60 v-14 h-60 Z M330 64 v-40 h4 v40 Z M322 28 h40 v3 h-40 Z" fill={ink} />;
    case 'vergers':
      return (
        <G>
          <Path d="M0 100 v-8 h400 v8 Z" fill={ink} />
          {[40, 110, 180, 250, 320].map((x) => (
            <Path key={x} d={`M${x} 92 v-18 M${x - 18} 74 q18 -34 36 0 q-18 8 -36 0 Z`} stroke={ink} strokeWidth={4} fill={ink} />
          ))}
          <Path d="M220 92 v-22 l20 -12 l20 12 v22 Z" fill={ink} />
        </G>
      );
    case 'rocade':
      return <Path d="M0 100 V70 H400 V100 Z M0 66 H400 V70 H0 Z M40 70 v30 h12 v-30 Z M170 70 v30 h12 v-30 Z M300 70 v30 h12 v-30 Z M80 66 v-10 h50 v10 Z M220 66 v-14 h30 v14 Z M330 66 v-6 h40 v6 Z" fill={ink} />;
    case 'prieure':
      return <Path d="M0 100 V88 Q120 70 200 72 T400 86 V100 Z M150 74 V44 L180 24 L210 44 V74 Z M176 24 V8 h8 v16 Z M210 74 V54 H290 V74 Z M120 74 V58 H150 V74 Z" fill={ink} />;
    case 'barrage':
      return <Path d="M0 100 V84 H400 V100 Z M60 84 L90 30 H310 L340 84 Z M110 40 v40 M150 40 v40 M190 40 v40 M230 40 v40 M270 40 v40 M180 30 v-14 h40 v14 Z" fill={ink} stroke={ink} strokeWidth={2} />;
    case 'convoi':
      return <Path d="M0 100 V92 H400 V100 Z M30 92 v-26 h80 v-12 h30 v38 Z M160 92 l10 -30 h90 l20 30 Z M300 92 v-22 h70 v22 Z M60 96 a8 8 0 1 0 0.1 0 Z M330 96 a8 8 0 1 0 0.1 0 Z" fill={ink} />;
    case 'tourbieres':
      return (
        <G>
          <Path d="M0 100 V92 Q60 86 120 92 T240 90 T400 92 V100 Z" fill={ink} />
          {[20, 70, 140, 200, 280, 340, 380].map((x, i) => (
            <Path key={x} d={`M${x} 92 v-${18 + (i % 3) * 8} M${x - 4} 92 v-${10 + (i % 2) * 6} M${x + 4} 92 v-${12 + (i % 3) * 4}`} stroke={ink} strokeWidth={2} />
          ))}
          <Path d="M240 90 v-20 h26 v20 Z" fill={ink} />
        </G>
      );
    case 'brennes':
      return <Path d="M0 100 V80 H40 V64 H70 V80 H110 V58 L130 44 L150 58 V80 H200 V40 H210 V30 H220 V40 H230 V80 H290 V66 H330 V80 H400 V100 Z M0 80 h400 v4 h-400 Z" fill={ink} />;
    case 'gue':
      return <Path d="M0 100 V86 Q80 80 160 88 T400 84 V100 Z M60 84 l6 -40 l6 40 Z M300 84 l5 -32 l5 32 Z M180 84 v-14 h54 v-8 h20 v22 Z" fill={ink} />;
    case 'bivouac':
      return <Path d="M0 100 V90 H400 V100 Z M150 90 V58 L180 38 L210 58 V90 Z M176 38 V24 h8 v14 Z M250 90 l14 -20 l14 20 Z" fill={ink} />;
    default:
      return (
        <G>
          <Path d="M0 100 h40 v-30 h30 v20 h40 v-40 h20 v40 h50 v-24 h40 v34 h50 v-50 h30 v50 h100 v20 H0 Z" fill={ink} />
        </G>
      );
  }
}

const REGION_ORDER_SKY: [string, string][] = [
  ['#3B4A47', '#121816'],
  ['#2A2620', '#0B0A08'],
  ['#4A4038', '#14110E'],
  ['#3E4B52', '#11171A'],
  ['#4C5546', '#121510'],
  ['#5A5547', '#15140F'],
];

/**
 * Bandeau de lieu. `regionIndex` : rang de la région dans le voyage (0 à 5),
 * indépendant de la langue. Si le cadre est plus haut que le bandeau
 * d'origine (4:1), le ciel (ou la voûte) s'étend vers le haut.
 */
function SceneryBannerDrawing({ location, regionIndex, height = 120, width = 400 }: { location: string; regionIndex: number; height?: number; width?: number }) {
  const [top, bottom] = REGION_ORDER_SKY[regionIndex] ?? REGION_ORDER_SKY[0];
  const underground = regionIndex === 1;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const extra = Math.max(0, (400 * height) / Math.max(1, width) - 100);
  const y0 = -extra;
  const stars = Array.from({ length: 26 }, (_, i) => ({ x: (i * 97) % 400, y: y0 + ((i * 53) % Math.max(1, extra + 30)), r: i % 5 === 0 ? 1.1 : 0.6 }));
  return (
    <Svg width="100%" height={height} viewBox={`0 ${y0} 400 ${100 + extra}`} preserveAspectRatio="xMidYMax slice">
      <Defs>
        <LinearGradient id={`bannerSky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={underground ? '#050403' : '#07090B'} />
          <Stop offset="0.6" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={y0} width={400} height={100 + extra} fill={`url(#bannerSky${uid})`} />
      {!underground && stars.map((st, i) => <Circle key={i} cx={st.x} cy={st.y} r={st.r} fill={colors.paper} opacity={0.35} />)}
      {underground ? (
        <Path d={`M0 ${y0} h400 v${extra + 18} q-40 14 -80 6 t-90 8 t-110 -4 t-120 10 Z`} fill={ink} />
      ) : (
        <Path d="M0 100 h30 v-24 h20 v10 h24 v-30 h14 v30 h26 v-12 h30 v26 h330 Z" fill={ink} opacity={0.6} />
      )}
      <Motif id={location} />
      {!underground && <Circle cx={330} cy={y0 + Math.max(14, extra * 0.35)} r={12} fill={colors.paper} opacity={0.18} />}
    </Svg>
  );
}

/** Dessin SVG coûteux : redessiné seulement si ses propriétés changent. */
export const SceneryBanner = React.memo(SceneryBannerDrawing);
