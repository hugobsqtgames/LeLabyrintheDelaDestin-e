/**
 * Racine de l'application : polices locales, zones de sécurité, persistance
 * AsyncStorage et garde-fou en cas d'erreur d'affichage.
 */
// Import par graisse : seules les polices utilisées sont embarquées.
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { InterTight_500Medium } from '@expo-google-fonts/inter-tight/500Medium';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRouter } from './AppRouter';
import { Ambience } from './audio/Ambience';
import { CONTENT } from './content';
import { asyncStorageAdapter } from './persistence/asyncStorage';
import { SaveManager } from './persistence/saves';
import { useT } from './i18n';
import { promoParams, PromoRoot } from './promo/PromoRoot';
import { GameProvider, useStore } from './store/GameStore';
import { Emblem } from './ui/art/Logo';
import { Button } from './ui/components/primitives';
import { colors, space } from './ui/theme';

// L'écran de démarrage reste affiché jusqu'à ce que polices et paramètres soient prêts :
// ni écran de chargement de la mauvaise couleur, ni langue qui change sous les yeux.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
const hideSplash = () => {
  SplashScreen.hideAsync().catch(() => undefined);
};

/** Masque l'écran de démarrage une fois les paramètres relus. */
function SplashGate() {
  const { model } = useStore();
  useEffect(() => {
    if (model.settingsReady) hideSplash();
  }, [model.settingsReady]);
  return null;
}

/** Dernier filet : une erreur hors des écrans (fournisseur d'état, ambiance) ne ferme plus l'application. */
class RootBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean; key: number }> {
  state = { error: false, key: 0 };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch() {
    hideSplash();
  }

  render() {
    if (!this.state.error) return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
    return (
      <View style={styles.center}>
        <Emblem size={96} glow={false} />
        <Text style={styles.errTitle}>Valombre</Text>
        <Text style={styles.errText}>Un problème est survenu. Vos parties sont conservées.{'\n'}Something went wrong. Your games are safe.</Text>
        <Button label="Relancer · Restart" onPress={() => this.setState((st) => ({ error: false, key: st.key + 1 }))} />
      </View>
    );
  }
}

/** L'ambiance n'est jamais essentielle : si elle échoue, le jeu continue en silence. */
class Silent extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    return this.state.error ? null : this.props.children;
  }
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode; onReset: () => void; labels: { title: string; text: string; menu: string } }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.center}>
        <Emblem size={96} glow={false} />
        <Text style={styles.errTitle}>{this.props.labels.title}</Text>
        <Text style={styles.errText}>{this.props.labels.text}</Text>
        <Text style={styles.errDetail} numberOfLines={3}>
          {this.state.error.message}
        </Text>
        <Button
          label={this.props.labels.menu}
          onPress={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
        />
      </View>
    );
  }
}

function Shell() {
  const { closeGame, back, model } = useStore();
  const t = useT();
  const route = model.route;
  // Retour matériel Android : même parent que le bouton « Retour » de chaque écran.
  // Le jeu et la création (étape par étape) gèrent le leur ; sur l'écran titre, le système ferme l'application.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'title' || route === 'game' || route === 'create') return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [route, back]);
  return (
    <ErrorBoundary onReset={() => closeGame()} labels={{ title: t('crash.title'), text: t('crash.text'), menu: t('crash.menu') }}>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    JetBrainsMono_500Medium,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_600SemiBold,
  });
  const saves = useMemo(() => new SaveManager(asyncStorageAdapter, CONTENT), []);
  const [promo] = useState(promoParams);
  // Filet de sécurité : jamais bloqué sur l'écran de démarrage.
  useEffect(() => {
    const id = setTimeout(hideSplash, 6000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (promo && (fontsLoaded || fontError)) hideSplash();
  }, [promo, fontsLoaded, fontError]);

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      {(fontsLoaded || fontError) && promo ? (
        <PromoRoot id={promo.id} lang={promo.lang} textScale={promo.textScale} />
      ) : fontsLoaded || fontError ? (
        <RootBoundary>
          <GameProvider saves={saves} introOnLaunch>
            <SplashGate />
            <Silent>
              <Ambience />
            </Silent>
            <Shell />
          </GameProvider>
        </RootBoundary>
      ) : (
        <View style={styles.center}>
          <Emblem size={120} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  errTitle: { color: colors.text, fontSize: 22, textAlign: 'center' },
  errText: { color: colors.textDim, fontSize: 15, textAlign: 'center' },
  errDetail: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
});
