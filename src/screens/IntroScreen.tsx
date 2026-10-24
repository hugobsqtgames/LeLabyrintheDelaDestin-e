/**
 * Cinématique d'introduction (44 s) : au tout premier lancement, puis à la demande
 * (Paramètres › Revoir l'introduction).
 *
 * - Vidéo muette (expo-video) + bande-son (expo-audio, session audio du jeu : le
 *   bouton silencieux est respecté, la musique de l'utilisateur n'est pas coupée).
 * - Textes superposés, traduits, synchronisés sur l'image (src/intro/script.ts) :
 *   nets à toutes les tailles d'écran, lus par VoiceOver.
 * - « Passer » visible dès la première image ; fin, erreur ou lenteur de lecture
 *   mènent toujours à l'écran suivant, une seule fois.
 */
import { useEventListener } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Platform, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { type FinishReason, IntroController } from '../intro/controller';
import { CUES, type Cue, dayAt, radioProgress } from '../intro/script';
import { type Route, useStore } from '../store/GameStore';
import { afterIntroRoute } from '../store/navigation';
import { Icon } from '../ui/icons';
import { colors, fonts, MAX_SCALE_UI, NATIVE_DRIVER } from '../ui/theme';

const VIDEO = require('../../assets/video/intro.mp4');
// Sur le web, la lecture automatique avec son est bloquée : l'introduction y est muette.
const SOUND = Platform.OS === 'web' ? null : require('../../assets/audio/intro.m4a');
const FADE_MS = 500;
const LEAVE_MS = 450;

/** Texte qui apparaît et disparaît en fondu (pilote natif : opacité seulement). */
function Fade({ visible, instant, style, children }: { visible: boolean; instant: boolean; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: visible ? 1 : 0, duration: instant ? 0 : FADE_MS, useNativeDriver: NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [visible, instant, v]);
  return (
    <Animated.View pointerEvents="none" style={[style, { opacity: v }]}>
      {children}
    </Animated.View>
  );
}

function CueView({ cue, time, instant, top }: { cue: Cue; time: number; instant: boolean; top: number }) {
  const t = useT();
  const visible = time > cue.from && time < cue.to;
  const text = t(`intro.${cue.id}`);
  switch (cue.style) {
    case 'label':
      return (
        <Fade visible={visible} instant={instant} style={styles.labelWrap}>
          <Text style={styles.label} maxFontSizeMultiplier={1.2}>
            {text.toUpperCase()}
          </Text>
        </Fade>
      );
    case 'line':
      return (
        <Fade visible={visible} instant={instant} style={styles.lineWrap}>
          <Text style={styles.line} maxFontSizeMultiplier={MAX_SCALE_UI}>
            {text}
          </Text>
        </Fade>
      );
    case 'radio': {
      const shown = text.slice(0, Math.round(text.length * radioProgress(time)));
      return (
        <Fade visible={visible} instant={instant} style={[styles.radioWrap, { top: top + 64 }]}>
          <View style={styles.radioBox} accessible accessibilityLabel={text}>
            <Text style={styles.radioLabel} maxFontSizeMultiplier={1.2}>
              {t('intro.radioLabel')}
            </Text>
            <Text style={styles.radio} maxFontSizeMultiplier={1.2}>
              {shown}
            </Text>
          </View>
        </Fade>
      );
    }
    case 'days': {
      const day = dayAt(time);
      return (
        <>
          <Fade visible={visible} instant={instant} style={styles.daysWrap}>
            <Text style={styles.days} maxFontSizeMultiplier={1.2}>
              {`${t('intro.day').toUpperCase()} ${day} / 7`}
            </Text>
            <View style={styles.ticks}>
              {Array.from({ length: 7 }, (_, i) => (
                <View key={i} style={[styles.tick, i < day && styles.tickOn]} />
              ))}
            </View>
          </Fade>
          <Fade visible={visible && time < cue.from + 3.6} instant={instant} style={styles.lineWrap}>
            <Text style={styles.line} maxFontSizeMultiplier={MAX_SCALE_UI}>
              {text}
            </Text>
          </Fade>
        </>
      );
    }
    case 'title':
      return (
        <Fade visible={visible} instant={instant} style={styles.titleWrap}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2} accessibilityRole="header">
            Valombre
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            {text}
          </Text>
        </Fade>
      );
  }
}

function IntroPlayer({ returnTo }: { returnTo: Route }) {
  const { model, go, setSettings, reduceMotion } = useStore();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState(0);
  const [leaving] = useState(() => new Animated.Value(1));
  const volume = model.settings.volume;

  const player = useVideoPlayer(VIDEO, (p) => {
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
    setTime(currentTime);
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
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {CUES.map((cue) => (
          <CueView key={cue.id} cue={cue} time={time} instant={reduceMotion} top={insets.top} />
        ))}
      </View>
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

const shadow = { textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 1 } };

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
  labelWrap: { position: 'absolute', top: '15%', left: 24, right: 24, alignItems: 'center' },
  label: { fontFamily: fonts.mono, fontSize: 11.5, letterSpacing: 2.2, color: colors.rustBright, textAlign: 'center', ...shadow },
  lineWrap: { position: 'absolute', bottom: '17%', left: 28, right: 28, alignItems: 'center' },
  line: { fontFamily: fonts.title, fontSize: 32, lineHeight: 38, color: colors.paper, textAlign: 'center', ...shadow },
  radioWrap: { position: 'absolute', left: 20, right: 20 },
  radioBox: { backgroundColor: 'rgba(11,10,10,0.6)', borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(255,196,107,0.18)' },
  radioLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, color: colors.amber, opacity: 0.8 },
  radio: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: colors.amber, minHeight: 60 },
  daysWrap: { position: 'absolute', top: '11%', left: 24, right: 24, alignItems: 'center', gap: 10 },
  days: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 2.4, color: colors.paper, ...shadow },
  ticks: { flexDirection: 'row', gap: 6 },
  tick: { width: 10, height: 3, borderRadius: 2, backgroundColor: 'rgba(237,230,218,0.25)' },
  tickOn: { backgroundColor: colors.rustBright },
  titleWrap: { position: 'absolute', top: '60%', left: 24, right: 24, alignItems: 'center' },
  title: { fontFamily: fonts.title, fontSize: 64, lineHeight: 72, color: colors.paper, ...shadow },
  subtitle: { fontFamily: fonts.titleItalic, fontSize: 30, lineHeight: 36, color: colors.rustBright, ...shadow },
});
