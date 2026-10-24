#!/usr/bin/env python3
"""
Bande-son de la cinématique d'introduction de Valombre (44 s), entièrement
synthétisée ici : aucune musique ni aucun bruitage externe (pas de licence tierce).

    python3 cinematic/soundtrack.py                  # cinematic/out/intro-mix.wav + assets/audio/intro.m4a
    python3 cinematic/soundtrack.py --stems           # aussi les pistes séparées (contrôle)

Synchronisation : tous les instants viennent de cinematic/timeline.json (le même
fichier que le rendu de l'image).

Écriture : ré mineur. Une cloche ouvre et ferme le film. Ville morte : nappe et
vent. Le Muet : cliquetis de dents, cordes tendues, puis le coup de tête et une
coupe sèche vers le silence du toit. La radio : parasites, sifflements d'accord,
puis une voix lointaine (texture vocale synthétique, volontairement
inintelligible : le texte est à l'écran). Le voyage : pulsation à 120, toms sur
chaque coupe, montée. L'aube : ré majeur, corne de brume de la Destinée, chœur.
Coupe au noir, silence. L'emblème : souffle grave, cloche, l'aiguille qui tourne,
un accord qui s'éteint exactement à la fin.

Pensé pour un haut-parleur d'iPhone et pour le casque : l'essentiel de l'énergie
entre 120 Hz et 5 kHz (les graves ont des harmoniques audibles sur téléphone),
aucune attaque de moins de 5 ms, intégrée ≈ −16 LUFS, crêtes ≤ −1,5 dBFS.
Dépendances : numpy, ffmpeg.
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TL = json.load(open(os.path.join(ROOT, 'cinematic', 'timeline.json')))
EV = TL['events']
SR = 48000
DUR = TL['duration']
N = int(round(DUR * SR))
OUT_DIR = os.path.join(ROOT, 'cinematic', 'out')
rng = np.random.default_rng(20261024)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def env(n, a, r, curve=1.0):
    """Enveloppe montée/descente en cosinus (sans angle, donc sans clic)."""
    e = np.ones(n)
    na = max(1, int(a * SR))
    nr = max(1, int(r * SR))
    na = min(na, n)
    nr = min(nr, n - na) if n - na > 0 else 0
    e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    if nr > 0:
        e[n - nr:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))) ** curve
    return e


def decay(n, tau, a=0.005):
    e = np.exp(-tt(n) / tau)
    na = max(1, int(a * SR))
    e[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    return e


def spec(x, fn):
    """Filtre à phase nulle dans le domaine fréquentiel (fn : fréquences → gain)."""
    n = len(x)
    m = 1 << int(np.ceil(np.log2(n + SR)))
    X = np.fft.rfft(x, m)
    f = np.fft.rfftfreq(m, 1 / SR)
    return np.fft.irfft(X * fn(f), m)[:n]


def bandpass(x, lo, hi, order=2):
    return spec(x, lambda f: 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** (2 * order)) / np.sqrt(1 + (f / hi) ** (2 * order)))


def lowpass(x, fc, order=2):
    return spec(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))


def highpass(x, fc, order=2):
    return spec(x, lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** (2 * order)))


def stft_filter(x, gain, n=2048, hop=512):
    """Filtre variable dans le temps : gain(t_seconde, fréquences) par trame."""
    win = np.hanning(n)
    out = np.zeros(len(x) + n)
    norm = np.zeros(len(x) + n)
    f = np.fft.rfftfreq(n, 1 / SR)
    for s in range(0, len(x), hop):
        seg = x[s:s + n]
        if len(seg) < n:
            seg = np.pad(seg, (0, n - len(seg)))
        y = np.fft.irfft(np.fft.rfft(seg * win) * gain((s + n / 2) / SR, f), n) * win
        out[s:s + n] += y
        norm[s:s + n] += win ** 2
    return (out / np.maximum(norm, 1e-3))[:len(x)]


def bell_gain(fc, bw):
    return lambda f: np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / bw) ** 2)


def saturate(x, drive):
    return np.tanh(x * drive) / np.tanh(drive)


class Mix:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, at, gain=1.0, pan=0.0):
        """Pose un son mono (ou (L, R)) à `at` secondes, panoramique à puissance constante."""
        i = int(round(at * SR))
        if isinstance(sig, tuple):
            l, r = sig
        else:
            a = (pan + 1) * np.pi / 4
            l, r = sig * np.cos(a) * np.sqrt(2), sig * np.sin(a) * np.sqrt(2)
        n = len(l)
        if i < 0:
            l, r, n, i = l[-i:], r[-i:], n + i, 0
        n = min(n, N - i)
        if n <= 0:
            return
        self.L[i:i + n] += l[:n] * gain
        self.R[i:i + n] += r[:n] * gain

    def stereo(self):
        return self.L, self.R


def reverb(sig, seconds=2.5, damp=3500, wet=0.35, pre=0.02, seed=1):
    """Réverbération par convolution : réponse impulsionnelle de bruit décroissant, stéréo décorrélée."""
    n = int(seconds * SR)
    r = np.random.default_rng(seed)
    out = []
    for k in range(2):
        ir = r.standard_normal(n) * np.exp(-tt(n) * 6.9 / seconds)
        ir = lowpass(ir, damp, 1)
        ir = np.concatenate([np.zeros(int(pre * SR)), ir])
        ir /= np.sqrt(np.sum(ir ** 2))
        m = 1 << int(np.ceil(np.log2(len(sig) + len(ir))))
        y = np.fft.irfft(np.fft.rfft(sig, m) * np.fft.rfft(ir, m), m)[:len(sig) + len(ir)]
        out.append(y)
    dry = np.concatenate([sig, np.zeros(len(ir))])
    return dry * (1 - wet) + out[0] * wet, dry * (1 - wet) + out[1] * wet


# ------------------------------------------------------------------ instruments
def additive(freq, dur, harm=24, tilt=1.0, bright=2500.0, detune=0.0, vib=0.0, vib_rate=5.0, formant=None):
    """Oscillateur additif à bande limitée (pas de repliement) ; `formant` : fonction gain(f)."""
    n = int(dur * SR)
    t = tt(n)
    ph_mod = 0.0
    if vib:
        ph_mod = vib * np.sin(2 * np.pi * vib_rate * t + rng.random() * 6.28)
    y = np.zeros(n)
    for k in range(1, harm + 1):
        fk = freq * k * (1 + detune)
        if fk > 9000:
            break
        a = (1 / k ** tilt) * np.exp(-fk / bright)
        if formant is not None:
            a *= formant(fk)
        y += a * np.sin(2 * np.pi * fk * t * (1 + ph_mod * 0.01) + rng.random() * 6.28)
    return y


def pad(notes, dur, a=1.5, r=2.0, bright=1800.0, voices=3, level=0.12):
    n = int(dur * SR)
    l = np.zeros(n)
    rr = np.zeros(n)
    for m in notes:
        # Rien sous le ré 3 dans les nappes : en dessous, un haut-parleur de téléphone ne restitue presque rien.
        while m < 50:
            m += 12
        f = midi(m)
        for v in range(voices):
            det = (v - (voices - 1) / 2) * 0.0035
            y = additive(f, dur, harm=26, tilt=0.75, bright=bright * 1.8, detune=det, vib=0.12, vib_rate=0.3 + v * 0.17)
            pan = (v - (voices - 1) / 2) * 0.6
            l += y * np.cos((pan + 1) * np.pi / 4)
            rr += y * np.sin((pan + 1) * np.pi / 4)
    e = env(n, a, r) * level / max(1, len(notes))
    return l * e, rr * e


def strings_trem(notes, dur, rate=11.0, level=0.08, bright=3200.0):
    n = int(dur * SR)
    y = np.zeros(n)
    for m in notes:
        y += additive(midi(m), dur, harm=20, tilt=0.9, bright=bright, vib=0.25, vib_rate=5.5)
    trem = 0.65 + 0.35 * np.sin(2 * np.pi * rate * tt(n))
    return y * trem * env(n, 0.8, 0.05) * level / len(notes)


VOWELS = {'a': (750, 1250, 2600), 'e': (450, 1900, 2600), 'i': (300, 2300, 3000), 'o': (500, 900, 2500), 'u': (330, 800, 2400), 'é': (400, 2100, 2700)}


def formant_fn(vowel, scale=1.0):
    fs = VOWELS[vowel]
    return lambda f: sum(np.exp(-0.5 * ((f - fc * scale) / (fc * 0.12)) ** 2) * w for fc, w in zip(fs, (1.0, 0.7, 0.35))) + 0.03


def choir(notes, dur, vowel='a', level=0.08, a=1.2, r=1.5):
    n = int(dur * SR)
    y = np.zeros(n)
    for m in notes:
        for v in range(3):
            y += additive(midi(m), dur, harm=40, tilt=0.8, bright=5000, detune=(v - 1) * 0.004, vib=0.35, vib_rate=4.8 + v * 0.3, formant=formant_fn(vowel))
    return y * env(n, a, r) * level / (len(notes) * 3)


def bell(freq, dur=6.0, level=0.3):
    """Cloche d'église : partiels inharmoniques (bourdon, fondamental, tierce mineure, quinte, nominal…)."""
    n = int(dur * SR)
    t = tt(n)
    y = np.zeros(n)
    for ratio, amp, tau in [(0.5, 0.2, 4.0), (1.0, 0.8, 3.2), (1.19, 0.5, 2.4), (1.5, 0.3, 1.8), (2.0, 0.45, 1.5), (2.51, 0.22, 1.0), (3.0, 0.18, 0.8), (4.07, 0.1, 0.5)]:
        f = freq * ratio
        y += amp * np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / tau) * (1 + 0.04 * np.sin(2 * np.pi * 1.3 * t))
    strike = bandpass(rng.standard_normal(n), 800, 5000) * np.exp(-t / 0.012) * 0.25
    return (y + strike) * decay(n, 99, 0.004) * level


