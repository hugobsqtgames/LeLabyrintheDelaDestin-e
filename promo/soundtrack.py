#!/usr/bin/env python3
"""
Bande-son de la vidéo, synthétisée et calée sur la scène (coupes, appuis, coups).

    python3 promo/soundtrack.py cues.json sortie.wav

Même palette que les ambiances du jeu (scripts/generate-ambience.py) : drones
graves, cloches lointaines, claquements de dents, battements. Ajoute pour la
publicité : impacts sur chaque coupe, montées avant les révélations, tic-tac de
l'horloge des sept jours, clics d'interface synchronisés avec les appuis.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
cues = json.load(open(sys.argv[1]))
DUR = float(cues['duration'])
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def env(a, b, attack=0.5, release=0.5):
    """Enveloppe 0→1→0 entre a et b (secondes)."""
    e = np.clip((t - a) / max(attack, 1e-3), 0, 1) * np.clip((b - t) / max(release, 1e-3), 0, 1)
    return e * e * (3 - 2 * e)


def place(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    n = min(len(sig), N - i)
    L[i : i + n] += sig[:n] * gain * np.sqrt(0.5 * (1 - pan))
    R[i : i + n] += sig[:n] * gain * np.sqrt(0.5 * (1 + pan))


def lowpass(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, n=len(x))


def bandpass(x, lo, hi):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / (1 + (f / hi) ** 4))
    return np.fft.irfft(spec, n=len(x))


def reverb(x, seconds=2.4, seed=0):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / (SR * seconds / 6.5))
    ir = lowpass(ir, 5000)
    ir /= np.sqrt(np.sum(ir**2))
    m = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), n=m)
    return y[: len(x)]


# --- Nappe : accord grave de ré mineur qui s'ouvre, puis se résout -----------------

def pad(freqs, a, b, gain, bright=0.0):
    sig = np.zeros(N)
    for k, f in enumerate(freqs):
        for d in (-0.18, 0.0, 0.21):
            ph = rng.uniform(0, 2 * np.pi)
            saw = 2 * (((f * (1 + d / 100)) * t + ph / (2 * np.pi)) % 1) - 1
            sig += saw * (0.6 if k == 0 else 0.35)
    dark = lowpass(sig, 380)
    light = lowpass(sig, 1800)
    mixk = np.clip(bright, 0, 1)
    return (dark * (1 - mixk) + light * mixk) * env(a, b, 1.6, 1.4) * gain


intensity = np.interp(t, [0, 2.7, 5.7, 8.3, 12.2, 15.6, 22.3, 25.8, 30], [0.15, 0.55, 0.45, 0.6, 0.85, 0.6, 0.9, 0.3, 0.2])
minor = pad([73.42, 110.0, 174.61, 220.0], 0.0, 26.2, 0.05, bright=intensity * 0.7)
major = pad([73.42, 146.83, 220.0, 369.99, 440.0], 25.6, DUR + 1.5, 0.045, bright=0.5)
place(minor * (0.5 + intensity), 0, 1.0, -0.15)
place(minor * (0.5 + intensity), 0, 0.9, 0.15)
place(major, 0, 1.0, 0.0)

# Souffle de vent filtré, comme dans les ambiances du jeu.
wind = bandpass(rng.standard_normal(N), 200, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.3)) * env(0, 26.5, 1.5, 1.5)
place(wind, 0, 0.035, -0.4)
place(np.roll(wind, SR // 3), 0, 0.035, 0.4)

# --- Ouverture : grésillement de radio et cloche lointaine ---------------------

for k in range(18):
    at = rng.uniform(0.05, 2.5)
    n = int(rng.uniform(0.03, 0.18) * SR)
    burst = bandpass(rng.standard_normal(n), 900, 3200) * np.hanning(n)
    place(burst, at, 0.05 * rng.uniform(0.4, 1), rng.uniform(-0.6, 0.6))


def bell(freq, dur=6.0):
    tt = np.arange(int(dur * SR)) / SR
    parts = [(1, 1), (2.76, 0.45), (5.4, 0.25), (8.93, 0.12)]
    return sum(a * np.sin(2 * np.pi * freq * p * tt) * np.exp(-tt * (0.9 + p * 0.5)) for p, a in parts)


b1 = bell(293.66)
place(reverb(np.pad(b1, (0, SR * 2)), 3.0, 1), 0.35, 0.05, -0.3)

# --- Tic-tac : « sept jours » --------------------------------------------------

def tick(f=2600):
    n = int(0.03 * SR)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 260) + 0.4 * rng.standard_normal(n) * np.exp(-tt * 500)


for k, at in enumerate(np.arange(2.75, 5.6, 0.5)):
    place(tick(2600 if k % 2 == 0 else 2100), at, 0.12, 0.25 if k % 2 else -0.25)

# --- Battement de cœur sourd (tension) -----------------------------------------

def thump(f=52, dur=0.35):
    tt = np.arange(int(dur * SR)) / SR
    fr = f * (1 + 1.2 * np.exp(-tt * 28))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 11)


beat = 60 / 72
for at in np.arange(8.3, 22.2, beat):
    g = 0.22 if 12.2 <= at < 15.6 else 0.12
    place(thump(), at, g)
    place(thump(48), at + 0.24, g * 0.6)

# --- Impacts sur les coupes -----------------------------------------------------

def impact(power=1.0, seed=0):
    n = int(2.8 * SR)
    tt = np.arange(n) / SR
    fr = 44 * (1 + 2.0 * np.exp(-tt * 18))
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 3.2)
    r = np.random.default_rng(seed)
    noise = lowpass(r.standard_normal(n), 2200) * np.exp(-tt * 14)
    body = sub * 0.9 + noise * 0.35
    return (body + 0.5 * reverb(body, 2.0, seed)) * power


for k, at in enumerate(cues['cuts']):
    place(impact(1.0 if at in (2.7, 22.3, 25.8) else 0.6, k), at - 0.01, 0.42)

# --- Montées avant les révélations ---------------------------------------------

def riser(dur):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    k = np.linspace(0, 1, n)
    out = np.zeros(n)
    for i, c in enumerate([300, 900, 2500, 6000]):
        seg = bandpass(x, c * 0.6, c * 1.6)
        w = np.clip(k * 4 - i, 0, 1) * np.clip(4 - k * 4 + i * 0.0, 0, 1)
        out += seg * w
    return out * k**2.2


for start, end in [(4.6, 5.7), (21.4, 22.3), (24.8, 25.8)]:
    place(riser(end - start), start, 0.16)

# Souffle de caméra : passage dans l'écran (22,3 → 23,9).
n = int(1.6 * SR)
whoosh = bandpass(rng.standard_normal(n), 250, 3000) * np.sin(np.linspace(0, np.pi, n)) ** 2
place(whoosh, 22.3, 0.14)

# --- Interface : appuis et coups ---------------------------------------------

def click():
    n = int(0.06 * SR)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt * 110) * 0.7 + np.sin(2 * np.pi * 420 * tt) * np.exp(-tt * 60)


for at in cues['taps']:
    place(click(), at, 0.16, 0.1)

for k, at in enumerate(cues.get('hits', [])):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    hit = lowpass(rng.standard_normal(n), 3500) * np.exp(-tt * 22) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 12)
    place(hit, at, 0.3, -0.2 if k % 2 else 0.2)

# Claquements de dents lointains pendant le combat.
for at in (12.6, 14.1):
    for j in range(9):
        n = int(0.012 * SR)
        b = bandpass(rng.standard_normal(n), 1500, 6000) * np.hanning(n)
        place(b, at + j * 0.1 + rng.uniform(0, 0.03), 0.06, 0.5)

# --- Conclusion : cloche claire et accord résolu -------------------------------

b2 = bell(587.33, 6) + 0.6 * bell(880.0, 6)
place(reverb(np.pad(b2, (0, SR * 3)), 3.2, 4), 25.95, 0.09)

# --- Mixage ---------------------------------------------------------------------

mixL = L + 0.25 * reverb(L, 1.6, 11)
mixR = R + 0.25 * reverb(R, 1.6, 12)
fade = np.clip((DUR - t) / 0.6, 0, 1)
fade_in = np.clip(t / 0.08, 0, 1)
mixL *= fade * fade_in
mixR *= fade * fade_in
rms = np.sqrt(np.mean((mixL**2 + mixR**2) / 2))
gain = 10 ** (-17 / 20) / max(rms, 1e-9)
mixL = np.tanh(mixL * gain * 1.1) / 1.1
mixR = np.tanh(mixR * gain * 1.1) / 1.1
peak = max(np.abs(mixL).max(), np.abs(mixR).max())
if peak > 0.89:
    mixL *= 0.89 / peak
    mixR *= 0.89 / peak

data = np.empty(N * 2, dtype='<i2')
data[0::2] = (mixL * 32767).astype('<i2')
data[1::2] = (mixR * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print(f'  bande-son : {DUR:.1f} s, {sys.argv[2]}')
