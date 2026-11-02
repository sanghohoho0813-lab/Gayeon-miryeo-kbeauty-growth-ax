#  mix.py <fmt> — 목소리(앞 0.8초) + 효과음 큐(out/sfx_<fmt>.json) → out/mix_<fmt>.wav (48kHz 스테레오, 정규화 전)
#  효과음은 은은하게 (도구 가이드 §1-7): swish · click · tick · pop
import json, sys, wave
import numpy as np
F = sys.argv[1]; SR = 48000
DUR = float(open("out/dur.txt").read()); N = int(round(DUR * 60)) / 60; L = int(N * SR)
def rd(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if w.getnchannels() == 2: a = a.reshape(-1, 2)
    else: a = np.stack([a, a], 1)
    assert w.getframerate() == SR; return a
out = np.zeros((L, 2), np.float32)
vo = rd("voice.wav"); s0 = int(.8 * SR); out[s0:s0 + len(vo)] += vo[: L - s0]
G = {"swish": 0.0, "click": -18.0, "tick": -18.0, "pop": -16.0}
fx = {k: rd(f"sfx/{k}.wav") for k in G}
for t, k in json.load(open(f"out/sfx_{F}.json")):
    a = int(t * SR); x = fx[k] * 10 ** (G[k] / 20); n = min(len(x), L - a)
    if n > 0: out[a:a + n] += x[:n]
fade = int(1.0 * SR); out[-fade:] *= np.linspace(1, 0, fade)[:, None]
w = wave.open(f"out/mix_{F}.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print(F, "mix", round(L / SR, 2), "초 · 효과음", len(json.load(open(f"out/sfx_{F}.json"))))