def tom(freq, level=0.5, dur=0.9):
    n = int(dur * SR)
    t = tt(n)
    f = freq * (1 + 0.9 * np.exp(-t / 0.035))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.28) + 0.35 * np.sin(2 * ph + 0.5) * np.exp(-t / 0.12)
    click = bandpass(rng.standard_normal(n), 600, 4000) * np.exp(-t / 0.01) * 0.35
    return saturate((body + click) * decay(n, 99, 0.004), 1.6) * level


def thump(freq=55, level=0.5, dur=0.6):
    """Coup grave, avec harmoniques pour rester audible sur un haut-parleur de téléphone."""
    n = int(dur * SR)
    t = tt(n)
    f = freq * (1 + 1.2 * np.exp(-t / 0.04))
    ph = 2 * np.pi * np.cumsum(f) / SR
    # Fondamental discret, harmoniques 2 à 4 portées : le téléphone les restitue, l'oreille reconstitue le grave.
    y = (0.25 * np.sin(ph) + 0.6 * np.sin(2 * ph) + 0.35 * np.sin(3 * ph + 0.3) + 0.15 * np.sin(4 * ph)) * np.exp(-t / 0.18)
    return saturate(y * decay(n, 99, 0.006), 1.8) * level


def noise_swell(dur, f0, f1, level=0.2, bw=0.6, curve=2.0, rev=False):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    y = stft_filter(x, lambda s, f: bell_gain(f0 * (f1 / f0) ** min(1, s / dur), bw)(f))
    e = (np.linspace(0, 1, n) ** curve) * env(n, 0.01, 0.03)
    if rev:
        e = e[::-1]
    return y * e * level


