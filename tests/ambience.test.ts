/**
 * Ambiance musicale : pilote du lecteur (sans iPhone : lecteur simulé, horloge
 * simulée) et qualité des fichiers audio livrés.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AmbienceController, FADE_IN_MS, FADE_OUT_MS, playerVolume, type PlayerLike } from '../src/audio/controller';

type Track = 'a' | 'b' | 'c';
const SOURCES: Record<Track, number> = { a: 1, b: 2, c: 3 };

class FakePlayer implements PlayerLike {
  volume = 1;
  loop = false;
  playing = false;
  source: number | null = null;
  replaced: number[] = [];
  play() {
    if (this.source !== null) this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  replace(source: number) {
    this.source = source;
    this.playing = false;
    this.replaced.push(source);
  }
}

/** Horloge simulée : les intervalles avancent quand on appelle `advance`. */
function harness() {
  const player = new FakePlayer();
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { fn: () => void; ms: number; next: number }>();
  const ctrl = new AmbienceController<Track>({
    createPlayer: () => player,
    configure: () => Promise.resolve(),
    sources: SOURCES,
    setInterval: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { fn, ms, next: now + ms });
      return id;
    },
    clearInterval: (id) => {
      timers.delete(id as number);
    },
  });
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      let first: [number, { fn: () => void; ms: number; next: number }] | null = null;
      for (const e of timers) if (e[1].next <= end && (!first || e[1].next < first[1].next)) first = e;
      if (!first) break;
      now = first[1].next;
      first[1].next += first[1].ms;
      first[1].fn();
    }
    now = end;
  };
  return { player, ctrl, advance };
}

describe('volume perceptif', () => {
  it('0 coupe, 1 est le maximum, 50 % est nettement plus bas que la moitié de l’amplitude', () => {
    expect(playerVolume(0)).toBe(0);
    expect(playerVolume(-1)).toBe(0);
    expect(playerVolume(Number.NaN)).toBe(0);
    expect(playerVolume(1)).toBe(1);
    expect(playerVolume(3)).toBe(1);
    expect(playerVolume(0.5)).toBeLessThan(0.4);
    // monotone
    for (let v = 0; v < 1; v += 0.05) expect(playerVolume(v + 0.05)).toBeGreaterThanOrEqual(playerVolume(v));
  });
});

describe('pilote de l’ambiance', () => {
  it('démarre en fondu, sans à-coup', () => {
    const { player, ctrl, advance } = harness();
    ctrl.sync('a', 1);
    expect(player.source).toBe(1);
    expect(player.volume).toBe(0);
    expect(player.loop).toBe(true);
    advance(FADE_IN_MS / 2);
    expect(player.volume).toBeGreaterThan(0.3);
    expect(player.volume).toBeLessThan(0.7);
    advance(FADE_IN_MS);
    expect(player.volume).toBeCloseTo(1);
    expect(player.playing).toBe(true);
  });

  it('un changement de piste interrompu par un réglage de volume aboutit quand même (bug corrigé)', () => {
    const { player, ctrl, advance } = harness();
    ctrl.sync('a', 1);
    advance(3000);
    ctrl.sync('b', 1); // début du fondu de sortie de « a »
    advance(FADE_OUT_MS / 3);
    ctrl.sync('b', 0.8); // l'ancien code annulait le fondu : « b » ne se chargeait jamais
    advance(5000);
    expect(player.source).toBe(2);
    expect(player.playing).toBe(true);
    expect(player.volume).toBeCloseTo(playerVolume(0.8));
  });

  it('volume à zéro : fondu puis pause ; on reprend sans recharger', () => {
    const { player, ctrl, advance } = harness();
    ctrl.sync('a', 0.6);
    advance(3000);
    ctrl.sync('a', 0);
    advance(2000);
    expect(player.playing).toBe(false);
    ctrl.sync('a', 0.6);
    advance(2000);
    expect(player.playing).toBe(true);
    expect(player.replaced).toEqual([1]);
  });

  it('arrière-plan : pause immédiate ; premier plan : reprise', () => {
    const { player, ctrl, advance } = harness();
    ctrl.sync('a', 1);
    advance(3000);
    ctrl.setActive(false);
    expect(player.playing).toBe(false);
    ctrl.sync('b', 1); // changement de piste demandé pendant l'arrière-plan
    advance(3000);
    expect(player.playing).toBe(false);
    ctrl.setActive(true);
    advance(5000);
    expect(player.source).toBe(2);
    expect(player.playing).toBe(true);
  });

  it('un lecteur qui ne peut pas être créé ne fait jamais planter le jeu', () => {
    const ctrl = new AmbienceController<Track>({
      createPlayer: () => {
        throw new Error('pas d’audio');
      },
      configure: () => Promise.reject(new Error('session refusée')),
      sources: SOURCES,
      setInterval: () => 0,
      clearInterval: () => undefined,
    });
    expect(() => {
      ctrl.sync('a', 1);
      ctrl.setActive(false);
      ctrl.setActive(true);
      ctrl.sync(null, 0);
    }).not.toThrow();
  });

  it('propriété : après n’importe quelle suite d’événements, le lecteur finit dans l’état demandé', () => {
    let seed = 20261023;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const tracks: (Track | null)[] = ['a', 'b', 'c', null];
    let runs = 0;
    for (let run = 0; run < 2000; run += 1) {
      const { player, ctrl, advance } = harness();
      let want: Track | null = null;
      let vol = 0;
      let active = true;
      const steps = 1 + Math.floor(rnd() * 25);
      for (let i = 0; i < steps; i += 1) {
        const r = rnd();
        if (r < 0.5) {
          want = tracks[Math.floor(rnd() * tracks.length)];
          vol = rnd() < 0.15 ? 0 : Math.round(rnd() * 20) / 20;
          ctrl.sync(want, vol);
        } else if (r < 0.65) {
          active = rnd() < 0.6;
          ctrl.setActive(active);
        }
        advance(Math.floor(rnd() * 1200));
      }
      advance(6000); // laisser finir tous les fondus
      const audible = !!want && playerVolume(vol) > 0 && active;
      expect(player.playing, `essai ${run}`).toBe(audible);
      if (audible) {
        expect(player.source, `essai ${run}`).toBe(SOURCES[want as Track]);
        expect(player.volume, `essai ${run}`).toBeCloseTo(playerVolume(vol), 5);
      }
      expect(ctrl.state.fading, `essai ${run}`).toBe(false);
      runs += 1;
    }
    expect(runs).toBe(2000);
  });
});

