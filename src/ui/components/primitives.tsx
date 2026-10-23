/**
 * Primitives du design system : écran, textes, boutons, surfaces de verre,
 * badges, jauges, tuiles et apparitions animées.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/GameStore';
import { Icon, type IconName } from '../icons';
import { type AuraName, colors, CONTINUOUS, fonts, MAX_SCALE_UI, radius, space, TOUCH, type, NATIVE_DRIVER } from '../theme';
import { Backdrop, Glass, type GlassTone } from './Glass';

// ---------------------------------------------------------------------------
// Écran
// ---------------------------------------------------------------------------

export function Screen({
  children,
  padded = true,
  edges = ['top', 'bottom'],
  aura = 'title',
}: {
  children: React.ReactNode;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  aura?: AuraName;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Backdrop aura={aura} />
      <View
        style={{
          flex: 1,
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingHorizontal: padded ? space.lg + 4 : 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Textes
// ---------------------------------------------------------------------------

export function Title({ children, style, level = 1 }: { children: React.ReactNode; style?: TextStyle; level?: 0 | 1 | 2 }) {
  const base = level === 0 ? type.display : level === 1 ? type.h1 : type.h2;
  return (
    <Text accessibilityRole="header" style={[base, style]} maxFontSizeMultiplier={MAX_SCALE_UI}>
      {children}
    </Text>
  );
}

export function Label({ children, style, color }: { children: React.ReactNode; style?: TextStyle; color?: string }) {
  return (
    <Text style={[type.label, color ? { color } : null, style]} maxFontSizeMultiplier={MAX_SCALE_UI}>
      {children}
    </Text>
  );
}

export function Body({ children, style, dim }: { children: React.ReactNode; style?: TextStyle; dim?: boolean }) {
  return <Text style={[dim ? type.bodySmall : type.body, style]}>{children}</Text>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={[type.label, { flex: 1, color: colors.textDim }]} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

const BUTTON_PALETTE: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: colors.text, text: colors.bg, border: 'transparent' },
  accent: { bg: colors.rust, text: '#1A0904', border: 'transparent' },
  secondary: { bg: 'transparent', text: colors.text, border: colors.glassStroke },
  ghost: { bg: 'transparent', text: colors.textDim, border: 'transparent' },
  danger: { bg: 'rgba(255,84,104,0.16)', text: '#FFC2CA', border: 'rgba(255,84,104,0.45)' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  compact,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  compact?: boolean;
  accessibilityHint?: string;
}) {
  const { feedback } = useStore();
  const palette = BUTTON_PALETTE[variant];
  const content = loading ? (
    <ActivityIndicator color={palette.text} />
  ) : (
    <>
      <Text style={[styles.buttonText, compact && { fontSize: 15 }, { color: palette.text }]} maxFontSizeMultiplier={MAX_SCALE_UI} numberOfLines={2}>
        {label}
      </Text>
      {icon && <Icon name={icon} size={compact ? 16 : 18} color={palette.text} strokeWidth={2} />}
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        feedback('light');
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.4 : pressed ? 0.82 : 1 },
        pressed && { transform: [{ scale: 0.975 }] },
        style,
      ]}
    >
      {variant === 'secondary' ? (
        <Glass radius={radius.pill} style={[StyleSheet.absoluteFill]} bordered={false}>
          <View />
        </Glass>
      ) : null}
      {content}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  badge,
  color = colors.text,
  size = 20,
  glass = true,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: boolean;
  color?: string;
  size?: number;
  glass?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      {glass && <Glass radius={radius.pill} style={StyleSheet.absoluteFill} />}
      <Icon name={icon} size={size} color={color} />
      {badge && <View style={styles.dot} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Panel({
  children,
  style,
  tone = 'default',
  taped,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'paper' | 'danger' | 'raised' | 'accent';
  taped?: boolean;
}) {
  if (tone === 'paper') {
    return (
      <View style={[styles.panel, styles.panelPaper, style]}>
        {taped && <View style={[styles.tape, { left: 22, transform: [{ rotate: '-4deg' }] }]} />}
        {taped && <View style={[styles.tape, { right: 22, transform: [{ rotate: '5deg' }] }]} />}
        {children}
      </View>
    );
  }
  const glassTone: GlassTone = tone === 'danger' ? 'danger' : tone === 'raised' ? 'strong' : tone === 'accent' ? 'accent' : 'default';
  return (
    <Glass tone={glassTone} radius={radius.lg} style={[styles.panelPad, style]}>
      {children}
    </Glass>
  );
}

export function Badge({ label, color = colors.textDim, icon, filled }: { label: string; color?: string; icon?: IconName; filled?: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: filled ? color : withAlpha(color, 0.12) }]}>
      {icon && <Icon name={icon} size={12} color={filled ? colors.bg : color} strokeWidth={2.2} />}
      <Text style={[styles.badgeText, { color: filled ? colors.bg : color }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
        {label}
      </Text>
    </View>
  );
}

/** Transparence sur une couleur hexadécimale (#RRGGBB) ; les autres formats passent tels quels. */
export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

