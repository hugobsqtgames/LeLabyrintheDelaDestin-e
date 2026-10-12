/**
 * Icônes d'objets, regroupées par silhouette.
 */
import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { ItemCategory } from '../../engine/types';
import { colors } from '../theme';

export const CATEGORY_COLORS: Record<ItemCategory, string> = {
  melee: colors.rustBright,
  ranged: colors.rust,
  ammo: colors.amber,
  consumable: colors.mossBright,
  armor: colors.steel,
  accessory: colors.ice,
  tool: colors.paperDim,
  material: colors.amberDim,
  quest: colors.amber,
};

const SHAPES: Record<string, (c: string) => React.ReactNode> = {
  knife: (c) => <Path d="M8 40 L36 12 L40 16 L14 42 Z M6 42 l6 -6" stroke={c} />,
  crowbar: (c) => <Path d="M10 40 L36 14 q4 -4 6 0 l-2 4" stroke={c} />,
  bar: (c) => <Path d="M10 40 L40 10" stroke={c} />,
  axe: (c) => (
    <>
      <Path d="M12 42 L34 14" stroke={c} />
      <Path d="M30 10 q12 0 10 14 l-10 -4 z" stroke={c} />
    </>
  ),
  machete: (c) => <Path d="M8 42 l6 -6 L38 10 q6 4 0 10 L18 40" stroke={c} />,
  hammer: (c) => (
    <>
      <Path d="M14 42 L32 18" stroke={c} />
      <Rect x={26} y={6} width={16} height={12} rx={2} stroke={c} transform="rotate(37 34 12)" />
    </>
  ),
  crossbow: (c) => <Path d="M8 24 q16 -16 32 0 M24 12 v28 M8 24 l32 0 M20 36 h8" stroke={c} />,
  nailgun: (c) => <Path d="M8 18 h26 v10 h-8 l-2 12 h-6 l2 -12 h-12 z M34 21 h6" stroke={c} />,
  pistol: (c) => <Path d="M8 16 h30 v8 h-16 l-2 16 h-8 l2 -16 h-6 z" stroke={c} />,
  shotgun: (c) => <Path d="M4 20 h36 v5 h-22 l-8 12 h-6 l6 -12 h-6 z" stroke={c} />,
  bolt: (c) => <Path d="M10 38 L38 10 M32 10 h6 v6 M10 38 l4 -10 M10 38 l10 -4" stroke={c} />,
  bullet: (c) => <Path d="M20 40 V20 q4 -10 8 0 V40 Z M20 32 h8" stroke={c} />,
  shell: (c) => <Path d="M18 40 V14 h12 V40 Z M18 32 h12" stroke={c} />,
  nail: (c) => <Path d="M14 12 h20 M24 12 v28 l-2 -4" stroke={c} />,
  bandage: (c) => (
    <>
      <Rect x={8} y={18} width={32} height={14} rx={7} stroke={c} />
      <Path d="M20 22 v6 M24 22 v6 M28 22 v6" stroke={c} />
    </>
  ),
  medkit: (c) => (
    <>
      <Rect x={8} y={14} width={32} height={24} rx={3} stroke={c} />
      <Path d="M24 20 v12 M18 26 h12 M18 14 v-4 h12 v4" stroke={c} />
    </>
  ),
  pills: (c) => (
    <>
      <Rect x={14} y={14} width={20} height={26} rx={3} stroke={c} />
      <Path d="M12 10 h24 v6 h-24 z M18 26 h12" stroke={c} />
    </>
  ),
  can: (c) => (
    <>
      <Rect x={12} y={12} width={24} height={28} rx={3} stroke={c} />
      <Path d="M12 18 h24 M12 34 h24" stroke={c} />
    </>
  ),
  tube: (c) => <Rect x={18} y={8} width={12} height={32} rx={6} stroke={c} />,
  bottle: (c) => <Path d="M20 8 h8 v8 q6 4 6 12 v14 h-20 v-14 q0 -8 6 -12 z M22 8 q2 -4 6 -2" stroke={c} />,
  flare: (c) => <Path d="M18 40 L28 18 L32 20 L22 42 Z M28 18 q-2 -8 4 -12 q2 6 0 12" stroke={c} />,
  jacket: (c) => <Path d="M16 10 l-8 8 v22 h8 v-14 v14 h16 v-14 v14 h8 v-22 l-8 -8 l-8 6 z" stroke={c} />,
  vest: (c) => <Path d="M14 10 h6 q4 6 8 0 h6 v30 h-20 z M14 22 h20" stroke={c} />,
  plate: (c) => <Path d="M12 10 h24 v30 h-24 z M12 20 h24 M12 30 h24 M24 10 v30" stroke={c} />,
  backpack: (c) => (
    <>
      <Rect x={12} y={12} width={24} height={28} rx={6} stroke={c} />
      <Path d="M18 12 v-4 h12 v4 M16 28 h16 v8 h-16 z" stroke={c} />
    </>
  ),
  boots: (c) => <Path d="M12 10 h10 v18 h14 q4 0 4 6 v4 h-28 z" stroke={c} />,
  medal: (c) => (
    <>
      <Path d="M16 8 l8 14 l8 -14" stroke={c} />
      <Circle cx={24} cy={30} r={9} stroke={c} />
    </>
  ),
  binoculars: (c) => (
    <>
      <Circle cx={15} cy={30} r={8} stroke={c} />
      <Circle cx={33} cy={30} r={8} stroke={c} />
      <Path d="M15 22 v-10 h6 v10 M33 22 v-10 h-6 v10 M21 28 h6" stroke={c} />
    </>
  ),
  toolbox: (c) => (
    <>
      <Rect x={8} y={18} width={32} height={20} rx={2} stroke={c} />
      <Path d="M18 18 v-6 h12 v6 M8 26 h32" stroke={c} />
    </>
  ),
  picks: (c) => <Path d="M10 38 L34 14 l4 2 M14 40 L38 18 l2 4 M10 38 h4" stroke={c} />,
  rope: (c) => (
    <>
      <Circle cx={24} cy={24} r={13} stroke={c} />
      <Circle cx={24} cy={24} r={7} stroke={c} />
      <Path d="M37 24 q4 10 -2 16" stroke={c} />
    </>
  ),
  chip: (c) => (
    <>
      <Rect x={14} y={14} width={20} height={20} rx={2} stroke={c} />
      <Path d="M18 14 v-6 M24 14 v-6 M30 14 v-6 M18 34 v6 M24 34 v6 M30 34 v6" stroke={c} />
    </>
  ),
  folder: (c) => <Path d="M8 14 h12 l4 4 h16 v22 h-32 z" stroke={c} />,
  letter: (c) => (
    <>
      <Rect x={8} y={14} width={32} height={22} stroke={c} />
      <Path d="M8 14 l16 12 l16 -12" stroke={c} />
    </>
  ),
  notebook: (c) => (
    <>
      <Rect x={12} y={8} width={24} height={32} rx={2} stroke={c} />
      <Path d="M16 8 v32 M20 16 h12 M20 22 h12" stroke={c} />
    </>
  ),
  bell: (c) => (
    <>
      <Path d="M14 34 q0 -18 10 -20 q10 2 10 20 z M12 34 h24" stroke={c} />
      <Circle cx={24} cy={38} r={3} stroke={c} />
      <Path d="M24 14 v-4" stroke={c} />
    </>
  ),
  tape: (c) => (
    <>
      <Rect x={8} y={14} width={32} height={20} rx={2} stroke={c} />
      <Circle cx={18} cy={24} r={4} stroke={c} />
      <Circle cx={30} cy={24} r={4} stroke={c} />
    </>
  ),
  keys: (c) => (
    <>
      <Circle cx={16} cy={16} r={6} stroke={c} />
      <Path d="M20 20 L36 36 M30 30 l4 -4 M34 34 l4 -4" stroke={c} />
    </>
  ),
};

export function ItemIcon({ icon, category, size = 40 }: { icon: string; category: ItemCategory; size?: number }) {
  const c = CATEGORY_COLORS[category];
  const shape = SHAPES[icon] ?? SHAPES.can;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={1} y={1} width={46} height={46} rx={8} fill={colors.panelRaised} stroke={colors.line} strokeWidth={1.5} />
      <G fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {shape(c)}
      </G>
    </Svg>
  );
}