const AUDIO = join(__dirname, '..', 'assets', 'audio');
const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasFfmpeg)('fichiers audio livrés', () => {
  const files = existsSync(AUDIO) ? readdirSync(AUDIO).filter((f) => f.endsWith('.m4a')) : [];
  it('les 8 pistes sont là', () => {
    expect(files.sort()).toEqual(['barrage.m4a', 'carrieres.m4a', 'combat.m4a', 'ecluse.m4a', 'faubourgs.m4a', 'marais.m4a', 'port.m4a', 'ville.m4a']);
  });
  for (const f of files) {
    it(`${f} : boucle exacte, niveau doux, pas de grave inaudible ni d’attaque brutale`, () => {
      const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', join(AUDIO, f), '-ac', '1', '-ar', '22050', '-f', 's16le', '-'], { maxBuffer: 64 << 20 });
      const x = new Float64Array(raw.length / 2);
      for (let i = 0; i < x.length; i += 1) x[i] = raw.readInt16LE(i * 2) / 32768;
      // Longueur multiple d'un bloc AAC : aucun silence ajouté, donc pas de trou au bouclage.
      expect(x.length % 1024).toBe(0);
      let peak = 0;
      let sum = 0;
      for (const v of x) {
        peak = Math.max(peak, Math.abs(v));
        sum += v * v;
      }
      const rmsDb = 10 * Math.log10(sum / x.length);
      expect(20 * Math.log10(peak)).toBeLessThan(-6); // crêtes sous −6 dBFS
      expect(rmsDb).toBeLessThan(-18);
      expect(rmsDb).toBeGreaterThan(-30);
      // Raccord : l'écart fin → début reste dans l'ordre des écarts ordinaires (pas de clic).
      const diffs = Array.from({ length: x.length - 1 }, (_, i) => Math.abs(x[i + 1] - x[i])).sort((a, b) => a - b);
      const typical = diffs[Math.floor(diffs.length * 0.999)];
      expect(Math.abs(x[0] - x[x.length - 1])).toBeLessThan(typical);
      // Aucune montée de plus de 12 dB en 10 ms (rien qui fasse sursauter).
      const w = 220;
      let prev = -1;
      let worst = 0;
      for (let i = 0; i + w <= x.length; i += w) {
        let e = 0;
        for (let j = i; j < i + w; j += 1) e += x[j] * x[j];
        const r = Math.sqrt(e / w);
        if (prev > 1e-4) worst = Math.max(worst, 20 * Math.log10(r / prev));
        prev = r;
      }
      expect(worst).toBeLessThan(12);
    });
  }
});
