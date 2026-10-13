/**
 * Ambiance sonore : une boucle par région (et une pour les combats), jouée
 * localement. Le volume vient des paramètres (0 = coupé, rien n'est lu).
 * L'ambiance respecte le mode silencieux de l'iPhone et se mélange à la
 * musique de l'utilisateur au lieu de l'interrompre.
 */
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useStore } from '../store/GameStore';
import { type TrackId, trackFor } from './tracks';

const TRACKS: Record<TrackId, number> = {
  ville: require('../../assets/audio/ville.m4a'),
  carrieres: require('../../assets/audio/carrieres.m4a'),
  port: require('../../assets/audio/port.m4a'),
  ecluse: require('../../assets/audio/ecluse.m4a'),
  combat: require('../../assets/audio/combat.m4a'),
};

/**
 * Pilote du lecteur, hors de React : il garde un seul lecteur pour toute la
 * vie de l'application et gère fondus, changements de piste et pauses.
 */
class AmbienceController {
  private player: AudioPlayer | null = null;
  private track: TrackId | null = null;
  private volume = 0;
  private active = true;
  private timer: ReturnType<typeof setInterval> | null = null;
  private configured = false;

  private get p(): AudioPlayer | null {
    if (!this.player) {
      try {
        this.player = createAudioPlayer(null);
        this.player.loop = true;
      } catch {
        return null;
      }
    }
    return this.player;
  }

  private fade(target: number, ms: number, done?: () => void) {
    const p = this.p;
    if (!p) return;
    if (this.timer) clearInterval(this.timer);
    const from = p.volume;
    const steps = Math.max(1, Math.round(ms / 50));
    let k = 0;
    this.timer = setInterval(() => {
      k += 1;
      try {
        p.volume = from + ((target - from) * k) / steps;
      } catch {
        // ignoré
      }
      if (k >= steps) {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        done?.();
      }
    }, 50);
  }

  sync(track: TrackId | null, volume: number) {
    // Sur le web, les boucles AAC ne sont pas toujours décodables et la lecture
    // automatique est bloquée : l'ambiance est réservée à iOS et Android.
    if (Platform.OS === 'web') return;
    if (!this.configured) {
      this.configured = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => undefined);
    }
    const p = this.p;
    if (!p) return;
    const changed = track !== this.track;
    this.volume = volume;
    try {
      if (!track || volume <= 0) {
        this.track = track;
        this.fade(0, 400, () => p.pause());
        return;
      }
      if (changed) {
        const start = () => {
          try {
            p.replace(TRACKS[track]);
            p.loop = true;
            p.volume = 0;
            if (this.active) p.play();
            this.fade(this.volume, 1200);
          } catch {
            // Lecture impossible (web sans geste de l'utilisateur…) : silence.
          }
        };
        const hadTrack = this.track !== null && p.playing;
        this.track = track;
        if (hadTrack) this.fade(0, 600, start);
        else start();
      } else {
        if (this.active && !p.playing) p.play();
        this.fade(volume, 250);
      }
    } catch {
      // ignoré
    }
  }

  setActive(active: boolean) {
    this.active = active;
    if (Platform.OS === 'web') return;
    const p = this.p;
    if (!p) return;
    try {
      if (!active) p.pause();
      else if (this.track && this.volume > 0) p.play();
    } catch {
      // ignoré
    }
  }
}

const controller = new AmbienceController();

export function Ambience() {
  const { model, content } = useStore();
  const volume = model.settings.volume;
  const track = trackFor(model, content.regions, (id) => {
    const loc = content.scenes[id]?.location;
    return loc ? content.locations[loc]?.region : undefined;
  });

  useEffect(() => {
    controller.sync(track, volume);
  }, [track, volume]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => controller.setActive(st === 'active'));
    return () => sub.remove();
  }, []);

  return null;
}
