#!/bin/bash
# bash render_all.sh v|h — 60fps 4구간 병렬 렌더 → 이어 붙이기 → 목소리+효과음 섞기 → 2-pass -14 LUFS → 합치기
set -e
cd "$(dirname "$0")"
F=$1; DUR=$(cat out/dur.txt); FPS=60
if [ "$F" = v ]; then W=1080; H=1920; else W=1920; H=1080; fi
N=$(python3 -c "print(round($DUR*$FPS))"); P=${PARTS:-4}
rm -f out/${F}_part*.mp4 out/${F}_list.txt
for k in $(seq 0 $((P-1))); do
  a=$((N*k/P)); b=$((N*(k+1)/P))
  FPS=$FPS node render.mjs $PWD/comp/comp_$F.html $PWD/out/${F}_part$k.mp4 $W $H $a $b &
  echo "file '${F}_part$k.mp4'" >> out/${F}_list.txt
done
wait
ffmpeg -nostdin -hide_banner -loglevel error -y -f concat -safe 0 -i out/${F}_list.txt -c copy out/${F}_video.mp4
../venv/bin/python mix.py $F
J=$(ffmpeg -nostdin -hide_banner -i out/mix_$F.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
read II TP LRA TH OFF < <(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
LEN=$(python3 -c "print($N/$FPS)")
ffmpeg -nostdin -hide_banner -loglevel error -y -i out/${F}_video.mp4 -i out/mix_$F.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true,alimiter=limit=0.89:level=false:latency=1,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart -t $LEN out/final_$F.mp4
ls -la out/final_$F.mp4