def click(level=0.4, ring=2300):
    """Claquement de dents : très bref, sec, une résonance osseuse."""
    n = int(0.03 * SR)
    t = tt(n)
    burst = bandpass(rng.standard_normal(n), 1500, 6000) * np.exp(-t / 0.0016)
    tone = np.sin(2 * np.pi * ring * t) * np.exp(-t / 0.006) * 0.5
    return (burst + tone) * decay(n, 99, 0.0008) * level


# ------------------------------------------------------------------ composition
def compose():
    mus = Mix()  # musique
    sfx = Mix()  # bruitages et ambiances
    bells_at = EV['bells']

    # 0 · Braises : un souffle grave, la cendre qui crépite, la cloche.
    mus.add(pad([50, 57, 64], 6.0, a=2.5, r=1.6, bright=1200, level=0.14), 0.2)
    crack = np.zeros(int(5.2 * SR))
    for _ in range(70):
        i = rng.integers(0, len(crack) - 2000)
        crack[i:i + 400] += rng.standard_normal(400) * np.exp(-np.arange(400) / 40) * rng.uniform(0.1, 0.5)
    sfx.add(bandpass(crack, 1800, 7000) * env(len(crack), 1.0, 1.0), 0, 0.35, 0.1)
    for i, b in enumerate(bells_at):
        f = midi(62) if i < 2 else midi(57)
        l, r = reverb(bell(f, 7.0, 0.32 if i != 1 else 0.18), 3.8, 3000, 0.45, seed=3 + i)
        mus.add((l, r), b, 1.0)

    # 1 · Valombre : la ville attend. Nappe ré mineur → si bémol, vent.
    mus.add(pad([50, 57, 62, 65], 4.0, a=1.5, r=1.4, bright=1500, level=0.17), 4.4)
    mus.add(pad([46, 53, 58, 62], 4.0, a=1.6, r=1.6, bright=1400, level=0.17), 7.6)
    wind_n = int(8.0 * SR)
    wind = stft_filter(rng.standard_normal(wind_n), lambda s, f: bell_gain(420 + 260 * np.sin(s * 0.9) + 120 * np.sin(s * 2.3), 0.55)(f))
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.21 * tt(wind_n)) ** 2
    sfx.add(wind * gust * env(wind_n, 1.2, 1.2), 3.8, 0.11, -0.2)

    # 2 · La rue : tension, cliquetis réguliers « comme une horloge détraquée », coup de tête.
    s0, snap = 10.9, EV['snap']
    mus.add(pad([50, 51, 62], snap - s0 + 0.4, a=2.0, r=0.3, bright=1100, level=0.18), s0)
    mus.add((strings_trem([74, 75, 81], snap - 12.0 + 0.2, rate=9, level=0.05),) * 2, 12.0)
    t_click = 11.6
    k = 0
    while t_click < snap - 0.05:
        jitter = 0.03 * np.sin(k * 2.7)
        near = 0.3 + 0.7 * (t_click - 11.6) / (snap - 11.6)
        sfx.add(click(0.22 * near, 2100 + 300 * np.sin(k)), t_click, 1.0, 0.45)
        t_click += 0.27 + jitter + (0.12 if k % 7 == 6 else 0)
        k += 1
    for c in EV['clicks']:
        for j in range(3):
            sfx.add(click(0.38, 2500 - j * 200), c - 0.04 + j * 0.055, 1.0, 0.45)
    sfx.add(noise_swell(snap - 15.4, 300, 5000, level=0.12, curve=3), 15.4, 1.0, 0.2)
    sfx.add(click(0.7, 1800), snap, 1.0, 0.4)
    sfx.add(thump(62, 0.45, 0.9), snap, 1.0)
    stab = additive(midi(62), 0.9, harm=20, tilt=0.8, bright=4000) + additive(midi(63), 0.9, harm=20, tilt=0.8, bright=4000) + additive(midi(68), 0.9, harm=20, tilt=0.8, bright=4000)
    mus.add(stab * decay(len(stab), 0.35, 0.006) * 0.12, snap, 1.0)

    # 3 · Le toit : silence relatif, vent, respiration, nappe très douce.
    roof = EV['cutRoof']
    wind2_n = int(8.6 * SR)
    wind2 = stft_filter(rng.standard_normal(wind2_n), lambda s, f: bell_gain(520 + 200 * np.sin(s * 0.7), 0.6)(f))
    sfx.add(wind2 * env(wind2_n, 0.05, 1.0), roof, 0.15, 0.3)
    mus.add(pad([62, 69, 76, 77], 3.2, a=0.6, r=1.2, bright=1800, level=0.13), roof)
    for b in EV['breath']:
        n = int(1.2 * SR)
        br = bandpass(rng.standard_normal(n), 500, 3500) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2
        sfx.add(br, b, 0.05, -0.1)

    # 4 · La radio : parasites, sifflements d'accord, puis la voix sort du bruit.
    t0, lock = EV['tuneFrom'], EV['tuneKeys'][-1][0]
    rad_end = EV['whoosh'] + 0.05
    rn = int((rad_end - t0 + 0.5) * SR)
    rt = tt(rn) + t0
    static = bandpass(rng.standard_normal(rn), 300, 3400)
    flutter = 0.7 + 0.3 * np.sin(2 * np.pi * 7.3 * rt) * np.sin(2 * np.pi * 1.1 * rt)
    crackles = np.zeros(rn)
    for _ in range(160):
        i = rng.integers(0, rn - 300)
        crackles[i:i + 200] += rng.standard_normal(200) * np.exp(-np.arange(200) / 25) * rng.uniform(0.3, 1.5)
    level = np.where(rt < lock, 1.0, 0.0) + np.where(rt >= lock, 0.22, 0.0)
    level = np.convolve(level, np.ones(2400) / 2400, mode='same')
    radio = (static * flutter * 0.55 + bandpass(crackles, 1000, 5000) * 0.5) * level
    # Sifflements d'hétérodyne pendant la recherche de la station.
    keys = EV['tuneKeys']
    fr = np.interp(rt, [k[0] for k in keys], [k[1] for k in keys])
    het = np.abs(fr - keys[-1][1])
    hf = 380 + het * 260
    whistle = np.sin(2 * np.pi * np.cumsum(hf) / SR) * np.clip(het / 2.0, 0, 1) * (rt < lock + 0.1) * 0.22
    radio += lowpass(whistle, 3000)
    radio *= env(rn, 0.04, 0.08)
    sfx.add(radio, t0, 0.42, -0.05)
    # La voix : texture vocale lointaine, volontairement inintelligible (le texte est à l'écran).
    v0, v1 = EV['voiceFrom'], EV['voiceTo']
    vn = int((v1 - v0) * SR)
    voice = np.zeros(vn)
    pos = 0.0
    sylls = ['i', 'i', 'a', 'é', 'i', 'é', 'u', 'a', 'o', 'é', 'u', 'i', 'a', 'é', 'e', 'o', 'a', 'u', 'o', 'é', 'e', 'i', 'o', 'u']
    pauses = {4, 10, 15, 20}
    for i, vw in enumerate(sylls):
        d = 0.13 + 0.06 * rng.random()
        if pos + d > (v1 - v0):
            break
        f0 = 205 + 25 * np.sin(i * 0.9) - 18 * (i % 5 == 4)
        sy = additive(f0, d, harm=30, tilt=0.6, bright=6000, vib=0.6, vib_rate=6, formant=formant_fn(vw, 1.08))
        sy *= env(len(sy), 0.025, 0.04)
        cons = bandpass(rng.standard_normal(int(0.035 * SR)), 2500, 7000) * env(int(0.035 * SR), 0.005, 0.02) * 0.25
        a = int(pos * SR)
        voice[a:a + len(cons)] += cons[:max(0, min(len(cons), vn - a))]
        b = a + len(cons) // 2
        m = min(len(sy), vn - b)
        if m > 0:
            voice[b:b + m] += sy[:m]
        pos += d + 0.02 + (0.28 if i in pauses else 0.0)
    voice = saturate(bandpass(voice, 380, 2900, 3) * 3.0, 2.0)
    voice *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.9 * tt(vn)) ** 2
    sfx.add(voice * env(vn, 0.08, 0.3), v0, 0.2, -0.05)
    mus.add(pad([53, 60, 64, 69], 4.4, a=1.4, r=1.0, bright=1600, level=0.11), lock + 0.4)
    sfx.add(noise_swell(0.5, 400, 6000, level=0.25, curve=2.5), EV['whoosh'] - 0.4, 1.0)

    # 5 · Le voyage : 120 bpm, pulsation de cordes, toms sur chaque coupe, montée.
    cuts = EV['dayCuts']
    j0, dawn = cuts[0], EV['dawn']
    beat = 0.5
    prog = [(26.0, [50, 57, 62, 65]), (28.0, [46, 53, 58, 62]), (30.0, [53, 60, 65, 69]), (31.0, [48, 55, 60, 64]), (32.0, [45, 52, 57, 61])]
    for i, (at, notes) in enumerate(prog):
        end = prog[i + 1][0] if i + 1 < len(prog) else dawn
        mus.add(pad(notes, end - at + 0.35, a=0.12, r=0.35, bright=1700 + i * 400, level=0.16 + i * 0.02), at)
    tq = j0
    i = 0
    while tq < dawn - 0.05:
        bass = 38 if (i // 8) % 2 == 0 else 34
        for at, notes in prog:
            if tq >= at:
                bass = notes[0] - 12
        y = additive(midi(bass + 12), 0.22, harm=16, tilt=0.7, bright=1400 + (tq - j0) * 200) + 0.4 * additive(midi(bass + 24), 0.22, harm=10, tilt=1.0, bright=2000)
        y *= decay(len(y), 0.09, 0.004) * env(len(y), 0.004, 0.04)
        mus.add(saturate(y * 1.4, 1.5) * (0.16 + 0.05 * (i % 2 == 0)), tq, 1.0)
        tq += beat / 2
        i += 1
    for i, c in enumerate(cuts):
        sfx.add(noise_swell(0.32, 500, 4000, level=0.12, curve=3), c - 0.32, 1.0, 0.0)
        mus.add(tom(midi(45 + (0, 3, 5, 3, 7, 5, 10)[i]), 0.4 + i * 0.03), c, 1.0, (-0.25, 0.25)[i % 2])
        if i >= 4:
            mus.add(tom(midi(52), 0.24), c + 0.5, 1.0, 0.2)
    for hb in np.arange(j0 + 0.25, dawn - 0.4, 0.82):
        sfx.add(thump(66, 0.2, 0.4), hb, 1.0)
        sfx.add(thump(62, 0.14, 0.4), hb + 0.17, 1.0)
    sfx.add(noise_swell(dawn - 31.0, 250, 7000, level=0.16, curve=2.4), 31.0, 1.0)
    mus.add((strings_trem([69, 74, 77], dawn - 31.0, rate=14, level=0.06, bright=4500),) * 2, 31.0)

    # 6 · L'aube à l'écluse : ré majeur, corne de brume, chœur, lumière ; puis la coupe.
    silence = EV['silence']
    span = silence - dawn + 0.3
    sfx.add(thump(58, 0.36, 1.6), dawn, 1.0)
    sfx.add(noise_swell(2.4, 6000, 2500, level=0.08, curve=0.6, rev=True), dawn, 1.0)
    mus.add(pad([50, 54, 57, 62, 66], span, a=1.0, r=0.2, bright=2200, level=0.22), dawn)
    mus.add((choir([69, 74], span - 0.6, 'a', level=0.12, a=2.2, r=0.2),) * 2, dawn + 0.6)
    mus.add((choir([78, 81], silence - EV['sun'] + 0.5, 'o', level=0.07, a=1.0, r=0.2),) * 2, EV['sun'] - 0.4)
    # La Destinée sonne : corne grave et cuivrée (deux tons à la quinte), échos sur l'eau.
    hn = int(2.4 * SR)
    ht = tt(hn)
    sag = 1 - 0.03 * np.exp(-ht / 0.12)
    horn = np.zeros(hn)
    for fh, amp in [(110.0, 1.0), (164.8, 0.7)]:
        for kk in range(1, 22):
            if fh * kk > 4000:
                break
            horn += amp * (1 / kk ** 0.8) * np.exp(-fh * kk / 1300) * np.sin(2 * np.pi * fh * kk * np.cumsum(sag) / SR)
    horn = saturate(horn * env(hn, 0.18, 0.7) * 0.5, 1.8)
    hl, hr = reverb(horn, 3.5, 2200, 0.5, pre=0.06, seed=9)
    sfx.add((hl, hr), EV['horn'], 0.45)
    for k, (dly, g) in enumerate([(0.42, 0.25), (0.95, 0.12)]):
        sfx.add(lowpass(horn, 1400), EV['horn'] + dly, g, (-0.6, 0.6)[k])
    shimmer = np.zeros(int((silence - EV['sun'] + 0.3) * SR))
    for f in [1760, 2217, 2637, 3520]:
        shimmer += np.sin(2 * np.pi * f * tt(len(shimmer)) + rng.random() * 6) * (0.5 + 0.5 * np.sin(2 * np.pi * (3 + f / 1000) * tt(len(shimmer))))
    mus.add(shimmer * env(len(shimmer), 1.2, 0.05) * 0.018, EV['sun'], 1.0)
    # Montée finale vers la coupe au noir : cordes en crescendo, souffle inversé.
    cres = silence - EV['sun']
    st = strings_trem([62, 66, 69, 74], cres, rate=13, level=0.11, bright=5000)
    st *= np.linspace(0.2, 1.0, len(st)) ** 1.5
    mus.add((st, st), EV['sun'], 1.0)
    sfx.add(noise_swell(cres, 700, 9000, level=0.2, curve=3.2), EV['sun'], 1.0)
    water_n = int(span * SR)
    water = stft_filter(rng.standard_normal(water_n), lambda s, f: bell_gain(900 + 400 * np.sin(s * 3.1), 0.9)(f))
    sfx.add(water * env(water_n, 0.6, 0.05) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.6 * tt(water_n)) ** 2), dawn, 0.05, 0.1)

    # Coupe au noir : tout s'arrête net (rampe de 12 ms, sans clic), puis le silence.
    for m in (mus, sfx):
        for ch in (m.L, m.R):
            a = int(silence * SR)
            b = int(EV['boom'] * SR) - int(0.01 * SR)
            ramp = int(0.012 * SR)
            ch[a:a + ramp] *= np.linspace(1, 0, ramp)
            ch[a + ramp:b] = 0

    # 7 · L'emblème : souffle grave, cloche, l'aiguille, l'accord final.
    sfx.add(thump(55, 0.32, 2.0), EV['boom'], 1.0)
    sfx.add(noise_swell(1.6, 3000, 600, level=0.06, curve=0.5, rev=True), EV['boom'], 1.0)
    n0, n1 = EV['needle']
    ticks = []
    u = 0.0
    while True:
        tk = n0 + u
        if tk >= n1:
            break
        ticks.append(tk)
        speed = 1 - ((tk - n0) / (n1 - n0)) ** 0.6
        u += 0.05 + 0.25 * (1 - speed)
    for tk in ticks:
        sfx.add(click(0.12, 3200), tk, 1.0, 0.05)
    latch = click(0.5, 1500)
    sfx.add(latch, n1, 1.0)
    sfx.add(thump(70, 0.28, 0.5), n1, 1.0)
    end = EV['end']
    chord = np.zeros(int((end - n1 + 0.05) * SR))
    for i, m in enumerate([50, 57, 64, 65, 69]):
        f = midi(m)
        a = int(i * 0.11 * SR)
        nn = len(chord) - a
        tone = additive(f, nn / SR, harm=12, tilt=1.3, bright=2400) * np.exp(-tt(nn) / 2.4) * decay(nn, 99, 0.01)
        chord[a:] += tone * 0.08
    cl, cr = reverb(chord, 3.0, 3500, 0.4, seed=12)
    mus.add((cl[:len(chord)], cr[:len(chord)]), n1, 1.0)
    mus.add(pad([50, 57, 64], end - 39.0, a=1.6, r=0.1, bright=1200, level=0.12), 39.0)

    # Fin : extinction douce jusqu'à zéro exactement à 44 s.
    fade_n = int(1.4 * SR)
    for m in (mus, sfx):
        for ch in (m.L, m.R):
            ch[N - fade_n:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fade_n)))
            ch[-int(0.02 * SR):] = 0
    return mus, sfx


