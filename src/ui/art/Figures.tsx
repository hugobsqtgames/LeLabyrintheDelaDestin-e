/**
 * Silhouettes stylisées : profils jouables et ennemis.
 * Composition commune : un cadre d'affiche usé, un fond en dégradé froid,
 * une silhouette en aplat sombre éclairée par une ligne de contour.
 */
import React, { useId } from 'react';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

function Frame({ children, accent, w, h }: { children: React.ReactNode; accent: string; w: number; h: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={w} height={h} viewBox="0 0 120 150">
      <Defs>
        <LinearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity={0.55} />
          <Stop offset="0.7" stopColor={colors.panel} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.bgDeep} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={120} height={150} rx={6} fill={`url(#sky${uid})`} />
      {/* Ville en ruine à l'horizon */}
      <Path d="M0 112 h10 v-14 h8 v8 h10 v-22 h6 v22 h12 v-10 h10 v16 h14 v-26 h4 v-6 h4 v32 h12 v-12 h10 v18 h20 v40 H0 Z" fill={colors.bgDeep} opacity={0.75} />
      {children}
      <Rect x={1} y={1} width={118} height={148} rx={6} fill="none" stroke={colors.lineStrong} strokeWidth={2} />
    </Svg>
  );
}

const ink = colors.bgDeep;

const PROFILE_ART: Record<string, { accent: string; body: React.ReactNode }> = {
  guerrier: {
    accent: colors.rust,
    body: (
      <G>
        <Path d="M44 150 L48 100 Q42 92 46 76 Q52 64 60 64 Q68 64 74 76 Q78 92 72 100 L76 150 Z" fill={ink} stroke={colors.rustBright} strokeWidth={1.2} />
        <Circle cx={60} cy={54} r={11} fill={ink} stroke={colors.rustBright} strokeWidth={1.2} />
        {/* Hachette sur l'épaule */}
        <Line x1={74} y1={88} x2={92} y2={44} stroke={colors.paperDim} strokeWidth={3} strokeLinecap="round" />
        <Path d="M88 40 Q100 38 100 52 L90 50 Z" fill={colors.rustBright} />
      </G>
    ),
  },
  eclaireur: {
    accent: colors.moss,
    body: (
      <G>
        {/* Accroupi sur un rebord, capuche */}
        <Path d="M30 150 L34 118 Q40 108 52 106 L50 92 Q48 76 60 70 Q74 72 74 88 L72 104 Q86 108 90 122 L94 150 Z" fill={ink} stroke={colors.mossBright} strokeWidth={1.2} />
        <Path d="M50 70 Q60 52 74 66 Q70 60 62 60 Q54 60 50 70 Z" fill={ink} stroke={colors.mossBright} strokeWidth={1.2} />
        <Path d="M78 112 L104 104" stroke={colors.paperDim} strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M100 98 L104 104 L98 108" stroke={colors.paperDim} strokeWidth={2} fill="none" />
      </G>
    ),
  },
  technicien: {
    accent: colors.amber,
    body: (
      <G>
        <Path d="M42 150 L46 104 Q44 84 54 76 L66 76 Q76 84 74 104 L78 150 Z" fill={ink} stroke={colors.amber} strokeWidth={1.2} />
        <Circle cx={60} cy={62} r={11} fill={ink} stroke={colors.amber} strokeWidth={1.2} />
        {/* Lunettes de soudeur */}
        <Rect x={50} y={52} width={20} height={6} rx={3} fill={colors.amber} opacity={0.8} />
        {/* Câbles et clé */}
        <Path d="M74 100 Q92 96 90 120 Q88 134 100 136" stroke={colors.ice} strokeWidth={2} fill="none" />
        <Path d="M34 96 L22 120" stroke={colors.paperDim} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={21} cy={122} r={4} fill="none" stroke={colors.paperDim} strokeWidth={2} />
      </G>
    ),
  },
};

