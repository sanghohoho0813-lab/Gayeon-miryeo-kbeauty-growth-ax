import json, time
from faster_whisper import WhisperModel
t = time.time()
m = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=4)
print("model loaded", round(time.time() - t), "s", flush=True)
segs, info = m.transcribe("voice.wav", language="ko", beam_size=5, word_timestamps=True,
                          vad_filter=True, vad_parameters={"min_silence_duration_ms": 300},
                          condition_on_previous_text=False,
                          initial_prompt="주식회사 가연인터내셔널, 중진공, AX 스프린트 II, K-Beauty, MIRYEO, 시연용, 시계열 분석, 머신러닝, 구독형 AX 서비스")
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text, "words": [{"s": w.start, "e": w.end, "w": w.word} for w in (s.words or [])]})
    print(f"{s.start:7.2f} {s.end:7.2f} {s.text}", flush=True)
json.dump(out, open("asr.json", "w"), ensure_ascii=False, indent=1)
print("done", round(time.time() - t), "s")