def master(mus, sfx):
    L = mus.L * 1.0 + sfx.L * 1.0
    R = mus.R * 1.0 + sfx.R * 1.0
    # Égalisation pour téléphone : coupe sous 70 Hz, graves (< 160 Hz) allégés de 6 dB,
    # aigus relevés, présence soulignée vers 2,5 kHz, extrême aigu adouci.
    def eq(f):
        f = np.maximum(f, 1)
        hp = 1 / np.sqrt(1 + (70 / f) ** 4)
        shelf = 0.5 + 0.5 / np.sqrt(1 + (160 / f) ** -4)
        presence = 1 + 0.25 * np.exp(-0.5 * (np.log2(f / 2500) / 0.7) ** 2)
        # Plateau +6 dB au-dessus de 1 kHz : de la clarté sur un petit haut-parleur.
        air = 1 + 1.0 / np.sqrt(1 + (1000 / f) ** 2)
        return hp * shelf * presence * air / np.sqrt(1 + (f / 14000) ** 4)
    L = spec(L, eq)
    R = spec(R, eq)
    return L, R


def write_wav(path, L, R):
    x = np.stack([L, R], axis=1)
    pcm = np.clip(x * 32767, -32768, 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def loudness(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(out[out.rindex('{'):])
    return float(j['input_i']), float(j['input_tp'])


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    mus, sfx = compose()
    L, R = master(mus, sfx)
    tmp = os.path.join(OUT_DIR, 'intro-premaster.wav')
    peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
    L, R = L / peak * 0.5, R / peak * 0.5
    write_wav(tmp, L, R)
    lufs, _ = loudness(tmp)
    # Gain vers −16 LUFS, puis limiteur doux : rien au-dessus de −1,5 dBFS.
    g = 10 ** ((-16.0 - lufs) / 20)
    ceil = 10 ** (-1.5 / 20)
    L = ceil * np.tanh(L * g / ceil)
    R = ceil * np.tanh(R * g / ceil)
    path = os.path.join(OUT_DIR, 'intro-mix.wav')
    write_wav(path, L, R)
    lufs2, tp = loudness(path)
    print(f'intro-mix.wav : {lufs2:.1f} LUFS intégrés, crête vraie {tp:.1f} dBTP, {N / SR:.2f} s')
    if '--stems' in sys.argv:
        write_wav(os.path.join(OUT_DIR, 'stem-musique.wav'), mus.L * 0.5 / peak * g, mus.R * 0.5 / peak * g)
        write_wav(os.path.join(OUT_DIR, 'stem-bruitages.wav'), sfx.L * 0.5 / peak * g, sfx.R * 0.5 / peak * g)
    m4a = os.path.join(ROOT, 'assets', 'audio', 'intro.m4a')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', m4a], check=True)
    print(f'{m4a} : {os.path.getsize(m4a) / 1024:.0f} Ko')
    os.remove(tmp)


if __name__ == '__main__':
    main()
