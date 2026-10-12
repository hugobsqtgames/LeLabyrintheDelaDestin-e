/**
 * Racine de l'application : polices locales, zones de sécurité, persistance
 * AsyncStorage et garde-fou en cas d'erreur d'affichage.
 */
// Import par graisse : seules les six polices utilisées sont embarquées.
import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed/500Medium';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite/400Regular';
import { Spectral_400Regular } from '@expo-google-fonts/spectral/400Regular';
import { Spectral_400Regular_Italic } from '@expo-google-fonts/spectral/400Regular_Italic';
import { Spectral_600SemiBold } from '@expo-google-fonts/spectral/600SemiBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRouter } from './AppRouter';
import { CONTENT } from './content';
import { asyncStorageAdapter } from './persistence/asyncStorage';
import { SaveManager } from './persistence/saves';
import { GameProvider, useStore } from './store/GameStore';
import { Emblem } from './ui/art/Logo';
import { Button } from './ui/components/primitives';
import { colors, space } from './ui/theme';

class ErrorBoundary extends React.Component<{ children: React.ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.center}>
        <Emblem size={96} glow={false} />
        <Text style={styles.errTitle}>Quelque chose s’est brisé.</Text>
        <Text style={styles.errText}>Votre partie a été sauvegardée avant l’incident. Revenez au menu pour la reprendre.</Text>
        <Text style={styles.errDetail} numberOfLines={3}>
          {this.state.error.message}
        </Text>
        <Button
          label="Retour au menu"
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
  return (
    <ErrorBoundary onReset={() => closeGame()}>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpecialElite_400Regular,
    Spectral_400Regular,
    Spectral_400Regular_Italic,
    Spectral_600SemiBold,
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
  });
  const saves = useMemo(() => new SaveManager(asyncStorageAdapter, CONTENT), []);

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      {fontsLoaded || fontError ? (
        <GameProvider saves={saves}>
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
