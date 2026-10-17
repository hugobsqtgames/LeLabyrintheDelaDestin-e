#!/usr/bin/env python3
"""
Génère les ambiances sonores du jeu (boucles sans couture), puis les encode
en AAC (.m4a) avec ffmpeg.

    python3 scripts/generate-ambience.py            # toutes les pistes
    python3 scripts/generate-ambience.py marais     # une seule

Tout est synthétisé : bruit mis en forme dans le domaine fréquentiel (donc
périodique, la boucle est parfaite), drones, gouttes, cloches lointaines,
claquements de dents, battements. Aucune ressource externe.
Dépendances : numpy, ffmpeg.
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR = 22050
DUR = 32.0
N = int(SR * DUR)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
t = np.arange(N) / SR


def shaped_noise(rng, lo, hi, tilt=0.0):
    """Bruit filtré passe-bande (périodique sur la durée de la boucle)."""
    spec = np.fft.rfft(rng.standard_normal(N))
    f = np.fft.rfftfreq(N, 1 / SR)
    gain = np.where((f >= lo) & (f <= hi), 1.0, 0.0)
    # bords adoucis
    gain *= np.clip((f - lo * 0.7) / (lo * 0.3 + 1e-9), 0, 1) if lo > 0 else 1
    gain *= np.clip((hi * 1.3 - f) / (hi * 0.3), 0, 1)
    if tilt:
        gain *= (np.maximum(f, 20) / 200.0) ** tilt
    x = np.fft.irfft(spec * gain, n=N)
    return x / (np.abs(x).max() + 1e-9)


def lfo(freq_cycles, phase=0.0, depth=1.0):
    """Modulation lente ; `freq_cycles` cycles entiers par boucle (sans couture)."""
    return 1 - depth * 0.5 * (1 - np.cos(2 * np.pi * freq_cycles * t / DUR + phase))


def tone(freq_cycles_exact, amp=1.0):
    """Sinusoïde dont la fréquence est arrondie pour boucler parfaitement."""
    k = round(freq_cycles_exact * DUR)
    return amp * np.sin(2 * np.pi * k * t / DUR)


def place(buf, event, at):
    """Ajoute un événement à la position `at` (secondes), en bouclant."""
    i = int(at * SR) % N
    n = len(event)
    end = i + n
    if end <= N:
        buf[i:end] += event
    else:
        buf[i:] += event[: N - i]
        buf[: end - N] += event[N - i :]


def bell(freq, dur=4.0, amp=0.3):
    tt = np.arange(int(dur * SR)) / SR
    partials = [(1, 1), (2.76, 0.45), (5.4, 0.25), (8.93, 0.12)]
    s = sum(a * np.sin(2 * np.pi * freq * p * tt) * np.exp(-tt * (1.2 + p * 0.6)) for p, a in partials)
    return amp * s


def drip(rng, amp=0.25):
    tt = np.arange(int(0.35 * SR)) / SR
    f0 = rng.uniform(900, 1700)
    f = f0 * (1 + 0.6 * np.exp(-tt * 40))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 18)
    # écho de caverne
    out = np.zeros(int(1.4 * SR))
    for k, (d, g) in enumerate([(0, 1), (0.21, 0.4), (0.47, 0.22), (0.83, 0.1)]):
        j = int(d * SR)
        out[j : j + len(s)] += g * s
    return amp * out


def clicks(rng, n=7, amp=0.12):
    """Claquements de dents lointains (le cliquetis des Muets)."""
    out = np.zeros(int((n * 0.11 + 0.3) * SR))
    for k in range(n):
        j = int((k * 0.11 + rng.uniform(0, 0.05)) * SR)
        L = int(0.012 * SR)
        burst = rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4))
        out[j : j + L] += burst * rng.uniform(0.5, 1)
    # passe-haut grossier : différence
    out = np.diff(out, prepend=0)
    return amp * out / (np.abs(out).max() + 1e-9)


def creak(rng, amp=0.15):
    dur = rng.uniform(0.8, 1.6)
    tt = np.arange(int(dur * SR)) / SR
    f = 70 + 40 * np.sin(np.pi * tt / dur) + 5 * rng.standard_normal(len(tt)).cumsum() / 200
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    env = np.sin(np.pi * tt / dur) ** 2
    return amp * saw * env


def thump(amp=0.6):
    tt = np.arange(int(0.25 * SR)) / SR
    f = 55 * (1 + np.exp(-tt * 30))
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14)


def city(rng):
    x = 0.55 * shaped_noise(rng, 60, 900, -0.6) * lfo(3, 0.3, 0.7)
    x += 0.18 * shaped_noise(rng, 1500, 4000) * lfo(5, 1.0, 0.9)
    x += tone(41, 0.05) + tone(61.5, 0.03)
    for at, f in [(3.0, 392), (17.5, 349)]:
        place(x, bell(f, 5, 0.12), at)
    for at in [9.0, 25.0]:
        place(x, clicks(rng, 8, 0.08), at)
    place(x, creak(rng, 0.06), 13.0)
    return x


def carrieres(rng):
    x = 0.35 * shaped_noise(rng, 30, 220, -1.0) * lfo(2, 0.0, 0.4)
    x += tone(55, 0.09) + tone(55.4, 0.08) + tone(82.5, 0.03)
    for k in range(14):
        place(x, drip(rng, rng.uniform(0.08, 0.2)), rng.uniform(0, DUR))
    place(x, clicks(rng, 10, 0.05), 21.0)
    return x


def port(rng):
    x = 0.5 * shaped_noise(rng, 120, 1800, -0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 16 * t / DUR) ** 2)
    x += 0.2 * shaped_noise(rng, 40, 200) * lfo(4, 2.0, 0.6)
    for at in [4.0, 15.0, 26.0]:
        place(x, creak(rng, 0.12), at)
    tt = np.arange(int(3.5 * SR)) / SR
    horn = (np.sin(2 * np.pi * 98 * tt) + 0.5 * np.sin(2 * np.pi * 147 * tt)) * np.sin(np.pi * tt / 3.5) ** 2
    place(x, 0.08 * horn, 10.0)
    return x


def ecluse(rng):
    x = 0.45 * shaped_noise(rng, 300, 3500, -0.2) * lfo(4, 0.5, 0.8)
    x += 0.3 * shaped_noise(rng, 80, 700) * (0.8 + 0.2 * np.sin(2 * np.pi * 11 * t / DUR))
    for k in range(9):
        tt = np.arange(int(0.18 * SR)) / SR
        f = rng.uniform(2500, 4200) * (1 + 0.25 * np.sin(2 * np.pi * 18 * tt))
        chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.18)
        place(x, 0.05 * chirp, rng.uniform(0, DUR))
    place(x, bell(523, 3, 0.05), 7.0)
    return x


def combat(rng):
    x = tone(49, 0.14) + tone(51.9, 0.1) + tone(73.5, 0.05)
    x += 0.3 * shaped_noise(rng, 50, 400) * lfo(8, 0.0, 0.5)
    x += 0.07 * shaped_noise(rng, 2000, 6000) * lfo(16, 0.0, 1.0)
    bpm = 75
    beat = 60 / bpm
    nbeats = int(DUR / beat)
    for k in range(nbeats):
        place(x, thump(0.5), k * (DUR / nbeats))
        place(x, thump(0.3), k * (DUR / nbeats) + 0.22)
    for at in [5.0, 19.0]:
        place(x, clicks(rng, 12, 0.1), at)
    return x


def wire_wind(rng):
    """Vent dans les câbles : sifflements tenus, lentement modulés."""
    x = np.zeros(N)
    for k, (f, cyc, ph) in enumerate([(620, 3, 0.4), (931, 5, 2.1), (1243, 2, 4.0)]):
        x += tone(f, 1.0) * lfo(cyc, ph, 1.0) * (0.5 + 0.5 * lfo(7 + k, ph * 2, 0.6))
    return x / (np.abs(x).max() + 1e-9)


def metal_groan(rng, dur=2.5, amp=0.1):
    """Long grincement de tôle : partiels inharmoniques qui glissent."""
    tt = np.arange(int(dur * SR)) / SR
    f0 = rng.uniform(140, 220)
    glide = 1 + 0.08 * np.sin(np.pi * tt / dur) + 0.01 * rng.standard_normal(len(tt)).cumsum() / 300
    s = sum(a * np.sin(2 * np.pi * np.cumsum(f0 * p * glide) / SR) for p, a in [(1, 1), (2.31, 0.5), (3.97, 0.3), (6.2, 0.15)])
    env = np.sin(np.pi * tt / dur) ** 3
    return amp * s * env


def clank(rng, amp=0.15):
    """Choc métallique lointain (rail, tampon de wagon)."""
    dur = 1.6
    tt = np.arange(int(dur * SR)) / SR
    f0 = rng.uniform(300, 480)
    s = sum(a * np.sin(2 * np.pi * f0 * p * tt) * np.exp(-tt * (3 + p * 1.5)) for p, a in [(1, 1), (1.47, 0.6), (2.83, 0.4), (4.1, 0.2)])
    L = int(0.01 * SR)
    s[:L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 5)) * 0.8
    return amp * s / (np.abs(s).max() + 1e-9)


def bark(rng, amp=0.08):
    """Aboiement lointain : formant bref, étouffé."""
    dur = 0.28
    tt = np.arange(int(dur * SR)) / SR
    f = rng.uniform(380, 460) * (1 + 0.3 * np.sin(np.pi * tt / dur))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)
    s *= np.sin(np.pi * tt / dur) ** 0.6 * np.exp(-tt * 6)
    s = np.convolve(s, np.ones(6) / 6, mode='same')  # étouffé par la distance
    return amp * s


def croak(rng, amp=0.06):
    """Coassement : train d'impulsions graves."""
    n = rng.integers(3, 7)
    rate = rng.uniform(18, 30)
    f0 = rng.uniform(180, 320)
    dur = n / rate + 0.1
    tt = np.arange(int(dur * SR)) / SR
    pulses = np.maximum(0, np.sin(2 * np.pi * rate * tt)) ** 4
    s = np.sin(2 * np.pi * f0 * tt) * pulses * np.exp(-tt * 2)
    return amp * s


