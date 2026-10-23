/**
 * Pilote de l'ambiance musicale, sans React ni dépendance native directe (testable) :
 * un seul lecteur pour toute la vie de l'application, fondus, changements de piste,
 * pause en arrière-plan.
 *
 * Toujours ramené à un état cohérent : à chaque appel, on compare la piste voulue à
 * la piste réellement chargée, si bien qu'un fondu interrompu ne peut pas laisser
 * l'ancienne piste jouer à la place de la nouvelle.
 */

/** Ce dont le pilote a besoin d'un lecteur (sous-ensemble d'`AudioPlayer` d'expo-audio). */
export interface PlayerLike {
  volume: number;
  loop: boolean;
  readonly playing: boolean;
  play(): void;
  pause(): void;
  replace(source: number): void;
}

export interface AmbienceDeps<T extends string> {
  createPlayer: () => PlayerLike;
  configure: () => Promise<unknown>;
  sources: Record<T, number>;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
}

/**
 * Courbe de volume perceptive : l'oreille entend en décibels, pas en amplitude.
 * 50 % du curseur ≈ −9 dB, 25 % ≈ −18 dB ; 0 coupe.
 */
export function playerVolume(setting: number): number {
  if (!Number.isFinite(setting) || setting <= 0) return 0;
  return Math.min(1, setting) ** 1.5;
}

export const FADE_IN_MS = 1500;
export const FADE_OUT_MS = 700;
const STEP_MS = 50;

export class AmbienceController<T extends string> {
  private player: PlayerLike | null = null;
  private broken = false;
  /** Piste réellement chargée dans le lecteur. */
  private loaded: T | null = null;
  /** Piste et volume voulus (derniers demandés). */
  private target: T | null = null;
  private setting = 0;
  private active = true;
  private timer: unknown = null;
  private configured = false;

  constructor(private readonly deps: AmbienceDeps<T>) {}

  private get p(): PlayerLike | null {
    if (this.broken) return null;
    if (!this.player) {
      try {
        this.player = this.deps.createPlayer();
        this.player.loop = true;
      } catch {
        this.broken = true;
        return null;
      }
    }
    return this.player;
  }

  private stopFade() {
    if (this.timer !== null) this.deps.clearInterval(this.timer);
    this.timer = null;
  }

  private fade(to: number, ms: number, done?: () => void) {
    const p = this.p;
    if (!p) return;
    this.stopFade();
    const from = safeVolume(p);
    const steps = Math.max(1, Math.round(ms / STEP_MS));
    let k = 0;
    this.timer = this.deps.setInterval(() => {
      k += 1;
      try {
        p.volume = from + ((to - from) * k) / steps;
      } catch {
        // lecteur indisponible : ignoré
      }
      if (k >= steps) {
        this.stopFade();
        done?.();
      }
    }, STEP_MS);
  }

  /** Demande une piste et un volume (0 à 1, valeur du curseur). Peut être appelé à tout moment. */
  sync(track: T | null, setting: number) {
    if (!this.configured) {
      this.configured = true;
      this.deps.configure().catch(() => undefined);
    }
    this.target = track;
    this.setting = setting;
    this.reconcile();
  }

  /** L'application passe au premier plan (true) ou en arrière-plan (false). */
  setActive(active: boolean) {
    this.active = active;
    const p = this.p;
    if (!p) return;
    try {
      if (!active) {
        this.stopFade();
        p.pause();
      } else this.reconcile();
    } catch {
      // ignoré
    }
  }

  private reconcile() {
    const p = this.p;
    if (!p) return;
    const want = this.target;
    const vol = playerVolume(this.setting);
    try {
      if (!want || vol <= 0 || !this.active) {
        // Silence voulu : fondu puis pause (la piste reste chargée pour une reprise rapide).
        if (!this.active) {
          this.stopFade();
          p.pause();
        } else this.fade(0, FADE_OUT_MS / 2, () => p.pause());
        return;
      }
      if (this.loaded !== want) {
        const load = () => {
          // Entre-temps, la demande a pu changer : on repart toujours de la dernière.
          if (this.target !== want || !this.active) return this.reconcile();
          try {
            p.replace(this.deps.sources[want]);
            p.loop = true;
            p.volume = 0;
            this.loaded = want;
            p.play();
            this.fade(playerVolume(this.setting), FADE_IN_MS);
          } catch {
            // lecture impossible : silence plutôt qu'un plantage
          }
        };
        if (this.loaded !== null && p.playing) this.fade(0, FADE_OUT_MS, load);
        else load();
        return;
      }
      if (!p.playing) p.play();
      this.fade(vol, 250);
    } catch {
      // ignoré
    }
  }

  /** État observable (tests). */
  get state() {
    return { loaded: this.loaded, target: this.target, active: this.active, fading: this.timer !== null };
  }
}

function safeVolume(p: PlayerLike): number {
  try {
    const v = p.volume;
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}
