#!/usr/bin/env python3
"""
Bande-son de la bande-annonce d'introduction de Valombre (30 s, 120 bpm),
entièrement synthétisée ici : aucune musique ni aucun bruitage externe (pas de
licence tierce).

    python3 cinematic/soundtrack.py                  # cinematic/out/intro-mix.wav + assets/audio/intro.m4a
    python3 cinematic/soundtrack.py --stems           # aussi les pistes séparées (contrôle)

Synchronisation : tous les instants viennent de cinematic/timeline.json (le même
fichier que le rendu de l'image).

Écriture : ré mineur, montage de bande-annonce. La radio qui accroche la Destinée
(parasites, sifflements, voix lointaine volontairement inintelligible : le texte
est à l'écran), un cœur qui bat. Puis un coup de cuivres graves (« braam ») sur
chaque coupe, pulsation de cordes en doubles croches, tambours. Bruitages calés à
l'image : horloge du choix chronométré, dés qui roulent et se posent, lame,
grondement du Berger, un coup par visage, sifflement d'oreille quand un compagnon
tombe, corne de brume de la Destinée, montée. Coupe au noir : silence total.
Explosion du titre, cloche, aiguille, accord final qui s'éteint à la dernière image.

Pensé pour un haut-parleur d'iPhone et pour le casque : l'essentiel de l'énergie
entre 120 Hz et 5 kHz (les graves ont des harmoniques audibles sur téléphone),
aucune attaque de moins de 2 ms, intégrée ≈ −15 LUFS, crêtes ≤ −1,5 dBFS.
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


# ------------------------------------------------------------------ instruments de bande-annonce
def braam(root, dur=1.8, level=0.5, bright=2600.0):
    """Coup de cuivres graves de bande-annonce : fondamentale, quinte et octave saturées, harmoniques audibles sur téléphone."""
    n = int(dur * SR)
    y = np.zeros(n)
    # L'octave porte le coup (audible sur téléphone) ; la fondamentale ne fait que l'épaissir.
    for m, g in [(root, 0.4), (root + 7, 0.5), (root + 12, 1.0), (root + 19, 0.5), (root + 24, 0.3)]:
        for det in (-0.004, 0.0, 0.004):
            y += g * additive(midi(m), dur, harm=28, tilt=0.55, bright=bright, detune=det)
    t = tt(n)
    y *= 1 + 0.18 * np.sin(2 * np.pi * 31 * t) * np.exp(-t / 0.4)
    y = saturate(y * 0.25, 2.2) * decay(n, 0.65, 0.008) * env(n, 0.008, 0.3)
    hit = bandpass(rng.standard_normal(n), 300, 6000) * np.exp(-t / 0.05) * 0.35
    return (y + hit) * level


def riser(dur, level=0.2):
    """Montée : souffle qui s'ouvre et note qui grimpe, de plus en plus fort."""
    n = int(dur * SR)
    t = tt(n)
    f = 110 * 2 ** (3 * (t / dur) ** 1.6)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    swell = noise_swell(dur, 300, 9000, level=1.0, curve=2.5)
    return (lowpass(tone, 4000) * 0.35 * (t / dur) ** 2 + swell) * level


def rattle(dur, level=0.3):
    """Dés qui roulent : petits chocs de plus en plus espacés."""
    n = int(dur * SR)
    y = np.zeros(n)
    pos = 0.0
    gap = 0.025
    while pos < dur - 0.03:
        c = bandpass(rng.standard_normal(int(0.02 * SR)), 900, 5000) * np.exp(-tt(int(0.02 * SR)) / 0.004)
        i = int(pos * SR)
        y[i:i + len(c)] += c[: max(0, n - i)] * rng.uniform(0.5, 1.0)
        pos += gap * rng.uniform(0.8, 1.3)
        gap *= 1.09
    return y * level


def clack(level=0.5):
    """Dé qui se pose sur la table : bois, grave et sec."""
    n = int(0.25 * SR)
    t = tt(n)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) + 0.5 * np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.03)
    snap = bandpass(rng.standard_normal(n), 700, 4000) * np.exp(-t / 0.01)
    return (body * 0.7 + snap) * decay(n, 99, 0.002) * level


def slash(level=0.5):
    """Lame : souffle très bref qui monte, puis un tintement métallique."""
    n = int(0.6 * SR)
    t = tt(n)
    whoosh = noise_swell(0.18, 1200, 9000, level=1.0, curve=1.5)
    ring = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / tau) for f, tau in [(4200, 0.25), (5630, 0.18), (7100, 0.12)])
    y = np.zeros(n)
    y[: len(whoosh)] += whoosh
    y += ring * 0.12 * decay(n, 99, 0.003)
    return y * level


