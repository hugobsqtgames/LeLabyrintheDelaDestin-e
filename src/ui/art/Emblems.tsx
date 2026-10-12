/**
 * Emblèmes du personnage (choix à la création) : des insignes cousus
 * à la main sur un écusson de toile.
 */
import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { EmblemId } from '../../engine/types';
import { colors } from '../theme';

export const EMBLEMS: { id: EmblemId; label: string }[] = [
  { id: 'masque', label: 'Masque à gaz' },
  { id: 'boussole', label: 'Boussole' },
  { id: 'cle', label: 'Clé' },
  { id: 'corbeau', label: 'Corbeau' },
  { id: 'fougere', label: 'Fougère' },
  { id: 'lame', label: 'Lame' },
];

function Motif({ id, c }: { id: EmblemId; c: string }) {
  switch (id) {
    case 'masque':
      return (
        <G stroke={c} strokeWidth={4} fill="none" strokeLinejoin="round">
          <Path d="M30 40 Q50 22 70 40 L70 58 Q50 76 30 58 Z" />
          <Circle cx={41} cy={46} r={6} />
          <Circle cx={59} cy={46} r={6} />
          <Path d="M44 62 h12 v10 h-12 z" />
        </G>
      );
    case 'boussole':
      return (
        <G stroke={c} strokeWidth={4} fill="none">
          <Circle cx={50} cy={50} r={22} />
          <Path d="M50 30 L56 50 L50 70 L44 50 Z" fill={c} />
          <Path d="M50 22 v-4 M50 82 v-4 M22 50 h-4 M82 50 h-4" />
        </G>
      );
    case 'cle':
      return (
        <G stroke={c} strokeWidth={4.5} fill="none" strokeLinecap="round">
          <Circle cx={38} cy={38} r={11} />
          <Path d="M46 46 L72 72 M62 62 l6 -6 M68 68 l6 -6" />
        </G>
      );
    case 'corbeau':
      return (
        <G fill={c}>
          <Path d="M24 58 Q40 40 58 42 L72 34 L68 44 Q76 50 74 58 Q60 54 52 62 L40 74 L42 62 Q32 64 24 58 Z" />
          <Circle cx={64} cy={43} r={1.8} fill={colors.bg} />
        </G>
      );
    case 'fougere':
      return (
        <G stroke={c} strokeWidth={3.5} fill="none" strokeLinecap="round">
          <Path d="M50 78 Q50 46 62 24" />
          {[0, 1, 2, 3, 4].map((i) => (
            <G key={i}>
              <Path d={`M${50 + i * 2} ${70 - i * 10} q-14 -2 -18 -10`} />
              <Path d={`M${51 + i * 2} ${68 - i * 10} q12 -4 14 -12`} />
            </G>
          ))}
        </G>
      );
    case 'lame':
      return (
        <G stroke={c} strokeWidth={4} fill="none" strokeLinejoin="round">
          <Path d="M50 18 L58 58 L50 64 L42 58 Z" fill={c} fillOpacity={0.25} />
          <Path d="M36 64 h28 M50 64 v14" strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}

export function EmblemBadge({ id, size = 64, selected = false }: { id: EmblemId; size?: number; selected?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 4 L90 20 L90 58 Q90 84 50 96 Q10 84 10 58 L10 20 Z" fill={selected ? colors.rustDeep : colors.panelRaised} stroke={selected ? colors.rustBright : colors.lineStrong} strokeWidth={3} />
      <Path d="M50 11 L83 24 L83 57 Q83 78 50 89 Q17 78 17 57 L17 24 Z" fill="none" stroke={selected ? colors.rust : colors.line} strokeWidth={1.5} strokeDasharray="4 4" />
      <Motif id={id} c={selected ? colors.paper : colors.paperDim} />
      {selected && <Rect x={44} y={0} width={12} height={8} fill={colors.rustBright} />}
    </Svg>
  );
}
