#  assemble.py — 짧은 파일(첫 문장) + 긴 파일(첫 문장 뺀 나머지) → 쉼 정리(도구 가이드 §4-3) → asm.wav (24kHz)
#  문장 사이 0.4초 · 장(문단) 사이 0.7초 · 문장 안 0.9초 넘는 쉼은 0.65초 · 그 밖의 쉼은 그대로
import json, re, wave, difflib, bisect
import numpy as np
SR = 24000
def load(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32); assert w.getframerate() == SR; return a
S_A, S_B = 0.20, 10.80          # 짧은 파일 말 구간 (앞뒤 무음 조금 남김)
L_CUT = 10.35                   # 긴 파일: 첫 문장 끝(9.95초 무음 시작) ~ 둘째 문장 시작(10.46초) 사이
short = load("short_src.wav")[int(S_A * SR):int(S_B * SR)]
long_ = load("long_src.wav")[int(L_CUT * SR):]
x = np.concatenate([short, long_])
OFF = len(short) / SR
# 단어 시각을 합친 파일 기준으로
words = []
for sg in json.load(open("asr_short.json")):
    for w in sg["words"]: words.append((w["s"] - S_A, w["e"] - S_A, w["w"]))
for sg in json.load(open("asr_long.json")):
    for w in sg["words"]:
        if w["s"] >= L_CUT - .05 and "자막" not in w["w"] and "박진희" not in w["w"]: words.append((w["s"] - L_CUT + OFF, w["e"] - L_CUT + OFF, w["w"]))
# 대본 문장 끝 · 문단 끝 글자 위치
norm = lambda s: re.sub(r"[^0-9A-Za-z가-힣]", "", s)
paras = [p.strip() for p in open("script.txt").read().strip().split("\n\n")]
sc, ends = "", []           # (끝 글자 index, 문단 끝 여부)
for p in paras:
    sents = [q for q in re.split(r"(?<=[.!?])\s+", p) if q]
    for k, q in enumerate(sents):
        sc += norm(q); ends.append((len(sc) - 1, k == len(sents) - 1))
ac, at1 = [], []
for s0, s1, w in words:
    n = norm(w)
    for k, ch in enumerate(n): ac.append(ch); at1.append(s0 + (s1 - s0) * (k + 1) / len(n))
sm = difflib.SequenceMatcher(None, sc, "".join(ac), autojunk=False)
m = {}
for a, b, size in sm.get_matching_blocks():
    for k in range(size): m[a + k] = at1[b + k]
print(f"대본 {len(sc)}자 · 맞은 글자 {len(m)} ({len(m)/len(sc):.1%})")
def end_time(i):
    while i not in m and i > 0: i -= 1
    return m.get(i)
bounds = [(end_time(i), para) for i, para in ends[:-1]]
# 10ms 음량 → 말/무음
hop = int(.01 * SR); n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1)) / 32768 + 1e-9)
sp = db > -38
# 80ms 미만 소리는 말이 아님(딸깍)
i = 0
while i < n:
    if sp[i]:
        j = i
        while j < n and sp[j]: j += 1
        if j - i < 8: sp[i:j] = False
        i = j
    else: i += 1
runs = []   # 무음 구간 (시작, 끝) 초
i = 0
while i < n:
    if not sp[i]:
        j = i
        while j < n and not sp[j]: j += 1
        runs.append((i * .01, j * .01)); i = j
    else: i += 1
first_sp = next(k for k in range(n) if sp[k]) * .01; last_sp = (n - 1 - next(k for k in range(n) if sp[n - 1 - k])) * .01
out, plan, cur = [], [], first_sp
# 문장 끝마다 가장 가까운 0.2초 이상 무음 하나를 경계로 (단어 사이 아주 짧은 틈은 제외)
cand = [(a, b) for (a, b) in runs if b - a >= .2 and first_sp < a < last_sp]
bmap = {}
for k, (te, para) in enumerate(bounds):
    best = min(cand, key=lambda r: abs(r[0] - te))
    if abs(best[0] - te) <= .6: bmap[best] = .7 if para else .4
used = set(range(len(bmap)))
for (a, b) in runs:
    if a <= first_sp or a >= last_sp: continue
    L = b - a
    tgt = bmap.get((a, b))
    if tgt is None:
        if L < .25: continue
        tgt = .65 if L > .9 else L
    out.append(x[int(cur * SR):int(a * SR)])
    pad = int(tgt * SR); out.append(np.zeros(pad, dtype=np.float32))
    plan.append((round(a, 2), round(L, 2), tgt)); cur = b
out.append(x[int(cur * SR):int((last_sp + .12) * SR)])
y = np.concatenate(out)
print("문장 경계", len(bounds), "· 찾은 경계", len(used), "· 바꾼 쉼", len(plan), f"· 길이 {len(x)/SR:.1f} → {len(y)/SR:.1f}초")
missing = len(bounds) - len(bmap)
print("못 찾은 경계(문장 번호):", missing)
w = wave.open("asm.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes()); w.close()
json.dump(plan, open("asm_plan.json", "w"))