def roar(dur=1.3, level=0.35):
    """Grondement du Berger : voix grave et rauque (formants « o »), souffle modulé."""
    n = int(dur * SR)
    t = tt(n)
    v = additive(82, dur, harm=40, tilt=0.5, bright=3500, vib=2.0, vib_rate=7, formant=formant_fn('o', 0.9))
    grit = bandpass(rng.standard_normal(n), 200, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t))
    return saturate((v * 0.6 + grit * 0.5) * env(n, 0.06, 0.5), 2.5) * level


def ring_tone(dur=1.6, level=0.06):
    """Sifflement d'oreille après le choc (la chute d'un compagnon)."""
    n = int(dur * SR)
    return np.sin(2 * np.pi * 3520 * tt(n)) * env(n, 0.05, dur * 0.8) * level


def horn_blast(dur=2.2):
    """La Destinée : corne de brume grave et cuivrée, deux tons à la quinte."""
    n = int(dur * SR)
    sag = 1 - 0.03 * np.exp(-tt(n) / 0.12)
    y = np.zeros(n)
    for fh, amp in [(130.8, 1.0), (196.0, 0.7)]:
        for kk in range(1, 22):
            if fh * kk > 4000:
                break
            y += amp * (1 / kk ** 0.8) * np.exp(-fh * kk / 1300) * np.sin(2 * np.pi * fh * kk * np.cumsum(sag) / SR)
    return saturate(y * env(n, 0.15, 0.6) * 0.5, 1.8)


def radio_voice(dur):
    """Voix radio lointaine, volontairement inintelligible (le texte est à l'écran)."""
    vn = int(dur * SR)
    voice = np.zeros(vn)
    pos = 0.0
    sylls = ['i', 'i', 'a', 'é', 'i', 'é', 'u', 'a', 'o', 'é', 'u', 'i', 'a', 'é', 'e', 'o', 'a', 'u']
    for i, vw in enumerate(sylls):
        d = 0.12 + 0.05 * rng.random()
        if pos + d > dur:
            break
        f0 = 205 + 25 * np.sin(i * 0.9) - 18 * (i % 5 == 4)
        sy = additive(f0, d, harm=30, tilt=0.6, bright=6000, vib=0.6, vib_rate=6, formant=formant_fn(vw, 1.08)) * env(int(d * SR), 0.025, 0.04)
        cons = bandpass(rng.standard_normal(int(0.035 * SR)), 2500, 7000) * env(int(0.035 * SR), 0.005, 0.02) * 0.25
        a = int(pos * SR)
        voice[a:a + len(cons)] += cons[: max(0, min(len(cons), vn - a))]
        b = a + len(cons) // 2
        m = min(len(sy), vn - b)
        if m > 0:
            voice[b:b + m] += sy[:m]
        pos += d + 0.02 + (0.25 if i in (4, 9, 13) else 0.0)
    voice = saturate(bandpass(voice, 380, 2900, 3) * 3.0, 2.0)
    return voice * (0.75 + 0.25 * np.sin(2 * np.pi * 0.9 * tt(vn)) ** 2) * env(vn, 0.08, 0.3)


