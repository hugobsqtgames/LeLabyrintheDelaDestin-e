/**
 * Primitives du design system : écran, textes, boutons, panneaux, badges,
 * jauges et apparitions animées.
 */
import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, fonts, radius, space, TOUCH, type, NATIVE_DRIVER } from '../theme';

// ---------------------------------------------------------------------------
// Écran
// ---------------------------------------------------------------------------

export function Screen({ children, padded = true, edges = ['top', 'bottom'] }: { children: React.ReactNode; padded?: boolean; edges?: ('top' | 'bottom')[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#18211E', colors.bg, colors.bgDeep]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View
        style={{
          flex: 1,
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingHorizontal: padded ? space.lg : 0,
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
    <Text accessibilityRole="header" style={[base, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style, color }: { children: React.ReactNode; style?: TextStyle; color?: string }) {
  return <Text style={[type.label, color ? { color } : null, style]}>{children}</Text>;
}

export function Body({ children, style, dim }: { children: React.ReactNode; style?: TextStyle; dim?: boolean }) {
  return <Text style={[dim ? type.bodySmall : type.body, style]}>{children}</Text>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionTick} />
      <Text style={[type.h3, { flex: 1 }]}>{children}</Text>
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

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

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
  const palette = {
    primary: { bg: colors.rust, bgPressed: colors.rustDeep, border: colors.rustBright, text: colors.paper },
    secondary: { bg: colors.panelRaised, bgPressed: colors.panelPressed, border: colors.lineStrong, text: colors.text },
    ghost: { bg: 'transparent', bgPressed: colors.panel, border: 'transparent', text: colors.textDim },
    danger: { bg: colors.rustDeep, bgPressed: '#3E160D', border: colors.blood, text: colors.paper },
  }[variant];
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
        { backgroundColor: pressed ? palette.bgPressed : palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={palette.text} />}
          <Text style={[styles.buttonText, { color: palette.text }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, badge, color = colors.text, size = 22 }: { icon: IconName; label: string; onPress: () => void; badge?: boolean; color?: string; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.panelPressed }]}
    >
      <Icon name={icon} size={size} color={color} />
      {badge && <View style={styles.dot} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Panneaux & badges
// ---------------------------------------------------------------------------

export function Panel({ children, style, tone = 'default', taped }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'paper' | 'danger' | 'raised'; taped?: boolean }) {
  const toneStyle =
    tone === 'paper' ? styles.panelPaper : tone === 'danger' ? styles.panelDanger : tone === 'raised' ? styles.panelRaised : null;
  return (
    <View style={[styles.panel, toneStyle, style]}>
      {taped && <View style={[styles.tape, { left: 18, transform: [{ rotate: '-4deg' }] }]} />}
      {taped && <View style={[styles.tape, { right: 18, transform: [{ rotate: '5deg' }] }]} />}
      {children}
    </View>
  );
}

export function Badge({ label, color = colors.textDim, icon, filled }: { label: string; color?: string; icon?: IconName; filled?: boolean }) {
  return (
    <View style={[styles.badge, { borderColor: color }, filled && { backgroundColor: color }]}>
      {icon && <Icon name={icon} size={12} color={filled ? colors.bgDeep : color} strokeWidth={2.2} />}
      <Text style={[styles.badgeText, { color: filled ? colors.bgDeep : color }]}>{label}</Text>
    </View>
  );
}

export function Bar({ value, max, color, height = 8, label, a11yLabel, showValue }: { value: number; max: number; color: string; height?: number; label?: string; a11yLabel?: string; showValue?: boolean }) {
  const { reduceMotion } = useStore();
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const [anim] = useState(() => new Animated.Value(ratio));
  useEffect(() => {
    if (reduceMotion) anim.setValue(ratio);
    else Animated.timing(anim, { toValue: ratio, duration: 360, useNativeDriver: false }).start();
  }, [ratio, reduceMotion, anim]);
  return (
    <View accessible accessibilityLabel={label || a11yLabel ? `${label ?? a11yLabel} : ${value} sur ${max}` : undefined}>
      {(label || showValue) && (
        <View style={styles.barLabelRow}>
          {label && <Text style={type.label}>{label}</Text>}
          {showValue && (
            <Text style={[type.number, { fontSize: 14, color: colors.textDim }]}>
              {value}/{max}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.barTrack, { height }]}>
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

/** Apparition en fondu (interrompue si le composant disparaît, désactivée si mouvements réduits). */
export function FadeIn({ children, delay = 0, style, from = 8 }: { children: React.ReactNode; delay?: number; style?: ViewStyle; from?: number }) {
  const { reduceMotion } = useStore();
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, { toValue: 1, duration: 320, delay, useNativeDriver: NATIVE_DRIVER });
    a.start();
    return () => a.stop();
  }, [v, delay, reduceMotion]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function PressableCard(props: PressableProps & { style?: ViewStyle; children: React.ReactNode }) {
  const { style, children, ...rest } = props;
  return (
    <Pressable {...rest} style={({ pressed }) => [styles.panel, style, pressed && { backgroundColor: colors.panelPressed }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, marginBottom: space.md },
  sectionTick: { width: 4, height: 16, backgroundColor: colors.rust },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.md },
  button: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: space.md },
  buttonText: { fontFamily: fonts.uiBold, fontSize: 17, letterSpacing: 1.2, textTransform: 'uppercase' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  panelPaper: { backgroundColor: colors.paper, borderColor: colors.paperDim },
  panelDanger: { backgroundColor: '#24130F', borderColor: colors.rustDeep },
  panelRaised: { backgroundColor: colors.panelRaised, borderColor: colors.lineStrong },
  tape: { position: 'absolute', top: -7, width: 46, height: 14, backgroundColor: 'rgba(201, 162, 74, 0.45)' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barTrack: { backgroundColor: colors.bgDeep, borderRadius: 2, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
});
