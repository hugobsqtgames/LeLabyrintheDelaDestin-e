#!/usr/bin/env python3
"""
Génère les ambiances musicales du jeu (boucles sans couture), puis les encode
en AAC (.m4a) avec ffmpeg.

    python3 scripts/generate-ambience.py            # toutes les pistes
    python3 scripts/generate-ambience.py marais     # une seule
    python3 scripts/generate-ambience.py --wav DIR  # aussi les WAV (contrôle)

Principes (pensés pour un haut-parleur d'iPhone, et pour accompagner la lecture) :
- de la musique douce plutôt que des bruits : nappes d'accords, notes de cloche
  espacées avec écho, textures discrètes (vent, eau) ;
- l'énergie est placée entre 150 Hz et 3 kHz, là où un téléphone restitue le son
  (sous 200 Hz, un haut-parleur de téléphone ne produit presque rien) ;
- aucune attaque brutale : chaque note monte en au moins 25 ms, rien ne claque ;
- niveau modéré (≈ −20 LUFS, crêtes sous −6 dBFS), le curseur de volume du jeu
  l'abaisse encore ;
- boucle parfaite : chaque événement est posé « en anneau » (ce qui dépasse la
  fin reprend au début) et la réverbération est circulaire ; la musique respire
  plus doucement au point de bouclage pour masquer la reprise du lecteur.
Tout est synthétisé. Dépendances : numpy, ffmpeg.
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR = 22050
# Longueur exacte en blocs AAC (1024 échantillons) : sans cela l'encodeur complète
# le dernier bloc avec du silence, et l'iPhone entend un trou à chaque bouclage.
N = 1034 * 1024
DUR = N / SR  # ≈ 48,02 s
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
t = np.arange(N) / SR
TOP = 3400.0  # rien au-dessus : doux et sans sifflement


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf, event, at):
    """Ajoute un événement à la position `at` (secondes), en anneau (boucle sans couture)."""
    i = int(round(at * SR)) % N
    n = len(event)
    while n > 0:
        take = min(n, N - i)
        buf[i:i + take] += event[:take]
        event = event[take:]
        n -= take
        i = 0


def envelope(n, attack, release):
    """Enveloppe en cosinus surélevé : montée et descente sans angle (donc sans clic)."""
    e = np.ones(n)
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e[:a] = 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    e[-r:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(r) / r)
    return e


def pad(freq, dur, amp, rng, bright=1.0):
    """Note de nappe : harmoniques douces, deux voix légèrement désaccordées, chorus lent."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for detune, gain in [(-0.0025, 0.5), (0.0025, 0.5), (-0.5, 0.06)]:
        f0 = freq * (1 + detune) if detune > -0.4 else freq / 2
        wobble = 1 + 0.0015 * np.sin(2 * np.pi * rng.uniform(0.08, 0.2) * tt + rng.uniform(0, 6.28))
        phase = 2 * np.pi * np.cumsum(f0 * wobble) / SR
        k = 1
        while k * f0 < TOP and k <= 10:
            a = (1 / k ** 1.6) * np.exp(-(k * f0) / (1400 * bright))
            out += gain * a * np.sin(k * phase + rng.uniform(0, 6.28))
            k += 1
    return amp * out * envelope(n, min(3.0, dur * 0.35), min(3.5, dur * 0.4))


def bell(freq, amp, decay=2.2):
    """Note de cloche ou de piano feutré : attaque adoucie, extinction lente."""
    dur = decay * 3
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for p, a, d in [(1, 1.0, 1.0), (2, 0.32, 0.7), (3, 0.12, 0.5), (4.01, 0.05, 0.35)]:
        if freq * p < TOP:
            s += a * np.sin(2 * np.pi * freq * p * tt) * np.exp(-tt / (decay * d))
    return amp * s * envelope(n, 0.05, 0.4)


