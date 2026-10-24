/**
 * Pilote de la cinématique d'introduction, sans React ni module natif (testable) :
 * une vidéo muette (expo-video) et sa bande-son (expo-audio, dans la session audio du
 * jeu : bouton silencieux respecté, musique de l'utilisateur jamais coupée), lancées
 * ensemble, resynchronisées, mises en pause en arrière-plan, et une seule fin.
 *
 * La fin est garantie : vidéo terminée, « Passer », erreur de lecture ou délai de
 * démarrage dépassé mènent tous, une seule fois, à `onFinish`.
 */
import { playerVolume } from '../audio/controller';
import { INTRO_DURATION } from './script';

export interface VideoLike {
  play(): void;
  pause(): void;
  currentTime: number;
}

export interface AudioLike {
  play(): void;
  pause(): void;
  volume: number;
  readonly currentTime: number;
  seekTo(seconds: number): Promise<unknown> | void;
}

export type FinishReason = 'ended' | 'skipped' | 'error' | 'timeout';
export type IntroPhase = 'loading' | 'playing' | 'paused' | 'done';

export interface IntroDeps {
  video: VideoLike;
  /** null : pas de bande-son (web, ou lecteur indisponible). */
  audio: AudioLike | null;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  /** Première image réellement lancée (l'introduction compte alors comme vue). */
  onStart?: () => void;
  onFinish: (reason: FinishReason) => void;
}

/** Au-delà, l'introduction est abandonnée : jamais d'écran noir qui s'éternise. */
export const START_TIMEOUT_MS = 8000;
/** Si la bande-son tarde (vidéo prête), on démarre sans l'attendre davantage. */
export const AUDIO_WAIT_MS = 1500;
/** Écart toléré entre l'image et le son avant de recaler le son. */
export const RESYNC_S = 0.12;
/** Fondu du son quand on passe l'introduction. */
export const SKIP_FADE_MS = 300;

/**
 * Volume de la bande-son d'après le curseur du jeu : 0 coupe ; la cinématique est un
 * peu plus présente que l'ambiance de fond (curseur par défaut 50 % ≈ −3 dB).
 */
export function introVolume(setting: number): number {
  if (!Number.isFinite(setting) || setting <= 0) return 0;
  return playerVolume(Math.min(1, setting * 1.6));
}

export class IntroController {
  private phase: IntroPhase = 'loading';
  private videoReady = false;
  private audioReady = false;
  private audioBroken = false;
  private active = true;
  private volume = 0;
  private startTimer: unknown = null;
  private audioTimer: unknown = null;
  private fadeTimers: unknown[] = [];

  constructor(private readonly deps: IntroDeps) {
    if (!deps.audio) this.audioBroken = true;
    this.startTimer = deps.setTimeout(() => this.finish('timeout'), START_TIMEOUT_MS);
  }

  get state() {
    return { phase: this.phase, videoReady: this.videoReady, audioReady: this.audioReady, audio: !this.audioBroken, active: this.active };
  }

  /** Volume du curseur (0 à 1). */
  setVolume(setting: number) {
    this.volume = introVolume(setting);
    this.withAudio((a) => {
      a.volume = this.volume;
    });
  }

  onVideoStatus(status: string) {
    if (this.phase === 'done') return;
    if (status === 'error') return this.finish('error');
    if (status !== 'readyToPlay' || this.videoReady) return;
    this.videoReady = true;
    if (this.audioReady || this.audioBroken) this.tryStart();
    else this.audioTimer = this.deps.setTimeout(() => this.giveUpAudio(), AUDIO_WAIT_MS);
  }

  onAudioReady() {
    if (this.phase === 'done' || this.audioBroken || this.audioReady) return;
    this.audioReady = true;
    if (this.videoReady) this.tryStart();
  }

  /** Lecteur audio en échec : la vidéo continue, muette (le texte porte le récit). */
  onAudioError() {
    this.audioBroken = true;
    if (this.videoReady && this.phase === 'loading') this.tryStart();
  }

  /** Temps de la vidéo (événement timeUpdate). */
  onTime(t: number) {
    if (this.phase !== 'playing' || !Number.isFinite(t)) return;
    if (t >= INTRO_DURATION - 0.05) return this.finish('ended');
    this.withAudio((a) => {
      const drift = Math.abs(a.currentTime - t);
      if (Number.isFinite(drift) && drift > RESYNC_S) void a.seekTo(t);
    });
  }

  onEnd() {
    this.finish('ended');
  }

  skip() {
    this.finish('skipped');
  }

  /** Premier plan (true) ou arrière-plan, appel, verrouillage (false). */
  setActive(active: boolean) {
    this.active = active;
    if (this.phase === 'playing' && !active) {
      this.call(() => this.deps.video.pause());
      this.withAudio((a) => a.pause());
      this.phase = 'paused';
    } else if (this.phase === 'paused' && active) {
      this.resume();
    } else if (this.phase === 'loading' && active && this.videoReady && (this.audioReady || this.audioBroken)) {
      this.tryStart();
    }
  }

  private giveUpAudio() {
    this.audioTimer = null;
    if (this.phase !== 'loading' || this.audioReady) return;
    this.audioBroken = true;
    this.tryStart();
  }

  private tryStart() {
    if (this.phase !== 'loading' || !this.videoReady || !this.active) return;
    this.clear();
    this.phase = 'playing';
    this.call(() => this.deps.video.play());
    this.withAudio((a) => {
      a.volume = this.volume;
      a.play();
    });
    this.deps.onStart?.();
  }

  private resume() {
    this.phase = 'playing';
    const t = this.deps.video.currentTime;
    this.withAudio((a) => {
      if (Number.isFinite(t)) void a.seekTo(t);
    });
    this.call(() => this.deps.video.play());
    this.withAudio((a) => a.play());
  }

  private finish(reason: FinishReason) {
    if (this.phase === 'done') return;
    const wasPlaying = this.phase === 'playing';
    this.phase = 'done';
    this.clear();
    this.call(() => this.deps.video.pause());
    if (reason === 'skipped' && wasPlaying) this.fadeOutAudio();
    else this.withAudio((a) => a.pause());
    this.deps.onFinish(reason);
  }

  /** Sur « Passer » : le son s'éteint en 300 ms au lieu d'être coupé net. */
  private fadeOutAudio() {
    const steps = 6;
    const from = this.volume;
    for (let i = 1; i <= steps; i += 1) {
      this.fadeTimers.push(
        this.deps.setTimeout(() => {
          this.withAudio((a) => {
            a.volume = (from * (steps - i)) / steps;
            if (i === steps) a.pause();
          });
        }, (SKIP_FADE_MS * i) / steps),
      );
    }
  }

  /** Arrête tout (démontage de l'écran). */
  dispose() {
    this.clear();
    for (const id of this.fadeTimers) this.deps.clearTimeout(id);
    this.fadeTimers = [];
    this.phase = 'done';
    this.call(() => this.deps.video.pause());
    this.withAudio((a) => a.pause());
  }

  private clear() {
    if (this.startTimer !== null) this.deps.clearTimeout(this.startTimer);
    if (this.audioTimer !== null) this.deps.clearTimeout(this.audioTimer);
    this.startTimer = null;
    this.audioTimer = null;
  }

  private withAudio(fn: (a: AudioLike) => void) {
    const a = this.deps.audio;
    if (!a || this.audioBroken) return;
    try {
      fn(a);
    } catch {
      this.audioBroken = true;
    }
  }

  private call(fn: () => void) {
    try {
      fn();
    } catch {
      // lecteur vidéo déjà libéré : rien à faire
    }
  }
}
