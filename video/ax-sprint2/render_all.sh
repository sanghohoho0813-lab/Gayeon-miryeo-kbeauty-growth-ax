#!/bin/bash
# bash render_all.sh v|h  — 4구간 병렬 렌더 → 이어 붙이기 → 음성(앞 0.6초 여백, 끝 무음 채움·1초 페이드) 합치기
set -e
cd "$(dirname "$0")"
F=$1; DUR=$(cat out/dur.txt); FPS=30
if [ "$F" = v ]; then W=1080; H=1920; else W=1920; H=1080; fi
N=$(python3 -c "print(round($DUR*$FPS))"); P=${PARTS:-4}
export FFMPEG=$PWD/ffmpeg
rm -f out/${F}_part*.mp4 out/${F}_list.txt
for k in $(seq 0 $((P-1))); do
  a=$((N*k/P)); b=$((N*(k+1)/P))
  node render.mjs $PWD/comp/comp_$F.html $PWD/out/${F}_part$k.mp4 $W $H $a $b &
  echo "file '${F}_part$k.mp4'" >> out/${F}_list.txt
done
wait
./ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i out/${F}_list.txt -c copy out/${F}_video.mp4
LEN=$(python3 -c "print($N/$FPS)")
./ffmpeg -hide_banner -loglevel error -y -i out/${F}_video.mp4 -i voice.wav \
  -filter_complex "[1:a]adelay=600|600,apad,atrim=start=0:end=$LEN,asetpts=PTS-STARTPTS,afade=t=out:st=$(python3 -c "print($LEN-1)"):d=1[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart -t $LEN out/final_$F.mp4
ls -la out/final_$F.mp4
