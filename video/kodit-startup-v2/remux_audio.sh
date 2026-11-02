#!/bin/bash
# remux_audio.sh h|v — 화면은 그대로(out/<F>_video.mp4, -c:v copy), 소리만 다시 섞어 붙임: mix.py → 2-pass -14 LUFS(TP -1) + 리미터 → final_<F>.mp4
set -e
cd "$(dirname "$0")"
F=$1; DUR=$(cat out/dur.txt); FPS=60
N=$(python3 -c "print(round($DUR*$FPS))"); LEN=$(python3 -c "print($N/$FPS)")
../venv/bin/python mix.py $F
J=$(ffmpeg -nostdin -hide_banner -i out/mix_$F.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 < /dev/null | sed -n '/^{/,/^}/p')
read II TP LRA TH OFF < <(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
ffmpeg -nostdin -hide_banner -loglevel error -y -i out/${F}_video.mp4 -i out/mix_$F.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true,alimiter=limit=0.89:level=false:latency=1,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart -t $LEN out/final_$F.mp4 < /dev/null
ls -la out/final_$F.mp4
