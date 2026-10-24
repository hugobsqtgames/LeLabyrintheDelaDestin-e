/**
 * Bande-annonce d'introduction : minutage, textes, pilote de lecture (vidéo et son
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
import { INTRO_DURATION } from '../src/intro/script';
import { afterIntroRoute, launchRoute, parentRoute } from '../src/store/navigation';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from '../src/store/settings';

const ROOT = join(__dirname, '..');
const TIMELINE = JSON.parse(readFileSync(join(ROOT, 'cinematic', 'timeline.json'), 'utf8'));

const TEXT = JSON.parse(readFileSync(join(ROOT, 'cinematic', 'trailer-text.json'), 'utf8'));
type Shot = { id: string; from: number; to: number; art?: string; text?: string[] };

describe('minutage', () => {
  it('la durée est celle du rendu (cinematic/timeline.json), entre 30 et 50 s', () => {
    expect(INTRO_DURATION).toBe(TIMELINE.duration);
    expect(INTRO_DURATION).toBeGreaterThanOrEqual(30);
    expect(INTRO_DURATION).toBeLessThanOrEqual(50);
  });

  it('les plans s’enchaînent sans trou ni chevauchement, du début à la fin', () => {
    const shots: Shot[] = TIMELINE.shots;
    expect(shots[0].from).toBe(0);
    for (let i = 0; i < shots.length; i += 1) {
      expect(shots[i].to, shots[i].id).toBeGreaterThan(shots[i].from);
      if (i > 0) expect(shots[i].from, `${shots[i].id} à ${shots[i].from} s`).toBeCloseTo(shots[i - 1].to, 6);
    }
    expect(shots.at(-1)!.to).toBe(INTRO_DURATION);
  });

  it('chaque affiche est un vrai dessin du jeu, capturé pour le rendu', () => {
    for (const s of TIMELINE.shots as Shot[]) if (s.art) expect(existsSync(join(ROOT, 'cinematic', 'assets', `art-${s.art}.png`)), s.art).toBe(true);
    for (const p of ['maelle', 'kaz', 'ines', 'theo']) expect(existsSync(join(ROOT, 'cinematic', 'assets', `portrait-${p}.png`)), p).toBe(true);
  });

  it('coupes calées sur le tempo (120 bpm) et sur les coups de la musique', () => {
    const beat = 60 / TIMELINE.bpm;
    for (const h of TIMELINE.events.hits as number[]) {
      expect(h >= 0 && h <= INTRO_DURATION).toBe(true);
      // Chaque coup tombe sur une coupe de plan ou sur un titre qui claque.
      const cut = (TIMELINE.shots as Shot[]).some((s) => Math.abs(s.from - h) < 0.01);
      const slam = (Object.values(TIMELINE.texts) as number[][]).some(([a]) => a >= h && a - h < 0.1);
      expect(cut || slam, `coup à ${h} s`).toBe(true);
    }
    for (const s of (TIMELINE.shots as Shot[]).filter((x) => x.from >= 4 && x.from < 22)) expect(Math.abs(s.from / beat - Math.round(s.from / beat)), `${s.id} à ${s.from} s`).toBeLessThan(0.01);
  });

  it('un silence total avant le titre, puis le titre jusqu’à la dernière image', () => {
    const ev = TIMELINE.events;
    expect(ev.boom - ev.silence).toBeGreaterThanOrEqual(0.5);
    const title = (TIMELINE.shots as Shot[]).find((s) => s.id === 'title')!;
    expect(title.from).toBe(ev.boom);
    expect(title.to).toBe(INTRO_DURATION);
  });

  it('tous les instants (textes, bruitages) tombent dans le film ; chaque texte reste lisible', () => {
    const { tuneKeys, ...events } = TIMELINE.events;
    const times = [...(Object.values(events).flat(2) as number[]), ...tuneKeys.map((k: number[]) => k[0])];
    for (const v of times) expect(v >= 0 && v <= INTRO_DURATION, String(v)).toBe(true);
    for (const [key, [a, b]] of Object.entries(TIMELINE.texts) as [string, number[]][]) {
      expect(a < b, key).toBe(true);
      expect(b - a, key).toBeGreaterThanOrEqual(0.8);
    }
  });
});

describe('textes de la bande-annonce', () => {
  const needed = new Set<string>([...(Object.keys(TIMELINE.texts) as string[]).filter((k) => k !== 'titleWord'), 'radioLabel', 'choiceA', 'choiceB', 'roll', 'rollOk', 'enemy', 'boss', 'fallen']);
  for (const lang of ['fr', 'en'])
    it(`${lang} : chaque texte affiché existe`, () => {
      for (const k of needed) expect(TEXT[lang][k]?.trim().length, `${lang}.${k}`).toBeGreaterThan(0);
    });
  it('même jeu de textes en français et en anglais, et l’anglais est traduit', () => {
    expect(Object.keys(TEXT.en).sort()).toEqual(Object.keys(TEXT.fr).sort());
    for (const k of ['ago', 'silent', 'mutes', 'living', 'seconds', 'price', 'count', 'notall', 'days', 'wait', 'sub']) expect(TEXT.en[k], k).not.toBe(TEXT.fr[k]);
  });
  it('les titres restent courts : ils se lisent en un coup d’œil', () => {
    for (const lang of ['fr', 'en']) for (const k of ['ago', 'silent', 'mutes', 'living', 'seconds', 'price', 'survive', 'count', 'notall', 'days', 'barge', 'wait']) expect(TEXT[lang][k].length, `${lang}.${k}`).toBeLessThanOrEqual(32);
  });
  it('les mots du jeu sont ceux de l’application (stat, ennemi, sous-titre)', () => {
    expect(TEXT.fr.roll).toMatch(/^ASTUCE/);
    expect(TEXT.en.roll).toMatch(/^WITS/);
    expect(TEXT.fr.enemy).toBe('Le Berger');
    expect(TEXT.en.enemy).toBe('The Shepherd');
    expect(TEXT.fr.sub).toBe(FR['title.line2']);
    expect(TEXT.en.sub).toBe(EN['title.line2']);
  });
  for (const [lang, dict] of [
    ['fr', FR],
    ['en', EN],
  ] as const)
    it(`${lang} : textes de l’écran (Passer, description VoiceOver, Revoir l’introduction)`, () => {
      for (const k of ['intro.skip', 'intro.skipHint', 'intro.a11y', 'settings.intro']) expect(dict[k]?.trim().length, `${lang} ${k}`).toBeGreaterThan(0);
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
const VIDEOS = ['fr', 'en'].map((l) => join(ROOT, 'assets', 'video', `intro-${l}.mp4`));
const SOUND = join(ROOT, 'assets', 'audio', 'intro.m4a');

describe.skipIf(!hasFfmpeg)('fichiers livrés', () => {
  for (const VIDEO of VIDEOS)
    it(`${VIDEO.slice(-12)} : H.264 1080×2340 à 30 i/s, durée exacte, muette, démarrage rapide, poids raisonnable`, () => {
      expect(existsSync(VIDEO)).toBe(true);
      const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).toString());
      const v = info.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
      expect(v.codec_name).toBe('h264');
      expect(v.pix_fmt).toBe('yuv420p');
      expect([v.width, v.height]).toEqual([1080, 2340]);
      expect(v.r_frame_rate).toBe('30/1');
      expect(info.streams.filter((s: { codec_type: string }) => s.codec_type === 'audio')).toEqual([]);
      expect(Math.abs(Number(info.format.duration) - INTRO_DURATION)).toBeLessThan(0.05);
      expect(statSync(VIDEO).size).toBeLessThan(8 * 1024 * 1024);
      // « faststart » : l'index (moov) est en tête du fichier, la lecture démarre sans tout lire.
      const head = readFileSync(VIDEO).subarray(0, 64 * 1024).toString('latin1');
      expect(head.indexOf('moov')).toBeGreaterThan(-1);
      expect(head.indexOf('moov')).toBeLessThan(head.indexOf('mdat') === -1 ? Infinity : head.indexOf('mdat'));
    });

  it('bande-son : durée du film, stéréo, ≈ −15 LUFS, crêtes sous −1 dBTP, silence exact à la fin', () => {
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

  it('bande-son : aucune montée brusque hors des coups voulus (coupes, visages, titre)', () => {
    const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', SOUND, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], { maxBuffer: 64 << 20 });
    const n = raw.length / 2;
    const ev = TIMELINE.events;
    const allowed: number[] = [...ev.hits, ...ev.faces, ev.fall, ev.impact, ev.diceLand, ev.tap, ev.boom];
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