def pluck(freq, amp, dur=0.42):
    """Corde grave assourdie (ostinato du combat) : attaque de 25 ms, pas de claquement."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = sum((1 / k ** 1.3) * np.sin(2 * np.pi * freq * k * tt) * np.exp(-tt * (5 + 3 * k)) for k in range(1, 7) if freq * k < TOP)
    return amp * s * envelope(n, 0.025, 0.08)


def soft_noise(rng, lo, hi):
    """Bruit filtré, périodique sur la boucle (vent, eau), bords de bande adoucis."""
    spec = np.fft.rfft(rng.standard_normal(N))
    f = np.fft.rfftfreq(N, 1 / SR)
    g = np.exp(-0.5 * ((np.log(np.maximum(f, 1) / np.sqrt(lo * hi))) / (np.log(hi / lo) / 2.5)) ** 2)
    x = np.fft.irfft(spec * g, n=N)
    return x / (np.abs(x).max() + 1e-9)


def slow_swell(cycles, phase=0.0, low=0.4):
    """Modulation lente et périodique (nombre entier de cycles par boucle)."""
    return low + (1 - low) * (0.5 - 0.5 * np.cos(2 * np.pi * cycles * t / DUR + phase))


def reverb(x, rng, seconds=2.6, wet=0.35, damp=2200.0):
    """Réverbération circulaire (la boucle reste parfaite) : réponse en bruit amorti et assourdi."""
    n = int(seconds * SR)
    tt = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-tt * 6.9 / seconds)
    spec = np.fft.rfft(ir, n=n)
    f = np.fft.rfftfreq(n, 1 / SR)
    ir = np.fft.irfft(spec / (1 + (f / damp) ** 2), n=n)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    h = np.zeros(N)
    h[:n] = ir
    wet_sig = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(h), n=N)
    return (1 - wet) * x + wet * wet_sig * (np.std(x) / (np.std(wet_sig) + 1e-9))


def echo(x, delay, feedback=0.35, taps=4):
    """Écho circulaire (répétitions décroissantes)."""
    y = x.copy()
    for k in range(1, taps + 1):
        y += (feedback ** k) * np.roll(x, int(delay * k * SR))
    return y


def compose(rng, chords, melody_scale, register=0, bright=1.0, bells=7, bell_oct=0, pad_amp=0.16, bell_amp=0.11, bell_echo=0.42):
    """Nappe d'accords qui se relaient + mélodie de cloches espacées dans la gamme."""
    x = np.zeros(N)
    step = DUR / len(chords)
    for i, chord in enumerate(chords):
        for note in chord:
            # chaque accord déborde sur le suivant : les nappes se fondent
            place(x, pad(midi(note + register), step + 4.0, pad_amp / len(chord) * 3, rng, bright), i * step - 1.5)
    mel = np.zeros(N)
    times = np.sort(rng.uniform(2.5, DUR - 3.5, bells))
    last = None
    for at in times:
        choices = [m for m in melody_scale if last is None or abs(m - last) <= 7] or melody_scale
        m = choices[rng.integers(len(choices))]
        last = m
        place(mel, bell(midi(m + 12 * bell_oct), bell_amp * rng.uniform(0.7, 1.0)), at)
    x += echo(mel, bell_echo, 0.33, 3)
    return x


def breath(x, depth=0.55, width=2.6):
    """La musique respire plus bas au point de bouclage : la reprise du lecteur ne s'entend pas."""
    d = np.minimum(t, DUR - t)
    g = 1 - depth * np.exp(-(d / width) ** 2)
    return x * g


# Gammes (notes MIDI) et accords par région ---------------------------------

def ville(rng):
    # ré mineur : Dm – Bb – F – C, mélancolique et calme
    x = compose(rng, [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]], [62, 64, 65, 69, 72, 74, 77], register=12, bells=8, bell_amp=0.09)
    x += 0.035 * soft_noise(rng, 250, 1100) * slow_swell(3, 0.4, 0.3)  # vent léger
    return x


def carrieres(rng):
    # la mineur, plus sombre et resserré : Am – F – Dm – E (sous la terre)
    x = compose(rng, [[45, 52, 57, 60], [41, 48, 53, 57], [38, 45, 50, 53], [40, 47, 52, 56]], [69, 71, 72, 76, 79, 81], register=12, bright=0.8, bells=9, bell_amp=0.09, bell_echo=0.61)
    return x


def faubourgs(rng):
    # si mineur : Bm – G – Em – F#sus (zones désolées)
    x = compose(rng, [[47, 54, 59, 62], [43, 50, 55, 59], [40, 47, 52, 55], [42, 49, 54, 59]], [59, 61, 62, 66, 69, 71, 74], register=12, bells=6)
    x += 0.04 * soft_noise(rng, 300, 1400) * slow_swell(2, 1.1, 0.25)
    return x