def bubble(rng, amp=0.08):
    """Bulle qui crève à la surface : sinus montant, très bref."""
    dur = rng.uniform(0.05, 0.12)
    tt = np.arange(int(dur * SR)) / SR
    f0 = rng.uniform(150, 500)
    f = f0 * (1 + 2.5 * tt / dur)
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / dur * 4)


def moan(rng, dur=6.0, amp=0.06):
    """Plainte lointaine : voyelle tenue qui retombe."""
    tt = np.arange(int(dur * SR)) / SR
    f = rng.uniform(150, 190) * (1.1 - 0.2 * tt / dur + 0.02 * np.sin(2 * np.pi * 5 * tt))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph) + 0.1 * np.sin(5 * ph)
    return amp * s * np.sin(np.pi * tt / dur) ** 2


def faubourgs(rng):
    x = 0.3 * shaped_noise(rng, 40, 600, -0.8) * lfo(3, 1.2, 0.6)
    x += 0.07 * wire_wind(rng)
    x += 0.08 * shaped_noise(rng, 1800, 5000) * lfo(4, 0.7, 0.9)
    x += tone(36.7, 0.04)
    for at in [2.5, 14.0, 23.5]:
        place(x, metal_groan(rng, rng.uniform(2.0, 3.5), 0.09), at)
    for at in [8.0, 8.9, 27.0]:
        place(x, clank(rng, 0.12), at)
    for at in [19.0, 19.45, 20.3]:
        place(x, bark(rng, 0.07), at)
    place(x, clicks(rng, 7, 0.05), 11.5)
    return x