# ------------------------------------------------------------------ composition
def compose():
    mus = Mix()  # musique
    sfx = Mix()  # bruitages
    E = EV
    beat = 60 / TL['bpm']

    # 0–4 s · Ouverture : la radio accroche la Destinée ; cœur qui bat, nappe sourde.
    mus.add(pad([50, 57, 62], 4.0, a=1.0, r=0.4, bright=900, level=0.12), 0.0)
    for hb in E['heartbeat']:
        sfx.add(thump(66, 0.3, 0.4), hb, 1.0)
        sfx.add(thump(62, 0.2, 0.4), hb + 0.18, 1.0)
    keys = E['tuneKeys']
    lock = keys[-1][0]
    rn = int(4.0 * SR)
    rt = tt(rn)
    static = bandpass(rng.standard_normal(rn), 300, 3400)
    crackles = np.zeros(rn)
    for _ in range(90):
        i = rng.integers(0, rn - 300)
        crackles[i:i + 200] += rng.standard_normal(200) * np.exp(-np.arange(200) / 25) * rng.uniform(0.3, 1.5)
    level = np.convolve(np.where(rt < lock, 1.0, 0.25), np.ones(2400) / 2400, mode='same')
    fr = np.interp(rt, [k[0] for k in keys], [k[1] for k in keys])
    het = np.abs(fr - keys[-1][1])
    whistle = np.sin(2 * np.pi * np.cumsum(380 + het * 260) / SR) * np.clip(het / 2.0, 0, 1) * (rt < lock + 0.1) * 0.22
    radio = (static * 0.5 + bandpass(crackles, 1000, 5000) * 0.5) * level + lowpass(whistle, 3000)
    sfx.add(radio * env(rn, 0.3, 0.1), 0.0, 0.4)
    sfx.add(radio_voice(E['voiceTo'] - E['voiceFrom']), E['voiceFrom'], 0.22)
    r0, r1 = E['riser']
    sfx.add(riser(r1 - r0, 0.22), r0, 1.0)

    # 4–23 s · Le corps de la bande-annonce : pulsation à 120, coups sur chaque coupe.
    hits = E['hits']
    roots = {4.0: 38, 6.0: 38, 7.0: 41, 8.0: 36, 9.0: 34, 10.0: 38, 12.0: 41, 13.0: 36, 14.0: 38, 18.0: 34, 19.0: 36, 20.0: 38, 22.0: 41, 22.34: 43, 22.67: 45}
    for h in hits:
        mus.add(braam(roots.get(h, 38), 1.6 if h < 22 else 0.5, 0.42 if h not in (18.0, 19.0) else 0.5), h, 1.0)
        sfx.add(thump(72, 0.26, 0.8), h, 1.0)
        sfx.add(noise_swell(0.3, 500, 5000, level=0.08, curve=3), h - 0.3, 1.0)
    # Nappes : ré mineur → si bémol → fa → do → la, sous les coups.
    for at, end, notes, lvl in [(4.0, 10.0, [50, 57, 62, 65], 0.14), (10.0, 14.0, [46, 53, 58, 62], 0.15), (14.0, 18.0, [50, 57, 62, 65], 0.15), (18.0, 20.0, [46, 53, 58, 65], 0.17), (20.0, 23.0, [45, 52, 57, 61, 64], 0.2)]:
        mus.add(pad(notes, end - at + 0.2, a=0.3, r=0.2, bright=1800, level=lvl), at)
    # Pulsation de cordes en doubles croches, de plus en plus brillante.
    t = 4.0
    i = 0
    while t < E['silence'] - 0.05:
        note = 50 if t < 18 else (46 if t < 20 else 45)
        y = additive(midi(note), 0.13, harm=16, tilt=0.7, bright=1200 + (t - 4) * 160) + 0.4 * additive(midi(note + 12), 0.13, harm=10, tilt=1.0, bright=2200)
        y *= decay(len(y), 0.07, 0.004) * env(len(y), 0.004, 0.03)
        quiet = 0.35 if 17.0 <= t < 17.9 else 1.0
        mus.add(saturate(y * 1.4, 1.5) * (0.1 + 0.05 * (i % 4 == 0)) * quiet, t, 1.0, 0.15 * (-1) ** i)
        t += beat / 4
        i += 1
    # Tambours sur les temps, à partir du jeu ; doublés pour la fin.
    t = 10.0
    while t < E['silence'] - 0.05:
        if not (17.0 <= t < 17.9):
            mus.add(tom(midi(55), 0.3), t, 1.0, -0.2)
            if t >= 18.0:
                mus.add(tom(midi(62), 0.22), t + beat / 2, 1.0, 0.2)
        t += beat

    # Les Muets, les vivants, le Berger.
    sfx.add(roar(1.3, 0.3), E['roar'] + 0.05, 1.0)

    # 10–12 s · Choix chronométré : l'horloge accélère, le doigt tranche.
    t0, t1 = E['ticks']
    t = t0
    gap = 0.25
    while t < t1:
        sfx.add(click(0.22, 3400), t, 1.0, 0.1)
        t += gap
        gap = max(0.09, gap * 0.9)
    sfx.add(click(0.55, 1800), E['tap'], 1.0)
    sfx.add(noise_swell(0.25, 6000, 900, level=0.12, curve=0.5, rev=True), E['tap'], 1.0)

    # 12–13 s · Les dés.
    sfx.add(rattle(E['diceLand'] - E['diceFrom'], 0.35), E['diceFrom'], 1.0, -0.1)
    sfx.add(clack(0.5), E['diceLand'], 1.0, -0.2)
    sfx.add(clack(0.45), E['diceLand'] + 0.04, 1.0, 0.2)
    ding = bell(midi(86), 1.2, 0.18) + bell(midi(81), 1.2, 0.12)
    mus.add(ding, E['success'], 1.0)

    # 13–14 s · Combat : la lame, le coup.
    sfx.add(slash(0.5), E['slash'], 1.0, 0.3)
    sfx.add(thump(70, 0.45, 0.6), E['impact'], 1.0)
    sfx.add(bandpass(rng.standard_normal(int(0.15 * SR)), 400, 5000) * np.exp(-tt(int(0.15 * SR)) / 0.03) * 0.4, E['impact'], 1.0)

    # 14–18 s · Les visages ; puis l'un d'eux tombe.
    for i, f in enumerate(E['faces']):
        sfx.add(thump(80, 0.34, 0.5), f, 1.0, (-0.3, 0.3, -0.3, 0.3)[i])
        sfx.add(click(0.35, 1300), f, 1.0, (-0.3, 0.3, -0.3, 0.3)[i])
    sfx.add(thump(52, 0.5, 1.4), E['fall'], 1.0)
    sfx.add(ring_tone(1.4, 0.05), E['fall'] + 0.05, 1.0)
    for hb in (15.9, 16.6, 17.35):
        sfx.add(thump(66, 0.22, 0.4), hb, 1.0)

    # 20–23 s · La Destinée sonne ; la montée jusqu'à la coupe.
    hl, hr = reverb(horn_blast(2.2), 3.0, 2200, 0.45, pre=0.06, seed=9)
    sfx.add((hl, hr), E['horn'], 0.45)
    mus.add((choir([69, 74, 78], 2.9, 'a', level=0.12, a=1.2, r=0.1),) * 2, 20.1)
    r0, r1 = E['riser2']
    sfx.add(riser(r1 - r0, 0.3), r0, 1.0)
    st = strings_trem([62, 69, 74, 77], r1 - r0, rate=14, level=0.1, bright=5000)
    st *= np.linspace(0.2, 1.0, len(st)) ** 1.5
    mus.add((st, st), r0, 1.0)

    # 23–23,8 s · Coupe au noir : silence total (rampe de 12 ms, sans clic).
    for m in (mus, sfx):
        for ch in (m.L, m.R):
            a = int(E['silence'] * SR)
            b = int(E['boom'] * SR) - int(0.005 * SR)
            ramp = int(0.012 * SR)
            ch[a:a + ramp] *= np.linspace(1, 0, ramp)
            ch[a + ramp:b] = 0

    # 23,8–30 s · Le titre : explosion, cloche, aiguille, accord final.
    boom = E['boom']
    bl, br = reverb(braam(38, 3.5, 0.75, bright=2400) + braam(50, 3.5, 0.35), 3.5, 2600, 0.4, seed=4)
    mus.add((bl, br), boom, 1.0)
    sfx.add(thump(62, 0.5, 2.0), boom, 1.0)
    sfx.add(bandpass(rng.standard_normal(int(1.5 * SR)), 200, 8000) * np.exp(-tt(int(1.5 * SR)) / 0.35) * 0.3, boom, 1.0)
    l, r = reverb(bell(midi(62), 5.0, 0.3), 3.8, 3000, 0.45, seed=3)
    mus.add((l, r), E['bell'], 1.0)
    n0, n1 = E['needle']
    tk = n0
    while tk < n1:
        sfx.add(click(0.1, 3200), tk, 1.0, 0.05)
        speed = 1 - ((tk - n0) / (n1 - n0)) ** 0.6
        tk += 0.05 + 0.22 * (1 - speed)
    sfx.add(click(0.5, 1500), n1, 1.0)
    sfx.add(thump(70, 0.28, 0.5), n1, 1.0)
    end = E['end']
    chord = np.zeros(int((end - n1 + 0.05) * SR))
    for i, m in enumerate([50, 57, 62, 65, 69, 74]):
        a = int(i * 0.08 * SR)
        nn = len(chord) - a
        chord[a:] += additive(midi(m), (nn + 0.5) / SR, harm=12, tilt=1.2, bright=2600)[:nn] * np.exp(-tt(nn) / 2.6) * decay(nn, 99, 0.01) * 0.08
    cl, cr = reverb(chord, 3.0, 3500, 0.4, seed=12)
    mus.add((cl[: len(chord)], cr[: len(chord)]), n1, 1.0)
    mus.add(pad([50, 57, 62, 65], end - boom, a=0.6, r=0.1, bright=1400, level=0.13), boom)

    # Fin : extinction jusqu'à zéro exactement à la dernière image.
    fade_n = int(1.6 * SR)
    for m in (mus, sfx):
        for ch in (m.L, m.R):
            ch[N - fade_n:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fade_n))
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
    # Gain vers −15 LUFS, puis limiteur doux : rien au-dessus de −1,5 dBFS.
    g = 10 ** ((-15.0 - lufs) / 20)
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
