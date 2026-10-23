/**
 * Ambiance musicale : une boucle par région ou lieu marquant (et une pour les combats), jouée
 * localement. Le volume vient des paramètres (0 = coupé, rien n'est lu), avec une courbe
 * perceptive (voir controller.ts).
 * L'ambiance respecte le mode silencieux de l'iPhone et se mélange à la
 * musique de l'utilisateur au lieu de l'interrompre.
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useStore } from '../store/GameStore';
import { AmbienceController } from './controller';
import { type TrackId, trackFor } from './tracks';

const TRACKS: Record<TrackId, number> = {
  ville: require('../../assets/audio/ville.m4a'),
  carrieres: require('../../assets/audio/carrieres.m4a'),
  faubourgs: require('../../assets/audio/faubourgs.m4a'),
  port: require('../../assets/audio/port.m4a'),
  ecluse: require('../../assets/audio/ecluse.m4a'),
  marais: require('../../assets/audio/marais.m4a'),
  barrage: require('../../assets/audio/barrage.m4a'),
  combat: require('../../assets/audio/combat.m4a'),
};

// Sur le web, la lecture automatique est bloquée : l'ambiance est réservée à l'application iPhone.
const controller =
  Platform.OS === 'web'
    ? null
    : new AmbienceController<TrackId>({
        createPlayer: () => createAudioPlayer(null),
        // Respecte le bouton silencieux de l'iPhone et se mélange à la musique de l'utilisateur.
        configure: () => setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }),
        sources: TRACKS,
        setInterval: (fn, ms) => setInterval(fn, ms),
        clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>),
      });

export function Ambience() {
  const { model, content } = useStore();
  // Tant que les paramètres ne sont pas relus, silence : un joueur qui a coupé le son ne doit rien entendre au lancement.
  const volume = model.settingsReady ? model.settings.volume : 0;
  const track = trackFor(
    model,
    content.regions,
    (id) => {
      const loc = content.scenes[id]?.location;
      return loc ? content.locations[loc]?.region : undefined;
    },
    (id) => content.scenes[id]?.location,
  );

  useEffect(() => {
    controller?.sync(track, volume);
  }, [track, volume]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => controller?.setActive(st === 'active'));
    return () => sub.remove();
  }, []);

  return null;
}
