/**
 * Surfaces de verre et fond d'ambiance.
 *
 * - iOS 26 : vrai Liquid Glass (`expo-glass-effect`).
 * - iOS antérieur et web : flou d'arrière-plan (`expo-blur`) + voile.
 * - Android : voile translucide (le flou natif exige une cible de rendu
 *   dédiée, trop coûteuse pour un écran de lecture).
 *
 * Le fond d'écran superpose deux halos colorés (propres au chapitre) et une
 * texture de grain béton/papier, très légère.
 */
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useId } from 'react';
import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { AURAS, type AuraName, colors, CONTINUOUS, radius as R } from '../theme';

let liquid: boolean | null = null;
/** Le Liquid Glass natif est-il disponible ? (évalué une seule fois) */
export function hasLiquidGlass(): boolean {
  if (liquid === null) {
    try {
      liquid = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
    } catch {
      liquid = false;
    }
  }
  return liquid;
}

const GRAIN = require('../../../assets/textures/grain.png');

export type GlassTone = 'default' | 'strong' | 'accent' | 'danger' | 'clear';

const TINTS: Record<GlassTone, string> = {
  default: colors.glass,
  strong: colors.glassStrong,
  accent: 'rgba(255,106,61,0.16)',
  danger: 'rgba(255,84,104,0.13)',
  clear: 'rgba(255,248,240,0.02)',
};

export function Glass({
  children,
  style,
  tone = 'default',
  radius = R.lg,
  blur = 28,
  interactive,
  bordered = true,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: GlassTone;
  radius?: number;
  blur?: number;
  interactive?: boolean;
  bordered?: boolean;
}) {
  const shape: ViewStyle = { borderRadius: radius, ...CONTINUOUS };
  if (hasLiquidGlass()) {
    return (
      <GlassView
        glassEffectStyle={tone === 'clear' ? 'clear' : 'regular'}
        colorScheme="dark"
        tintColor={tone === 'accent' ? 'rgba(255,106,61,0.35)' : tone === 'danger' ? 'rgba(255,84,104,0.3)' : undefined}
        isInteractive={interactive}
        style={[shape, style]}
      >
        {children}
      </GlassView>
    );
  }
  // Les calques de fond passent derrière le contenu (sur le web, un élément
  // positionné se peindrait sinon au-dessus des SVG et des champs de saisie).
  return (
    <View style={[shape, styles.clip, styles.stack, style]}>
      {Platform.OS !== 'android' && <BlurView intensity={blur} tint="dark" style={[StyleSheet.absoluteFill, styles.under]} />}
      {Platform.OS === 'android' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,27,26,0.9)' }]} />}
      <View style={[StyleSheet.absoluteFill, styles.under, { backgroundColor: TINTS[tone] }]} />
      {/* Reflet supérieur : un dégradé très doux, comme une vitre éclairée d'en haut. */}
      <LinearGradient colors={['rgba(255,248,240,0.07)', 'rgba(255,248,240,0)']} locations={[0, 0.6]} style={[StyleSheet.absoluteFill, styles.under]} pointerEvents="none" />
      {bordered && <View pointerEvents="none" style={[StyleSheet.absoluteFill, shape, styles.stroke, styles.under]} />}
      {children}
    </View>
  );
}

/** Halos colorés + grain, derrière tout l'écran. */
export function Backdrop({ aura = 'title', grain = true, intensity = 1 }: { aura?: AuraName; grain?: boolean; intensity?: number }) {
  const [a, b] = AURAS[aura];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`a${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={a} stopOpacity={0.34 * intensity} />
            <Stop offset="1" stopColor={a} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`b${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={b} stopOpacity={0.5 * intensity} />
            <Stop offset="1" stopColor={b} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="88" cy="-6" rx="78" ry="70" fill={`url(#a${uid})`} />
        <Ellipse cx="0" cy="150" rx="90" ry="80" fill={`url(#b${uid})`} />
      </Svg>
      {grain && <Grain />}
    </View>
  );
}

export function Grain({ opacity = 0.32 }: { opacity?: number }) {
  return <Image source={GRAIN} resizeMode="repeat" style={[StyleSheet.absoluteFill, { opacity, width: '100%', height: '100%' }]} accessibilityIgnoresInvertColors />;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  stack: Platform.select({ web: { zIndex: 0 }, default: {} }),
  under: Platform.select({ web: { zIndex: -1 }, default: {} }),
  stroke: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.glassStroke },
});
