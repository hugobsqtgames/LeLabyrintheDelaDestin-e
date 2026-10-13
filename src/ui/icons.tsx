/**
 * Jeu d'icônes au trait, dessiné en SVG (grille 24×24).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './theme';

export type IconName =
  | 'heart'
  | 'bolt'
  | 'bag'
  | 'map'
  | 'quest'
  | 'book'
  | 'person'
  | 'gear'
  | 'pause'
  | 'sword'
  | 'shield'
  | 'run'
  | 'eye'
  | 'chat'
  | 'hand'
  | 'move'
  | 'search'
  | 'lock'
  | 'check'
  | 'close'
  | 'plus'
  | 'minus'
  | 'skull'
  | 'star'
  | 'dice'
  | 'flame'
  | 'target'
  | 'bed'
  | 'trash'
  | 'save'
  | 'warning'
  | 'chevron'
  | 'back'
  | 'biohazard'
  | 'weight'
  | 'grid'
  | 'clock'
  | 'archive'
  | 'wrench'
  | 'volume'
  | 'globe'
  | 'expand'
  | 'info'
  | 'sparkle'
  | 'journal';

const PATHS: Record<IconName, (c: string) => React.ReactNode> = {
  heart: (c) => <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" stroke={c} />,
  bolt: (c) => <Path d="M13 3 5 13h6l-1 8 8-10h-6l1-8z" stroke={c} />,
  bag: (c) => (
    <>
      <Path d="M6 8h12l-1 12H7L6 8z" stroke={c} />
      <Path d="M9 8V6a3 3 0 0 1 6 0v2" stroke={c} />
      <Path d="M9 13h6" stroke={c} />
    </>
  ),
  map: (c) => (
    <>
      <Path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" stroke={c} />
      <Path d="M9 4v14M15 6v14" stroke={c} />
    </>
  ),
  quest: (c) => (
    <>
      <Path d="M6 3h9l3 3v15H6V3z" stroke={c} />
      <Path d="M9 9h6M9 13h6M9 17h3" stroke={c} />
    </>
  ),
  book: (c) => (
    <>
      <Path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1V5z" stroke={c} />
      <Path d="M12 6v14" stroke={c} />
    </>
  ),
  person: (c) => (
    <>
      <Circle cx={12} cy={8} r={3.5} stroke={c} />
      <Path d="M5 20c1-4 4-6 7-6s6 2 7 6" stroke={c} />
    </>
  ),
  gear: (c) => (
    <>
      <Circle cx={12} cy={12} r={3} stroke={c} />
      <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke={c} />
    </>
  ),
  pause: (c) => <Path d="M9 5v14M15 5v14" stroke={c} />,
  sword: (c) => (
    <>
      <Path d="M19 4 9 14M19 4h-4M19 4v4" stroke={c} />
      <Path d="M7 12l5 5M6 18l-2 2M8 16l-3 3" stroke={c} />
    </>
  ),
  shield: (c) => <Path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" stroke={c} />,
  run: (c) => (
    <>
      <Circle cx={14} cy={5} r={2} stroke={c} />
      <Path d="M10 21l2-6-3-2 2-5 4 3 3 1M12 15l4 2v4M9 13l-4 1" stroke={c} />
    </>
  ),
  eye: (c) => (
    <>
      <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke={c} />
      <Circle cx={12} cy={12} r={3} stroke={c} />
    </>
  ),
  chat: (c) => <Path d="M4 5h16v11H9l-5 4V5z" stroke={c} />,
  hand: (c) => <Path d="M7 12V6a1.5 1.5 0 0 1 3 0v5V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V13l1.5-2a1.5 1.5 0 0 1 2.5 1.6L17 18c-1 2-3 3-5 3h-1c-3 0-5-2-5-5v-4z" stroke={c} />,
  move: (c) => <Path d="M5 12h14M13 6l6 6-6 6" stroke={c} />,
  search: (c) => (
    <>
      <Circle cx={10.5} cy={10.5} r={6} stroke={c} />
      <Path d="M15 15l5 5" stroke={c} />
    </>
  ),
  lock: (c) => (
    <>
      <Rect x={5} y={10} width={14} height={10} rx={1.5} stroke={c} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={c} />
    </>
  ),
  check: (c) => <Path d="M5 12.5l4.5 4.5L19 7" stroke={c} />,
  close: (c) => <Path d="M6 6l12 12M18 6 6 18" stroke={c} />,
  plus: (c) => <Path d="M12 5v14M5 12h14" stroke={c} />,
  minus: (c) => <Path d="M5 12h14" stroke={c} />,
  skull: (c) => (
    <>
      <Path d="M5 11a7 7 0 0 1 14 0v3l-2 1v4H7v-4l-2-1v-3z" stroke={c} />
      <Circle cx={9.5} cy={12} r={1.5} stroke={c} />
      <Circle cx={14.5} cy={12} r={1.5} stroke={c} />
      <Path d="M11 19v-2M13 19v-2" stroke={c} />
    </>
  ),
  star: (c) => <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" stroke={c} />,
  dice: (c) => (
    <>
      <Rect x={4} y={4} width={16} height={16} rx={3} stroke={c} />
      <Circle cx={9} cy={9} r={1} stroke={c} />
      <Circle cx={15} cy={15} r={1} stroke={c} />
      <Circle cx={12} cy={12} r={1} stroke={c} />
    </>
  ),
  flame: (c) => <Path d="M12 21c-4 0-6-3-6-6 0-4 4-6 4-10 3 2 4 4 4 6 1-1 2-2 2-3 2 2 2 4 2 7 0 3-2 6-6 6z" stroke={c} />,
  target: (c) => (
    <>
      <Circle cx={12} cy={12} r={8} stroke={c} />
      <Circle cx={12} cy={12} r={4} stroke={c} />
      <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={c} />
    </>
  ),
  bed: (c) => (
    <>
      <Path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" stroke={c} />
      <Circle cx={7} cy={11} r={1.6} stroke={c} />
    </>
  ),
  trash: (c) => <Path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" stroke={c} />,
  save: (c) => (
    <>
      <Path d="M5 4h11l3 3v13H5V4z" stroke={c} />
      <Path d="M8 4v5h7V4M8 20v-6h8v6" stroke={c} />
    </>
  ),
  warning: (c) => (
    <>
      <Path d="M12 4 2.5 20h19L12 4z" stroke={c} />
      <Path d="M12 10v4M12 17v.5" stroke={c} />
    </>
  ),
  chevron: (c) => <Path d="M9 6l6 6-6 6" stroke={c} />,
  back: (c) => <Path d="M15 6l-6 6 6 6" stroke={c} />,
  biohazard: (c) => (
    <>
      <Circle cx={12} cy={12} r={2} stroke={c} />
      <Path d="M12 3a5 5 0 0 0-3 9M12 3a5 5 0 0 1 3 9M4 18a5 5 0 0 0 7-1M20 18a5 5 0 0 1-7-1" stroke={c} />
    </>
  ),
  weight: (c) => (
    <>
      <Path d="M6 9h12l2 11H4L6 9z" stroke={c} />
      <Circle cx={12} cy={6} r={2.5} stroke={c} />
    </>
  ),
  grid: (c) => <Path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke={c} />,
  clock: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={c} />
      <Path d="M12 7.5V12l3 2" stroke={c} />
    </>
  ),
  archive: (c) => (
    <>
      <Path d="M4 5h16v4H4z" stroke={c} />
      <Path d="M5.5 9v10h13V9M10 13h4" stroke={c} />
    </>
  ),
  wrench: (c) => <Path d="M14.5 4.5a4.5 4.5 0 0 0-4.2 6.1L4 16.9 7.1 20l6.3-6.3a4.5 4.5 0 0 0 6.1-4.2l-2.7 2.7-2.6-.6-.6-2.6 2.7-2.7a4.5 4.5 0 0 0-1.8-.3z" stroke={c} />,
  volume: (c) => (
    <>
      <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke={c} />
      <Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke={c} />
    </>
  ),
  globe: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={c} />
      <Path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" stroke={c} />
    </>
  ),
  expand: (c) => <Path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" stroke={c} />,
  info: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={c} />
      <Path d="M12 11v5.5M12 7.6v.2" stroke={c} />
    </>
  ),
  sparkle: (c) => <Path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM19 16c.2 1.5.8 2.1 2.3 2.3-1.5.2-2.1.8-2.3 2.3-.2-1.5-.8-2.1-2.3-2.3 1.5-.2 2.1-.8 2.3-2.3z" stroke={c} />,
  journal: (c) => (
    <>
      <Path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14.5a1.5 1.5 0 0 1-1.5 1.5H6z" stroke={c} />
      <Path d="M6 3.5v17M9.5 8h5.5M9.5 11.5h5.5" stroke={c} />
    </>
  ),
};

export function Icon({ name, size = 20, color = colors.text, strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  // Enveloppé dans une vue : sur le web, il reste ainsi au-dessus des calques de verre.
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {PATHS[name](color)}
      </Svg>
    </View>
  );
}

/** Icône associée à un type de choix narratif. */
export const CHOICE_ICONS: Record<string, IconName> = {
  move: 'move',
  talk: 'chat',
  negotiate: 'hand',
  stealth: 'eye',
  explore: 'search',
  item: 'bag',
  fight: 'sword',
  flee: 'run',
  sacrifice: 'heart',
  rest: 'bed',
};
