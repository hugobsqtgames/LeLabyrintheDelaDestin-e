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
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRouter } from './AppRouter';
import { Ambience } from './audio/Ambience';
import { CONTENT } from './content';
import { asyncStorageAdapter } from './persistence/asyncStorage';
import { SaveManager } from './persistence/saves';
import { useT } from './i18n';
import { GameProvider, useStore } from './store/GameStore';
import { Emblem } from './ui/art/Logo';
import { Button } from './ui/components/primitives';
import { colors, space } from './ui/theme';

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
  const { closeGame } = useStore();
  const t = useT();
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

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      {fontsLoaded || fontError ? (
        <GameProvider saves={saves}>
          <Ambience />
          <Shell />
        </GameProvider>
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
