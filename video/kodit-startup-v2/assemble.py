#  assemble.py — 짧은 파일(첫 문장) + 긴 파일(첫 문장 뺀 나머지) → 쉼 정리 → asm.wav (24kHz)
#  V2.1 (사용자 피드백: 말끝이 잘려 다음 문장으로 넘어감 · 쉼을 줄여 속도감 있게)
#  - 쉼 안에서 '조용한 프레임'(-46dB 미만)만 잘라 낸다. 말끝 꼬리 · 숨소리 · 다음 말 시작은 지우지 않는다(무음으로 바꾸지 않음)
#  - 조용한 가운데 길이 목표(속도 바꾸기 전): 문장 사이 0.24초 · 문단 사이 0.38초 · 문장 안 쉼은 0.26초 넘으면 0.26초
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
# 10ms 음량 → 쉼 후보(-38dB 미만 연속, 80ms 미만 소리는 쉼 안에 포함) · 지워도 되는 프레임(-46dB 미만)
hop = int(.01 * SR); n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1)) / 32768 + 1e-9)
sp = db > -38
i = 0
while i < n:
    if sp[i]:
        j = i
        while j < n and sp[j]: j += 1
        if j - i < 8: sp[i:j] = False
        i = j
    else: i += 1
runs = []   # 쉼 후보 (시작 프레임, 끝 프레임)
i = 0
while i < n:
    if not sp[i]:
        j = i
        while j < n and not sp[j]: j += 1
        runs.append((i, j)); i = j
    else: i += 1
loud = db >= -46
guard = loud.copy()
for k in (1, 2): guard[k:] |= loud[:-k]; guard[:-k] |= loud[k:]      # 소리 앞뒤 20ms 보호
first_sp = next(k for k in range(n) if sp[k]); last_sp = n - 1 - next(k for k in range(n) if loud[n - 1 - k])
S_T, P_T, CAP = .24, .38, .26
cand = [(a, b) for (a, b) in runs if (b - a) >= 20 and first_sp < a < last_sp]
bmap = {}
for te, para in bounds:
    best = min(cand, key=lambda r: abs(r[0] * .01 - te))
    if abs(best[0] * .01 - te) <= .6: bmap[best] = P_T if para else S_T
cuts, ins, plan = [], [], []    # cuts: (시작 프레임, 끝 프레임) 지움 · ins: (프레임, 길이 초) 넣음
for (a, b) in runs:
    if a <= first_sp or a >= last_sp or b - a < 20: continue
    rem = [k for k in range(a + 6, b - 4) if not guard[k]]       # 꼬리 60ms · 다음 말 앞 40ms는 항상 남김
    if not rem: continue
    r0, r1 = rem[0], rem[-1]
    mid = (r1 - r0 + 1) * .01
    tgt = bmap.get((a, b))
    if tgt is None:
        if mid <= CAP: continue
        tgt = CAP
    need = int(round((mid - tgt) * 100))
    st, cur = [], [rem[0]]                                         # 지울 수 있는 연속 구간들
    for k in rem[1:]:
        if k == cur[-1] + 1: cur.append(k)
        else: st.append(cur); cur = [k]
    st.append(cur); st.sort(key=len, reverse=True)
    if need > 0:
        got = 0
        for s_ in st:
            if got >= need: break
            take = min(need - got, len(s_) - 2)
            if take <= 0: continue
            c0 = s_[0] + (len(s_) - take) // 2
            cuts.append((c0, c0 + take)); got += take
        plan.append((round(a * .01, 2), round((b - a) * .01, 2), round(mid, 2), tgt, -got * .01))
    elif need < 0:
        s_ = st[0]; ins.append((s_[len(s_) // 2], -need * .01))
        plan.append((round(a * .01, 2), round((b - a) * .01, 2), round(mid, 2), tgt, -need * .01))
# 지우는 프레임에 말소리가 없는지 확인
for c0, c1 in cuts: assert not loud[c0:c1].any()
ops = sorted([(c0 * hop, "cut", c1 * hop) for c0, c1 in cuts] + [(p * hop, "ins", L) for p, L in ins])
XF = int(.005 * SR); fo = np.linspace(1, 0, XF, dtype=np.float32); fi = 1 - fo
out, pos = [], max(0, first_sp * hop - int(.05 * SR))
for p0, kind, v in ops:
    if kind == "cut":
        out.append(x[pos:p0 - XF]); out.append(x[p0 - XF:p0] * fo + x[v:v + XF] * fi); pos = v + XF
    else:
        out.append(x[pos:p0]); out.append(np.zeros(int(v * SR), dtype=np.float32)); pos = p0
out.append(x[pos:min(len(x), (last_sp + 12) * hop)])
y = np.concatenate(out)
print("문장 경계", len(bounds), "· 찾은 경계", len(bmap), "· 바꾼 쉼", len(plan), f"· 길이 {len(x)/SR:.1f} → {len(y)/SR:.1f}초", "· 못 찾은 경계", len(bounds) - len(bmap))
w = wave.open("asm.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes()); w.close()
json.dump(plan, open("asm_plan.json", "w"))
