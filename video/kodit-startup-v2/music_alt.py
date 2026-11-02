#  music_alt.py A|B [초] — 배경음악 후보 직접 합성 (자체 제작, 저작권 걱정 없음) → music_A_raw.wav / music_B_raw.wav (48kHz 스테레오)
#  A 희망찬 피아노: C장조 C–G–Am–F, 약 91 BPM — 피아노 분산화음 + 선율 → 현악 패드 → 부드러운 킥·셰이커로 차오름 → 피아노만 남고 C로 끝
#  B 밝은 기타 리듬: G장조 Em–C–G–D, 약 109 BPM — 기타 뜯는 소리(3-3-2 리듬) + 마림바 선율 + 베이스 + 킥·박수·셰이커, 가운데 잠깐 쉬었다 다시 차오름 → G로 끝
import sys, wave
import numpy as np
SR = 48000
KIND = sys.argv[1]
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else float(open("out/dur.txt").read())
N = int(DUR * SR) + SR
rng = np.random.default_rng(7 if KIND == "A" else 11)
L = np.zeros(N, np.float32); R = np.zeros(N, np.float32)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(t0, sig, pan=.5, g=1.0):
    s = int(t0 * SR)
    if s < 0: sig = sig[-s:]; s = 0
    n = min(len(sig), N - s)
    if n <= 0: return
    L[s:s + n] += (sig[:n] * g * np.sqrt(1 - pan)).astype(np.float32); R[s:s + n] += (sig[:n] * g * np.sqrt(pan)).astype(np.float32)

# ── 악기 ─────────────────────────────────────────────
def piano(m, vel, dur):
    f = hz(m); tail = 1.2; n = int((dur + tail) * SR); t = np.arange(n) / SR
    B = .00035; tau0 = float(np.clip(3.2 * (261.6 / f) ** .5, .8, 5.0))
    sig = np.zeros(n, np.float32)
    for k in range(1, 13):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 7000: break
        a = (1 / k ** 1.15) * np.exp(-(k - 1) * (1.05 - vel) * .35)
        for det in (-.7, .7):
            sig += (a * .5 * np.sin(2 * np.pi * fk * 2 ** (det / 1200) * t + rng.uniform(0, 6.28)) * np.exp(-t / (tau0 / (1 + .18 * k)))).astype(np.float32)
    sig *= (1 - np.exp(-t / .002)).astype(np.float32)
    off = int(dur * SR); rel = np.ones(n, np.float32); rel[off:] = np.exp(-np.arange(n - off) / SR / .18)
    ham = rng.standard_normal(int(.012 * SR)).astype(np.float32); ham = np.convolve(ham, np.ones(6) / 6, "same") * np.linspace(1, 0, len(ham)) * .08 * vel
    sig[:len(ham)] += ham
    return sig * rel * vel
def strings(ms, dur, att=1.2, rel=1.5):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; sig = np.zeros(n, np.float32)
    vib = 1 + .0018 * np.sin(2 * np.pi * 5.1 * t)
    for m in ms:
        f = hz(m)
        for det in (-7, 0, 7):
            fd = f * 2 ** (det / 1200); ph = rng.uniform(0, 6.28)
            for k in range(1, 14):
                if fd * k > 5000: break
                sig += ((1 / k) * np.exp(-k / 5.5) * np.sin(2 * np.pi * fd * k * vib * t + ph * k)).astype(np.float32)
    e = np.ones(n, np.float32); a = int(att * SR); r = int(rel * SR)
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2; e[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return sig * e / (len(ms) * 3)
def pluck(m, vel, p=.18, tau=.9):
    f = hz(m); n = int(1.6 * SR); t = np.arange(n) / SR; sig = np.zeros(n, np.float32)
    for k in range(1, 16):
        if f * k > 8000: break
        a = abs(np.sin(k * np.pi * p)) / k ** 1.3
        sig += (a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (tau / (1 + .45 * k)))).astype(np.float32)
    return sig * (1 - np.exp(-t / .0015)).astype(np.float32) * vel
def marimba(m, vel):
    f = hz(m); n = int(1.2 * SR); t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t / .38) + .35 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t / .07) + .08 * np.sin(2 * np.pi * 9.8 * f * t) * np.exp(-t / .02)
    return (sig * (1 - np.exp(-t / .002)) * vel).astype(np.float32)
def bass(m, vel, dur):
    f = hz(m); n = int((dur + .3) * SR); t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .25) + .12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / .12)
    e = (1 - np.exp(-t / .004)) * np.exp(-t / 1.4); off = int(dur * SR); e[off:] *= np.exp(-np.arange(n - off) / SR / .06)
    return (sig * e * vel).astype(np.float32)
