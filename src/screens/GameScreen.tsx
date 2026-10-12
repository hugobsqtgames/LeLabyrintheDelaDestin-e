/**
 * Écran de jeu : bandeau, contenu de l'onglet actif, barre d'onglets et menu pause.
 * Consulter la fiche, le sac ou la carte ne modifie jamais la position dans l'histoire.
 */
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame, useStore } from '../store/GameStore';
import { TabBar, TopBar } from '../ui/components/Hud';
import { Sheet } from '../ui/components/Sheet';
import { Button, Screen } from '../ui/components/primitives';
import { colors, space, type } from '../ui/theme';
import { CharacterView } from './game/CharacterView';
import { ChronicleView } from './game/ChronicleView';
import { CombatView } from './game/CombatView';
import { EndingView } from './game/EndingView';
import { InventoryView } from './game/InventoryView';
import { MapView } from './game/MapView';
import { QuestsView } from './game/QuestsView';
import { StoryView } from './game/StoryView';

export function GameScreen({ initialPaused = false }: { initialPaused?: boolean }) {
  const game = useGame();
  const { model, setTab, go, openSaves, closeGame } = useStore();
  const [paused, setPaused] = useState(initialPaused);
  const insets = useSafeAreaInsets();
  const tab = model.tab;

  // Retour matériel Android : onglet → récit → pause. Jamais de sortie silencieuse.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (paused) setPaused(false);
      else if (tab !== 'story') setTab('story');
      else setPaused(true);
      return true;
    });
    return () => sub.remove();
  }, [paused, tab, setTab]);

  const p = game.player;
  const badges = {
    character: p.unspentStatPoints + p.unspentPerks > 0,
    inventory: Object.keys(game.ground).length > 0,
  };

  let body: React.ReactNode;
  if (tab === 'story') {
    if (game.ending) body = <EndingView game={game} />;
    else if (game.combat) body = <CombatView game={game} />;
    else body = <StoryView game={game} />;
  } else if (tab === 'character') body = <CharacterView game={game} />;
  else if (tab === 'inventory') body = <InventoryView game={game} />;
  else if (tab === 'map') body = <MapView game={game} />;
  else if (tab === 'quests') body = <QuestsView game={game} />;
  else body = <ChronicleView game={game} />;

  return (
    <Screen padded={false} edges={['top']}>
      <TopBar game={game} onPause={() => setPaused(true)} />
      {model.saveError && (
        <View style={styles.saveError}>
          <Text style={[type.uiSmall, { color: colors.paper }]}>Sauvegarde automatique impossible : {model.saveError}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>{body}</View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.surface }}>
        <TabBar tab={tab} onChange={setTab} badges={badges} />
      </View>

      <Sheet visible={paused} onClose={() => setPaused(false)} title="Pause">
        <Text style={[type.bodySmall, { marginBottom: space.lg }]}>
          {model.slot !== null
            ? `Partie sauvegardée automatiquement dans l’emplacement ${model.slot} après chaque décision.`
            : 'Partie de démonstration : aucune sauvegarde.'}
        </Text>
        <View style={{ gap: space.sm }}>
          <Button label="Reprendre" icon="chevron" onPress={() => setPaused(false)} />
          {model.slot !== null && (
            <Button
              label="Copier vers un autre emplacement"
              icon="save"
              variant="secondary"
              onPress={() => {
                setPaused(false);
                openSaves('copy');
              }}
            />
          )}
          <Button
            label="Paramètres"
            icon="gear"
            variant="secondary"
            onPress={() => {
              setPaused(false);
              go('settings');
            }}
          />
          <Button
            label="Quitter vers le menu"
            variant="ghost"
            onPress={() => {
              setPaused(false);
              closeGame();
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  saveError: { backgroundColor: colors.rustDeep, paddingHorizontal: space.lg, paddingVertical: 6 },
});