def marais(rng):
    x = 0.4 * shaped_noise(rng, 25, 160, -1.2) * lfo(2, 0.8, 0.4)
    x += tone(43.2, 0.08) + tone(43.6, 0.07) + tone(64.8, 0.025)
    # roseaux : bruit aigu en rafales
    x += 0.12 * shaped_noise(rng, 2500, 7000) * lfo(5, 0.3, 1.0) * lfo(3, 2.0, 0.7)
    # insectes : stridulation lointaine
    tt = t
    x += 0.012 * tone(4200, 1.0) * (np.sin(2 * np.pi * 480 * tt / DUR) > 0.3) * lfo(2, 3.0, 1.0)
    for k in range(10):
        place(x, croak(rng, rng.uniform(0.03, 0.07)), rng.uniform(0, DUR))
    for k in range(5):
        at = rng.uniform(0, DUR)
        for j in range(rng.integers(2, 6)):
            place(x, bubble(rng, rng.uniform(0.04, 0.1)), at + j * rng.uniform(0.08, 0.3))
    place(x, moan(rng, 6.5, 0.05), 17.0)
    return x


def barrage(rng):
    # grondement du déversoir : bruit large et grave, très dense
    x = 0.6 * shaped_noise(rng, 30, 1200, -0.9) * (0.85 + 0.15 * np.sin(2 * np.pi * 6 * t / DUR))
    x += 0.15 * shaped_noise(rng, 1500, 4500) * lfo(3, 0.5, 0.5)
    # bourdon du transformateur : 50 Hz, 100 Hz, harmoniques impaires
    hum = tone(50, 0.06) + tone(100, 0.07) + tone(150, 0.025) + tone(200, 0.02) + tone(300, 0.01)
    x += hum * (0.85 + 0.15 * lfo(4, 1.0, 1.0))
    # résonance métallique (conduites)
    for at in [6.0, 21.0]:
        place(x, metal_groan(rng, 4.0, 0.06), at)
    place(x, clank(rng, 0.08), 13.5)
    place(x, bell(196, 5, 0.04), 28.0)
    return x


def write_wav(path, x):
    x = x - x.mean()
    x = 0.7 * x / (np.abs(x).max() + 1e-9)
    data = (x * 32767).astype('<i2').tobytes()
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


def main():
    os.makedirs(OUT, exist_ok=True)
    tracks = {
        'ville': city,
        'carrieres': carrieres,
        'port': port,
        'ecluse': ecluse,
        'combat': combat,
        'faubourgs': faubourgs,
        'marais': marais,
        'barrage': barrage,
    }
    # `python3 scripts/generate-ambience.py marais barrage` : seulement ces pistes.
    only = set(sys.argv[1:])
    unknown = only - tracks.keys()
    if unknown:
        sys.exit(f'pistes inconnues : {", ".join(sorted(unknown))}')
    with tempfile.TemporaryDirectory() as tmp:
        for i, (name, fn) in enumerate(tracks.items()):
            if only and name not in only:
                continue
            rng = np.random.default_rng(100 + i)
            wav = os.path.join(tmp, f'{name}.wav')
            write_wav(wav, fn(rng))
            dst = os.path.join(OUT, f'{name}.m4a')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '64k', dst], check=True)
            print(dst, os.path.getsize(dst) // 1024, 'Ko')


if __name__ == '__main__':
    main()