def kick(vel):
    n = int(.4 * SR); t = np.arange(n) / SR
    fr = 45 + 75 * np.exp(-t / .035); ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) * np.exp(-t / .16) * (1 - np.exp(-t / .001)) * vel).astype(np.float32)
def noise_hit(dur, tau, hp=True):
    n = int(dur * SR); x = rng.standard_normal(n).astype(np.float32)
    if hp: x = np.diff(np.concatenate([[0], x])).astype(np.float32)
    t = np.arange(n) / SR
    return x * np.exp(-t / tau).astype(np.float32) * (1 - np.exp(-t / .002)).astype(np.float32)
def shaker(vel): return noise_hit(.12, .03) * .35 * vel
def clap(vel):
    x = np.zeros(int(.3 * SR), np.float32)
    for k, d in enumerate((0, .011, .022)):
        h = noise_hit(.25, .012 if k < 2 else .09, hp=False); h = np.convolve(h, np.ones(3) / 3, "same"); h = np.diff(np.concatenate([[0], h]))
        s = int(d * SR); x[s:s + len(h)] += h[:len(x) - s]
    return x * .9 * vel

# ── 곡 ───────────────────────────────────────────────
if KIND == "A":
    BARS = 60; BAR = (DUR - 4.5) / BARS; Q = BAR / 4; E8 = Q / 2
    # (베이스, 오른손 근음, 3도, 현악 화음, 선율 단조 여부)
    CH = [(36, 60, 4, [52, 55, 60, 64]), (43, 55, 4, [50, 55, 59, 62]), (45, 57, 3, [52, 57, 60, 64]), (41, 53, 4, [53, 57, 60, 65])]
    MEL = [  # 4마디 두 가지 (박 위치, 길이(박), 음)
        [[(0, 1.5, 76), (1.5, .5, 74), (2, 2, 72)], [(0, 1, 74), (1, 1, 76), (2, 2, 79)], [(0, 1.5, 76), (1.5, .5, 74), (2, 1, 72), (3, 1, 71)], [(0, 1, 69), (1, 1, 72), (2, 2, 74)]],
        [[(0, 1.5, 76), (1.5, .5, 77), (2, 2, 79)], [(0, 1, 79), (1, 1, 81), (2, 2, 79)], [(0, 1.5, 76), (1.5, .5, 77), (2, 1, 79), (3, 1, 84)], [(0, 1, 81), (1, 1, 79), (2, 2, 77)]],
    ]
    for b in range(BARS + 1):
        t0 = b * BAR; last = b == BARS
        c = 0 if last else b % 4; bs, r, third, pad = CH[c]
        sec = 0 if b < 4 else 1 if b < 20 else 2 if b < 36 else 3 if b < 54 else 4
        lvl = [.62, .72, .78, .86, .66][sec]
        if last:
            for k, m in enumerate([48, 55, 60, 64, 67, 72, 76]):
                put(t0 + k * .045, piano(m, .7 - .03 * k, 4.0), .35 + .05 * k, .55)
            put(t0, piano(36, .7, 4.0), .5, .6)
            break
        pat = [r, r + 7, r + 12 + third, r + 7, r + 12, r + 7, r + 12 + third, r + 7]
        for k, m in enumerate(pat):
            put(t0 + k * E8 + rng.uniform(-.004, .004), piano(m, lvl * (1.0 if k % 2 == 0 else .82) * rng.uniform(.92, 1.0), E8 * 1.6), .56, .5)
        put(t0, piano(bs, lvl * .9, BAR * .95), .45, .62); put(t0, piano(bs + 12, lvl * .55, BAR * .95), .45, .5)
        if sec in (1, 2, 3):
            ph = MEL[(b // 4) % 2][b % 4]
            for pos, ln, m in ph:
                put(t0 + pos * Q, piano(m + (12 if sec == 3 and m < 79 else 0), lvl * 1.05, ln * Q * .95), .6, .55)
        if sec in (2, 3):
            put(t0 - .3, strings(pad, BAR + .3, att=.9, rel=1.2), .4, .55 if sec == 2 else .7)
        if sec == 3:
            for k in range(4): put(t0 + k * Q, kick(.55 if k % 2 == 0 else .3), .5, .5)
            for k in range(8): put(t0 + k * E8, shaker(.9 if k % 2 else .55), .7, .4)
        elif sec == 2 and b >= 28:
            for k in range(8): put(t0 + k * E8, shaker(.7 if k % 2 else .4), .7, .35)
else:
    BARS = 72; BAR = (DUR - 4.0) / BARS; Q = BAR / 4; E8 = Q / 2
    CH = [  # 베이스, 기타 4음, 패드
        (40, [64, 67, 71, 76], [52, 59, 64, 67]), (36, [64, 67, 72, 76], [52, 55, 60, 64]),
        (43, [62, 67, 71, 74], [50, 55, 59, 62]), (38, [62, 66, 69, 74], [50, 54, 57, 62])]
    MAR = [[(0, 71), (3, 76), (6, 74)], [(0, 72), (3, 76), (6, 79)], [(0, 74), (3, 71), (6, 67)], [(0, 69), (2, 74), (4, 78), (6, 81)]]
    GPAT = [0, 1, 2, 3, 2, 1, 2, 3]; ACC = {0, 3, 6}
    for b in range(BARS + 1):
        t0 = b * BAR; last = b == BARS
        if last:
            for k, m in enumerate([55, 59, 62, 67, 71, 74]):
                put(t0 + k * .03, pluck(m, .8, tau=2.2), .3 + .08 * k, .55)
            put(t0, bass(31, .8, 3.5), .5, .6); put(t0, strings([50, 55, 59, 62, 67], 3.6, att=.2, rel=2.0), .5, .5)
            put(t0, marimba(79, .7), .6, .4)
            break
        c = b % 4; bs, gt, pad = CH[c]
        sec = 0 if b < 8 else 1 if b < 24 else 2 if b < 48 else 3 if b < 56 else 4
        lvl = [.7, .8, .9, .72, .95][sec]
        for k in range(8):
            m = gt[GPAT[k]] + (12 if (sec == 4 and k in (2, 6)) else 0)
            put(t0 + k * E8 + rng.uniform(-.003, .003), pluck(m, lvl * (1.0 if k in ACC else .62)), .38 if k % 2 else .62, .42)
        put(t0 - .2, strings(pad, BAR + .2, att=.5, rel=.8), .5, .22 if sec in (0, 3) else .3)
        if sec >= 1 and sec != 3:
            for pos, ln in ((0, 1.4), (3, 1.0), (4, 1.4), (7, .8)):
                put(t0 + pos * E8, bass(bs, lvl * (1 if pos in (0, 4) else .7), ln * E8), .5, .5)
        if sec in (2, 4) or (sec == 3 and b % 2 == 0):
            for pos, m in MAR[c]: put(t0 + pos * E8, marimba(m, lvl * .9), .66, .3)
        if sec in (2, 4):
            for k in (0, 2): put(t0 + k * Q, kick(.7), .5, .55)
            put(t0 + 2.5 * Q, kick(.4), .5, .5)
            for k in (1, 3): put(t0 + k * Q, clap(.6), .45, .32)
            for k in range(8): put(t0 + k * E8, shaker(.9 if k % 2 else .5), .7, .3)
        elif sec == 1 and b >= 16:
            for k in range(8): put(t0 + k * E8, shaker(.7 if k % 2 else .4), .7, .25)
            if b % 2 == 1: put(t0 + 3.5 * Q, kick(.35), .5, .4)

# ── 잔향 (짧게, 젖은 소리 18%) · 마무리 ─────────────
def ir(seed):
    r = np.random.default_rng(seed); n = int(1.8 * SR); tt = np.arange(n) / SR
    x = r.standard_normal(n) * np.exp(-tt / .45); x = np.convolve(x, np.ones(14) / 14, mode="same")
    x[: int(.015 * SR)] *= np.linspace(0, 1, int(.015 * SR))
    return (x / np.sqrt(np.sum(x ** 2))).astype(np.float32)
def conv(a, h):
    m = len(a) + len(h) - 1; nf = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, nf) * np.fft.rfft(h, nf), nf)[: len(a)].astype(np.float32)
wl, wr = conv(L, ir(3)), conv(R, ir(4))
L = .82 * L + .18 * wl * 3.0; R = .82 * R + .18 * wr * 3.0
L = L[: int(DUR * SR)]; R = R[: int(DUR * SR)]
fi = int(.6 * SR); fo = int(2.5 * SR)
for ch in (L, R):
    ch[:fi] *= np.linspace(0, 1, fi); ch[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
y = np.stack([L, R], 1); y /= np.abs(y).max() / .7
w = wave.open(f"music_{KIND}_raw.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((y * 32767).astype(np.int16).tobytes()); w.close()
print(f"music_{KIND}_raw.wav {DUR:.2f}초 · {BARS}마디 × {BAR:.3f}초 · 약 {240 / BAR:.0f} BPM")
