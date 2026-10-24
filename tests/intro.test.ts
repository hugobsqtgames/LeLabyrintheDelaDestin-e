/**
 * Cinématique d'introduction : minutage, textes, pilote de lecture (vidéo et son
 * simulés, horloge simulée), navigation, paramètres et fichiers livrés.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trackFor } from '../src/audio/tracks';
import { EN } from '../src/i18n/en';
import { FR } from '../src/i18n/fr';
import { AUDIO_WAIT_MS, type AudioLike, type FinishReason, introVolume, IntroController, RESYNC_S, SKIP_FADE_MS, START_TIMEOUT_MS, type VideoLike } from '../src/intro/controller';
import { CUE_FADE, CUES, cueOpacity, DAY_CUTS, dayAt, INTRO_DURATION, radioProgress, visibleCues } from '../src/intro/script';
import { afterIntroRoute, launchRoute, parentRoute } from '../src/store/navigation';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from '../src/store/settings';

const ROOT = join(__dirname, '..');
const TIMELINE = JSON.parse(readFileSync(join(ROOT, 'cinematic', 'timeline.json'), 'utf8'));

describe('minutage', () => {
  it('la durée et les coupes du voyage sont celles du rendu (cinematic/timeline.json)', () => {
    expect(INTRO_DURATION).toBe(TIMELINE.duration);
    expect(DAY_CUTS).toEqual(TIMELINE.events.dayCuts);
    expect(INTRO_DURATION).toBeGreaterThanOrEqual(30);
    expect(INTRO_DURATION).toBeLessThanOrEqual(50);
  });

  it('les plans couvrent tout le film, sans trou', () => {
    const shots = [...TIMELINE.shots].sort((a: { from: number }, b: { from: number }) => a.from - b.from);
    expect(shots[0].from).toBe(0);
    let end = 0;
    for (const s of shots) {
      expect(s.to).toBeGreaterThan(s.from);
      expect(s.from).toBeLessThanOrEqual(end + 1e-9);
      end = Math.max(end, s.to);
    }
    expect(end).toBe(INTRO_DURATION);
    // Tous les instants des événements (bruitages, cloches, coupes) tombent dans le film.
    const { tuneKeys, ...events } = TIMELINE.events;
    const times = [...(Object.values(events).flat(2) as number[]), ...tuneKeys.map((k: number[]) => k[0])];
    for (const v of times) expect(v >= 0 && v <= INTRO_DURATION, String(v)).toBe(true);
  });

  it('chaque texte tient dans le film et laisse le temps de le lire', () => {
    for (const c of CUES) {
      expect(c.from).toBeGreaterThanOrEqual(0);
      expect(c.to).toBeLessThanOrEqual(INTRO_DURATION);
      expect(c.to - c.from, c.id).toBeGreaterThanOrEqual(3.5);
    }
  });

  it('jamais deux phrases au même endroit de l’écran en même temps', () => {
    const bottom = CUES.filter((c) => c.style === 'line' || c.style === 'days');
    for (let t = 0; t < INTRO_DURATION; t += 0.05) {
      const at = bottom.filter((c) => t > c.from && t < c.to);
      expect(at.length, `t = ${t.toFixed(2)}`).toBeLessThanOrEqual(1);
    }
  });

  it('fondus : 0 hors du texte, 1 au milieu, montée et descente progressives', () => {
    for (const c of CUES) {
      expect(cueOpacity(c, c.from - 0.1)).toBe(0);
      expect(cueOpacity(c, c.from)).toBe(0);
      expect(cueOpacity(c, (c.from + c.to) / 2)).toBe(1);
      expect(cueOpacity(c, c.from + CUE_FADE / 2)).toBeCloseTo(0.5, 5);
      expect(cueOpacity(c, Number.NaN)).toBe(0);
    }
    // Le titre final reste à pleine opacité jusqu'à la dernière image.
    const title = CUES.find((c) => c.style === 'title')!;
    expect(cueOpacity(title, INTRO_DURATION - 0.01)).toBe(1);
    expect(visibleCues(INTRO_DURATION / 2).every((v) => v.opacity > 0)).toBe(true);
  });

  it('compteur des jours : 1 à 7, au rythme des coupes', () => {
    expect(dayAt(0)).toBe(1);
    DAY_CUTS.forEach((cut, i) => {
      expect(dayAt(cut + 0.01)).toBe(i + 1);
    });
    expect(dayAt(INTRO_DURATION)).toBe(7);
  });

  it('le message radio se tape progressivement, en entier avant de disparaître', () => {
    const radio = CUES.find((c) => c.id === 'radio')!;
    expect(radioProgress(radio.from)).toBe(0);
    let prev = 0;
    for (let t = radio.from; t <= radio.to; t += 0.1) {
      const p = radioProgress(t);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
    expect(radioProgress(radio.to - 1.0)).toBe(1);
  });
});

describe('textes', () => {
  const keys = [...CUES.map((c) => `intro.${c.id}`), 'intro.day', 'intro.radioLabel', 'intro.skip', 'intro.skipHint', 'intro.a11y', 'settings.intro'];
  for (const [lang, dict] of [
    ['fr', FR],
    ['en', EN],
  ] as const)
    it(`${lang} : tous les textes de l’introduction existent`, () => {
      for (const k of keys) expect(dict[k]?.trim().length, `${lang} ${k}`).toBeGreaterThan(0);
    });
  it('l’anglais est traduit (pas une copie du français)', () => {
    for (const c of CUES) expect(EN[`intro.${c.id}`]).not.toBe(FR[`intro.${c.id}`]);
  });
  it('les phrases restent courtes : lisibles en quelques secondes', () => {
    for (const c of CUES.filter((x) => x.style !== 'radio')) {
      expect(FR[`intro.${c.id}`].length, c.id).toBeLessThanOrEqual(48);
      expect(EN[`intro.${c.id}`].length, c.id).toBeLessThanOrEqual(48);
    }
  });
});

// ---------------------------------------------------------------- pilote
class FakeVideo implements VideoLike {
  currentTime = 0;
  playing = false;
  plays = 0;
  throws = false;
  play() {
    if (this.throws) throw new Error('libéré');
    this.playing = true;
    this.plays += 1;
  }
  pause() {
    if (this.throws) throw new Error('libéré');
    this.playing = false;
  }
}
class FakeAudio implements AudioLike {
  volume = 1;
  currentTime = 0;
  playing = false;
  seeks: number[] = [];
  broken = false;
  play() {
    if (this.broken) throw new Error('session audio refusée');
    this.playing = true;
  }
  pause() {
    if (this.broken) throw new Error('session audio refusée');
    this.playing = false;
  }
  seekTo(s: number) {
    if (this.broken) throw new Error('session audio refusée');
    this.seeks.push(s);
    this.currentTime = s;
  }
}

function harness({ audio = true }: { audio?: boolean } = {}) {
  const video = new FakeVideo();
  const sound = audio ? new FakeAudio() : null;
  let now = 0;
  let next = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const finishes: FinishReason[] = [];
  let starts = 0;
  const ctrl = new IntroController({
    video,
    audio: sound,
    setTimeout: (fn, ms) => {
      const id = next++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id as number);
    },
    onStart: () => {
      starts += 1;
    },
    onFinish: (r) => finishes.push(r),
  });
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      let first: [number, { at: number; fn: () => void }] | null = null;
      for (const e of timers) if (e[1].at <= end && (!first || e[1].at < first[1].at)) first = e;
      if (!first) break;
      timers.delete(first[0]);
      now = first[1].at;
      first[1].fn();
    }
    now = end;
  };
  return { video, sound, ctrl, finishes, advance, starts: () => starts, pending: () => timers.size };
}

describe('pilote de l’introduction', () => {
  it('volume : suit le curseur du jeu, 0 coupe', () => {
    expect(introVolume(0)).toBe(0);
    expect(introVolume(-1)).toBe(0);
    expect(introVolume(Number.NaN)).toBe(0);
    expect(introVolume(1)).toBe(1);
    expect(introVolume(0.5)).toBeGreaterThan(0.6);
    expect(introVolume(0.5)).toBeLessThan(0.8);
    for (let v = 0; v < 1; v += 0.05) expect(introVolume(v + 0.05)).toBeGreaterThanOrEqual(introVolume(v));
  });

  it('démarre l’image et le son ensemble, une fois les deux prêts, au bon volume', () => {
    const h = harness();
    h.ctrl.setVolume(0.5);
    h.ctrl.onVideoStatus('loading');
    expect(h.video.playing).toBe(false);
    h.ctrl.onVideoStatus('readyToPlay');
    expect(h.video.playing).toBe(false);
    h.ctrl.onAudioReady();
    expect(h.video.playing).toBe(true);
    expect(h.sound!.playing).toBe(true);
    expect(h.sound!.volume).toBeCloseTo(introVolume(0.5));
    expect(h.starts()).toBe(1);
    // Un second « prêt » ne relance rien.
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    expect(h.video.plays).toBe(1);
  });

  it('son trop lent : l’image part quand même, sans le son', () => {
    const h = harness();
    h.ctrl.onVideoStatus('readyToPlay');
    h.advance(AUDIO_WAIT_MS - 1);
    expect(h.video.playing).toBe(false);
    h.advance(2);
    expect(h.video.playing).toBe(true);
    expect(h.sound!.playing).toBe(false);
    h.ctrl.onAudioReady(); // arrivé trop tard : ignoré, pas de son décalé
    expect(h.sound!.playing).toBe(false);
  });

  it('erreur de lecture vidéo : on passe à la suite, une seule fois', () => {
    const h = harness();
    h.ctrl.onVideoStatus('error');
    h.ctrl.onVideoStatus('error');
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    expect(h.finishes).toEqual(['error']);
    expect(h.video.playing).toBe(false);
  });

  it('vidéo qui ne charge jamais : abandon après le délai, jamais d’écran noir sans fin', () => {
    const h = harness();
    h.advance(START_TIMEOUT_MS - 1);
    expect(h.finishes).toEqual([]);
    h.advance(1);
    expect(h.finishes).toEqual(['timeout']);
  });

  it('fin normale : une seule fin, même si la fin de lecture arrive aussi', () => {
    const h = harness();
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    h.ctrl.onTime(20);
    h.ctrl.onTime(INTRO_DURATION - 0.01);
    h.ctrl.onEnd();
    expect(h.finishes).toEqual(['ended']);
    expect(h.video.playing).toBe(false);
    expect(h.sound!.playing).toBe(false);
  });

  it('« Passer » à tout moment : une seule fin ; pendant la lecture, le son s’éteint en fondu', () => {
    for (const when of ['avant', 'pendant', 'pause', 'après'] as const) {
      const h = harness();
      h.ctrl.setVolume(1);
      if (when !== 'avant') {
        h.ctrl.onVideoStatus('readyToPlay');
        h.ctrl.onAudioReady();
      }
      if (when === 'pause') h.ctrl.setActive(false);
      if (when === 'après') h.ctrl.onEnd();
      h.ctrl.skip();
      h.ctrl.skip();
      expect(h.finishes.length, when).toBe(1);
      expect(h.video.playing).toBe(false);
      if (when === 'pendant') {
        expect(h.sound!.playing).toBe(true); // le fondu commence
        h.advance(SKIP_FADE_MS / 2);
        expect(h.sound!.volume).toBeGreaterThan(0);
        expect(h.sound!.volume).toBeLessThan(1);
        h.advance(SKIP_FADE_MS);
        expect(h.sound!.volume).toBe(0);
      }
      h.advance(5000);
      expect(h.sound!.playing, when).toBe(false);
      expect(h.finishes.length, when).toBe(1);
    }
  });

  it('arrière-plan : tout se met en pause ; retour : le son se recale sur l’image', () => {
    const h = harness();
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    h.video.currentTime = 12.3;
    h.ctrl.setActive(false);
    expect(h.video.playing).toBe(false);
    expect(h.sound!.playing).toBe(false);
    h.ctrl.setActive(true);
    expect(h.video.playing).toBe(true);
    expect(h.sound!.playing).toBe(true);
    expect(h.sound!.seeks.at(-1)).toBeCloseTo(12.3);
    expect(h.finishes).toEqual([]);
  });

  it('application en arrière-plan pendant le chargement : rien ne démarre avant le retour', () => {
    const h = harness();
    h.ctrl.setActive(false);
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    expect(h.video.playing).toBe(false);
    h.ctrl.setActive(true);
    expect(h.video.playing).toBe(true);
  });

  it('synchronisation : le son est recalé au-delà de l’écart toléré, pas en deçà', () => {
    const h = harness();
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    h.sound!.currentTime = 10 + RESYNC_S / 2;
    h.ctrl.onTime(10);
    expect(h.sound!.seeks).toEqual([]);
    h.sound!.currentTime = 10.4;
    h.ctrl.onTime(10);
    expect(h.sound!.seeks).toEqual([10]);
  });

  it('sans bande-son (web) ou son en panne : l’image continue, rien ne plante', () => {
    const h = harness({ audio: false });
    h.ctrl.onVideoStatus('readyToPlay');
    expect(h.video.playing).toBe(true);
    const k = harness();
    k.sound!.broken = true;
    k.ctrl.onVideoStatus('readyToPlay');
    expect(() => k.ctrl.onAudioReady()).not.toThrow();
    expect(k.video.playing).toBe(true);
    expect(() => {
      k.ctrl.onTime(5);
      k.ctrl.setActive(false);
      k.ctrl.setActive(true);
      k.ctrl.skip();
    }).not.toThrow();
    expect(k.finishes).toEqual(['skipped']);
  });

  it('lecteur vidéo déjà libéré : aucune exception', () => {
    const h = harness();
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    h.video.throws = true;
    expect(() => {
      h.ctrl.setActive(false);
      h.ctrl.setActive(true);
      h.ctrl.skip();
      h.ctrl.dispose();
    }).not.toThrow();
  });

  it('démontage : plus aucun minuteur, plus de son', () => {
    const h = harness();
    h.ctrl.onVideoStatus('readyToPlay');
    h.ctrl.onAudioReady();
    h.ctrl.skip();
    h.ctrl.dispose();
    expect(h.pending()).toBe(0);
    expect(h.sound!.playing).toBe(false);
  });

  it('propriété : quelle que soit la suite d’événements, une fin au plus, et rien ne joue en arrière-plan', () => {
    let seed = 44;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let run = 0; run < 3000; run += 1) {
      const h = harness({ audio: rnd() < 0.85 });
      let active = true;
      const steps = 1 + Math.floor(rnd() * 30);
      for (let i = 0; i < steps; i += 1) {
        const r = rnd();
        if (r < 0.15) h.ctrl.onVideoStatus(['loading', 'readyToPlay', 'readyToPlay', 'error', 'idle'][Math.floor(rnd() * 5)]);
        else if (r < 0.28) h.ctrl.onAudioReady();
        else if (r < 0.45) {
          active = rnd() < 0.6;
          h.ctrl.setActive(active);
        } else if (r < 0.65) {
          const t = rnd() * (INTRO_DURATION + 2);
          h.video.currentTime = t;
          h.ctrl.onTime(t);
        } else if (r < 0.7) h.ctrl.skip();
        else if (r < 0.72) h.ctrl.onEnd();
        else if (r < 0.75 && h.sound) h.ctrl.onAudioError();
        h.advance(Math.floor(rnd() * 3000));
      }
      expect(h.finishes.length, `essai ${run}`).toBeLessThanOrEqual(1);
      if (h.finishes.length) expect(h.video.playing, `essai ${run}`).toBe(false);
      if (!active) expect(h.video.playing, `essai ${run}`).toBe(false);
      h.advance(START_TIMEOUT_MS + 1000);
      // Jamais bloqué : soit l'introduction joue, soit elle attend le retour au premier plan, soit elle est finie.
      const st = h.ctrl.state;
      expect(st.phase === 'playing' || st.phase === 'done' || (!active && (st.phase === 'paused' || st.phase === 'loading')), `essai ${run} : ${JSON.stringify(st)}`).toBe(true);
      h.ctrl.dispose();
    }
  });
});

describe('navigation et paramètres', () => {
  it('premier lancement : l’introduction remplace l’écran titre, jamais un autre écran', () => {
    expect(launchRoute('title', true)).toBe('intro');
    expect(launchRoute('title', false)).toBe('title');
    for (const r of ['game', 'create', 'saves', 'settings', 'memories', 'gallery'] as const) expect(launchRoute(r, true)).toBe(r);
  });
  it('après l’introduction : paramètres si elle y a été relancée, sinon l’écran titre', () => {
    expect(afterIntroRoute('settings')).toBe('settings');
    expect(afterIntroRoute('title')).toBe('title');
    expect(afterIntroRoute(undefined)).toBe('title');
    expect(parentRoute({ route: 'intro', game: null, savesMode: 'new', pendingChapter: null })).toBe('title');
  });
  it('pendant l’introduction, l’ambiance du jeu se tait (la cinématique a sa bande-son)', () => {
    expect(trackFor({ route: 'intro', game: null }, [], () => undefined)).toBeNull();
  });
  it('paramètre « introduction vue » : absent ou abîmé = pas vue ; remis à zéro par « Tout effacer »', () => {
    expect(DEFAULT_SETTINGS.introSeen).toBe(false);
    expect(sanitizeSettings({ ...DEFAULT_SETTINGS, introSeen: true }).introSeen).toBe(true);
    expect(sanitizeSettings({ ...DEFAULT_SETTINGS, introSeen: 'oui' as unknown as boolean }).introSeen).toBe(false);
    const old = { ...DEFAULT_SETTINGS } as Partial<Settings>;
    delete old.introSeen;
    expect(sanitizeSettings(old as Settings).introSeen).toBe(false);
  });
});

// ---------------------------------------------------------------- fichiers livrés
const hasFfmpeg = (() => {
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();
const VIDEO = join(ROOT, 'assets', 'video', 'intro.mp4');
const SOUND = join(ROOT, 'assets', 'audio', 'intro.m4a');

describe.skipIf(!hasFfmpeg)('fichiers livrés', () => {
  it('vidéo : H.264 1080×2340 à 30 i/s, 44 s, muette, démarrage rapide, poids raisonnable', () => {
    expect(existsSync(VIDEO)).toBe(true);
    const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).toString());
    const v = info.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
    expect(v.codec_name).toBe('h264');
    expect(v.pix_fmt).toBe('yuv420p');
    expect([v.width, v.height]).toEqual([1080, 2340]);
    expect(v.r_frame_rate).toBe('30/1');
    expect(info.streams.filter((s: { codec_type: string }) => s.codec_type === 'audio')).toEqual([]);
    expect(Math.abs(Number(info.format.duration) - INTRO_DURATION)).toBeLessThan(0.05);
    expect(statSync(VIDEO).size).toBeLessThan(12 * 1024 * 1024);
    // « faststart » : l'index (moov) est en tête du fichier, la lecture démarre sans tout lire.
    const head = readFileSync(VIDEO).subarray(0, 64 * 1024).toString('latin1');
    expect(head.indexOf('moov')).toBeGreaterThan(-1);
    expect(head.indexOf('moov')).toBeLessThan(head.indexOf('mdat') === -1 ? Infinity : head.indexOf('mdat'));
  });

  it('bande-son : 44 s stéréo, ≈ −16 LUFS, crêtes sous −1 dBTP, silence exact à la fin', () => {
    expect(existsSync(SOUND)).toBe(true);
    const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', SOUND]).toString());
    const a = info.streams[0];
    expect(a.codec_name).toBe('aac');
    expect(a.channels).toBe(2);
    expect(Number(info.format.duration)).toBeGreaterThanOrEqual(INTRO_DURATION - 0.05);
    const err = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${SOUND}" -af loudnorm=print_format=json -f null - 2>&1`]).toString();
    const j = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
    expect(Number(j.input_i)).toBeGreaterThan(-18);
    expect(Number(j.input_i)).toBeLessThan(-14);
    expect(Number(j.input_tp)).toBeLessThan(-1);
    const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', SOUND, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], { maxBuffer: 64 << 20 });
    const n = raw.length / 2;
    let tail = 0;
    const from = Math.round((INTRO_DURATION - 0.05) * 48000);
    for (let i = from; i < Math.min(n, Math.round(INTRO_DURATION * 48000)); i += 1) tail = Math.max(tail, Math.abs(raw.readInt16LE(i * 2)));
    expect(tail / 32768).toBeLessThan(0.002);
  });

  it('bande-son : aucune montée brusque hors des impacts voulus (coupes, cloche, souffle final)', () => {
    const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', SOUND, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], { maxBuffer: 64 << 20 });
    const n = raw.length / 2;
    const ev = TIMELINE.events;
    const allowed: number[] = [ev.bells[0], ...ev.dayCuts, ev.snap, ev.dawn, ev.boom];
    const w = 480;
    let prev = 0;
    for (let i = 0; i + w <= n; i += w) {
      let e = 0;
      for (let j = i; j < i + w; j += 1) {
        const v = raw.readInt16LE(j * 2) / 32768;
        e += v * v;
      }
      const r = Math.sqrt(e / w);
      if (prev > 1e-3 && 20 * Math.log10(r / prev) > 12) {
        const t = i / 48000;
        expect(allowed.some((a) => Math.abs(a - t) < 0.08), `montée brusque à ${t.toFixed(2)} s`).toBe(true);
      }
      prev = r;
    }
  });
});