export function ProfileArt({ id, width = 120 }: { id: string; width?: number }) {
  const art = PROFILE_ART[id] ?? PROFILE_ART.guerrier;
  return (
    <Frame accent={art.accent} w={width} h={width * 1.25}>
      {art.body}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Ennemis
// ---------------------------------------------------------------------------

function Shambler({ stroke, hunch = 0, arms = 'down', scale = 1 }: { stroke: string; hunch?: number; arms?: 'down' | 'up' | 'wide'; scale?: number }) {
  const armPath =
    arms === 'up'
      ? 'M48 88 L34 56 M72 88 L86 54'
      : arms === 'wide'
        ? 'M48 90 L22 100 M72 90 L98 98'
        : 'M48 88 L40 122 M72 88 L82 124';
  return (
    <G transform={`translate(60 150) scale(${scale}) translate(-60 -150)`}>
      <Path d={armPath} stroke={ink} strokeWidth={7} strokeLinecap="round" />
      <Path d={armPath} stroke={stroke} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
      <Path d={`M46 150 L50 112 Q44 ${96 - hunch} 52 ${82 - hunch} L68 ${82 - hunch} Q76 ${96 - hunch} 70 112 L74 150 Z`} fill={ink} stroke={stroke} strokeWidth={1.2} />
      <Circle cx={60 + hunch / 2} cy={70 - hunch} r={10} fill={ink} stroke={stroke} strokeWidth={1.2} />
      <Circle cx={57 + hunch / 2} cy={69 - hunch} r={1.6} fill={colors.paper} />
      <Circle cx={63 + hunch / 2} cy={69 - hunch} r={1.6} fill={colors.paper} />
    </G>
  );
}

const ENEMY_ART: Record<string, { accent: string; body: React.ReactNode }> = {
  rodeur: { accent: colors.steel, body: <Shambler stroke={colors.ice} hunch={4} /> },
  coureur: { accent: colors.ice, body: <Shambler stroke={colors.paper} hunch={10} arms="wide" /> },
  gonfle: {
    accent: colors.moss,
    body: (
      <G>
        <Path d="M36 150 Q24 112 40 92 Q60 76 80 92 Q96 112 84 150 Z" fill={ink} stroke={colors.mossBright} strokeWidth={1.2} />
        <Circle cx={60} cy={74} r={9} fill={ink} stroke={colors.mossBright} strokeWidth={1.2} />
        <Circle cx={50} cy={112} r={5} fill={colors.mossDeep} />
        <Circle cx={70} cy={124} r={4} fill={colors.mossDeep} />
      </G>
    ),
  },
  hurleur: {
    accent: colors.blood,
    body: (
      <G>
        <Shambler stroke={colors.rustBright} hunch={-4} arms="up" />
        <Path d="M56 80 Q60 92 64 80" fill={colors.blood} />
        <Path d="M30 50 q-8 -6 -2 -14 M90 50 q8 -6 2 -14 M24 66 q-8 -4 -6 -12" stroke={colors.rustBright} strokeWidth={1.5} fill="none" />
      </G>
    ),
  },
  pillard: {
    accent: colors.rust,
    body: (
      <G>
        <Path d="M44 150 L48 104 Q44 86 52 78 L68 78 Q76 86 72 104 L76 150 Z" fill={ink} stroke={colors.rustBright} strokeWidth={1.2} />
        <Circle cx={60} cy={64} r={10} fill={ink} stroke={colors.rustBright} strokeWidth={1.2} />
        <Path d="M52 62 h16" stroke={colors.rustBright} strokeWidth={3} />
        <Path d="M72 96 L102 82" stroke={colors.paperDim} strokeWidth={4} strokeLinecap="round" />
      </G>
    ),
  },
  chien: {
    accent: colors.rust,
    body: (
      <G>
        <Path d="M20 128 Q30 106 60 108 Q80 108 88 96 L100 92 L104 104 Q98 112 92 114 L94 140 L86 140 L84 122 Q60 126 40 124 L38 140 L30 140 Z" fill={ink} stroke={colors.rustBright} strokeWidth={1.2} />
        <Circle cx={96} cy={99} r={1.6} fill={colors.paper} />
      </G>
    ),
  },
  soldat: {
    accent: colors.ice,
    body: (
      <G>
        <Path d="M44 150 L48 104 Q44 86 52 78 L68 78 Q76 86 72 104 L76 150 Z" fill={ink} stroke={colors.ice} strokeWidth={1.2} />
        <Path d="M49 66 Q60 48 71 66 L71 72 L49 72 Z" fill={ink} stroke={colors.ice} strokeWidth={1.2} />
        <Rect x={52} y={64} width={16} height={6} rx={2} fill={colors.ice} opacity={0.7} />
        <Path d="M40 98 L82 92" stroke={colors.paperDim} strokeWidth={4} strokeLinecap="round" />
      </G>
    ),
  },
  berger: {
    accent: colors.amber,
    body: (
      <G>
        <Shambler stroke={colors.amber} hunch={6} arms="wide" scale={1.15} />
        <Path d="M58 98 L54 110 L66 110 L62 98 Z" fill={colors.amber} />
        <Path d="M40 92 q20 12 40 0" stroke={colors.paperDim} strokeWidth={1.5} fill="none" />
      </G>
    ),
  },
  gaspard: {
    accent: colors.rust,
    body: (
      <G>
        <Path d="M38 150 L42 104 Q36 84 50 74 L70 74 Q84 84 78 104 L82 150 Z" fill={ink} stroke={colors.rustBright} strokeWidth={1.2} />
        <Path d="M46 84 h28 v24 h-28 z M46 96 h28" stroke={colors.steel} strokeWidth={1.5} fill="none" />
        <Circle cx={60} cy={60} r={11} fill={ink} stroke={colors.rustBright} strokeWidth={1.2} />
        <Path d="M84 110 L98 54" stroke={colors.paperDim} strokeWidth={4} strokeLinecap="round" />
        <Rect x={90} y={40} width={18} height={14} rx={2} fill={colors.steel} />
      </G>
    ),
  },
  rousset: {
    accent: colors.ice,
    body: (
      <G>
        <Path d="M44 150 L48 104 Q44 86 52 78 L68 78 Q76 86 72 104 L76 150 Z" fill={ink} stroke={colors.ice} strokeWidth={1.2} />
        <Circle cx={60} cy={64} r={10} fill={ink} stroke={colors.ice} strokeWidth={1.2} />
        <Path d="M22 82 h26 v52 q-13 8 -26 0 z" fill={colors.panelRaised} stroke={colors.ice} strokeWidth={1.5} opacity={0.9} />
        <Path d="M76 96 L94 84" stroke={colors.amber} strokeWidth={3} strokeLinecap="round" />
      </G>
    ),
  },
  colosse: {
    accent: colors.blood,
    body: (
      <G>
        <Shambler stroke={colors.rustBright} hunch={2} arms="wide" scale={1.25} />
        <Path d="M44 46 Q60 28 76 46 L76 54 L44 54 Z" fill={colors.panelRaised} stroke={colors.steel} strokeWidth={1.5} />
      </G>
    ),
  },
};

export function EnemyArt({ id, width = 96 }: { id: string; width?: number }) {
  const art = ENEMY_ART[id] ?? ENEMY_ART.rodeur;
  return (
    <Frame accent={art.accent} w={width} h={width * 1.25}>
      {art.body}
    </Frame>
  );
}
