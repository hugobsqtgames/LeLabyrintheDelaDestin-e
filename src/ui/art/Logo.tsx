/**
 * Emblème du jeu : un labyrinthe circulaire, une boussole brisée et une
 * aiguille rouille pointée vers la sortie. Réutilisé comme sceau.
 */
import React, { useId } from 'react';
import Svg, { Circle, G, Line, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

export function Emblem({ size = 160, glow = true }: { size?: number; glow?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={`halo${uid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={colors.rust} stopOpacity={0.35} />
          <Stop offset="70%" stopColor={colors.rust} stopOpacity={0.05} />
          <Stop offset="100%" stopColor={colors.rust} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {glow && <Circle cx={100} cy={100} r={98} fill={`url(#halo${uid})`} />}
      <G fill="none" stroke={colors.paper} strokeLinecap="round">
        {/* Anneaux du labyrinthe, ouverts à des angles différents */}
        <Path d="M100 18 A82 82 0 1 1 42 42" strokeWidth={5} />
        <Path d="M100 38 A62 62 0 1 0 156 74" strokeWidth={4.5} />
        <Path d="M100 58 A42 42 0 1 1 64 79" strokeWidth={4} />
        <Path d="M100 78 A22 22 0 1 0 121 94" strokeWidth={3.5} />
        {/* Passages radiaux */}
        <Line x1={42} y1={42} x2={57} y2={57} strokeWidth={4.5} />
        <Line x1={156} y1={74} x2={138} y2={82} strokeWidth={4} />
        <Line x1={100} y1={38} x2={100} y2={58} strokeWidth={4} />
        <Line x1={64} y1={79} x2={81} y2={89} strokeWidth={3.5} />
      </G>
      {/* Aiguille */}
      <Path d="M100 100 L148 150 L104 108 Z" fill={colors.rustBright} />
      <Path d="M100 100 L60 58 L96 92 Z" fill={colors.steel} />
      <Circle cx={100} cy={100} r={5} fill={colors.paper} />
      {/* Fissure */}
      <Path d="M170 36 L158 52 L164 58 L150 72" stroke={colors.bg} strokeWidth={3} fill="none" />
    </Svg>
  );
}

export function Wordmark({ width = 300 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.12} viewBox="0 0 300 36">
      <Line x1={0} y1={18} x2={70} y2={18} stroke={colors.rust} strokeWidth={2} />
      <Line x1={230} y1={18} x2={300} y2={18} stroke={colors.rust} strokeWidth={2} />
      <Circle cx={150} cy={18} r={4} fill={colors.rust} />
      <Circle cx={128} cy={18} r={2} fill={colors.paperDim} />
      <Circle cx={172} cy={18} r={2} fill={colors.paperDim} />
    </Svg>
  );
}