def port(rng):
    # mi mineur : Em – C – G – D, avec un clapotis doux
    x = compose(rng, [[40, 47, 52, 55], [36, 43, 48, 52], [43, 50, 55, 59], [38, 45, 50, 54]], [64, 66, 67, 71, 74, 76], register=12, bells=7)
    x += 0.04 * soft_noise(rng, 450, 1900) * slow_swell(6, 0.0, 0.5)
    return x


def ecluse(rng):
    # fa majeur, la dernière étape : F – C – Dm – Bb, une lueur d'espoir
    x = compose(rng, [[53, 57, 60, 65], [48, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 62]], [65, 67, 69, 72, 74, 77], register=12, bright=1.1, bells=9, bell_amp=0.08)
    x += 0.035 * soft_noise(rng, 400, 2000) * slow_swell(4, 0.8, 0.4)
    return x


def marais(rng):
    # do mineur : Cm – Ab – Fm – G, brumeux
    x = compose(rng, [[48, 55, 60, 63], [44, 51, 56, 60], [41, 48, 53, 56], [43, 50, 55, 59]], [60, 62, 63, 67, 70, 72], register=12, bright=0.75, bells=6, bell_amp=0.09)
    x += 0.03 * soft_noise(rng, 200, 900) * slow_swell(2, 2.0, 0.3)
    return x


def barrage(rng):
    # sol mineur : Gm – Eb – Bb – D, ample
    x = compose(rng, [[43, 50, 55, 58], [39, 46, 51, 55], [46, 53, 58, 62], [38, 45, 50, 54]], [67, 69, 70, 74, 77, 79], register=12, bells=7)
    x += 0.03 * soft_noise(rng, 220, 1000) * slow_swell(3, 0.2, 0.5)
    return x


def combat(rng):
    # mi mineur, tendu mais pas agressif : ostinato de cordes graves à 100 bpm
    chords = [[40, 47, 52, 55], [36, 43, 48, 52], [45, 52, 57, 60], [47, 54, 59, 63]]
    x = compose(rng, chords, [64, 67, 71, 72, 74], register=12, pad_amp=0.12, bells=5, bell_amp=0.07)
    steps = int(round(DUR / (60 / 100 / 2)))
    eighth = DUR / steps  # ≈ 100 bpm, calé exactement sur la boucle
    per_chord = steps // len(chords)
    for k in range(steps):
        root = chords[min(k // per_chord, len(chords) - 1)][0] + 12
        note = root + (7 if k % 4 == 2 else 0) + (12 if k % 8 == 6 else 0)
        accent = 1.0 if k % 2 == 0 else 0.6
        place(x, pluck(midi(note + 12), 0.07 * accent), k * eighth)
    return x


TRACKS = {
    'ville': ville,
    'carrieres': carrieres,
    'port': port,
    'ecluse': ecluse,
    'combat': combat,
    'faubourgs': faubourgs,
    'marais': marais,
    'barrage': barrage,
}


def master(x, rng):
    x = reverb(x, rng)
    x = breath(x)
    x = x - x.mean()
    # niveau visé : RMS ≈ −21 dBFS ; limiteur doux pour garder les crêtes sous −6 dBFS
    x *= 10 ** (-21 / 20) / (np.sqrt(np.mean(x ** 2)) + 1e-12)
    ceiling = 10 ** (-6 / 20)
    return ceiling * np.tanh(x / ceiling)


def write_wav(path, x):
    data = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


def main():
    args = sys.argv[1:]
    keep = None
    if '--wav' in args:
        i = args.index('--wav')
        keep = args[i + 1]
        args = args[:i] + args[i + 2:]
        os.makedirs(keep, exist_ok=True)
    only = set(args)
    unknown = only - TRACKS.keys()
    if unknown:
        sys.exit(f'pistes inconnues : {", ".join(sorted(unknown))}')
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for i, (name, fn) in enumerate(TRACKS.items()):
            if only and name not in only:
                continue
            rng = np.random.default_rng(200 + i)
            x = master(fn(rng), rng)
            wav = os.path.join(keep or tmp, f'{name}.wav')
            write_wav(wav, x)
            dst = os.path.join(OUT, f'{name}.m4a')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '96k', dst], check=True)
            print(dst, os.path.getsize(dst) // 1024, 'Ko')


if __name__ == '__main__':
    main()
