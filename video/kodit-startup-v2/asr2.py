import json, sys, time
from faster_whisper import WhisperModel
t = time.time()
m = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=4)
for src, out in [("short_src.wav", "asr_short.json"), ("long_src.wav", "asr_long.json")]:
    segs, info = m.transcribe(src, language="ko", beam_size=5, word_timestamps=True, vad_filter=True,
                              vad_parameters={"min_silence_duration_ms": 300}, condition_on_previous_text=False,
                              initial_prompt="주식회사 가연인터내셔널, MIRYEO AX, MIRYEO AI Beauty, OEM, ERP, MVP, SaaS, 신용보증기금 스타트업지점, 4억 7천만 원")
    res = []
    for s in segs:
        res.append({"start": s.start, "end": s.end, "text": s.text, "words": [{"s": w.start, "e": w.end, "w": w.word} for w in (s.words or [])]})
        print(f"{src} {s.start:7.2f} {s.end:7.2f} {s.text}", flush=True)
    json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
print("done", round(time.time() - t), "s")
