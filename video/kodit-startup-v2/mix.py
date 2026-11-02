#  mix.py <fmt> — 목소리(앞 0.8초) + 효과음 큐(out/sfx_<fmt>.json) → out/mix_<fmt>.wav (48kHz 스테레오, 정규화 전)
#  효과음은 은은하게 (도구 가이드 §1-7): swish · click · tick · pop
#  배경음악(music.wav, 자체 합성 · -24.5 LUFS로 맞춘 것)은 말할 때 5dB 낮춤(덕킹: 붙기 0.08초 · 풀리기 0.6초 · 유지 0.25초)
import os
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
if os.path.exists("music.wav"):
    mu = rd("music.wav")[:L]; mu = np.pad(mu, ((0, L - len(mu)), (0, 0)))
    hop = SR // 100; nf = L // hop
    vm = out[: nf * hop, 0].reshape(nf, hop)
    act = (20 * np.log10(np.sqrt((vm ** 2).mean(1)) + 1e-9) > -45).astype(np.float32)
    hold = 25; act = np.array([act[max(0, k - hold):k + 1].max() for k in range(nf)], np.float32)
    env = np.zeros(nf, np.float32); e = 0.0
    for k in range(nf):
        tau = .08 if act[k] > e else .6; e += (act[k] - e) * (1 - np.exp(-.01 / tau)); env[k] = e
    g = 10 ** (-5 * env / 20); gs = np.interp(np.arange(L), np.arange(nf) * hop + hop / 2, g).astype(np.float32)
    out += mu * gs[:, None]
G = {"swish": 0.0, "click": -18.0, "tick": -18.0, "pop": -16.0}
fx = {k: rd(f"sfx/{k}.wav") for k in G}
for t, k in json.load(open(f"out/sfx_{F}.json")):
    a = int(t * SR); x = fx[k] * 10 ** (G[k] / 20); n = min(len(x), L - a)
    if n > 0: out[a:a + n] += x[:n]
fade = int(1.0 * SR); out[-fade:] *= np.linspace(1, 0, fade)[:, None]
w = wave.open(f"out/mix_{F}.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print(F, "mix", round(L / SR, 2), "초 · 효과음", len(json.load(open(f"out/sfx_{F}.json"))))
