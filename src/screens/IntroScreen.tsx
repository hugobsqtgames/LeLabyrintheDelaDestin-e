/**
 * Bande-annonce d'introduction (30 s) : au tout premier lancement, puis à la demande
 * (Paramètres › Revoir l'introduction).
 *
 * - Vidéo muette (expo-video), une par langue : les titres y sont incrustés pour
 *   tomber à l'image près sur la musique. VoiceOver en lit le résumé (`intro.a11y`).
 * - Bande-son (expo-audio, session audio du jeu : le bouton silencieux est
 *   respecté, la musique de l'utilisateur n'est pas coupée).
 * - « Passer » visible dès la première image ; fin, erreur ou lenteur de lecture
 *   mènent toujours à l'écran suivant, une seule fois.
 */
import { useEventListener } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { type FinishReason, IntroController } from '../intro/controller';
import { type Route, useStore } from '../store/GameStore';
import { afterIntroRoute } from '../store/navigation';
import { Icon } from '../ui/icons';
import { colors, fonts, NATIVE_DRIVER } from '../ui/theme';

const VIDEOS = {
  fr: require('../../assets/video/intro-fr.mp4'),
  en: require('../../assets/video/intro-en.mp4'),
};
// Sur le web, la lecture automatique avec son est bloquée : l'introduction y est muette.
const SOUND = Platform.OS === 'web' ? null : require('../../assets/audio/intro.m4a');
const LEAVE_MS = 450;

function IntroPlayer({ returnTo }: { returnTo: Route }) {
  const { model, go, setSettings, lang } = useStore();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [leaving] = useState(() => new Animated.Value(1));
  const volume = model.settings.volume;

  const player = useVideoPlayer(VIDEOS[lang] ?? VIDEOS.fr, (p) => {
    p.muted = true;
    p.loop = false;
    p.audioMixingMode = 'mixWithOthers';
    p.timeUpdateEventInterval = 0.1;
  });
  const sound = useAudioPlayer(SOUND);
  const soundStatus = useAudioPlayerStatus(sound);

  // Un pilote par montage (un remontage en développement en recrée un propre).
  const ctrl = useRef<IntroController | null>(null);
  useEffect(() => {
    const c = new IntroController({
      video: player,
      audio: SOUND ? sound : null,
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      // Le pilote n'appelle cette fin qu'une seule fois, quelle qu'en soit la cause.
      onFinish: (_reason: FinishReason) => {
        setSettings({ introSeen: true });
        Animated.timing(leaving, { toValue: 0, duration: LEAVE_MS, useNativeDriver: NATIVE_DRIVER }).start(() => go(returnTo));
      },
    });
    ctrl.current = c;
    // Les lecteurs ont pu être prêts avant l'abonnement aux événements.
    if (SOUND && sound.isLoaded) c.onAudioReady();
    c.onVideoStatus(player.status);
    return () => {
      c.dispose();
      ctrl.current = null;
    };
  }, [player, sound, setSettings, go, leaving, returnTo]);
  // Vue dès l'ouverture : si la lecture échouait d'une façon imprévue, elle ne se relancerait pas à chaque démarrage.
  useEffect(() => setSettings({ introSeen: true }), [setSettings]);
  useEffect(() => ctrl.current?.setVolume(volume), [volume]);
  useEffect(() => {
    if (soundStatus.isLoaded) ctrl.current?.onAudioReady();
  }, [soundStatus.isLoaded]);

  useEventListener(player, 'statusChange', ({ status }) => ctrl.current?.onVideoStatus(status));
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    ctrl.current?.onTime(currentTime);
  });
  useEventListener(player, 'playToEnd', () => ctrl.current?.onEnd());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => ctrl.current?.setActive(st === 'active'));
    return () => sub.remove();
  }, []);
  // Retour Android : passe l'introduction.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      ctrl.current?.skip();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: leaving }]} accessible={false}>
      <StatusBar hidden />
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} accessible accessibilityLabel={t('intro.a11y')} />
      <Pressable
        onPress={() => ctrl.current?.skip()}
        accessibilityRole="button"
        accessibilityLabel={t('intro.skip')}
        accessibilityHint={t('intro.skipHint')}
        hitSlop={14}
        style={({ pressed }) => [styles.skip, { top: insets.top + 10 }, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.skipText} maxFontSizeMultiplier={1.3}>
          {t('intro.skip')}
        </Text>
        <Icon name="chevron" size={14} color={colors.text} />
      </Pressable>
    </Animated.View>
  );
}

/** Toute erreur imprévue de l'introduction mène simplement à l'écran suivant, jamais à un écran d'erreur. */
class IntroBoundary extends React.Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? <View style={styles.root} /> : this.props.children;
  }
}

export function IntroScreen() {
  const { model, go, setSettings } = useStore();
  // Revue depuis les paramètres : on y revient ; premier lancement : écran titre.
  const [returnTo] = useState<Route>(() => afterIntroRoute(model.prevRoute));
  return (
    <IntroBoundary
      onError={() => {
        setSettings({ introSeen: true });
        go(returnTo);
      }}
    >
      <IntroPlayer returnTo={returnTo} />
    </IntroBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  skip: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(11,10,10,0.55)',
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  skipText: { fontFamily: fonts.uiBold, fontSize: 14, color: colors.text },
});