export function Bar({
  value,
  max,
  color,
  height = 6,
  label,
  a11yLabel,
  showValue,
}: {
  value: number;
  max: number;
  color: string;
  height?: number;
  label?: string;
  a11yLabel?: string;
  showValue?: boolean;
}) {
  const { reduceMotion } = useStore();
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const [anim] = useState(() => new Animated.Value(ratio));
  useEffect(() => {
    if (reduceMotion) anim.setValue(ratio);
    else Animated.timing(anim, { toValue: ratio, duration: 420, useNativeDriver: false }).start();
  }, [ratio, reduceMotion, anim]);
  return (
    <View accessible accessibilityLabel={label || a11yLabel ? `${label ?? a11yLabel} : ${value} sur ${max}` : undefined}>
      {(label || showValue) && (
        <View style={styles.barLabelRow}>
          {label && <Text style={type.label}>{label}</Text>}
          {showValue && (
            <Text style={[type.number, { fontSize: 13, color: colors.textDim }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
              {value}/{max}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.barTrack, { height, borderRadius: height }]}>
        <Animated.View
          style={{
            height: '100%',
            borderRadius: height,
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>
    </View>
  );
}

/** Tuile « bento » : grande valeur, petite étiquette. */
export function Tile({
  label,
  value,
  sub,
  icon,
  color = colors.text,
  style,
  children,
}: {
  label: string;
  value?: string | number;
  sub?: string;
  icon?: IconName;
  color?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  return (
    <Glass radius={radius.lg} style={[styles.tile, style]}>
      <View style={styles.tileHead}>
        {icon && <Icon name={icon} size={14} color={color} strokeWidth={2} />}
        <Text style={[type.label, { flex: 1 }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE_UI}>
          {label}
        </Text>
      </View>
      {value !== undefined && (
        <Text style={[styles.tileValue, { color }]} maxFontSizeMultiplier={MAX_SCALE_UI} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
      {sub && (
        <Text style={[type.uiSmall, { fontSize: 12.5 }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE_UI}>
          {sub}
        </Text>
      )}
      {children}
    </Glass>
  );
}

/** Contrôle segmenté en pilule. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; badge?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Glass radius={radius.pill} style={styles.segmented}>
      <View style={{ flexDirection: 'row', padding: 4, gap: 4 }} accessibilityRole="tablist">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.id)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && { color: colors.bg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE_UI}>
                {o.label}
                {o.badge ? ` · ${o.badge}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Glass>
  );
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

/** Apparition en fondu (interrompue si le composant disparaît, désactivée si mouvements réduits). */
export function FadeIn({ children, delay = 0, style, from = 10 }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; from?: number }) {
  const { reduceMotion } = useStore();
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, { toValue: 1, duration: 420, delay, useNativeDriver: NATIVE_DRIVER });
    a.start();
    return () => a.stop();
  }, [v, delay, reduceMotion]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function PressableCard(props: PressableProps & { style?: StyleProp<ViewStyle>; children: React.ReactNode; tone?: GlassTone }) {
  const { style, children, tone, ...rest } = props;
  return (
    <Pressable {...rest} style={({ pressed }) => [pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
      <Glass tone={tone} radius={radius.lg} style={[styles.panelPad, style]}>
        {children}
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, marginBottom: space.sm, paddingHorizontal: 2 },
  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.line, marginVertical: space.md },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    overflow: 'hidden',
    ...CONTINUOUS,
  },
  buttonCompact: { minHeight: 44, paddingHorizontal: space.lg },
  buttonText: { fontFamily: fonts.uiBold, fontSize: 16.5, letterSpacing: -0.2, textAlign: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  dot: { position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.rust, borderWidth: 2, borderColor: colors.bg },
  panel: { borderRadius: radius.lg, padding: space.lg + 2, ...CONTINUOUS },
  panelPad: { padding: space.lg + 2 },
  panelPaper: { backgroundColor: colors.paper },
  tape: { position: 'absolute', top: -8, width: 52, height: 16, backgroundColor: 'rgba(255,196,107,0.55)', borderRadius: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack: { backgroundColor: 'rgba(255,248,240,0.08)', overflow: 'hidden' },
  tile: { padding: space.md + 2, gap: 4, minHeight: 92 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileValue: { fontFamily: fonts.title, fontSize: 34, lineHeight: 38 },
  segmented: {},
  segment: { flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  segmentActive: { backgroundColor: colors.text },
  segmentText: { fontFamily: fonts.uiBold, fontSize: 14, color: colors.textDim },
});

export { TOUCH };
