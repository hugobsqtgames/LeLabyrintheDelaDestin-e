/**
 * Routeur à état : l'écran affiché découle uniquement du modèle de l'application.
 */
import React from 'react';
import type { CharacterDraft } from './engine/types';
import type { SlotInfo } from './persistence/saves';
import { CreateScreen } from './screens/CreateScreen';
import { GalleryScreen } from './gallery/GalleryScreen';
import { GameScreen } from './screens/GameScreen';
import { SavesScreen } from './screens/SavesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TitleScreen } from './screens/TitleScreen';
import { useStore } from './store/GameStore';

/** Paramètres d'affichage initiaux (utilisés par la galerie de maquettes). */
export interface ScreenProps {
  create?: { initialDraft?: CharacterDraft; initialStep?: number };
  saves?: { initialSlots?: SlotInfo[] };
  game?: { initialPaused?: boolean; intro?: boolean };
}

export function AppRouter({ screenProps = {} }: { screenProps?: ScreenProps }) {
  const { model } = useStore();
  switch (model.route) {
    case 'create':
      return <CreateScreen {...screenProps.create} />;
    case 'game':
      return model.game ? <GameScreen {...screenProps.game} /> : <TitleScreen />;
    case 'saves':
      return <SavesScreen {...screenProps.saves} />;
    case 'settings':
      return <SettingsScreen />;
    case 'gallery':
      return <GalleryScreen />;
    case 'title':
    default:
      return <TitleScreen />;
  }
}
