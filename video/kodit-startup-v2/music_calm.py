#  music_calm.py [초] — V2.1의 잔잔한 배경음악 (D장조 Dmaj9–Bm9–Gmaj9–Asus2, 패드 + 드문 맑은 음). V2.1b에서 music.py(희망찬 곡)로 교체 — 기록용
#  D장조 4화음 순환(Dmaj9 → Bm9 → Gmaj9 → Asus2) · 부드러운 패드 + 드문 맑은 음 + 합성 잔향, 마지막은 Dmaj9로 끝남
#  음량: highpass 45Hz + 2-pass loudnorm -24.5 LUFS → music.wav, 말할 때 5dB 덕킹(mix.py) → 목소리보다 약 20dB 아래
import sys, wave
import numpy as np
SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else float(open("out/dur.txt").read())
N = int(DUR * SR)
rng = np.random.default_rng(20261102)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
# MIDI 음 (베이스, 패드 음들, 위쪽 맑은 음 후보)
CH = [
    (38, [50, 57, 61, 64, 66], [74, 78, 81, 76, 73]),   # Dmaj9
    (35, [47, 54, 57, 61, 62], [74, 73, 78, 71, 69]),   # Bm9
    (31, [43, 50, 54, 57, 59], [74, 78, 71, 69, 66]),   # Gmaj9
    (33, [45, 52, 57, 59, 61], [76, 73, 71, 69, 64]),   # Asus2(add6)
]
BEAT = 60 / 70
n_ch = max(4, round(DUR / (8 * BEAT)))
CL = DUR / n_ch                                         # 화음 길이 (≈6.9초)
seq = [k % 4 for k in range(n_ch)]; seq[-1] = 0           # 마지막은 Dmaj9
t = np.arange(N) / SR
L = np.zeros(N, np.float32); R = np.zeros(N, np.float32)

def env(n, att, rel):
    e = np.ones(n, np.float32); a = int(att * SR); r = int(rel * SR)
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2; e[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e

# 패드: 음마다 배음 5개(1/k^1.8) × 살짝 어긋난 2목소리, 화음끼리 3초 겹침
for i, c in enumerate(seq):
    bass, pad, _ = CH[c]
    s = int(max(0, i * CL - 1.5) * SR); e = int(min(DUR, (i + 1) * CL + 1.5) * SR); n = e - s
    tt = t[s:e]; g = env(n, 2.2, 2.6)
    for m in pad:
        f0 = hz(m)
        for v, det in enumerate((-3.5, 3.5)):
            f = f0 * 2 ** (det / 1200)
            ph = rng.uniform(0, 2 * np.pi, 6)
            sig = np.zeros(n, np.float32)
            for k in range(1, 6):
                if f * k > 2400: break
                sig += (1 / k ** 1.8) * np.sin(2 * np.pi * f * k * tt + ph[k]).astype(np.float32)
            pan = .5 + (.22 if v else -.22) * (1 if m % 2 else -1)
            amp = .055 * g
            L[s:e] += sig * amp * np.sqrt(1 - pan); R[s:e] += sig * amp * np.sqrt(pan)
    b = (np.sin(2 * np.pi * hz(bass) * tt) + .25 * np.sin(2 * np.pi * hz(bass) * 2 * tt)).astype(np.float32) * .07 * g
    L[s:e] += b; R[s:e] += b

# 맑은 음 (펠트 피아노 느낌): 2박마다, 55% 확률, 화음의 위쪽 음
step = 2 * BEAT; k = 0; tk = 2.0
while tk < DUR - 3.0:
    c = seq[min(int(tk // CL), n_ch - 1)]
    if rng.random() < .55:
        m = CH[c][2][rng.integers(0, 5)]; f = hz(m); vel = rng.uniform(.55, 1.0)
        s = int(tk * SR); n = min(int(3.2 * SR), N - s); tt = np.arange(n) / SR
        e_ = (1 - np.exp(-tt / .008)) * np.exp(-tt / 1.1)
        sig = (np.sin(2 * np.pi * f * tt) + .28 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / .35) + .08 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt / .2)) * e_ * .05 * vel
        pan = rng.uniform(.3, .7)
        L[s:s + n] += (sig * np.sqrt(1 - pan)).astype(np.float32); R[s:s + n] += (sig * np.sqrt(pan)).astype(np.float32)
    tk += step

# 숨 쉬듯 느린 음량 변화 (±1dB)
lfo = (10 ** ((np.sin(2 * np.pi * .05 * t) * 1.0) / 20)).astype(np.float32); L *= lfo; R *= lfo

# 합성 잔향: 2.8초 감쇠 잡음(좌우 다름), 고역 깎음 → FFT 합성곱, 젖은 소리 35%
def ir(seed):
    r = np.random.default_rng(seed); n = int(2.8 * SR); tt = np.arange(n) / SR
    x = r.standard_normal(n) * np.exp(-tt / .75)
    k = 24; x = np.convolve(x, np.ones(k) / k, mode="same")   # 고역 깎기
    x[: int(.02 * SR)] *= np.linspace(0, 1, int(.02 * SR))
    return (x / np.sqrt(np.sum(x ** 2))).astype(np.float32)
def conv(a, h):
    m = len(a) + len(h) - 1; nf = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, nf) * np.fft.rfft(h, nf), nf)[: len(a)].astype(np.float32)
wl, wr = conv(L, ir(1)), conv(R, ir(2))
L = .65 * L + .35 * wl * 3.0; R = .65 * R + .35 * wr * 3.0

# 처음 2초 들어오기 · 끝 3초 사라지기
fi = int(2.0 * SR); fo = int(3.0 * SR)
for ch in (L, R):
    ch[:fi] *= np.linspace(0, 1, fi) ** 2; ch[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
y = np.stack([L, R], 1); y /= np.abs(y).max() / .5
w = wave.open("music_raw.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((y * 32767).astype(np.int16).tobytes()); w.close()
print(f"music_raw.wav {DUR:.2f}초 · 화음 {n_ch}개 × {CL:.2f}초")
