# V6 — 69.0초(영상 시각, '…시험버전입니다.'와 '제품 이미지는…' 사이 무음)에 2초 쉼을 넣는다.
#  나레이션(voice.wav는 0.6초 지연 전 시각)·자막(subs.json)·글자 시각(chars.json)을 그 뒤로 +2초. 원본은 *_v5 로 보관.
import json, wave
INS, D, DELAY = 69.0, 2.0, 0.6
S = json.load(open("subs_v5.json"))
for s in S:
    for k in ("in", "out"):
        if s[k] >= INS: s[k] = round(s[k] + D, 3)
json.dump(S, open("subs.json", "w"), ensure_ascii=False, indent=1)
C = json.load(open("chars_v5.json"))
C["t0"] = [round(t + D, 3) if t >= INS else t for t in C["t0"]]
json.dump(C, open("chars.json", "w"), ensure_ascii=False)
w = wave.open("voice_v5.wav"); p = w.getparams(); n = w.getnframes(); sr = w.getframerate(); fb = p.sampwidth * p.nchannels
data = w.readframes(n); cut = int(round((INS - DELAY) * sr)) * fb
o = wave.open("voice.wav", "w"); o.setparams(p)
o.writeframes(data[:cut] + b"\x00" * (int(D * sr) * fb) + data[cut:]); o.close()
print("voice", n / sr, "→", (n + int(D * sr)) / sr, "| subs shifted", sum(1 for s in S if s["in"] >= INS + D))
