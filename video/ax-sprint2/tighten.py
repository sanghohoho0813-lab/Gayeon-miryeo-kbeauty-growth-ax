#  문장 사이 쉼을 「아주 살짝」 줄입니다. (스타일 가이드 7-②)
import wave, numpy as np, json
w = wave.open('sped.wav'); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32)
hop = int(sr * .01); n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean((x[:n*hop] / 32768).reshape(n, hop) ** 2, axis=1) + 1e-12))
sil = db < -38
runs, i = [], 0
while i < n:
    if sil[i]:
        j = i
        while j < n and sil[j]: j += 1
        a, b = i * .01, j * .01
        if b - a >= .35 and a > .05 and b < n * .01 - .05: runs.append((a, b))
        i = j
    else: i += 1
KEEP, RATIO = .35, .55
cuts = []
for a, b in runs:
    L = b - a; newL = KEEP + (L - KEEP) * RATIO; cut = L - newL
    mid = (a + b) / 2
    cuts.append((mid - cut / 2, cut))
xf = int(sr * .008)
out, pos = [], 0
for c0, cl in cuts:
    s0, s1 = int(c0 * sr), int((c0 + cl) * sr)
    seg = x[pos:s0].copy()
    if out and xf:
        prev = out[-1]
        ramp = np.linspace(0, 1, xf)
        prev[-xf:] = prev[-xf:] * (1 - ramp) + seg[:xf] * ramp
        seg = seg[xf:]
    out.append(seg); pos = s1
out.append(x[pos:])
y = np.concatenate(out)
wo = wave.open('tight.wav', 'w'); wo.setnchannels(1); wo.setsampwidth(2); wo.setframerate(sr)
wo.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes()); wo.close()
json.dump(cuts, open('cuts.json', 'w'))
print(f"줄인 쉼 {len(cuts)}곳 · 합계 {sum(c for _, c in cuts):.1f}s 줄어듦 · {len(x)/sr:.1f}s → {len(y)/sr:.1f}s")
