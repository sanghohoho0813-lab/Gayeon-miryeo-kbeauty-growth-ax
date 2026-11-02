#  music.py [초] — 희망찬 배경음악을 직접 합성 (자체 제작, 저작권 걱정 없음) → music_raw.wav (48kHz 스테레오)
#  V2.1b (사용자: '약간 더 희망찬 음악'): D장조 I–V–vi–IV (D–A–Bm–G) 순환, 약 86 BPM
#  - 밝은 음역 패드 + 8분음 아르페지오(6초부터 서서히, 뒤로 갈수록 조금씩 커짐) + 올라가는 종소리 선율 + 부드러운 베이스
#  - 화음 수를 4k+1로 맞춰 마지막이 G → D로 풀림(끝 화음 길게)
#  음량: highpass 70Hz + 2-pass loudnorm -24.5 LUFS → music.wav, 말할 때 5dB 덕킹(mix.py) → 목소리보다 약 20dB 아래
import sys, wave
import numpy as np
SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else float(open("out/dur.txt").read())
N = int(DUR * SR)
rng = np.random.default_rng(20261102)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
# (베이스, 패드, 아르페지오 8음, 종소리 선율 음)
CH = [
    (38, [57, 62, 64, 66, 69], [62, 66, 69, 74, 76, 74, 69, 66], 78),   # D(add9)
    (33, [57, 61, 64, 69, 71], [61, 64, 69, 73, 76, 73, 69, 64], 76),   # A(add9)
    (35, [54, 59, 62, 66, 69], [62, 66, 71, 74, 78, 74, 71, 66], 78),   # Bm7
    (31, [55, 59, 62, 66, 69], [62, 67, 71, 74, 79, 74, 71, 67], 79),   # Gmaj7
]
n_ch = round(DUR / 5.6); n_ch += (1 - n_ch % 4) % 4                     # 4k+1 → 마지막 화음 D
CL = DUR / n_ch; BEAT = CL / 8
seq = [k % 4 for k in range(n_ch)]
t = np.arange(N) / SR
L = np.zeros(N, np.float32); R = np.zeros(N, np.float32)
def add(s, sig, pan):
    n = min(len(sig), N - s)
    if n <= 0: return
    L[s:s + n] += (sig[:n] * np.sqrt(1 - pan)).astype(np.float32); R[s:s + n] += (sig[:n] * np.sqrt(pan)).astype(np.float32)
def env(n, att, rel):
    e = np.ones(n, np.float32); a = int(att * SR); r = int(rel * SR)
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2; e[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e

# 패드 (화음끼리 1.2초 겹침, 마지막 화음은 끝까지)
for i, c in enumerate(seq):
    bass, pad, _, _ = CH[c]
    last = i == n_ch - 1
    s = int(max(0, i * CL - 1.2) * SR); e = N if last else int(min(DUR, (i + 1) * CL + 1.2) * SR); n = e - s
    tt = t[s:e]; g = env(n, 1.6, 3.0 if last else 2.0)
    for m in pad:
        f0 = hz(m)
        for v, det in enumerate((-4.0, 4.0)):
            f = f0 * 2 ** (det / 1200); ph = rng.uniform(0, 2 * np.pi, 6)
            sig = np.zeros(n, np.float32)
            for k in range(1, 6):
                if f * k > 3000: break
                sig += (1 / k ** 1.7) * np.sin(2 * np.pi * f * k * tt + ph[k]).astype(np.float32)
            add(s, sig * .045 * g, .5 + (.25 if v else -.25) * (1 if m % 2 else -1))
    # 베이스: 마디 첫 박마다 부드럽게 (+ 아주 작은 지속음)
    sus = (np.sin(2 * np.pi * hz(bass) * tt)).astype(np.float32) * .03 * g
    add(s, sus, .5)
    for b in range(2 if not last else 1):
        bs = int((i * CL + b * 4 * BEAT) * SR); nn = int(2.6 * SR); t2 = np.arange(nn) / SR
        sig = (np.sin(2 * np.pi * hz(bass + 12) * t2) + .3 * np.sin(2 * np.pi * hz(bass + 24) * t2) * np.exp(-t2 / .3)) * (1 - np.exp(-t2 / .01)) * np.exp(-t2 / 1.0) * .07
        add(bs, sig, .5)

# 아르페지오 (8분음, 6초부터 들어옴, 진행에 따라 0.75 → 1.0)
step = BEAT / 2; tk = 6.0
while tk < DUR - CL:
    i = int(tk // CL); c = seq[i]; pos = int(round((tk - i * CL) / step)) % 8
    m = CH[c][2][pos]; f = hz(m)
    vel = (.75 + .25 * tk / DUR) * min(1, (tk - 6.0) / 4 + .25) * (1.12 if pos == 0 else 1.0) * rng.uniform(.85, 1.0)
    nn = int(1.4 * SR); t2 = np.arange(nn) / SR
    sig = (np.sin(2 * np.pi * f * t2) + .22 * np.sin(2 * np.pi * 2 * f * t2) * np.exp(-t2 / .15)) * (1 - np.exp(-t2 / .005)) * np.exp(-t2 / .42) * .028 * vel
    add(int((tk + rng.uniform(-.006, .006)) * SR), sig, .5 + .28 * np.sin(pos * np.pi / 4))
    tk += step

# 종소리 선율 (화음마다 하나, 마지막 D에서 A5로 올라감)
for i, c in enumerate(seq):
    if i * CL < 3.0: continue
    m = 81 if i == n_ch - 1 else CH[c][3]
    f = hz(m); s = int((i * CL + BEAT * .02) * SR); nn = int(4.5 * SR); t2 = np.arange(nn) / SR
    sig = (np.sin(2 * np.pi * f * t2) + .18 * np.sin(2 * np.pi * 2 * f * t2) * np.exp(-t2 / .5) + .06 * np.sin(2 * np.pi * 3.01 * f * t2) * np.exp(-t2 / .25)) * (1 - np.exp(-t2 / .006)) * np.exp(-t2 / 1.6) * .045
    add(s, sig, .62 if i % 2 else .38)

# 합성 잔향 (2.6초, 좌우 다름, 고역 깎음), 젖은 소리 30%
def ir(seed):
    r = np.random.default_rng(seed); n = int(2.6 * SR); tt = np.arange(n) / SR
    x = r.standard_normal(n) * np.exp(-tt / .7)
    k = 20; x = np.convolve(x, np.ones(k) / k, mode="same")
    x[: int(.02 * SR)] *= np.linspace(0, 1, int(.02 * SR))
    return (x / np.sqrt(np.sum(x ** 2))).astype(np.float32)
def conv(a, h):
    m = len(a) + len(h) - 1; nf = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, nf) * np.fft.rfft(h, nf), nf)[: len(a)].astype(np.float32)
wl, wr = conv(L, ir(1)), conv(R, ir(2))
L = .7 * L + .3 * wl * 3.0; R = .7 * R + .3 * wr * 3.0

fi = int(1.5 * SR); fo = int(3.0 * SR)
for ch in (L, R):
    ch[:fi] *= np.linspace(0, 1, fi) ** 2; ch[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
y = np.stack([L, R], 1); y /= np.abs(y).max() / .5
w = wave.open("music_raw.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((y * 32767).astype(np.int16).tobytes()); w.close()
print(f"music_raw.wav {DUR:.2f}초 · 화음 {n_ch}개 × {CL:.2f}초 · 약 {60 / BEAT:.0f} BPM")
